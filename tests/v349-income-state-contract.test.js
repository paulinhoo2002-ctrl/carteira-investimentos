const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// V349: pin the income-state classification contract used by all received
// totals. These invariants are what keeps EXPECTED/DECLARED/ANNOUNCED money
// out of "received" aggregations while manual entries (no explicit state,
// registered by the user as received) remain PAID.

const di = require(path.join(__dirname, '..', 'dividend-intelligence.js'));
const classify = (di.classifyIncomeState || (di.buildDividendIntelligence && di.classifyIncomeState));

test('V349 contract: explicit non-paid states never classify as PAID', () => {
  assert.equal(classify({ state: 'ANNOUNCED' }), 'ANNOUNCED');
  assert.equal(classify({ state: 'DECLARED' }), 'ANNOUNCED');
  assert.equal(classify({ state: 'EXPECTED' }), 'ANNOUNCED');
  assert.equal(classify({ state: 'ESTIMATED' }), 'ESTIMATED');
  assert.equal(classify({ state: 'PROJECTED' }), 'ESTIMATED');
  assert.equal(classify({ state: 'UNKNOWN' }), 'UNKNOWN');
  assert.equal(classify({ state: 'PENDING' }), 'UNKNOWN', 'PENDING must never be PAID');
  assert.equal(classify({ state: 'CANCELLED' }), 'UNKNOWN', 'CANCELLED must never be PAID');
});

test('V349 contract: user-registered manual income (no explicit state) is PAID', () => {
  // registering a provento through the app means the user recorded a receipt;
  // absence of a state field is domain-default PAID, not UNKNOWN
  assert.equal(classify({ ticker: 'PETR4', value: 10, date: '2026-10-01', source: 'Manual' }), 'PAID');
  assert.equal(classify({}), 'PAID');
  assert.equal(classify({ state: 'PAGO' }), 'PAID');
  assert.equal(classify({ state: 'RECEBIDO' }), 'PAID');
});

test('V349 source guard: legacy received aggregations filter via classifyIncomeState', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const fn = html.slice(html.indexOf('function dividendReceivedRows'), html.indexOf('function dividendAssetSummary'));
  assert.ok(fn.length > 0, 'dividendReceivedRows not found');
  assert.match(fn, /classifyIncomeState/, 'must classify through the engine');
  assert.match(fn, /==='PAID'/, 'must keep only PAID');
  // three consumers must all route through the PAID-only filter
  assert.match(html, /function dividendAssetSummary\(rows\)\{[\s\S]{0,80}dividendReceivedRows/, 'asset summary must filter PAID-only');
  assert.match(html, /function dividendMonthlyRows\(rows=dividendPremiumRows\(\)\)\{[\s\S]{0,80}dividendReceivedRows/, 'monthly matrix must filter PAID-only');
  assert.match(html, /function dividendsByAssetView\(rows\)\{[\s\S]{0,80}dividendReceivedRows/, 'by-asset view must filter PAID-only');
});
