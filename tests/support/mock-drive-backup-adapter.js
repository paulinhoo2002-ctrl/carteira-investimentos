'use strict';

const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const ENCRYPTED_FORMAT = 'carteira-investimentos-backup-encrypted';
const PBKDF2_ITERATIONS = 310000;
const MAX_ENVELOPE_BYTES = 36 * 1024 * 1024;
const uploadQueues = new Map();

function fail(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function recordSha256(row) {
  const { recordSha256: _storedDigest, ...record } = row;
  return sha256(JSON.stringify(record));
}

function validateEnvelope(envelope) {
  if (!envelope || envelope.format !== ENCRYPTED_FORMAT || envelope.version !== 1 ||
      envelope.kdf?.name !== 'PBKDF2' || envelope.kdf?.hash !== 'SHA-256' || envelope.kdf?.iterations !== PBKDF2_ITERATIONS ||
      envelope.cipher?.name !== 'AES-GCM' || typeof envelope.kdf?.salt !== 'string' ||
      typeof envelope.cipher?.iv !== 'string' || typeof envelope.ciphertext !== 'string') {
    throw fail('UNSUPPORTED_ENCRYPTED_BACKUP');
  }
  const serialized = JSON.stringify(envelope);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_ENVELOPE_BYTES) throw fail('BACKUP_TOO_LARGE');
  return serialized;
}

class MockDriveBackupAdapter {
  constructor(root) {
    const resolvedRoot = path.resolve(root);
    if (path.dirname(resolvedRoot) !== path.resolve(os.tmpdir()) || !path.basename(resolvedRoot).startsWith('v1051-mock-drive-')) {
      throw fail('MOCK_STORAGE_MUST_USE_TEST_TEMP_DIRECTORY');
    }
    try {
      const stat = fsSync.lstatSync(resolvedRoot);
      const realRoot = fsSync.realpathSync.native(resolvedRoot);
      if (!stat.isDirectory() || stat.isSymbolicLink() || path.dirname(realRoot) !== fsSync.realpathSync.native(os.tmpdir())) throw fail('MOCK_STORAGE_MUST_USE_REAL_TEMP_DIRECTORY');
      this.root = realRoot;
    } catch (error) { throw error.code ? error : fail('MOCK_STORAGE_MUST_USE_REAL_TEMP_DIRECTORY'); }
    this.objects = path.join(this.root, 'objects');
    this.faults = new Map();
  }

  failNext(operation, code = 'NETWORK_ERROR') {
    this.faults.set(operation, code);
  }

  _authorize(ownerScope, authenticated = true) {
    if (authenticated !== true) throw fail('AUTH_REQUIRED');
    if (typeof ownerScope !== 'string' || !/^[a-f0-9]{64}$/.test(ownerScope)) throw fail('OWNER_SCOPE_REQUIRED');
  }

  _takeFault(operation) {
    const code = this.faults.get(operation);
    this.faults.delete(operation);
    return code;
  }

