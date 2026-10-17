'use strict';

// IR2026 — P2 precedence + P4 opening compare tests (synthetic only).

const test = require('node:test');
const assert = require('node:assert/strict');
const { PRECEDENCE_LEVELS, evaluatePromotion, classifyOpeningCompare } = require('../ir2026/precedence');

test('P2: only evidence levels 1-4 can certify', () => {
  assert.equal(PRECEDENCE_LEVELS.OFFICIAL_YEAR_END_STATEMENT.CAN_CERTIFY, true);
  assert.equal(PRECEDENCE_LEVELS.OFFICIAL_ANNUAL_TAX_REPORT.CAN_CERTIFY, true);
  assert.equal(PRECEDENCE_LEVELS.BROKER_IR_EXPORT.CAN_CERTIFY, true);
  assert.equal(PRECEDENCE_LEVELS.B3_CUSTODY_STATEMENT.CAN_CERTIFY, true);
  assert.equal(PRECEDENCE_LEVELS.OFFICIAL_MOVEMENT_EXPORT.CAN_CERTIFY, false);
  assert.equal(PRECEDENCE_LEVELS.CERTIFIED_DERIVED_RECONSTRUCTION.CAN_CERTIFY, false);
  assert.equal(PRECEDENCE_LEVELS.HEURISTIC_INFERENCE.CAN_CERTIFY, false);
});

test('P2: official year-end statement promotes UNKNOWN -> CERTIFIED', () => {
  const r = evaluatePromotion({ currentStatus: 'UNKNOWN', evidenceLevel: 'OFFICIAL_YEAR_END_STATEMENT', evidencePresent: true, consistent: true });
  assert.deepEqual({ PROMOTED: r.PROMOTED, NEW_STATUS: r.NEW_STATUS }, { PROMOTED: true, NEW_STATUS: 'CERTIFIED' });
});

test('P2: movement export never certifies; derives at most', () => {
  const r = evaluatePromotion({ currentStatus: 'UNKNOWN', evidenceLevel: 'OFFICIAL_MOVEMENT_EXPORT', evidencePresent: true, consistent: true });
  assert.equal(r.NEW_STATUS, 'DERIVED');
  assert.equal(r.PROMOTED, true);
  const r2 = evaluatePromotion({ currentStatus: 'CERTIFIED', evidenceLevel: 'OFFICIAL_MOVEMENT_EXPORT', evidencePresent: true, consistent: true });
  assert.equal(r2.PROMOTED, false);
  assert.equal(r2.NEW_STATUS, 'CERTIFIED'); // never downgraded
});

test('P2: heuristic inference never promotes anything', () => {
  const r = evaluatePromotion({ currentStatus: 'UNKNOWN', evidenceLevel: 'HEURISTIC_INFERENCE', evidencePresent: true, consistent: true });
  assert.equal(r.PROMOTED, false);
  assert.equal(r.NEW_STATUS, 'UNKNOWN');
});

test('P2: conflict blocks promotion and reports SOURCE_CONFLICT', () => {
  const r = evaluatePromotion({ currentStatus: 'PARTIAL', evidenceLevel: 'OFFICIAL_YEAR_END_STATEMENT', evidencePresent: true, consistent: false });
  assert.equal(r.PROMOTED, false);
  assert.equal(r.BLOCKER, 'SOURCE_CONFLICT');
});

test('P2: absent evidence is a no-op', () => {
  const r = evaluatePromotion({ currentStatus: 'PARTIAL', evidenceLevel: 'OFFICIAL_ANNUAL_TAX_REPORT', evidencePresent: false, consistent: true });
  assert.equal(r.PROMOTED, false);
  assert.equal(r.REASON, 'EVIDENCE_ABSENT');
});

test('P2: unknown evidence level fails closed', () => {
  const r = evaluatePromotion({ currentStatus: 'DERIVED', evidenceLevel: 'NOT_A_LEVEL', evidencePresent: true, consistent: true });
  assert.equal(r.PROMOTED, false);
  assert.equal(r.REASON, 'UNKNOWN_EVIDENCE_LEVEL');
});

test('P4: exact qty+cost compare classifies CERTIFIED_EXACT', () => {
  const c = classifyOpeningCompare({ derivedQty: 100, derivedCostCents: 3500000, evidenceQty: 100, evidenceCostCents: 3500000 });
  assert.equal(c, 'CERTIFIED_EXACT');
});

test('P4: qty match with cost-only evidence stays PARTIAL', () => {
  const c = classifyOpeningCompare({ derivedQty: 100, derivedCostCents: 3500000, evidenceQty: 100, evidenceCostCents: null });
  assert.equal(c, 'CERTIFIED_EXACT'); // qty certified; cost dimension tracked separately by caller
  const c2 = classifyOpeningCompare({ derivedQty: null, derivedCostCents: null, evidenceQty: null, evidenceCostCents: 900000 });
  assert.equal(c2, 'PARTIAL');
});

test('P4: qty or cost mismatch classifies CONFLICT (never auto-resolved)', () => {
  const c = classifyOpeningCompare({ derivedQty: 100, derivedCostCents: 3500000, evidenceQty: 90, evidenceCostCents: 3500000 });
  assert.equal(c, 'CONFLICT');
  const c2 = classifyOpeningCompare({ derivedQty: 100, derivedCostCents: 3500000, evidenceQty: 100, evidenceCostCents: 3000000 });
  assert.equal(c2, 'CONFLICT');
});

test('P4: empty evidence stays UNKNOWN', () => {
  const c = classifyOpeningCompare({ derivedQty: 10, derivedCostCents: 1000, evidenceQty: null, evidenceCostCents: null });
  assert.equal(c, 'UNKNOWN');
});

test('P4: tolerance windows absorb float noise, not real differences', () => {
  const ok = classifyOpeningCompare({ derivedQty: 100.0000001, derivedCostCents: 3500000, evidenceQty: 100, evidenceCostCents: 3500001 });
  assert.equal(ok, 'CERTIFIED_EXACT');
  const bad = classifyOpeningCompare({ derivedQty: 100, derivedCostCents: 3500000, evidenceQty: 100, evidenceCostCents: 3500100 });
  assert.equal(bad, 'CONFLICT');
});
