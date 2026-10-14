'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const FinanceCore = require('../finance-core');
const Gate = require('../package1-write-safety');

const BATCH = 'INTER_CURRENT_POSITION_2026-10-10_V1';
const CREATED = '2026-10-14T12:00:00.000Z';
function positions() {
  return Array.from({ length: 35 }, (_, index) => ({
    ticker: 'SYN' + String(index + 1).padStart(2, '0'),
    asset: 'Synthetic ' + (index + 1),
    asset_type: index < 31 ? 'RV_ACAO' : 'RF',
    custodian: 'INTER',
    quantity: 10,
    current_value: 1000,
    cost_basis: index < 25 ? 5 : null,
    cost_basis_total: index < 25 ? (index < 19 ? 45 : 50) : null,
    pnl_status: index < 25 ? 'CALCULATED' : 'UNKNOWN',
    as_of: '2026-10-10',
    source: 'SYN_POSITION',
    detail_positions: [{ position_id: 'SYN_ROW_' + (index + 1) }]
  }));
}
function official() {
  return { custodian: 'INTER', as_of: '2026-10-10', rv_official: 32000, rf_official: 5000, total_official: 37000, source_id: 'SYN_OFFICIAL' };
}
function build() {
  return Gate.buildPackage1({ positions: positions(), official: official(), importBatchId: BATCH, createdAt: CREATED });
}
function absent(packageData) {
  return new Map(packageData.records.map(record => [Gate.targetKey(record), { state: 'ABSENT' }]));
}

