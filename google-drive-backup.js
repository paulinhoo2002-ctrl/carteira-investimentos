'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GoogleDriveBackup = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
  const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const FORMAT = 'carteira-investimentos-backup-encrypted';
  const MAX_BYTES = 36 * 1024 * 1024;
  const MAX_READ_RETRIES = 2;
  const MAX_VERSION_CHECKS = 2;
  const MAX_RETRY_AFTER_MS = 2000;
  const MAX_UPLOAD_RESUMES = 2;
  const HEX_256 = /^[a-f0-9]{64}$/;
  const uploadQueues = new Map();

  function fail(code, retryable = false, retryAfter = null) {
    return Object.assign(new Error(code), { code, retryable, retryAfter });
  }

  function isBrowserRuntime() {
    return typeof window === 'object' || typeof document === 'object' || (typeof self === 'object' && typeof self.importScripts === 'function');
  }

  function createFirestoreBackupOperationCoordinator({ firestore, getOwnerUid } = {}) {
    if (!firestore || typeof firestore.collection !== 'function' || typeof firestore.runTransaction !== 'function') throw fail('COORDINATOR_UNAVAILABLE');
    if (typeof getOwnerUid !== 'function') throw fail('COORDINATOR_AUTH_REQUIRED');
    return Object.freeze({
      async reserve({ idempotencyHash, contentSha256, proposedFileId, ownerScope } = {}) {
        if (!HEX_256.test(idempotencyHash || '') || !HEX_256.test(contentSha256 || '') || !HEX_256.test(ownerScope || '') ||
            typeof proposedFileId !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(proposedFileId)) throw fail('INVALID_OPERATION_IDENTITY');
        let ownerUid;
        try { ownerUid = await getOwnerUid(); } catch { throw fail('COORDINATOR_AUTH_REQUIRED'); }
        if (typeof ownerUid !== 'string' || !ownerUid || ownerUid !== ownerUid.trim() || ownerUid.includes('/') || ownerUid.length > 128) throw fail('COORDINATOR_AUTH_REQUIRED');
        if (ownerScope !== await sha256(`carteira-investimentos-backup-owner-v1:${ownerUid}`)) throw fail('COORDINATOR_OWNER_MISMATCH');
        const ref = firestore.collection('users').doc(ownerUid).collection('driveBackupOperations').doc(idempotencyHash);
        try {
          return await firestore.runTransaction(async transaction => {
            const snapshot = await transaction.get(ref);
            if (snapshot.exists) {
              const stored = snapshot.data();
              if (!stored || stored.contentSha256 !== contentSha256 || typeof stored.fileId !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(stored.fileId)) throw fail('IDEMPOTENCY_CONFLICT');
              return { fileId: stored.fileId, contentSha256: stored.contentSha256 };
            }
            const operation = { fileId: proposedFileId, contentSha256 };
            transaction.set(ref, operation);
            return operation;
          });
        } catch (error) {
          if (error?.code === 'IDEMPOTENCY_CONFLICT') throw error;
          if (['permission-denied', 'unauthenticated', 'firestore/permission-denied', 'firestore/unauthenticated'].includes(error?.code)) throw fail('COORDINATOR_FORBIDDEN');
          throw fail('COORDINATOR_UNAVAILABLE', true);
        }
      }
    });
  }

  async function sha256(value) {
    const crypto = globalThis.crypto;
    if (!crypto?.subtle) throw fail('CRYPTO_UNAVAILABLE');
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function validateEnvelope(envelope) {
    if (!envelope || envelope.format !== FORMAT || envelope.version !== 1 ||
        envelope.kdf?.name !== 'PBKDF2' || envelope.kdf?.hash !== 'SHA-256' || envelope.kdf?.iterations !== 310000 ||
        envelope.cipher?.name !== 'AES-GCM' || typeof envelope.kdf?.salt !== 'string' ||
        typeof envelope.cipher?.iv !== 'string' || typeof envelope.ciphertext !== 'string') throw fail('UNSUPPORTED_ENCRYPTED_BACKUP');
    const base64Length = value => {
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return -1;
      return value.length * 3 / 4 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);
    };
    if (base64Length(envelope.kdf.salt) !== 16 || base64Length(envelope.cipher.iv) !== 12 || base64Length(envelope.ciphertext) < 16) throw fail('INVALID_ENCRYPTED_BACKUP');
    const serialized = JSON.stringify(envelope);
    if (new TextEncoder().encode(serialized).byteLength > MAX_BYTES) throw fail('BACKUP_TOO_LARGE');
    return serialized;
  }

  function safeScope(scope) {
    const scopes = String(scope || '').split(/\s+/).filter(Boolean);
    return scopes.length === 1 && scopes[0] === DRIVE_SCOPE;
  }

  async function readJson(response) {
    try { return await response.json(); } catch { throw fail('DRIVE_RESPONSE_INVALID'); }
  }

  function assertRemoteSize(size) {
    if (size === undefined || size === null || size === '') return;
    const bytes = Number(size);
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw fail('INVALID_REMOTE_METADATA');
    if (bytes > MAX_BYTES) throw fail('BACKUP_TOO_LARGE');
  }

  async function readRemoteText(response, expectedSize) {
    assertRemoteSize(expectedSize);
    assertRemoteSize(response.headers?.get?.('content-length'));
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      const chunks = [];
      let actualSize = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          actualSize += value.byteLength;
          if (actualSize > MAX_BYTES) {
            try { await reader.cancel(); } catch { /* Stop on size even if cancellation fails. */ }
            throw fail('BACKUP_TOO_LARGE');
          }
          chunks.push(value);
        }
      } catch (error) {
        if (error?.code) throw error;
        throw fail('NETWORK_ERROR', true);
      }
      const bytes = new Uint8Array(actualSize);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        if (expectedSize !== undefined && expectedSize !== null && expectedSize !== '' && actualSize !== Number(expectedSize)) throw fail('FILE_CORRUPT');
        return text;
      } catch (error) {
        if (error?.code) throw error;
        throw fail('FILE_CORRUPT');
      }
    }
    let text;
    try { text = await response.text(); } catch { throw fail('NETWORK_ERROR', true); }
    const actualSize = new TextEncoder().encode(text).byteLength;
    if (actualSize > MAX_BYTES) throw fail('BACKUP_TOO_LARGE');
    if (expectedSize !== undefined && expectedSize !== null && expectedSize !== '' && actualSize !== Number(expectedSize)) throw fail('FILE_CORRUPT');
    return text;
  }

  async function mapConcurrent(values, limit, mapper) {
    const results = new Array(values.length);
    let nextIndex = 0;
    let failure = null;
    await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
      while (!failure && nextIndex < values.length) {
        const index = nextIndex++;
        try { results[index] = await mapper(values[index]); }
        catch (error) { failure = error; }
      }
    }));
    if (failure) throw failure;
    return results;
  }

  function createGoogleDriveTokenProvider({ clientId, google = globalThis.google } = {}) {
    if (typeof clientId !== 'string' || !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw fail('OAUTH_CLIENT_ID_REQUIRED');
    let cachedToken = null;
    const provider = () => {
      if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return Promise.resolve(cachedToken);
      return new Promise((resolve, reject) => {
        const oauth = google?.accounts?.oauth2;
        if (!oauth?.initTokenClient) return reject(fail('OAUTH_UNAVAILABLE'));
        const client = oauth.initTokenClient({
          client_id: clientId,
          scope: DRIVE_SCOPE,
          include_granted_scopes: false,
          callback: response => {
            if (!response || response.error || typeof response.access_token !== 'string' || !safeScope(response.scope)) return reject(fail('OAUTH_SCOPE_REQUIRED'));
            const expiresIn = Number(response.expires_in);
            if (!Number.isFinite(expiresIn) || expiresIn <= 0) return reject(fail('AUTH_EXPIRED'));
            cachedToken = { accessToken: response.access_token, scope: response.scope, expiresAt: Date.now() + expiresIn * 1000 };
            resolve(cachedToken);
          },
          error_callback: () => reject(fail('OAUTH_FAILED'))
        });
        try { client.requestAccessToken({ prompt: '' }); } catch { reject(fail('OAUTH_FAILED')); }
      });
    };
    provider.invalidate = () => { cachedToken = null; };
    return provider;
  }

  function createGoogleDriveBackupAdapter({ getAccessToken, fetchImpl = globalThis.fetch, ownerScope, appId, operationStore, operationCoordinator } = {}) {
    if (typeof getAccessToken !== 'function') throw fail('AUTH_PROVIDER_REQUIRED');
    if (typeof fetchImpl !== 'function') throw fail('FETCH_UNAVAILABLE');
    if (!HEX_256.test(ownerScope || '')) throw fail('OWNER_SCOPE_REQUIRED');
    if (typeof appId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(appId)) throw fail('INVALID_APP_ID');
    if (operationCoordinator && typeof operationCoordinator.reserve !== 'function') throw fail('COORDINATOR_UNAVAILABLE');
    let journal = operationStore;
    if (!journal) {
      // shortcut: local journal only recovers this profile; upgrade when a shared authority exists.
      try { journal = typeof window === 'object' ? window.localStorage : new Map(); }
      catch { throw fail('OPERATION_JOURNAL_UNAVAILABLE'); }
    }

    function journalGet(key) {
      try {
        const value = journal instanceof Map ? journal.get(key) : journal.getItem(key);
        return typeof value === 'string' ? JSON.parse(value) : value || null;
      } catch { throw fail('OPERATION_JOURNAL_UNAVAILABLE'); }
    }

    function journalSet(key, value) {
      try {
        if (journal instanceof Map) journal.set(key, value);
        else journal.setItem(key, JSON.stringify(value));
      } catch { throw fail('OPERATION_JOURNAL_UNAVAILABLE'); }
    }

    async function auth() {
      let token;
      try { token = await getAccessToken(); } catch (error) { throw error?.code ? error : fail('AUTH_REQUIRED'); }
      if (!token || typeof token.accessToken !== 'string' || !token.accessToken || !safeScope(token.scope)) throw fail('OAUTH_SCOPE_REQUIRED');
      if (!Number.isFinite(token.expiresAt) || token.expiresAt <= Date.now()) throw fail('AUTH_EXPIRED');
      return token.accessToken;
    }

    async function request(url, { method = 'GET', body, contentType } = {}) {
      let attempt = 0;
      while (true) {
        const accessToken = await auth();
        let response;
        try {
          const headers = { Authorization: `Bearer ${accessToken}` };
          if (contentType) headers['Content-Type'] = contentType;
          response = await fetchImpl(url, { method, headers, redirect: 'error', ...(body === undefined ? {} : { body }) });
        } catch {
          if (method === 'GET' && attempt < MAX_READ_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 100 * (2 ** attempt++)));
            continue;
          }
          throw fail(method === 'POST' ? 'UPLOAD_OUTCOME_UNKNOWN' : 'NETWORK_ERROR', method === 'GET');
        }
        if (response.ok) return response;
        let reason = '';
        try { reason = (await response.json())?.error?.errors?.[0]?.reason || ''; } catch { /* Ignore remote response bodies. */ }
        if (response.status === 401) {
          getAccessToken.invalidate?.();
          throw fail('AUTH_REQUIRED');
        }
        if (response.status === 404) throw fail('NOT_FOUND');
        if (response.status === 409) throw fail('DRIVE_CONFLICT');
        const retryAfterHeader = response.headers?.get?.('retry-after');
        const retryAfterSeconds = retryAfterHeader === null ? NaN : Number(retryAfterHeader);
        const retryAfter = Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
          ? Math.min(MAX_RETRY_AFTER_MS, retryAfterSeconds * 1000)
          : null;
        const quotaError = response.status === 429 || (response.status === 403 && /rateLimit|quota|limitExceeded/i.test(reason));
        if (response.status === 403 && !quotaError) throw fail('PERMISSION_DENIED');
        if (method === 'GET' && (quotaError || response.status >= 500) && attempt < MAX_READ_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, retryAfter ?? 100 * (2 ** attempt)));
          attempt += 1;
          continue;
        }
        if (quotaError) throw fail('QUOTA_EXCEEDED', method === 'GET', retryAfter);
        if (response.status >= 500) throw fail(method === 'POST' ? 'UPLOAD_OUTCOME_UNKNOWN' : 'NETWORK_ERROR', method === 'GET', retryAfter);
        throw fail('DRIVE_REQUEST_FAILED');
      }
    }

    function uploadOffset(response, total, previousOffset) {
      const range = response.headers?.get?.('range');
      if (!range) return 0;
      const match = /^bytes=0-(\d+)$/.exec(range);
      const offset = match ? Number(match[1]) + 1 : NaN;
      if (!Number.isSafeInteger(offset) || offset <= 0 || offset > total || offset < previousOffset) throw fail('DRIVE_RESPONSE_INVALID');
      return offset;
    }

    async function inspectUploadFailure(response) {
      let reason = '';
      try { reason = (await response.json())?.error?.errors?.[0]?.reason || ''; } catch { /* Remote details stay private. */ }
      if (response.status === 401 || response.status === 404) throw fail('UPLOAD_SESSION_EXPIRED');
      if (response.status === 409) throw fail('DRIVE_CONFLICT');
      const quotaError = response.status === 429 || (response.status === 403 && /rateLimit|quota|limitExceeded/i.test(reason));
      if (quotaError) throw fail('QUOTA_EXCEEDED', true);
      if (response.status === 403) throw fail('PERMISSION_DENIED');
      throw fail(response.status >= 500 ? 'UPLOAD_OUTCOME_UNKNOWN' : 'DRIVE_REQUEST_FAILED');
    }

    function assertSessionUrl(location) {
      try {
        const url = new URL(location);
        if (url.protocol !== 'https:' || url.hostname !== 'www.googleapis.com' || url.port || url.username || url.password ||
            url.pathname !== '/upload/drive/v3/files' || !url.searchParams.get('upload_id')) throw fail('UPLOAD_SESSION_INVALID');
        return url.href;
      } catch (error) {
        if (error?.code) throw error;
        throw fail('UPLOAD_SESSION_INVALID');
      }
    }

    async function uploadSession(sessionUrl, content) {
      let offset = 0;
      let resumes = 0;
      async function reconcile(previousOffset) {
        let status;
        try {
          status = await fetchImpl(sessionUrl, { method: 'PUT', headers: { 'Content-Range': `bytes */${content.size}` }, redirect: 'error' });
        } catch { throw fail('UPLOAD_OUTCOME_UNKNOWN'); }
        if (status.ok) return { file: await readJson(status) };
        if (status.status === 308) return { offset: uploadOffset(status, content.size, previousOffset) };
        await inspectUploadFailure(status);
      }
      while (offset < content.size) {
        let response;
        try {
          response = await fetchImpl(sessionUrl, {
            method: 'PUT',
            headers: { 'Content-Range': `bytes ${offset}-${content.size - 1}/${content.size}` },
            body: content.slice(offset),
            redirect: 'error'
          });
        } catch {
          if (resumes++ >= MAX_UPLOAD_RESUMES) throw fail('UPLOAD_OUTCOME_UNKNOWN');
          const state = await reconcile(offset);
          if (state.file) return state.file;
          offset = state.offset;
          if (offset >= content.size) throw fail('UPLOAD_OUTCOME_UNKNOWN');
          continue;
        }
        if (response.status === 308) {
          if (resumes++ >= MAX_UPLOAD_RESUMES) throw fail('UPLOAD_OUTCOME_UNKNOWN');
          const nextOffset = uploadOffset(response, content.size, offset);
          if (nextOffset <= offset || nextOffset >= content.size) throw fail('UPLOAD_OUTCOME_UNKNOWN');
          offset = nextOffset;
          continue;
        }
        if (response.ok) return readJson(response);
        if (response.status >= 500) {
          if (resumes++ >= MAX_UPLOAD_RESUMES) throw fail('UPLOAD_OUTCOME_UNKNOWN');
          const state = await reconcile(offset);
          if (state.file) return state.file;
          offset = state.offset;
          if (offset >= content.size) throw fail('UPLOAD_OUTCOME_UNKNOWN');
          continue;
        }
        await inspectUploadFailure(response);
      }
      throw fail('UPLOAD_OUTCOME_UNKNOWN');
    }

    function queryUrl({ ownerScope: scope, backupKeyHash, idempotencyHash } = {}) {
      if (!HEX_256.test(scope || '') || !HEX_256.test(backupKeyHash || '') || (idempotencyHash && !HEX_256.test(idempotencyHash))) throw fail('INVALID_BACKUP_IDENTITY');
      const clauses = [
        "trashed = false",
        `appProperties has { key='appId' and value='${appId}' }`,
        `appProperties has { key='ownerScope' and value='${scope}' }`,
        `appProperties has { key='backupKey' and value='${backupKeyHash}' }`
      ];
      if (idempotencyHash) clauses.push(`appProperties has { key='idempotency' and value='${idempotencyHash}' }`);
      const url = new URL(DRIVE_FILES);
      url.searchParams.set('q', clauses.join(' and '));
      url.searchParams.set('spaces', 'drive');
      url.searchParams.set('pageSize', '1000');
      url.searchParams.set('orderBy', 'createdTime desc');
      url.searchParams.set('fields', 'nextPageToken,incompleteSearch,files(id,name,mimeType,createdTime,size,appProperties)');
      return url;
    }

    async function listRaw({ backupKeyHash, idempotencyHash } = {}) {
      const files = [];
      let pageToken = '';
      do {
        const url = queryUrl({ ownerScope, backupKeyHash, idempotencyHash });
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const response = await request(url);
        const data = await readJson(response);
        if (data.incompleteSearch === true || !Array.isArray(data.files)) throw fail('INCOMPLETE_REMOTE_LIST');
        for (const file of data.files) {
          if (file?.appProperties?.appId !== appId || file.appProperties.ownerScope !== ownerScope || file.appProperties.backupKey !== backupKeyHash ||
              (idempotencyHash && file.appProperties.idempotency !== idempotencyHash)) continue;
          files.push(file);
        }
        pageToken = data.nextPageToken || '';
      } while (pageToken);
      return files;
    }

    async function listVersions({ backupKey } = {}) {
      if (typeof backupKey !== 'string' || !backupKey.trim()) throw fail('INVALID_BACKUP_KEY');
      const backupKeyHash = await sha256(backupKey);
      const files = await listRaw({ backupKeyHash });
      return mapConcurrent(files, MAX_VERSION_CHECKS, async file => {
        let integrity = 'UNKNOWN';
        try {
          assertRemoteSize(file.size);
          const response = await request(`${DRIVE_FILES}/${encodeURIComponent(file.id)}?alt=media`);
          const raw = await readRemoteText(response, file.size);
          const parsed = JSON.parse(raw);
          validateEnvelope(parsed);
          integrity = await sha256(raw) === file.appProperties.contentSha256 ? 'VALID' : 'CORRUPT';
        } catch (error) {
          if (error instanceof SyntaxError || ['UNSUPPORTED_ENCRYPTED_BACKUP', 'INVALID_ENCRYPTED_BACKUP'].includes(error.code)) integrity = 'CORRUPT';
          else throw error;
        }
        return { fileId: file.id, createdAt: file.createdTime || null, size: Number(file.size) || null, integrity };
      });
    }

    async function upload(args = {}) {
      const { backupKey, idempotencyKey } = args;
      if (typeof backupKey !== 'string' || !backupKey.trim() || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) throw fail('INVALID_BACKUP_IDENTITY');
      const queueKey = await sha256(`${ownerScope}:${backupKey}:${idempotencyKey}`);
      const previous = uploadQueues.get(queueKey) || Promise.resolve();
      let release;
      const current = new Promise(resolve => { release = resolve; });
      uploadQueues.set(queueKey, current);
      await previous;
      const run = () => uploadOne(args);
      try {
        if (globalThis.navigator?.locks?.request) return await globalThis.navigator.locks.request(`drive-backup:${queueKey}`, run);
        if (isBrowserRuntime()) throw fail('CROSS_TAB_COORDINATION_UNAVAILABLE');
        return await run();
      }
      finally {
        release();
        if (uploadQueues.get(queueKey) === current) uploadQueues.delete(queueKey);
      }
    }

    async function uploadOne({ backupKey, idempotencyKey, envelope } = {}) {
      if (typeof backupKey !== 'string' || !backupKey.trim() || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) throw fail('INVALID_BACKUP_IDENTITY');
      if (isBrowserRuntime() && !operationCoordinator) throw fail('SHARED_COORDINATOR_REQUIRED');
      const content = validateEnvelope(envelope);
      const contentSha256 = await sha256(content);
      const backupKeyHash = await sha256(backupKey);
      const idempotencyHash = await sha256(`${ownerScope}:${backupKey}:${idempotencyKey}`);
      const journalKey = `drive-backup-operation:${idempotencyHash}`;
      let operation = journalGet(journalKey);
      if (operation && (typeof operation.fileId !== 'string' || !/^[\w-]+$/.test(operation.fileId) || operation.contentSha256 !== contentSha256)) throw fail('IDEMPOTENCY_CONFLICT');
      const existing = await listRaw({ backupKeyHash, idempotencyHash });
      if (existing.length > 1) throw fail('IDEMPOTENCY_CONFLICT');
      const sameContent = (await listRaw({ backupKeyHash })).filter(file => file.appProperties.contentSha256 === contentSha256);
      if (sameContent.length > 1) throw fail('IDEMPOTENCY_CONFLICT');
      const discovered = existing[0] || sameContent[0] || null;
      if (discovered && discovered.appProperties.contentSha256 !== contentSha256) throw fail('IDEMPOTENCY_CONFLICT');
      if (operationCoordinator) {
        let proposedFileId = operation?.fileId || discovered?.id;
        if (!proposedFileId) {
          const ids = await readJson(await request(`${DRIVE_FILES}/generateIds?count=1&space=drive&fields=ids`));
          if (!Array.isArray(ids.ids) || typeof ids.ids[0] !== 'string' || !/^[\w-]+$/.test(ids.ids[0])) throw fail('DRIVE_RESPONSE_INVALID');
          proposedFileId = ids.ids[0];
        }
        const shared = await operationCoordinator.reserve({ idempotencyHash, contentSha256, proposedFileId, ownerScope });
        if (!shared || typeof shared.fileId !== 'string' || !/^[\w-]+$/.test(shared.fileId) || shared.contentSha256 !== contentSha256 ||
            (operation && operation.fileId !== shared.fileId) || (discovered && discovered.id !== shared.fileId)) throw fail('IDEMPOTENCY_CONFLICT');
        operation = { fileId: shared.fileId, contentSha256 };
        journalSet(journalKey, operation);
      }
      if (discovered) {
        await verifyUploadedFile(discovered, { backupKey, contentSha256, expectedSize: new TextEncoder().encode(content).byteLength });
        if (!operation) { operation = { fileId: discovered.id, contentSha256 }; journalSet(journalKey, operation); }
        return { fileId: discovered.id, createdAt: discovered.createdTime || null, contentSha256, replayed: true };
      }
      if (operation) {
        try {
          const recovered = await download(operation.fileId, { backupKey });
          if (recovered.contentSha256 !== contentSha256) throw fail('IDEMPOTENCY_CONFLICT');
          return { fileId: recovered.fileId, createdAt: recovered.createdAt, contentSha256, replayed: true };
        } catch (error) { if (error.code !== 'NOT_FOUND') throw error; }
      } else {
        const ids = await readJson(await request(`${DRIVE_FILES}/generateIds?count=1&space=drive&fields=ids`));
        if (!Array.isArray(ids.ids) || typeof ids.ids[0] !== 'string' || !/^[\w-]+$/.test(ids.ids[0])) throw fail('DRIVE_RESPONSE_INVALID');
        operation = { fileId: ids.ids[0], contentSha256 };
        journalSet(journalKey, operation);
      }
      const metadata = {
        id: operation.fileId,
        name: 'carteira-backup-encrypted.json',
        mimeType: 'application/json',
        appProperties: { appId, ownerScope, backupKey: backupKeyHash, idempotency: idempotencyHash, contentSha256, formatVersion: '1' }
      };
      const body = new Blob([content], { type: 'application/json' });
      let initiation;
      try {
        initiation = await request(`${DRIVE_UPLOAD}?uploadType=resumable&fields=id,createdTime,size,appProperties`, {
          method: 'POST', body: JSON.stringify(metadata), contentType: 'application/json; charset=UTF-8'
        });
      } catch (error) {
        if (error.code !== 'DRIVE_CONFLICT') throw error;
        const recovered = await download(operation.fileId, { backupKey });
        if (recovered.contentSha256 !== contentSha256) throw fail('IDEMPOTENCY_CONFLICT');
        return { fileId: recovered.fileId, createdAt: recovered.createdAt, contentSha256, replayed: true };
      }
      const sessionUrl = assertSessionUrl(initiation.headers?.get?.('location'));
      let file;
      try { file = await uploadSession(sessionUrl, body); }
      catch (error) {
        if (error.code !== 'DRIVE_CONFLICT') throw error;
        const recovered = await download(operation.fileId, { backupKey });
        if (recovered.contentSha256 !== contentSha256) throw fail('IDEMPOTENCY_CONFLICT');
        return { fileId: recovered.fileId, createdAt: recovered.createdAt, contentSha256, replayed: true };
      }
      if (!file?.id || file.appProperties?.appId !== appId || file.appProperties.ownerScope !== ownerScope ||
          file.appProperties.backupKey !== backupKeyHash || file.appProperties.idempotency !== idempotencyHash ||
          file.appProperties.contentSha256 !== contentSha256 || file.appProperties.formatVersion !== '1' || Number(file.size) !== body.size) throw fail('UPLOAD_VERIFICATION_FAILED');
      await verifyUploadedFile(file, { backupKey, contentSha256, expectedSize: body.size });
      return { fileId: file.id, createdAt: file.createdTime || null, contentSha256, replayed: false };
    }

    async function verifyUploadedFile(file, { backupKey, contentSha256, expectedSize }) {
      if (Number(file.size) !== expectedSize) throw fail('UPLOAD_VERIFICATION_FAILED');
      const stored = await download(file.id, { backupKey });
      if (stored.contentSha256 !== contentSha256) throw fail('UPLOAD_VERIFICATION_FAILED');
    }

    async function download(fileId, { backupKey } = {}) {
      if (typeof fileId !== 'string' || !/^[\w-]+$/.test(fileId) || typeof backupKey !== 'string' || !backupKey.trim()) throw fail('NOT_FOUND');
      const response = await request(`${DRIVE_FILES}/${encodeURIComponent(fileId)}?fields=id,createdTime,size,appProperties`);
      const metadata = await readJson(response);
      const backupKeyHash = await sha256(backupKey);
      if (metadata.appProperties?.appId !== appId || metadata.appProperties.ownerScope !== ownerScope || metadata.appProperties.backupKey !== backupKeyHash) throw fail('NOT_FOUND');
      assertRemoteSize(metadata.size);
      const mediaResponse = await request(`${DRIVE_FILES}/${encodeURIComponent(fileId)}?alt=media`);
      const raw = await readRemoteText(mediaResponse, metadata.size);
      let envelope;
      try { envelope = JSON.parse(raw); } catch { throw fail('FILE_CORRUPT'); }
      validateEnvelope(envelope);
      const contentSha256 = await sha256(raw);
      if (contentSha256 !== metadata.appProperties.contentSha256) throw fail('FILE_CORRUPT');
      return { fileId, createdAt: metadata.createdTime || null, contentSha256, integrity: 'VALID', envelope };
    }

    async function planRetention({ backupKey, keepLatest } = {}) {
      if (!Number.isInteger(keepLatest) || keepLatest < 1) throw fail('INVALID_RETENTION_POLICY');
      const versions = await listVersions({ backupKey });
      const valid = versions.filter(row => row.integrity === 'VALID');
      const protectedRows = versions.filter(row => row.integrity !== 'VALID');
      return {
        keepLatest,
        keepFileIds: [...protectedRows, ...valid.slice(0, keepLatest)].map(row => row.fileId),
        deleteFileIds: valid.slice(keepLatest).map(row => row.fileId),
        destructiveActionAvailable: false
      };
    }

    return Object.freeze({ upload, listVersions, download, planRetention });
  }

  return { GOOGLE_DRIVE_FILE_SCOPE: DRIVE_SCOPE, createGoogleDriveTokenProvider, createGoogleDriveBackupAdapter, createFirestoreBackupOperationCoordinator };
});
