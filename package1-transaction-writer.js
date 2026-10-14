'use strict';

// Transaction contract only. No Firebase client, credentials, or hosted call is created here.
const crypto = require('node:crypto');
const Mapping = require('./package1-portfolio-schema-mapping');

const ALLOWED_PROJECT_ID = 'carteira-de-investimento-16725';
const HASH_PATTERN = /^[a-f0-9]{64}$/i;

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('PACKAGE1_CANONICAL_VALUE_INVALID');
    return value;
  }
  if (value === undefined) return undefined;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error('PACKAGE1_CANONICAL_VALUE_INVALID');
    return value.toISOString();
  }
  if (Array.isArray(value)) return value.map(item => canonicalize(item) ?? null);
  if (typeof value?.toDate === 'function') return canonicalize(value.toDate());
  if (typeof value !== 'object') throw new Error('PACKAGE1_CANONICAL_VALUE_INVALID');
  return Object.fromEntries(Object.keys(value).sort().flatMap(key => {
    const normalized = canonicalize(value[key]);
    return normalized === undefined ? [] : [[key, normalized]];
  }));
}

function hashCanonical(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value)), 'utf8').digest('hex');
}

function assertIdentity(options) {
  if (!options || options.projectId !== ALLOWED_PROJECT_ID || options.expectedProjectId !== ALLOWED_PROJECT_ID) {
    throw new Error('PACKAGE1_PROJECT_IDENTITY_MISMATCH');
  }
  if (typeof options.uid !== 'string' || !options.uid.trim() || options.uid.includes('/') || options.uid !== options.expectedUid) {
    throw new Error('PACKAGE1_UID_IDENTITY_MISMATCH');
  }
  const exactPath = `portfolios/${options.uid}`;
  if (options.expectedPath !== exactPath || options.documentRef?.path !== exactPath) {
    throw new Error('PACKAGE1_DOCUMENT_PATH_MISMATCH');
  }
  if (typeof options.runTransaction !== 'function') throw new Error('PACKAGE1_TRANSACTION_RUNNER_REQUIRED');
}

function snapshotData(snapshot) {
  if (!snapshot || snapshot.exists !== true || typeof snapshot.data !== 'function') {
    throw new Error('PACKAGE1_PORTFOLIO_DOCUMENT_MISSING');
  }
  const value = snapshot.data();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('PACKAGE1_PORTFOLIO_DOCUMENT_INVALID');
  return value;
}

function timestampKey(value) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error('PACKAGE1_UPDATE_TIME_UNAVAILABLE');
    const milliseconds = value.getTime();
    return `${Math.floor(milliseconds / 1000)}:${String((milliseconds % 1000 + 1000) % 1000 * 1_000_000).padStart(9, '0')}`;
  }
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?(Z|[+-]\d\d:\d\d)$/.exec(value);
    if (!match) throw new Error('PACKAGE1_UPDATE_TIME_UNAVAILABLE');
    const seconds = Math.floor(Date.parse(`${match[1]}${match[3]}`) / 1000);
    if (!Number.isFinite(seconds)) throw new Error('PACKAGE1_UPDATE_TIME_UNAVAILABLE');
    return `${seconds}:${(match[2] || '').padEnd(9, '0') || '000000000'}`;
  }
  if (value && Number.isSafeInteger(value.seconds) && Number.isInteger(value.nanoseconds) &&
      value.nanoseconds >= 0 && value.nanoseconds < 1_000_000_000) {
    return `${value.seconds}:${String(value.nanoseconds).padStart(9, '0')}`;
  }
  throw new Error('PACKAGE1_UPDATE_TIME_UNAVAILABLE');
}

function snapshotUpdateTime(snapshot) {
  try {
    return timestampKey(snapshot.updateTime);
  } catch (error) {
    if (error?.message === 'PACKAGE1_UPDATE_TIME_UNAVAILABLE') throw error;
    throw new Error('PACKAGE1_UPDATE_TIME_UNAVAILABLE');
  }
}

