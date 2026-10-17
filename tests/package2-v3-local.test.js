'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256Json } = require('../ir2026/hash');
const { financialField, snapshot, mergeSnapshots, buildPackage2V3, latestReadModel } = require('../package2/v3');
const { baseIdentity, fieldIdentity, planPromotion, simulateRollback } = require('../package2/promotion-dry-run');

const project = 'carteira-de-investimento-16725';
const uid = 'SYNTH_OWNER_001';
const hash = 'a'.repeat(64);
const time = '2026-10-17T12:00:00.000Z';

function field(amount_cents, status = 'PARTIAL', as_of = '2026-10-17', authority_scope = 'CURRENT_POSITION') {
  return {
    amount_cents, status, as_of, authority_scope,
    source_id: amount_cents === null ? null : 'SYNTH_STATEMENT',
    source_hash: amount_cents === null ? null : hash,
  };
}

function makeSnapshot(as_of = '2026-10-17') {
  return snapshot({
    as_of, source_bundle_hash: hash, custodian_id: 'SYNTH_CUSTODIAN', coverage: 'PARTIAL', income_status: 'PARTIAL',
    position: {
      rv_market: field(12000, 'PARTIAL', as_of),
      rf_liquid: field(8000, 'PARTIAL', as_of),
      total_net: field(20000, 'PARTIAL', as_of),
    },
    current_result: field(-500, 'PROVEN_FOR_STATEMENT', as_of, 'CURRENT_POSITION_RESULT'),
    result_method: 'MARKET_MINUS_REPORTED_CURRENT_COST', fiscal: false,
  });
}

function makeCandidate() {
  let snapshots = {};
  for (const date of ['2026-10-10', '2026-10-14', '2026-10-17']) snapshots = mergeSnapshots(snapshots, makeSnapshot(date));
  const latest_snapshot_id = makeSnapshot().snapshot_id;
  const kinds = [
    'received_certified', 'received_partial', 'candidate_total', 'legacy_reported', 'transferred_jcp',
    'rf_interest', 'loan_reimbursement', 'redemption', 'unknown',
  ];
  const income = Object.fromEntries(kinds.map(kind => [kind, { ...field(null, 'UNKNOWN'), event_count: null }]));
  income.candidate_total = { ...field(350, 'PARTIAL', '2026-10-17', 'SOURCE_CANDIDATE_ONLY'), event_count: 3 };
  income.legacy_unknown_included = true;
  return buildPackage2V3({
    snapshots, latest_snapshot_id, income,
    blockers: [{ reason_code: 'SYNTH_MISSING_SOURCE', impact_flags: {
      affects_current_position: false, affects_current_result: false, affects_income: true,
      affects_global_total: false, affects_fiscal: true, affects_tax: true,
    } }],
  });
}

function makeBefore() {
  return {
    project_id: project, database_id: '(default)', uid,
    document_path: `portfolios/${uid}`, update_time: time,
    fields: { legacy_setting: 'keep-me', package1_v2: { import_batch_id: 'SYNTH_BATCH' }, package2_v2: { schema_version: 2 } },
  };
}

function expectedFor(before, candidate) {
  return {
    project_id: project, database_id: '(default)', uid, document_path: `portfolios/${uid}`,
    update_time: time,
    base_identity: baseIdentity(before.fields),
    package1_identity: fieldIdentity(before.fields, 'package1_v2'),
    package2_identity: fieldIdentity(before.fields, 'package2_v2'),
    candidate_hash: sha256Json(candidate),
  };
}

