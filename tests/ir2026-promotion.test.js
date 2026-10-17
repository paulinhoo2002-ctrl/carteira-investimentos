'use strict';

// IR2026 — P4 promotion pipeline tests (synthetic opening universe).

const test = require('node:test');
const assert = require('node:assert/strict');
const { ingestDocument } = require('../ir2026/ingest');
const { proposeOpeningPromotions } = require('../ir2026/promotion');

const openingRows = () => [
  { ASSET: 'DEMO4', OPENING_QTY: 100, OPENING_TOTAL_COST_CENTS: 3500000, OPENING_STATUS: 'DERIVED' },
  { ASSET: 'DEMO11', OPENING_QTY: 53, OPENING_TOTAL_COST_CENTS: 614126, OPENING_STATUS: 'PARTIAL' },
  { ASSET: 'DEMOOLD', OPENING_QTY: null, OPENING_TOTAL_COST_CENTS: null, OPENING_STATUS: 'UNKNOWN' },
];

function yearEndDoc(rows) {
  return ingestDocument({ name: 'pos-2025', type: 'YEAR_END_POSITION', rows, knownAssets: openingRows().map((r) => r.ASSET), asOf: '2025-12-31' });
}

test('P4: official year-end evidence proposes DERIVED -> CERTIFIED on exact match', () => {
  const doc = yearEndDoc([{ ticker: 'DEMO4', quantity: 100, custo: 35000 }]);
  const p = proposeOpeningPromotions({ ingested: doc, openingRows: openingRows() });
  const promo = p.PROMOTIONS.find((x) => x.ASSET === 'DEMO4');
  assert.equal(promo.COMPARE_CLASS, 'CERTIFIED_EXACT');
  assert.equal(promo.PROPOSED_STATUS, 'CERTIFIED');
  assert.equal(promo.PROMOTED, true);
  assert.equal(promo.EVIDENCE_LEVEL, 1);
});

test('P4: qty mismatch goes to CONFLICT and never auto-resolves', () => {
  const doc = yearEndDoc([{ ticker: 'DEMO4', quantity: 90, custo: 35000 }]);
  const p = proposeOpeningPromotions({ ingested: doc, openingRows: openingRows() });
  assert.equal(p.PROMOTIONS.length, 0);
  const conflict = p.CONFLICTS.find((c) => c.ASSET === 'DEMO4');
  assert.equal(conflict.REASON, 'QTY_OR_COST_MISMATCH');
  assert.equal(conflict.RESOLUTION, 'HUMAN_REVIEW_REQUIRED');
});

test('P4: evidence for an asset outside the opening universe is a conflict', () => {
  const doc = yearEndDoc([{ ticker: 'DEMOX', quantity: 1, custo: 1 }]);
  const p = proposeOpeningPromotions({ ingested: doc, openingRows: openingRows() });
  assert.equal(p.CONFLICTS[0].REASON, 'ASSET_NOT_IN_OPENING_UNIVERSE');
});

test('P4: cost-only evidence upgrades cost dimension partially (ADJUSTMENT recorded)', () => {
  const doc = yearEndDoc([{ ticker: 'DEMOOLD', custo: 777 }]);
  const p = proposeOpeningPromotions({ ingested: doc, openingRows: openingRows() });
  const promo = p.PROMOTIONS.find((x) => x.ASSET === 'DEMOOLD');
  assert.equal(promo.COMPARE_CLASS, 'PARTIAL');
  assert.ok(promo.ADJUSTMENT);
  assert.equal(promo.ADJUSTMENT.COST_CENTS.DERIVED, null);
  assert.equal(promo.ADJUSTMENT.COST_CENTS.EVIDENCE, 77700);
});

test('P4: broker note (level 3) also certifies; document hash rides along', () => {
  const doc = ingestDocument({ name: 'nota', type: 'BROKERAGE_NOTE', rows: [{ ticker: 'DEMO4', quantity: 100, custo: 35000 }], knownAssets: ['DEMO4'] });
  const p = proposeOpeningPromotions({ ingested: doc, openingRows: openingRows() });
  assert.equal(p.EVIDENCE_LEVEL, 3);
  assert.equal(p.PROMOTIONS[0].DOCUMENT_SHA256, doc.CONTENT_SHA256);
});

test('P4: multiple evidence rows for one asset aggregate before compare', () => {
  const doc = yearEndDoc([
    { ticker: 'DEMO4', quantity: 60, custo: 21000 },
    { ticker: 'DEMO4', quantity: 40, custo: 14000 },
  ]);
  const p = proposeOpeningPromotions({ ingested: doc, openingRows: openingRows() });
  assert.equal(p.PROMOTIONS[0].COMPARE_CLASS, 'CERTIFIED_EXACT');
  assert.equal(p.PROMOTIONS[0].EVIDENCE_ROWS.length, 2);
});

test('P4: document type without precedence level fails closed', () => {
  const p = proposeOpeningPromotions({ ingested: { ACCEPTED: true, DOCUMENT_TYPE: 'MYSTERY', RECORDS: [] }, openingRows: [] });
  assert.equal(p.REASON, 'DOCUMENT_TYPE_HAS_NO_PRECEDENCE');
});
