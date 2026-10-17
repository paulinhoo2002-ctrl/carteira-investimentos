'use strict';

const { sha256Json } = require('../ir2026/hash');

const STATES = new Set(['CERTIFIED', 'PARTIAL', 'UNKNOWN', 'ARITHMETIC_ONLY', 'PROVEN_FOR_STATEMENT']);
const IMPACT_FLAGS = [
  'affects_current_position', 'affects_current_result', 'affects_income',
  'affects_global_total', 'affects_fiscal', 'affects_tax',
];
const INCOME_KINDS = [
  'received_certified', 'received_partial', 'candidate_total', 'legacy_reported',
  'transferred_jcp', 'rf_interest', 'loan_reimbursement', 'redemption', 'unknown',
];

function requireDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_AS_OF');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('INVALID_AS_OF');
  return value;
}

function requireHash(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) throw new Error('INVALID_SOURCE_HASH');
  return value.toLowerCase();
}

function financialField(field) {
  if (!field || typeof field !== 'object' || !STATES.has(field.status)) throw new Error('INVALID_FIELD_STATUS');
  const amount = field.amount_cents;
  if (amount !== null && !Number.isSafeInteger(amount)) throw new Error('INVALID_AMOUNT_CENTS');
  if (field.status === 'UNKNOWN' && amount !== null) throw new Error('UNKNOWN_HAS_AMOUNT');
  if (field.status === 'ARITHMETIC_ONLY' && amount !== null) throw new Error('ARITHMETIC_IS_NOT_AUTHORITY');
  if (['CERTIFIED', 'PROVEN_FOR_STATEMENT'].includes(field.status) && amount === null) throw new Error('PROVEN_WITHOUT_AMOUNT');
  if (amount !== null && (!field.source_id || !field.source_hash || !field.authority_scope)) throw new Error('MISSING_FIELD_AUTHORITY');
  return {
    amount_cents: amount,
    status: field.status,
    as_of: requireDate(field.as_of),
    source_id: field.source_id || null,
    source_hash: field.source_hash ? requireHash(field.source_hash) : null,
    authority_scope: field.authority_scope || null,
  };
}

function snapshot(input) {
  if (!input || typeof input !== 'object') throw new Error('INVALID_SNAPSHOT');
  if (input.schema_version !== undefined && input.schema_version !== 3) throw new Error('UNSUPPORTED_PACKAGE2_VERSION');
  const asOf = requireDate(input.as_of);
  const bundleHash = requireHash(input.source_bundle_hash);
  if (!input.custodian_id || input.custodian_id === 'GLOBAL') throw new Error('INVALID_CUSTODIAN');
  if (!['COMPLETE', 'PARTIAL', 'UNKNOWN'].includes(input.coverage)) throw new Error('INVALID_COVERAGE');
  if (!['CERTIFIED', 'PARTIAL', 'UNKNOWN'].includes(input.income_status)) throw new Error('INVALID_INCOME_STATUS');
  const position = {
    rv_market: financialField(input.position?.rv_market),
    rf_liquid: financialField(input.position?.rf_liquid),
    total_net: financialField(input.position?.total_net),
  };
  const result = financialField(input.current_result);
  if (Object.values(position).some(field => !['CERTIFIED', 'PARTIAL', 'UNKNOWN'].includes(field.status))) {
    throw new Error('INVALID_POSITION_STATUS');
  }
  if (input.coverage === 'COMPLETE' && Object.values(position).some(field => field.status !== 'CERTIFIED')) {
    throw new Error('INCOMPLETE_CERTIFIED_POSITION');
  }
  if (result.authority_scope !== 'CURRENT_POSITION_RESULT' || input.result_method !== 'MARKET_MINUS_REPORTED_CURRENT_COST') {
    throw new Error('INVALID_RESULT_SEMANTICS');
  }
  if (!['PROVEN_FOR_STATEMENT', 'UNKNOWN'].includes(result.status)) throw new Error('INVALID_RESULT_STATUS');
  if (input.fiscal === true || input.global_total) throw new Error('FISCAL_OR_GLOBAL_LEAK');
  for (const field of [...Object.values(position), result]) {
    if (field.as_of !== asOf) throw new Error('FIELD_AS_OF_MISMATCH');
  }
  return {
    schema_version: 3,
    snapshot_id: `${asOf}:${bundleHash}`,
    as_of: asOf,
    source_bundle_hash: bundleHash,
    custodian_id: input.custodian_id,
    coverage: input.coverage,
    income_status: input.income_status,
    position,
    current_result: result,
    result_method: input.result_method,
  };
}