test('V3 keeps confirmed zero, UNKNOWN, partial, and fiscal scope separate', () => {
  assert.equal(financialField(field(0, 'CERTIFIED')).amount_cents, 0);
  assert.equal(financialField(field(null, 'UNKNOWN')).amount_cents, null);
  assert.throws(() => financialField(field(0, 'UNKNOWN')), /UNKNOWN_HAS_AMOUNT/);
  const model = latestReadModel(makeCandidate());
  assert.equal(model.current_position_result.authority_scope, 'CURRENT_POSITION_RESULT');
  assert.equal(model.current_position_result.status, 'PROVEN_FOR_STATEMENT');
  assert.equal(model.readiness.CURRENT_RESULT, 'READY');
  assert.equal(model.income.received_certified.amount_cents, null);
  assert.equal(model.income.candidate_total.amount_cents, 350);
  assert.equal(model.income.candidate_total.event_count, 3);
  assert.equal(model.readiness.INCOME_2026, 'PARTIAL');
  assert.equal(model.global_total.amount_cents, null);
  assert.equal(model.ir2026.status, 'BLOCKED');
  const partialIncome = makeCandidate();
  partialIncome.income.received_certified = { ...field(0, 'CERTIFIED'), event_count: 0 };
  assert.equal(latestReadModel(partialIncome).readiness.INCOME_2026, 'PARTIAL');
});

test('V3 serialization keeps fiscal, global, and uncertified income out of the read model', () => {
  const candidate = makeCandidate();
  const id = candidate.latest_snapshot_id;
  const withExtras = structuredClone(candidate);
  withExtras.snapshots[id].fiscal_cost = field(900, 'CERTIFIED');
  withExtras.snapshots[id].position.rv_market.current_avg_cost = field(900, 'CERTIFIED');
  const canonical = buildPackage2V3(withExtras);
  assert.equal(Object.hasOwn(canonical.snapshots[id], 'fiscal_cost'), false);
  assert.equal(Object.hasOwn(canonical.snapshots[id].position.rv_market, 'current_avg_cost'), false);
  assert.equal(Object.hasOwn(latestReadModel(withExtras), 'fiscal_cost'), false);
  assert.throws(() => snapshot({ ...makeSnapshot(), as_of: '2026-02-30' }), /INVALID_AS_OF/);
  assert.throws(() => snapshot({ ...makeSnapshot(), current_result: field(-500, 'CERTIFIED', '2026-10-17', 'CURRENT_POSITION_RESULT') }), /INVALID_RESULT_STATUS/);
  assert.throws(() => snapshot({ ...makeSnapshot(), global_total: { amount_cents: 100 } }), /FISCAL_OR_GLOBAL_LEAK/);
  assert.throws(() => snapshot({ ...makeSnapshot(), coverage: 'COMPLETE' }), /INCOMPLETE_CERTIFIED_POSITION/);
  const base = makeSnapshot();
  const complete = snapshot({ ...base, coverage: 'COMPLETE', position: Object.fromEntries(
    Object.entries(base.position).map(([key, value]) => [key, { ...value, status: 'CERTIFIED' }])
  ) });
  const completePayload = buildPackage2V3({ ...candidate, snapshots: { [complete.snapshot_id]: complete } });
  assert.equal(latestReadModel(completePayload).readiness.CURRENT_POSITION, 'READY');
  const promotedIncome = structuredClone(candidate);
  promotedIncome.income.candidate_total.status = 'CERTIFIED';
  assert.throws(() => buildPackage2V3(promotedIncome), /PARTIAL_INCOME_STATUS/);
});

test('V3 preserves dated snapshots and rejects mutation of an existing identity', () => {
  const payload = makeCandidate();
  assert.equal(Object.keys(payload.snapshots).length, 3);
  const original = payload.snapshots[makeSnapshot('2026-10-10').snapshot_id];
  assert.equal(original.as_of, '2026-10-10');
  const changed = makeSnapshot('2026-10-10');
  changed.position.rv_market.amount_cents = 999;
  assert.throws(() => mergeSnapshots(payload.snapshots, changed), /IMMUTABLE_SNAPSHOT_CONFLICT/);
  assert.equal(original.position.rv_market.amount_cents, 12000);
  assert.throws(() => snapshot({ ...makeSnapshot(), fiscal: true }), /FISCAL_OR_GLOBAL_LEAK/);
  assert.throws(() => snapshot({ ...makeSnapshot(), schema_version: 4 }), /UNSUPPORTED_PACKAGE2_VERSION/);
  assert.throws(() => buildPackage2V3({ ...payload, schema_version: 4 }), /UNSUPPORTED_PACKAGE2_VERSION/);
  const reversed = Object.fromEntries(Object.entries(payload.snapshots).reverse());
  assert.equal(sha256Json(buildPackage2V3({ ...payload, snapshots: reversed })), sha256Json(payload));
});