test('35 positions plus one official snapshot preserve partial detail and unknown cost', () => {
  const result = build();
  assert.equal(result.records.length, 36);
  assert.equal(new Set(result.records.map(Gate.targetKey)).size, 36);
  assert.deepEqual(result.totals, { rv_detail_sum: 31000, rf_detail_sum: 4000, detail_total: 35000, rv_gap: 1000, rf_gap: 1000, total_gap: 2000 });
  assert.equal(result.snapshot.total_official, 37000);
  assert.equal(result.snapshot.reconciliation_status, 'PARTIAL');
  assert.equal(result.cost_evidence.length, 25);
  assert.equal(result.cost_evidence.filter(row => row.lot_quantity_matches).length, 6);
  for (const row of result.cost_evidence) {
    assert.equal(row.method, 'FIFO');
    assert.equal(row.is_true_average_cost, 'NO');
    assert.equal(row.field_target, 'QUARANTINED_DRY_RUN_ONLY');
  }
  for (const record of result.records.filter(row => row.collection === 'positions')) {
    assert.equal(record.data.average_cost, null);
    assert.equal(record.data.average_cost_status, 'UNKNOWN');
    assert.equal(record.data.cost_basis_value, null);
    assert.equal(record.data.cost_basis_status, 'UNKNOWN');
  }
});
test('unread target blocks; first dry run inserts 36; identical second run changes nothing', () => {
  const payload = build();
  assert.throws(() => Gate.previewWrites(payload, new Map()), /TARGET_NOT_READ/);
  const before = absent(payload);
  const first = Gate.previewWrites(payload, before);
  assert.deepEqual(first.counts, { insert: 36, update: 0, delete: 0, unchanged: 0 });
  const after = Gate.applyInsertPlan(payload, before);
  const second = Gate.previewWrites(payload, after);
  assert.deepEqual(second.counts, { insert: 0, update: 0, delete: 0, unchanged: 36 });
  const altered = structuredClone(payload);
  altered.records[0].data.source_ids.push('SYN_DIFFERENT');
  assert.throws(() => Gate.previewWrites(altered, after), /EXISTING_DOCUMENT_CONFLICT/);
});
test('backup hashes exact read set, detects tampering, and rollback targets only batch IDs', () => {
  const payload = build();
  const before = absent(payload);
  before.set('positions/unrelated', { state: 'PRESENT', data: { private: 'untouched' } });
  const backup = Gate.backupTargets(payload, before);
  assert.equal(backup.targets.length, 36);
  assert.equal(Gate.verifyBackup(payload, backup), true);
  const tampered = structuredClone(backup);
  tampered.targets[0].state = 'PRESENT';
  assert.equal(Gate.verifyBackup(payload, tampered), false);
  const after = Gate.applyInsertPlan(payload, before);
  const operations = Gate.rollbackExact(payload, backup, after);
  assert.equal(operations.length, 36);
  assert.ok(operations.every(operation => operation.action === 'DELETE_EXACT'));
  assert.deepEqual(after.get('positions/unrelated'), before.get('positions/unrelated'));
  after.get(Gate.targetKey(payload.records[0])).data.import_batch_id = 'OTHER_BATCH';
  assert.throws(() => Gate.rollbackExact(payload, backup, after), /BATCH_MISMATCH/);
});
test('payload tampering fails before any simulated insert', () => {
  const payload = build();
  const before = absent(payload);
  const altered = structuredClone(payload);
  altered.records[0].data.current_value += 1;
  assert.throws(() => Gate.previewWrites(altered, before), /SNAPSHOT_RECONCILIATION_MISMATCH/);
  const fakeCost = structuredClone(payload);
  fakeCost.records[0].data.average_cost = 5;
  assert.throws(() => Gate.previewWrites(fakeCost, before), /COST_SEMANTICS_NOT_CERTIFIED/);
  const wrongBatch = structuredClone(payload);
  wrongBatch.records[0].data.import_batch_id = 'OTHER';
  assert.throws(() => Gate.previewWrites(wrongBatch, before), /RECORD_INVALID/);
  const forgedId = structuredClone(payload);
  forgedId.records[0].document_id = forgedId.records[0].data.document_id = 'pos_forged';
  assert.throws(() => Gate.previewWrites(forgedId, before), /RECORD_INVALID/);
  const forgedSnapshot = structuredClone(payload);
  const last = forgedSnapshot.records.at(-1);
  last.document_id = last.data.document_id = last.data.snapshot_id = 'snapshot_forged';
  assert.throws(() => Gate.previewWrites(forgedSnapshot, before), /SNAPSHOT_INVALID/);
});
test('rollback restores an exact prior document without touching unrelated IDs', () => {
  const payload = build();
  const before = absent(payload);
  const key = Gate.targetKey(payload.records[0]);
  before.set(key, { state: 'PRESENT', data: { document_id: payload.records[0].document_id, import_batch_id: 'OLDER', value: 123 } });
  const backup = Gate.backupTargets(payload, before);
  const after = new Map(before);
  after.set(key, { state: 'PRESENT', data: structuredClone(payload.records[0].data) });
  for (const record of payload.records.slice(1)) after.set(Gate.targetKey(record), { state: 'PRESENT', data: structuredClone(record.data) });
  const actions = Gate.rollbackExact(payload, backup, after);
  assert.equal(actions.find(action => action.key === key).action, 'RESTORE_EXACT');
  assert.deepEqual(actions.find(action => action.key === key).data, before.get(key).data);
  assert.ok(actions.every(action => ['DELETE_EXACT', 'RESTORE_EXACT'].includes(action.action)));
  after.get(key).data.current_value += 1;
  assert.throws(() => Gate.rollbackExact(payload, backup, after), /CONCURRENT_TARGET_MUTATION/);
});
test('wrong date, duplicate position and missing source fail closed', () => {
  const wrongDate = positions();
  wrongDate[0].as_of = '2026-10-09';
  assert.throws(() => Gate.buildPackage1({ positions: wrongDate, official: official(), importBatchId: BATCH, createdAt: CREATED }), /AS_OF_MISMATCH/);
  const duplicate = positions();
  duplicate[1].ticker = duplicate[0].ticker;
  assert.throws(() => Gate.buildPackage1({ positions: duplicate, official: official(), importBatchId: BATCH, createdAt: CREATED }), /DUPLICATE_DOCUMENT_ID/);
  const noSource = positions();
  noSource[0].source = '';
  assert.throws(() => Gate.buildPackage1({ positions: noSource, official: official(), importBatchId: BATCH, createdAt: CREATED }), /SOURCE_MISSING/);
});
test('opt-in V2 metrics cannot use FIFO as average or claim P&L; legacy remains readable', () => {
  const row = build().records.find(record => record.collection === 'positions').data;
  const metrics = Gate.positionV2Preview(row);
  assert.equal(metrics.currentValue, row.current_value);
  assert.equal(metrics.appliedValue, null);
  assert.equal(metrics.pnl, null);
  const old = { type: 'Ação', qty: 10, avg_price: 4, current_price: 5 };
  assert.equal(FinanceCore.assetAppliedValue(old), 40);
  assert.equal(FinanceCore.assetCurrentValue(old), 50);
  const context = {
    document_id: 'syn_legacy', custodian_id: 'INTER', asset_id: 'SYN', asset_type: 'RV_ACAO',
    current_value: 50, as_of: '2026-10-10', source_ids: ['SYN_LEGACY'], import_batch_id: BATCH,
    created_at: CREATED, updated_at: CREATED
  };
  const migrated = Gate.migrateLegacyPositionV2(old, context);
  assert.equal(migrated.average_cost, null);
  assert.equal(migrated.average_cost_status, 'UNKNOWN');
  assert.equal(migrated.cost_basis_value, null);
  assert.equal(Gate.positionV2Preview(migrated).pnl, null);
  for (const missing of [null, undefined, '']) {
    assert.throws(() => Gate.migrateLegacyPositionV2({ ...old, qty: missing }, context), /MIGRATION_CONTEXT_REQUIRED/);
  }
});
