'use strict';

// Financial snapshot reconciliation test
// Validates the 05/10 and 10/10 snapshots and their bridge

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SNAPSHOT_FILE = path.resolve(__dirname, '..', '.qa-state', 'financial-snapshots.json');

test('Financial snapshots: 05/10 INTER RV observed', () => {
  const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  const rv = data.snapshot.positions.RV;
  assert.equal(rv.value, 422189.40, 'INTER RV 05/10 must be 422189.40');
  assert.equal(rv.status, 'OBSERVED', 'INTER RV 05/10 status must be OBSERVED');
});

test('Financial snapshots: 05/10 INTER RF derived from components', () => {
  const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  const rf = data.snapshot.positions.RF;
  assert.equal(rf.value_net, 107767.48, 'INTER RF NET 05/10 must be 107767.48');
  assert.equal(rf.components.CDB_liquido, 92898.75, 'CDB líquido must be 92898.75');
  assert.equal(rf.components.LIG_liquido, 14868.73, 'LIG líquido must be 14868.73');
  // Validate derivation
  const derived = rf.components.CDB_liquido + rf.components.LIG_liquido;
  assert.equal(derived, rf.value_net, 'RF NET must equal CDB + LIG');
  assert.equal(rf.status, 'DERIVED_FROM_OFFICIAL_COMPONENTS');
});

test('Financial snapshots: 05/10 INTER TOTAL derived', () => {
  const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  const total = data.snapshot.positions.TOTAL;
  const expected = 422189.40 + 107767.48; // RV + RF_NET
  assert.equal(total.value, 529956.88, 'INTER TOTAL 05/10 must be 529956.88');
  assert.equal(total.value, expected, 'TOTAL must equal RV + RF_NET');
  assert.equal(total.status, 'DERIVED_FROM_OFFICIAL_COMPONENTS');
});

test('Financial snapshots: 10/10 INTER positions observed', () => {
  const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  const rv = data.snapshot_10_10.positions.RV;
  const rf = data.snapshot_10_10.positions.RF;
  const total = data.snapshot_10_10.positions.TOTAL;
  assert.equal(rv.value, 361023.63, 'INTER RV 10/10 must be 361023.63');
  assert.equal(rf.value_net, 208293.20, 'INTER RF NET 10/10 must be 208293.20');
  assert.equal(total.value, 569316.83, 'INTER TOTAL 10/10 must be 569316.83');
  // Validate consistency (floating point safe)
  const sum = Math.round((rv.value + rf.value_net) * 100) / 100;
  assert.equal(sum, total.value, '10/10 RV + RF must equal TOTAL');
});

test('Financial snapshots: Other custodian 10/10', () => {
  const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  const other = data.other_custodian;
  assert.equal(other.identity, 'UNKNOWN', 'Other custodian identity must be UNKNOWN');
  assert.equal(other.summary, 132858.82, 'Other custodian summary must be 132858.82');
  assert.equal(other.detail, 132858.81, 'Other custodian detail must be 132858.81');
  assert.equal(other.difference, 0.01, 'Difference of R$0.01 must be preserved');
});

test('Financial snapshots: Global derived 10/10', () => {
  const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  const global = data.global_derived_10_10;
  const expected = Math.round((569316.83 + 132858.82) * 100) / 100;
  assert.equal(global.value, 702175.65, 'Global derived must be 702175.65');
  assert.equal(global.value, expected, 'Global must equal INTER + Other');
});

test('Financial snapshots: Bridge 05/10 to 10/10 changes', () => {
  const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  const bridge = data.bridge_05_10_to_10_10;
  // Validate change calculations
  assert.equal(bridge.inter_rv_change, -61165.77, 'RV change must be -61165.77 (361023.63 - 422189.40)');
  assert.equal(bridge.inter_rf_change, 100525.72, 'RF change must be 100525.72 (208293.20 - 107767.48)');
  assert.equal(bridge.inter_total_change, 39359.95, 'Total change must be 39359.95 (569316.83 - 529956.88)');
  // Validate bridge metadata
  assert.equal(bridge.movement_coverage, 'UNKNOWN', 'Movement coverage must be UNKNOWN');
  assert.equal(bridge.unknown_gaps, true, 'Unknown gaps must be true');
});

test('Financial snapshots: No hardcoded Finance Core values', () => {
  // Ensure snapshots are data files, not hardcoded in Finance Core
  const financeCoreFiles = [
    'legacy/js/finance/portfolio-core.js',
    'legacy/js/finance/calculations.js',
    'legacy/js/finance/valuation.js',
  ];
  for (const file of financeCoreFiles) {
    const fullPath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // These specific values must NOT appear in Finance Core
      assert.ok(!content.includes('422189.40'), `${file} must not hardcode 05/10 RV value`);
      assert.ok(!content.includes('107767.48'), `${file} must not hardcode 05/10 RF NET value`);
      assert.ok(!content.includes('529956.88'), `${file} must not hardcode 05/10 TOTAL value`);
      assert.ok(!content.includes('361023.63'), `${file} must not hardcode 10/10 RV value`);
      assert.ok(!content.includes('208293.20'), `${file} must not hardcode 10/10 RF NET value`);
      assert.ok(!content.includes('569316.83'), `${file} must not hardcode 10/10 TOTAL value`);
      assert.ok(!content.includes('132858.82'), `${file} must not hardcode other custodian value`);
      assert.ok(!content.includes('702175.65'), `${file} must not hardcode global derived value`);
    }
  }
});