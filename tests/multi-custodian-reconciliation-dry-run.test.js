'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { reconcilePositionSnapshots } = require('../multi-custodian-reconciliation-dry-run.js');

const row = (overrides = {}) => ({
  recordType: 'POSITION',
  custodian: 'INTER',
  account: 'SYNTH_ACCOUNT_A',
  source: 'POSIÇÃO',
  sourceId: 'SYNTH_SOURCE_A',
  sourceRecordId: overrides.sourceRecordId || overrides.assetId || 'ROW_1',
  sourceSha256: 'a'.repeat(64),
  asOf: '2026-10-10',
  assetId: 'SYNTH_ASSET_1',
  assetClass: 'RV',
  currency: 'BRL',
  amountKind: 'CURRENT_NET',
  amountCents: 12000,
  coverage: 'COMPLETE',
  provenance: 'synthetic:test-fixture',
  confidenceBasis: 'explicit synthetic position row and as-of date',
  observedOrDerived: 'OBSERVED',
  ...overrides,
});

test('reconciles synthetic custodian and global totals without mixing dates or amount kinds', () => {
  const result = reconcilePositionSnapshots([
    row(),
    row({ custodian: 'INTER', account: 'SYNTH_ACCOUNT_A', sourceId: 'SYNTH_SOURCE_B', sourceRecordId: 'ROW_2', sourceSha256: 'b'.repeat(64), assetId: 'SYNTH_ASSET_2', assetClass: 'RF', amountCents: 8000 }),
    row({ custodian: 'OUTRO', account: 'SYNTH_ACCOUNT_B', sourceId: 'SYNTH_SOURCE_C', sourceRecordId: 'ROW_3', sourceSha256: 'c'.repeat(64), amountCents: 5000 }),
    row({ custodian: 'OUTRO', account: 'SYNTH_ACCOUNT_B', sourceId: 'SYNTH_SOURCE_D', sourceRecordId: 'ROW_4', sourceSha256: 'd'.repeat(64), amountKind: 'CURRENT_GROSS', amountCents: 9000 }),
  ]);

  assert.equal(result.globalTotalCents, null);
  assert.equal(result.status, 'MIXED_AMOUNT_KIND');
  assert.deepEqual(result.summaries.filter(item => item.custodian === 'INTER').map(item => [item.amountKind, item.totalCents]), [['CURRENT_NET', 20000]]);
  assert.deepEqual(result.summaries.filter(item => item.custodian === 'OUTRO').map(item => [item.amountKind, item.totalCents]), [['CURRENT_GROSS', 9000], ['CURRENT_NET', 5000]]);
  assert.deepEqual(result.globalSummaries.map(item => [item.amountKind, item.totalCents]), [['CURRENT_GROSS', 9000], ['CURRENT_NET', 25000]]);
  const interNet = result.summaries.find(item => item.custodian === 'INTER' && item.amountKind === 'CURRENT_NET').totalCents;
  const otherNet = result.summaries.find(item => item.custodian === 'OUTRO' && item.amountKind === 'CURRENT_NET').totalCents;
  const globalNet = result.globalSummaries.find(item => item.amountKind === 'CURRENT_NET').totalCents;
  assert.equal(interNet + otherNet, globalNet);
});

test('collapses an exact repeated source row and corroborating source snapshots without double counting', () => {
  const first = row();
  const exactRepeat = { ...first, sourceId: 'SYNTH_SOURCE_REIMPORTED' };
  const corroborating = row({ sourceId: 'SYNTH_SOURCE_B', sourceRecordId: 'ROW_9', sourceSha256: 'b'.repeat(64) });
  const result = reconcilePositionSnapshots([first, exactRepeat, corroborating]);

  assert.equal(result.globalTotalCents, 12000);
  assert.equal(result.exactSourceDuplicates, 1);
  assert.equal(result.positionDuplicatesCollapsed, 1);
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.summaries[0].positionCount, 1);
  assert.deepEqual(result.summaries[0].sourceIds.sort(), ['SYNTH_SOURCE_A', 'SYNTH_SOURCE_B']);
});

test('uses source id when source hash is absent', () => {
  const result = reconcilePositionSnapshots([
    row({ sourceSha256: undefined, sourceId: 'SYNTH_SOURCE_A', sourceRecordId: 'ROW_SHARED' }),
    row({ sourceSha256: undefined, sourceId: 'SYNTH_SOURCE_B', assetId: 'SYNTH_ASSET_2', sourceRecordId: 'ROW_SHARED', amountCents: 8000 }),
  ]);

  assert.equal(result.globalTotalCents, 20000);
  assert.equal(result.conflicts.length, 0);
});