  async _readRows() {
    await fs.mkdir(this.objects, { recursive: true });
    const rootStat = await fs.lstat(this.root);
    const objectsStat = await fs.lstat(this.objects);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || !objectsStat.isDirectory() || objectsStat.isSymbolicLink() ||
        await fs.realpath(this.root) !== this.root || await fs.realpath(this.objects) !== this.objects) {
      throw fail('MOCK_STORAGE_MUST_USE_REAL_TEMP_DIRECTORY');
    }
    const rows = [];
    let quarantinedCount = 0;
    for (const name of await fs.readdir(this.objects)) {
      if (!/^[a-f0-9-]{36}\.json$/.test(name)) continue;
      try {
        const row = JSON.parse(await fs.readFile(path.join(this.objects, name), 'utf8'));
        if (row?.schema !== 'mock-drive-object-v1' || row.fileId !== name.slice(0, -5)) throw fail('CORRUPT_METADATA');
        rows.push(row);
      } catch (error) {
        if (error instanceof SyntaxError || error.code === 'CORRUPT_METADATA') quarantinedCount += 1;
        else throw error;
      }
    }
    return { rows, quarantinedCount };
  }

  async upload(args) {
    const previous = uploadQueues.get(this.root) || Promise.resolve();
    let release;
    const current = new Promise(resolve => { release = resolve; });
    uploadQueues.set(this.root, current);
    await previous;
    try { return await this._upload(args); }
    finally {
      release();
      if (uploadQueues.get(this.root) === current) uploadQueues.delete(this.root);
    }
  }

  async _upload({ backupKey, idempotencyKey, ownerScope, envelope, authenticated = true }) {
    this._authorize(ownerScope, authenticated);
    if (typeof backupKey !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(backupKey)) throw fail('INVALID_BACKUP_KEY');
    if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) throw fail('IDEMPOTENCY_KEY_REQUIRED');
    const serialized = validateEnvelope(envelope);
    const contentSha256 = sha256(serialized);
    const idempotencyHash = sha256(`${ownerScope}:${backupKey}:${idempotencyKey}`);
    const { rows, quarantinedCount } = await this._readRows();
    if (quarantinedCount) throw fail('CORRUPT_METADATA');
    const sameRequest = rows.find(row => !row.malformed && row.ownerScope === ownerScope && row.backupKey === backupKey && row.idempotencyHash === idempotencyHash);
    if (sameRequest) {
      if (sameRequest.contentSha256 !== contentSha256) throw fail('IDEMPOTENCY_CONFLICT');
      return this._publicMetadata(sameRequest, true);
    }
    const duplicate = rows.find(row => !row.malformed && row.ownerScope === ownerScope && row.backupKey === backupKey && row.contentSha256 === contentSha256);
    if (duplicate) return this._publicMetadata(duplicate, true);

    const fault = this._takeFault('upload');
    if (fault === 'NETWORK_ERROR' || fault === 'AUTH_REQUIRED') throw fail(fault);
    const siblings = rows.filter(row => !row.malformed && row.ownerScope === ownerScope && row.backupKey === backupKey);
    const fileId = crypto.randomUUID();
    const version = siblings.reduce((max, row) => Math.max(max, Number(row.version) || 0), 0) + 1;
    const object = {
      schema: 'mock-drive-object-v1', fileId, backupKey, version, ownerScope,
      idempotencyHash, contentSha256, createdAt: new Date().toISOString(), envelope
    };
    object.recordSha256 = recordSha256(object);
    const tempPath = path.join(this.objects, `${fileId}.part`);
    const finalPath = path.join(this.objects, `${fileId}.json`);
    await fs.writeFile(tempPath, JSON.stringify(object), { flag: 'wx', mode: 0o600 });
    try {
      if (fault === 'UPLOAD_INTERRUPTED') throw fail(fault);
      await fs.link(tempPath, finalPath);
      return this._publicMetadata(object, false);
    } finally {
      await fs.rm(tempPath, { force: true });
    }
  }

  _publicMetadata(row, replayed = false, integrity = 'UNKNOWN') {
    return {
      fileId: row.fileId, backupKey: row.backupKey, version: row.version,
      ownerScope: row.ownerScope, createdAt: row.createdAt,
      contentSha256: row.contentSha256, integrity, replayed
    };
  }

  async listVersions({ backupKey, ownerScope, authenticated = true }) {
    this._authorize(ownerScope, authenticated);
    const fault = this._takeFault('listVersions');
    if (fault) throw fail(fault);
    const { rows, quarantinedCount } = await this._readRows();
    const scopedRows = rows
      .filter(row => !row.malformed && row.ownerScope === ownerScope && row.backupKey === backupKey)
      .sort((a, b) => b.version - a.version);
    const versions = await Promise.all(scopedRows.map(async row => {
      const serialized = JSON.stringify(row.envelope);
      const integrity = sha256(serialized) === row.contentSha256 && recordSha256(row) === row.recordSha256 ? 'VALID' : 'CORRUPT';
      return this._publicMetadata(row, false, integrity);
    }));
    return { versions, warnings: quarantinedCount ? ['UNSCOPED_CORRUPT_METADATA'] : [] };
  }

  async download(fileId, { ownerScope, authenticated = true }) {
    this._authorize(ownerScope, authenticated);
    const fault = this._takeFault('download');
    if (fault) throw fail(fault);
    if (typeof fileId !== 'string' || !/^[a-f0-9-]{36}$/.test(fileId)) throw fail('NOT_FOUND');
    await this._readRows();
    let row;
    try { row = JSON.parse(await fs.readFile(path.join(this.objects, `${fileId}.json`), 'utf8')); }
    catch (error) {
      if (error.code === 'ENOENT') throw fail('NOT_FOUND');
      if (error instanceof SyntaxError) throw fail('FILE_CORRUPT');
      throw error;
    }
    if (row.fileId !== fileId || row.ownerScope !== ownerScope) throw fail('NOT_FOUND');
    if (sha256(JSON.stringify(row.envelope)) !== row.contentSha256 || recordSha256(row) !== row.recordSha256) throw fail('FILE_CORRUPT');
    return { ...this._publicMetadata(row, false, 'VALID'), envelope: row.envelope };
  }

  async planRetention({ backupKey, ownerScope, keepLatest }) {
    this._authorize(ownerScope);
    if (!Number.isInteger(keepLatest) || keepLatest < 1) throw fail('INVALID_RETENTION_POLICY');
    const { versions, warnings } = await this.listVersions({ backupKey, ownerScope });
    const protectedFileIds = versions.filter(row => row.integrity !== 'VALID').map(row => row.fileId);
    const validVersions = versions.filter(row => row.integrity === 'VALID');
    const keepFileIds = [...protectedFileIds, ...validVersions.slice(0, keepLatest).map(row => row.fileId)];
    return {
      backupKey, ownerScope, keepLatest, keepFileIds,
      deleteFileIds: warnings.length ? [] : validVersions.slice(keepLatest).map(row => row.fileId),
      warnings
    };
  }

  async applyRetention(plan, { ownerScope, confirm = false } = {}) {
    this._authorize(ownerScope);
    if (confirm !== true) throw fail('CONFIRMATION_REQUIRED');
    if (!plan || plan.ownerScope !== ownerScope) throw fail('OWNER_MISMATCH');
    const current = await this.planRetention(plan);
    if (JSON.stringify(current.deleteFileIds) !== JSON.stringify(plan.deleteFileIds) ||
        JSON.stringify(current.keepFileIds) !== JSON.stringify(plan.keepFileIds)) throw fail('RETENTION_PLAN_STALE');
    for (const fileId of plan.deleteFileIds) {
      const row = await this.download(fileId, { ownerScope });
      if (row.backupKey !== plan.backupKey) throw fail('OWNER_MISMATCH');
      await fs.rm(path.join(this.objects, `${fileId}.json`));
    }
    return plan.deleteFileIds.slice();
  }

  async objectPathForTest(fileId) {
    if (typeof fileId !== 'string' || !/^[a-f0-9-]{36}$/.test(fileId)) throw fail('NOT_FOUND');
    return path.join(this.objects, `${fileId}.json`);
  }
}

module.exports = { MockDriveBackupAdapter };
