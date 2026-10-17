'use strict';

// IR2026 — P15 monthly fields, P21/P28 dry-run entrypoint, P22 determinism,
// P23 privacy boundary. Synthetic only.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { buildTaxLedger } = require('../ir2026/ledger');
const { loadRegistry } = require('../ir2026/rules');

let seq = 0;
function ev(over) {
  seq += 1;
  return { CANONICAL_ID: 'me' + String(seq).padStart(3, '0'), DATE: '2026-01-10', TICKER: 'DEMO4',
    TYPE: 'BUY', DIRECTION: 'Debito', QUANTITY: 10, UNIT_PRICE: 100, AMOUNT: 1000,
    STATUS: 'CERTIFIED', CONFIDENCE: 'HIGH', MOVEMENT_RAW: 'Transferência - Liquidação',
    PROVENANCE: 'synthetic', SOURCE_ROW_IDS: ['s:' + seq], SOURCE_COUNT: 1, ...over };
}

function opening() {
  return { ROWS: [{ ASSET: 'DEMO4', ASSET_CLASS: 'BRAZIL_STOCK', CLASSIFICATION_BASIS: 'PATTERN',
    OPENING_QTY: 0, QTY_STATUS: 'CERTIFIED', OPENING_TOTAL_COST_CENTS: 0, COST_STATUS: 'NOT_APPLICABLE', FLAGS: {} }], SHA256: 'x' };
}

function ledgerWith(sellEvents) {
  return buildTaxLedger({ opening: opening(), events: [ev({ TYPE: 'BUY', QUANTITY: 50, AMOUNT: 5000 }), ...sellEvents],
    registry: loadRegistry(), fiscalYear: 2026 });
}

test('P15: monthly close carries fees/loss-used/status fields fail-closed', () => {
  const led = ledgerWith([ev({ DATE: '2026-03-05', TYPE: 'SELL', QUANTITY: 20, AMOUNT: 2600 })]);
  const close = led.MONTHLY_CLOSES[0];
  assert.equal(close.FEES_CENTS, null);
  assert.equal(close.FEES_STATUS, 'MISSING_FEES');
  assert.equal(close.WITHHOLDING_STATUS, 'UNKNOWN');
  assert.equal(close.LOSS_USED_CENTS, 0);
  assert.equal(close.LOSS_USED_STATUS, 'UNKNOWN_PRIOR_LOSSES');
  assert.equal(close.OPENING_LOSS_CARRY_STATUS, 'UNKNOWN');
  assert.equal(close.STATUS, 'SIMULATION_ONLY'); // all sells applied -> simulation only, never authoritative
  assert.equal(close.TAX_DUE, 'NOT_CALCULATED');
});

test('P15: month with blocked sells is PARTIAL/BLOCKED, never COMPLETE', () => {
  const led = ledgerWith([
    ev({ DATE: '2026-03-05', TYPE: 'SELL', QUANTITY: 20, AMOUNT: 2600 }),
    ev({ DATE: '2026-03-06', TYPE: 'SELL', QUANTITY: 20, AMOUNT: null, UNIT_PRICE: null }), // missing amount AND unit price -> blocked
  ]);
  const close = led.MONTHLY_CLOSES[0];
  assert.equal(close.STATUS, 'PARTIAL');
  assert.equal(close.UNKNOWN_BLOCKERS, 1);
  assert.ok(close.SOURCE_COVERAGE < 1);
});

test('P16: annual close keeps tax NOT_CALCULATED and loss carry UNKNOWN', () => {
  const led = ledgerWith([ev({ DATE: '2026-03-05', TYPE: 'SELL', QUANTITY: 20, AMOUNT: 2600 })]);
  assert.equal(led.ANNUAL_CLOSE.TAXES, 'NOT_CALCULATED_RULES_UNCERTIFIED');
  assert.equal(led.ANNUAL_CLOSE.WITHHOLDING.STATUS, 'UNKNOWN');
  const carry = led.ANNUAL_CLOSE.LOSS_CARRYFORWARD.find((l) => l.BUCKET === 'RV_STOCK_SWING');
  assert.equal(carry.OPENING_STATUS, 'UNKNOWN');
});

test('P21/P28: ingest dry-run entrypoint runs, reports proposals and writes nothing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ir2026-dry-'));
  const docPath = path.join(tmp, 'doc.json');
  const openingPath = path.resolve(__dirname, '../.qa-state/ir2026/opening-evidence/opening-fiscal-2026-v1.json');
  const beforeHash = fs.existsSync(openingPath) ? fs.readFileSync(openingPath).toString() : null;
  const syntheticRows = [];
  for (let i = 0; i < 3; i++) syntheticRows.push({ ticker: 'DEMOX' + i, quantity: 1, custo: 1 });
  fs.writeFileSync(docPath, JSON.stringify({ name: 'informe sintetico 31/12/2025', asOf: '2025-12-31', rows: syntheticRows }));
  const out = execFileSync('node', [path.resolve(__dirname, '../ir2026/scripts/ingest-dry-run.js'), docPath], { encoding: 'utf8' });
  const parsed = JSON.parse(out);
  assert.equal(parsed.MODE, 'DRY_RUN_NO_WRITE');
  assert.equal(parsed.DOCUMENTS.length, 1);
  const afterHash = fs.existsSync(openingPath) ? fs.readFileSync(openingPath).toString() : null;
  assert.equal(beforeHash, afterHash, 'opening artifact must be untouched');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('P22: dry-run is deterministic for the same synthetic document', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ir2026-det-'));
  const docPath = path.join(tmp, 'doc.json');
  fs.writeFileSync(docPath, JSON.stringify({ name: 'informe 31/12/2025', asOf: '2025-12-31', rows: [{ ticker: 'DEMOX', quantity: 5, custo: 100 }] }));
  const run = () => JSON.parse(execFileSync('node', [path.resolve(__dirname, '../ir2026/scripts/ingest-dry-run.js'), docPath], { encoding: 'utf8' }));
  const a = run();
  const b = run();
  assert.deepEqual(a, b);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('P23: public summary exposes only generic certification status', () => {
  const summaryPath = path.resolve(__dirname, '../ir2026/opening-v1-summary.json');
  assert.ok(fs.existsSync(summaryPath), 'safe summary must exist');
  const raw = fs.readFileSync(summaryPath, 'utf8');
  const parsed = JSON.parse(raw);
  assert.deepEqual(Object.keys(parsed).sort(), ['ARTIFACT', 'DETERMINISTIC', 'DETAILS', 'FISCAL_YEAR', 'OFFICIAL_YEAR_END_EVIDENCE', 'OPENING_STATUS', 'TAX_PAYABLE_STATUS'].sort());
  assert.equal(parsed.DETAILS, 'PRIVATE_LOCAL_ONLY');
  assert.doesNotMatch(raw, /(?:ASSET_COUNT|HELD_CANDIDATES|SALES_2026|COST_COVERAGE|SHA256|R\$|[A-Z]{4}[0-9]{1,2})/i);
});

test('P23: private artifacts stay outside git tracking', () => {
  const gitignore = fs.readFileSync(path.resolve(__dirname, '../.gitignore'), 'utf8');
  assert.match(gitignore, /\.qa-state\//);
  const status = execFileSync('git', ['-C', path.resolve(__dirname, '..'), 'status', '--porcelain'], { encoding: 'utf8' });
  assert.ok(!status.split('\n').some((l) => l.includes('.qa-state/ir2026/opening-evidence')), 'private opening artifact must not be trackable');
});
