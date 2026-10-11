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
  const HEX_256 = /^[a-f0-9]{64}$/;
  const uploadQueues = new Map();

  function fail(code, retryable = false, retryAfter = null) {
    return Object.assign(new Error(code), { code, retryable, retryAfter });
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

  function createGoogleDriveTokenProvider({ clientId, google = globalThis.google } = {}) {
    if (typeof clientId !== 'string' || !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw fail('OAUTH_CLIENT_ID_REQUIRED');
    return () => new Promise((resolve, reject) => {
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
          resolve({ accessToken: response.access_token, scope: response.scope, expiresAt: Date.now() + expiresIn * 1000 });
        },
        error_callback: () => reject(fail('OAUTH_FAILED'))
      });
      try { client.requestAccessToken({ prompt: '' }); } catch { reject(fail('OAUTH_FAILED')); }
    });
  }

  function createGoogleDriveBackupAdapter({ getAccessToken, fetchImpl = globalThis.fetch, ownerScope, appId } = {}) {
    if (typeof getAccessToken !== 'function') throw fail('AUTH_PROVIDER_REQUIRED');
    if (typeof fetchImpl !== 'function') throw fail('FETCH_UNAVAILABLE');
    if (!HEX_256.test(ownerScope || '')) throw fail('OWNER_SCOPE_REQUIRED');
    if (typeof appId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(appId)) throw fail('INVALID_APP_ID');

    async function auth() {
      let token;
      try { token = await getAccessToken(); } catch (error) { throw error?.code ? error : fail('AUTH_REQUIRED'); }
      if (!token || typeof token.accessToken !== 'string' || !token.accessToken || !safeScope(token.scope)) throw fail('OAUTH_SCOPE_REQUIRED');
      if (!Number.isFinite(token.expiresAt) || token.expiresAt <= Date.now()) throw fail('AUTH_EXPIRED');
      return token.accessToken;
    }

    async function request(url, { method = 'GET', body, contentType } = {}) {
      const accessToken = await auth();
      let response;
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        if (contentType) headers['Content-Type'] = contentType;
        response = await fetchImpl(url, { method, headers, redirect: 'error', ...(body === undefined ? {} : { body }) });
      } catch { throw fail('NETWORK_ERROR', true); }
      if (!response.ok) {
        let reason = '';
        try { reason = (await response.json())?.error?.errors?.[0]?.reason || ''; } catch { /* Ignore remote response bodies. */ }
        if (response.status === 401) throw fail('AUTH_REQUIRED');
        if (response.status === 404) throw fail('NOT_FOUND');
        const retryAfter = Number(response.headers?.get?.('retry-after')) || null;
        if (response.status === 429 || (response.status === 403 && /rateLimit|quota|limitExceeded/i.test(reason))) throw fail('QUOTA_EXCEEDED', true, retryAfter);
        if (response.status >= 500) throw fail('NETWORK_ERROR', true, retryAfter);
        throw fail('DRIVE_REQUEST_FAILED');
      }
      return response;
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
      return Promise.all(files.map(async file => {
        let integrity = 'UNKNOWN';
        try {
          const response = await request(`${DRIVE_FILES}/${encodeURIComponent(file.id)}?alt=media`);
          const raw = await response.text();
          const parsed = JSON.parse(raw);
          validateEnvelope(parsed);
          integrity = await sha256(raw) === file.appProperties.contentSha256 ? 'VALID' : 'CORRUPT';
        } catch (error) {
          if (error instanceof SyntaxError || ['UNSUPPORTED_ENCRYPTED_BACKUP', 'INVALID_ENCRYPTED_BACKUP'].includes(error.code)) integrity = 'CORRUPT';
          else throw error;
        }
        return { fileId: file.id, createdAt: file.createdTime || null, size: Number(file.size) || null, integrity };
      }));
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
      try { return await uploadOne(args); }
      finally {
        release();
        if (uploadQueues.get(queueKey) === current) uploadQueues.delete(queueKey);
      }
    }

    async function uploadOne({ backupKey, idempotencyKey, envelope } = {}) {
      if (typeof backupKey !== 'string' || !backupKey.trim() || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) throw fail('INVALID_BACKUP_IDENTITY');
      const content = validateEnvelope(envelope);
      const contentSha256 = await sha256(content);
      const backupKeyHash = await sha256(backupKey);
      const idempotencyHash = await sha256(`${ownerScope}:${backupKey}:${idempotencyKey}`);
      const existing = await listRaw({ backupKeyHash, idempotencyHash });
      if (existing.length > 1) throw fail('IDEMPOTENCY_CONFLICT');
      if (existing.length === 1) {
        if (existing[0].appProperties.contentSha256 !== contentSha256) throw fail('IDEMPOTENCY_CONFLICT');
        return { fileId: existing[0].id, createdAt: existing[0].createdTime || null, contentSha256, replayed: true };
      }
      const sameContent = (await listRaw({ backupKeyHash })).filter(file => file.appProperties.contentSha256 === contentSha256);
      if (sameContent.length > 1) throw fail('IDEMPOTENCY_CONFLICT');
      if (sameContent.length === 1) return { fileId: sameContent[0].id, createdAt: sameContent[0].createdTime || null, contentSha256, replayed: true };
      const boundary = `ci-backup-${await sha256(`${contentSha256}:${idempotencyHash}`)}`;
      const metadata = {
        name: 'carteira-backup-encrypted.json',
        mimeType: 'application/json',
        appProperties: { appId, ownerScope, backupKey: backupKeyHash, idempotency: idempotencyHash, contentSha256, formatVersion: '1' }
      };
      const body = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`
      ]);
      const response = await request(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id,createdTime,size,appProperties`, {
        method: 'POST', body, contentType: `multipart/related; boundary=${boundary}`
      });
      const file = await readJson(response);
      if (!file?.id || file.appProperties?.appId !== appId || file.appProperties.ownerScope !== ownerScope ||
          file.appProperties.backupKey !== backupKeyHash || file.appProperties.idempotency !== idempotencyHash ||
          file.appProperties.contentSha256 !== contentSha256 || file.appProperties.formatVersion !== '1') throw fail('UPLOAD_VERIFICATION_FAILED');
      return { fileId: file.id, createdAt: file.createdTime || null, contentSha256, replayed: false };
    }

    async function download(fileId, { backupKey } = {}) {
      if (typeof fileId !== 'string' || !/^[\w-]+$/.test(fileId) || typeof backupKey !== 'string' || !backupKey.trim()) throw fail('NOT_FOUND');
      const response = await request(`${DRIVE_FILES}/${encodeURIComponent(fileId)}?fields=id,createdTime,size,appProperties`);
      const metadata = await readJson(response);
      const backupKeyHash = await sha256(backupKey);
      if (metadata.appProperties?.appId !== appId || metadata.appProperties.ownerScope !== ownerScope || metadata.appProperties.backupKey !== backupKeyHash) throw fail('NOT_FOUND');
      const mediaResponse = await request(`${DRIVE_FILES}/${encodeURIComponent(fileId)}?alt=media`);
      const raw = await mediaResponse.text();
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

  return { GOOGLE_DRIVE_FILE_SCOPE: DRIVE_SCOPE, createGoogleDriveTokenProvider, createGoogleDriveBackupAdapter };
});