function mergeSnapshots(existing, next) {
  const snapshots = { ...(existing || {}) };
  const candidate = snapshot(next);
  const prior = snapshots[candidate.snapshot_id];
  if (prior && sha256Json(prior) !== sha256Json(candidate)) throw new Error('IMMUTABLE_SNAPSHOT_CONFLICT');
  snapshots[candidate.snapshot_id] = candidate;
  return snapshots;
}

function income(input) {
  if (!input || typeof input !== 'object') throw new Error('INVALID_INCOME');
  const fields = {};
  for (const kind of INCOME_KINDS) {
    const value = financialField(input[kind]);
    if (!['CERTIFIED', 'PARTIAL', 'UNKNOWN'].includes(value.status)) throw new Error('INVALID_INCOME_FIELD_STATUS');
    const count = input[kind].event_count;
    if (count !== null && (!Number.isSafeInteger(count) || count < 0)) throw new Error('INVALID_EVENT_COUNT');
    fields[kind] = { ...value, event_count: count };
  }
  if (!['CERTIFIED', 'UNKNOWN'].includes(fields.received_certified.status)) {
    throw new Error('UNCERTIFIED_RECEIVED');
  }
  if (['received_partial', 'candidate_total', 'legacy_reported'].some(kind =>
      !['PARTIAL', 'UNKNOWN'].includes(fields[kind].status))) {
    throw new Error('PARTIAL_INCOME_STATUS');
  }
  return { ...fields, legacy_unknown_included: input.legacy_unknown_included === true };
}

function buildPackage2V3({ schema_version = 3, snapshots, latest_snapshot_id, income: incomeInput, blockers = [] }) {
  if (schema_version !== 3) throw new Error('UNSUPPORTED_PACKAGE2_VERSION');
  if (!snapshots || typeof snapshots !== 'object' || !snapshots[latest_snapshot_id]) throw new Error('MISSING_LATEST_SNAPSHOT');
  const normalized = {};
  for (const [id, value] of Object.entries(snapshots)) {
    const item = snapshot(value);
    if (item.snapshot_id !== id) throw new Error('INVALID_SNAPSHOT_ID');
    normalized[id] = item;
  }
  if (!Array.isArray(blockers) || blockers.some(item => !item?.reason_code || !item?.impact_flags ||
      IMPACT_FLAGS.some(flag => typeof item.impact_flags[flag] !== 'boolean') ||
      Object.keys(item.impact_flags).some(flag => !IMPACT_FLAGS.includes(flag)))) {
    throw new Error('INVALID_BLOCKERS');
  }
  return {
    schema_version: 3,
    latest_snapshot_id,
    snapshots: normalized,
    income: income(incomeInput),
    blockers: blockers.map(({ reason_code, impact_flags }) => ({ reason_code, impact_flags: { ...impact_flags } })),
  };
}

function latestReadModel(payload) {
  if (payload?.schema_version !== 3) throw new Error('UNSUPPORTED_PACKAGE2_VERSION');
  const canonical = buildPackage2V3(payload);
  const current = canonical.snapshots[canonical.latest_snapshot_id];
  if (!current) throw new Error('MISSING_LATEST_SNAPSHOT');
  return {
    current_position: current.position,
    current_position_result: current.current_result,
    as_of: current.as_of,
    custodian_id: current.custodian_id,
    coverage: current.coverage,
    income: canonical.income,
    global_total: { amount_cents: null, status: 'ARITHMETIC_ONLY' },
    ir2026: { status: 'BLOCKED', reason_code: 'FISCAL_EVIDENCE_NOT_CERTIFIED' },
    readiness: {
      CURRENT_POSITION: current.coverage === 'UNKNOWN' ? 'BLOCKED' : current.coverage === 'COMPLETE' ? 'READY' : 'PARTIAL',
      CURRENT_RESULT: current.current_result.status === 'PROVEN_FOR_STATEMENT' ? 'READY' : 'BLOCKED',
      INCOME_2026: current.income_status === 'CERTIFIED' && canonical.income.received_certified.amount_cents !== null ? 'READY'
        : canonical.income.received_partial.amount_cents !== null || canonical.income.candidate_total.amount_cents !== null ? 'PARTIAL' : 'BLOCKED',
      HISTORICAL_INCOME: canonical.income.legacy_reported.amount_cents !== null ? 'PARTIAL' : 'BLOCKED',
      GLOBAL_TOTAL: 'BLOCKED',
      IR2026: 'BLOCKED',
    },
  };
}

module.exports = { financialField, snapshot, mergeSnapshots, income, buildPackage2V3, latestReadModel };