function validatePayload(options) {
  const { update, importBatchId, payloadHash } = options;
  if (!update || typeof update !== 'object' || Array.isArray(update) ||
      Object.keys(update).length !== 1 || !Object.hasOwn(update, Mapping.FIELD)) {
    throw new Error('PACKAGE1_FIELD_UPDATE_INVALID');
  }
  const package1 = update[Mapping.FIELD];
  const parsed = Mapping.readCurrentPackage1({ [Mapping.FIELD]: package1 });
  if (parsed.status !== 'PRESENT' || package1.import_batch_id !== importBatchId ||
      importBatchId !== Mapping.CURRENT_IMPORT.import_batch_id) {
    throw new Error('PACKAGE1_IMPORT_BATCH_MISMATCH');
  }
  if (!HASH_PATTERN.test(String(payloadHash || '')) || hashCanonical(package1) !== payloadHash.toLowerCase()) {
    throw new Error('PACKAGE1_PAYLOAD_HASH_MISMATCH');
  }
}

async function writePackage1FieldTransaction(options) {
  assertIdentity(options);
  validatePayload(options);
  if (!HASH_PATTERN.test(String(options.expectedDocumentHash || '')) || typeof options.expectedUpdateTime !== 'string') {
    throw new Error('PACKAGE1_EXPECTED_STATE_INVALID');
  }
  let expectedTime;
  try { expectedTime = timestampKey(options.expectedUpdateTime); }
  catch { throw new Error('PACKAGE1_EXPECTED_STATE_INVALID'); }
  return options.runTransaction(async transaction => {
    const snapshot = await transaction.get(options.documentRef);
    const current = snapshotData(snapshot);
    if (Object.hasOwn(current, Mapping.FIELD)) throw new Error('PACKAGE1_FIELD_ALREADY_PRESENT');
    if (snapshotUpdateTime(snapshot) !== expectedTime) throw new Error('PACKAGE1_UPDATE_TIME_DRIFT');
    if (hashCanonical(current) !== options.expectedDocumentHash.toLowerCase()) throw new Error('PACKAGE1_DOCUMENT_DRIFT');
    transaction.update(options.documentRef, { [Mapping.FIELD]: structuredClone(options.update[Mapping.FIELD]) });
    return { status: 'SIMULATED_WRITE_ALLOWED', field: Mapping.FIELD, importBatchId: options.importBatchId,
      payloadHash: options.payloadHash.toLowerCase() };
  });
}

async function rollbackPackage1FieldTransaction(options) {
  assertIdentity(options);
  if (!HASH_PATTERN.test(String(options.expectedCurrentPackageHash || '')) ||
      !options.beforeField || options.beforeField.status !== 'ABSENT' || Object.hasOwn(options.beforeField, 'value')) {
    throw new Error('PACKAGE1_ROLLBACK_PRECONDITION_INVALID');
  }
  if (options.fieldDeleteValue === undefined) throw new Error('PACKAGE1_FIELD_DELETE_SENTINEL_REQUIRED');
  return options.runTransaction(async transaction => {
    const snapshot = await transaction.get(options.documentRef);
    const current = snapshotData(snapshot);
    const currentField = current[Mapping.FIELD];
    if (!currentField || currentField.import_batch_id !== options.importBatchId) {
      throw new Error('PACKAGE1_ROLLBACK_BATCH_MISMATCH');
    }
    if (hashCanonical(currentField) !== options.expectedCurrentPackageHash.toLowerCase()) {
      throw new Error('PACKAGE1_ROLLBACK_FIELD_DRIFT');
    }
    transaction.update(options.documentRef, { [Mapping.FIELD]: options.fieldDeleteValue });
    return { status: 'SIMULATED_ROLLBACK_ALLOWED', field: Mapping.FIELD, importBatchId: options.importBatchId,
      restored: 'ABSENT' };
  });
}

module.exports = {
  ALLOWED_PROJECT_ID,
  canonicalize,
  hashCanonical,
  timestampKey,
  writePackage1FieldTransaction,
  rollbackPackage1FieldTransaction
};