test('flags a same-source identity collision with different contents and suppresses the total', () => {
  const first = row();
  const collision = row({ amountCents: 13000 });
  const result = reconcilePositionSnapshots([first, collision]);

  assert.equal(result.globalTotalCents, null);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.summaries[0].totalCents, null);
});

test('flags differing values for the same logical position instead of summing them', () => {
  const result = reconcilePositionSnapshots([
    row(),
    row({ sourceId: 'SYNTH_SOURCE_B', sourceRecordId: 'ROW_2', sourceSha256: 'b'.repeat(64), amountCents: 13000 }),
  ]);

  assert.equal(result.globalTotalCents, null);
  assert.equal(result.conflicts[0].state, 'POSITION_VALUE_CONFLICT');
  assert.equal(result.knownSubtotalCents, null);
});

test('keeps same asset at different custodians as separate legitimate positions', () => {
  const result = reconcilePositionSnapshots([
    row(),
    row({ custodian: 'OUTRO', account: 'SYNTH_ACCOUNT_B', sourceId: 'SYNTH_SOURCE_B', sourceRecordId: 'ROW_2', sourceSha256: 'b'.repeat(64) }),
  ]);

  assert.equal(result.globalTotalCents, 24000);
  assert.equal(result.summaries.length, 2);
});

test('keeps different as-of dates in separate snapshots and blocks cross-date total', () => {
  const result = reconcilePositionSnapshots([
    row(),
    row({ asOf: '2026-10-11', sourceId: 'SYNTH_SOURCE_B', sourceRecordId: 'ROW_2', sourceSha256: 'b'.repeat(64), amountCents: 12500 }),
  ]);

  assert.equal(result.globalTotalCents, null);
  assert.equal(result.status, 'MIXED_AS_OF');
  assert.deepEqual(result.globalSummaries.map(item => item.asOf), ['2026-10-10', '2026-10-11']);
});

test('preserves partial and unknown coverage while distinguishing confirmed zero', () => {
  const result = reconcilePositionSnapshots([
    row({ assetId: 'SYNTH_PARTIAL', coverage: 'PARTIAL', amountCents: 4000 }),
    row({ assetId: 'SYNTH_UNKNOWN', coverage: 'UNKNOWN', amountCents: null }),
    row({ assetId: 'SYNTH_ZERO', amountCents: 0 }),
  ]);

  assert.equal(result.globalTotalCents, null);
  assert.equal(result.globalSummaries[0].status, 'PARTIAL');
  assert.equal(result.globalSummaries[0].knownSubtotalCents, 4000);
  assert.equal(result.globalSummaries[0].totalCents, null);
  assert.equal(result.positions.find(item => item.assetId === 'SYNTH_ZERO').status, 'ZERO_CONFIRMED');
});

test('unknown source cannot contribute an amount to a complete total', () => {
  const result = reconcilePositionSnapshots([
    row({ source: 'DESCONHECIDO', sourceId: 'SYNTH_UNKNOWN_SOURCE', sourceRecordId: 'ROW_UNKNOWN', sourceSha256: 'e'.repeat(64), observedOrDerived: 'UNKNOWN', coverage: 'UNKNOWN', amountCents: 7000 }),
  ]);

  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.globalTotalCents, null);
  assert.equal(result.globalSummaries[0].knownSubtotalCents, null);
  assert.equal(result.positions[0].amountCents, null);
  assert.equal(result.positions[0].candidateAmountCents, 7000);
});

test('requires movement-derived position evidence to be labeled DERIVED', () => {
  const result = reconcilePositionSnapshots([
    row({ source: 'MOVIMENTAÇÃO', sourceId: 'SYNTH_MOVEMENTS', sourceRecordId: 'ROW_MOVEMENT', sourceSha256: 'f'.repeat(64) }),
  ]);

  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.deepEqual(result.invalidRecords[0].errors, ['DERIVED_SOURCE_MISMATCH']);
});

test('rejects insufficient position identity and suppresses a seemingly complete total', () => {
  const result = reconcilePositionSnapshots([
    row(),
    row({ assetId: '', sourceId: 'SYNTH_SOURCE_B', sourceRecordId: 'ROW_2', sourceSha256: 'b'.repeat(64) }),
  ]);

  assert.equal(result.globalTotalCents, null);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.invalidRecords.length, 1);
});

test('does not mutate input records', () => {
  const input = [row()];
  const before = structuredClone(input);
  reconcilePositionSnapshots(input);
  assert.deepEqual(input, before);
});
