'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const FinanceCore = require('../finance-core');
const PersistenceCore = require('../persistence-core');

const position = {
  document_id: 'SYN_POSITION', schema_version: 2, custodian_id: 'INTER', asset_id: 'SYN',
  asset_type: 'RV_ACAO', quantity: 10, current_value: 100, as_of: '2026-10-10',
  average_cost: null, average_cost_status: 'UNKNOWN', cost_basis_value: null,
  cost_basis_status: 'UNKNOWN', cost_method: null, provenance: { source_id: 'SYN_SOURCE' },
  source_ids: ['SYN_SOURCE'], reconciliation_status: 'PARTIAL',
  import_batch_id: 'SYN_BATCH', created_at: '2026-10-14T12:00:00.000Z', updated_at: '2026-10-14T12:00:00.000Z'
};
const fixedPosition = { ...position, document_id: 'SYN_RF', asset_id: 'SYN_RF',
  asset_type: 'RF', current_value: 15 };
const snapshot = {
  document_id: 'SYN_SNAPSHOT', snapshot_id: 'SYN_SNAPSHOT', schema_version: 1,
  custodian_id: 'INTER', as_of: '2026-10-10', rv_official: 110, rf_official: 20,
  total_official: 130, rv_detail_sum: 100, rf_detail_sum: 15, detail_total: 115,
  rv_gap: 10, rf_gap: 5, total_gap: 15, reconciliation_status: 'PARTIAL',
  provenance: { source_id: 'SYN_OFFICIAL' }, import_batch_id: 'SYN_BATCH'
};

test('Position V2 exposes observed value without manufacturing cost or P&L', () => {
  const safe = PersistenceCore.normalizePositionV2(position);
  const metrics = FinanceCore.positionV2Metrics(safe);
  assert.deepEqual(metrics, { currentValue: 100, averageCost: null, appliedValue: null,
    pnl: null, averageCostStatus: 'UNKNOWN', costBasisStatus: 'UNKNOWN',
    reconciliationStatus: 'PARTIAL' });
  assert.notStrictEqual(safe, position);
});

test('confirmed zero differs from a missing quantity or value', () => {
  for (const missing of [null, undefined, '']) {
    assert.throws(() => PersistenceCore.normalizePositionV2({ ...position, quantity: missing }), /POSITION_V2_INVALID/);
    assert.throws(() => PersistenceCore.normalizePositionV2({ ...position, current_value: missing }), /POSITION_V2_INVALID/);
  }
  assert.equal(FinanceCore.positionV2Metrics({ ...position, current_value: 0 }).currentValue, 0);
  assert.throws(() => FinanceCore.positionV2Metrics({ ...position, current_value: null }), /POSITION_V2_INVALID/);
});

test('derived FIFO basis remains separate and does not authorize P&L', () => {
  const derived = { ...position, cost_basis_value: 80, cost_basis_status: 'DERIVED', cost_method: 'FIFO' };
  const normalized = PersistenceCore.normalizePositionV2(derived);
  const metrics = FinanceCore.positionV2Metrics(normalized);
  assert.equal(normalized.average_cost, null);
  assert.equal(metrics.appliedValue, null);
  assert.equal(metrics.pnl, null);
  assert.equal(metrics.costBasisStatus, 'DERIVED');
  assert.throws(() => PersistenceCore.normalizePositionV2({ ...derived, average_cost: 8 }), /AVERAGE_COST_UNCERTIFIED/);
});

test('official account snapshot is distinct from partial detail', () => {
  const safe = PersistenceCore.normalizeAccountSnapshotV1(snapshot);
  assert.deepEqual(FinanceCore.accountSnapshotSummary(safe), {
    rvOfficial: 110, rfOfficial: 20, officialTotal: 130,
    rvDetail: 100, rfDetail: 15, detailTotal: 115, reconciliationGap: 15,
    reconciliationStatus: 'PARTIAL', asOf: '2026-10-10'
  });
  assert.throws(() => PersistenceCore.normalizeAccountSnapshotV1({ ...snapshot, total_gap: 0 }), /SNAPSHOT_TOTAL_MISMATCH/);
});

test('read-only V2 view does not migrate or mutate legacy stored arrays', () => {
  const original = { assets: [{ type: 'Ação', ticker: 'OLD', qty: 2, avg_price: 3 }], wallets: [] };
  const stored = PersistenceCore.parseStoredState(PersistenceCore.serializeStoredState(original));
  const view = PersistenceCore.buildPackage1ReadOnlyView([position, fixedPosition], snapshot);
  assert.equal(view.positions.length, 2);
  assert.equal(view.snapshot.total_official, 130);
  assert.equal(stored.assets.length, 1);
  assert.equal(Object.hasOwn(stored, 'package1'), false);
  assert.equal(FinanceCore.assetAppliedValue(stored.assets[0]), 6);
});

test('read-only view rejects mismatched custodians, dates or detail arithmetic', () => {
  assert.throws(() => PersistenceCore.buildPackage1ReadOnlyView([{ ...position, custodian_id: 'OTHER' }, fixedPosition], snapshot), /PACKAGE1_SCOPE_MISMATCH/);
  assert.throws(() => PersistenceCore.buildPackage1ReadOnlyView([{ ...position, as_of: '2026-10-09' }, fixedPosition], snapshot), /PACKAGE1_SCOPE_MISMATCH/);
  assert.throws(() => PersistenceCore.buildPackage1ReadOnlyView([{ ...position, current_value: 99 }, fixedPosition], snapshot), /PACKAGE1_DETAIL_MISMATCH/);
});
