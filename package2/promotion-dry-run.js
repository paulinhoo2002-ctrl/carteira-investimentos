'use strict';

const { sha256Json } = require('../ir2026/hash');
const { buildPackage2V3, latestReadModel } = require('./v3');

const PROJECT_ID = 'carteira-de-investimento-16725';
const DATABASE_ID = '(default)';
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const baseIdentity = fields => {
  const { package2_v3: _candidate, ...base } = fields;
  return sha256Json(base);
};

function fieldIdentity(fields, key) {
  const present = has(fields, key);
  return sha256Json({ present, value: present ? fields[key] : null });
}

function assertIdentity(document, expected) {
  if (document?.project_id !== PROJECT_ID || expected?.project_id !== PROJECT_ID) throw new Error('WRONG_PROJECT');
  if (document.database_id !== DATABASE_ID || expected.database_id !== DATABASE_ID) throw new Error('WRONG_DATABASE');
  if (!expected.uid || document.uid !== expected.uid) throw new Error('WRONG_UID');
  const path = `portfolios/${expected.uid}`;
  if (document.document_path !== path || expected.document_path !== path) throw new Error('WRONG_DOCUMENT_PATH');
}

function planPromotion({ before, expected, candidate }) {
  assertIdentity(before, expected);
  if (!before?.update_time || before.update_time !== expected.update_time) throw new Error('STALE_DOCUMENT');
  if (!before.fields || typeof before.fields !== 'object') throw new Error('INVALID_DOCUMENT');
  if (!has(before.fields, 'package1_v2')) throw new Error('PACKAGE1_MISSING');
  if (fieldIdentity(before.fields, 'package1_v2') !== expected.package1_identity) throw new Error('PACKAGE1_DRIFT');
  if (fieldIdentity(before.fields, 'package2_v2') !== expected.package2_identity) throw new Error('PACKAGE2_DRIFT');
  if (baseIdentity(before.fields) !== expected.base_identity) throw new Error('BASE_DOCUMENT_DRIFT');
  latestReadModel(candidate);
  if (sha256Json(buildPackage2V3(candidate)) !== sha256Json(candidate)) throw new Error('MALFORMED_CANDIDATE');
  const candidateHash = sha256Json(candidate);
  if (candidateHash !== expected.candidate_hash) throw new Error('CANDIDATE_DRIFT');
  const priorPresent = has(before.fields, 'package2_v3');
  if (priorPresent && sha256Json(before.fields.package2_v3) !== candidateHash) throw new Error('PACKAGE2_V3_CONFLICT');
  const operation = priorPresent ? 'NOOP_IF_EXACT_MATCH' : 'INSERT_IF_ABSENT';
  const after = priorPresent ? { ...before.fields } : { ...before.fields, package2_v3: candidate };
  const fieldDiff = priorPresent ? [] : [{ field: 'package2_v3', before: 'ABSENT', after_hash: candidateHash }];
  return {
    operation,
    before: { ...before.fields },
    after,
    field_diff: fieldDiff,
    status_diff: priorPresent ? [] : [{ field: 'package2_v3', before: 'ABSENT', after: 'PRESENT' }],
    rollback: {
      project_id: PROJECT_ID,
      database_id: DATABASE_ID,
      uid: expected.uid,
      document_path: expected.document_path,
      update_time_before: before.update_time,
      field: 'package2_v3',
      before_present: priorPresent,
      before_value: priorPresent ? before.fields.package2_v3 : null,
      written_identity: fieldIdentity(after, 'package2_v3'),
      candidate_hash: candidateHash,
    },
  };
}

function simulateRollback(current, rollback) {
  assertIdentity(current, rollback);
  if (rollback.field !== 'package2_v3') throw new Error('INVALID_ROLLBACK_FIELD');
  if (!current?.fields || fieldIdentity(current.fields, rollback.field) !== rollback.written_identity) {
    throw new Error('ROLLBACK_TARGET_DRIFT');
  }
  const fields = { ...current.fields };
  if (rollback.before_present) fields.package2_v3 = rollback.before_value;
  else delete fields.package2_v3;
  return fields;
}

module.exports = { baseIdentity, fieldIdentity, planPromotion, simulateRollback };