test('dry run inserts only package2_v3, then exact repeat is a no-op', () => {
  const before = makeBefore();
  const candidate = makeCandidate();
  const expected = expectedFor(before, candidate);
  const plan = planPromotion({ before, expected, candidate });
  assert.equal(plan.operation, 'INSERT_IF_ABSENT');
  assert.deepEqual(plan.field_diff.map(item => item.field), ['package2_v3']);
  assert.deepEqual(Object.keys(plan.after).sort(), [...Object.keys(before.fields), 'package2_v3'].sort());
  assert.deepEqual(before.fields, makeBefore().fields);
  const second = planPromotion({ before: { ...before, fields: plan.after }, expected, candidate });
  assert.equal(second.operation, 'NOOP_IF_EXACT_MATCH');
  assert.deepEqual(second.field_diff, []);
});

test('future writer preconditions abort on identity, concurrent, and candidate drift', () => {
  const before = makeBefore();
  const candidate = makeCandidate();
  const expected = expectedFor(before, candidate);
  const rejects = [
    [{ ...before, project_id: 'other-project' }, expected, /WRONG_PROJECT/],
    [{ ...before, uid: 'OTHER_SYNTH_OWNER' }, expected, /WRONG_UID/],
    [{ ...before, document_path: 'portfolios/OTHER_SYNTH_OWNER' }, expected, /WRONG_DOCUMENT_PATH/],
    [{ ...before, update_time: '2026-10-17T12:00:01.000Z' }, expected, /STALE_DOCUMENT/],
    [{ ...before, fields: { ...before.fields, legacy_setting: 'changed' } }, expected, /BASE_DOCUMENT_DRIFT/],
    [{ ...before, fields: { ...before.fields, package1_v2: { changed: true } } }, expected, /PACKAGE1_DRIFT/],
    [{ ...before, fields: { ...before.fields, package2_v2: { changed: true } } }, expected, /PACKAGE2_DRIFT/],
    [{ ...before, fields: { legacy_setting: 'keep-me', package1_v2: before.fields.package1_v2 } }, expected, /PACKAGE2_DRIFT/],
    [before, { ...expected, candidate_hash: 'b'.repeat(64) }, /CANDIDATE_DRIFT/],
    [{ ...before, fields: { ...before.fields, package2_v3: { conflict: true } } }, expected, /PACKAGE2_V3_CONFLICT/],
    [{ ...before, fields: { legacy_setting: 'keep-me', package2_v2: { schema_version: 2 } } }, expected, /PACKAGE1_MISSING/],
  ];
  for (const [document, guard, error] of rejects) {
    assert.throws(() => planPromotion({ before: document, expected: guard, candidate }), error);
  }
  const malformed = structuredClone(candidate);
  malformed.snapshots[malformed.latest_snapshot_id].position.rv_market.status = 'UNKNOWN';
  assert.throws(() => planPromotion({ before, expected, candidate: malformed }), /UNKNOWN_HAS_AMOUNT/);
});

test('rollback changes only Package2 V3 and preserves later unrelated edits', () => {
  const before = makeBefore();
  const candidate = makeCandidate();
  const plan = planPromotion({ before, expected: expectedFor(before, candidate), candidate });
  const current = { ...before, update_time: '2026-10-18T12:00:00.000Z', fields: { ...plan.after, later_setting: 'preserve' } };
  const rolledBack = simulateRollback(current, plan.rollback);
  assert.equal(rolledBack.later_setting, 'preserve');
  assert.equal(rolledBack.legacy_setting, 'keep-me');
  assert.equal(Object.hasOwn(rolledBack, 'package2_v3'), false);
  assert.throws(() => simulateRollback({ ...current, fields: { ...current.fields, package2_v3: { changed: true } } }, plan.rollback), /ROLLBACK_TARGET_DRIFT/);
  assert.throws(() => simulateRollback(current, { ...plan.rollback, field: 'legacy_setting' }), /INVALID_ROLLBACK_FIELD/);
});
