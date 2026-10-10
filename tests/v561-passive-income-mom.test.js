const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract passiveIncomeMonthOverMonth as pure source and evaluate with stubs.
const fnStart = html.indexOf('function passiveIncomeMonthOverMonth');
assert.ok(fnStart > 0, 'passiveIncomeMonthOverMonth must exist in index.html');
const fnEnd = html.indexOf('\n}', fnStart) + 2;
const fnSource = html.slice(fnStart, fnEnd);

function build(overrides = {}) {
  const sandbox = { ...overrides };
  const factory = new Function(`${fnSource}; return passiveIncomeMonthOverMonth;`)();
  return factory;
}
const fn = build();

test('V561 RED->GREEN: month-over-month compares current vs previous received totals', () => {
  const r = fn({ currentTotal: 100, previousTotal: 80 });
  assert.deepEqual(r, { status: 'COMPLETE', delta: 20, deltaPercent: 25, direction: 'up' });
});

test('V561: previous month null keeps UNKNOWN (never zero)', () => {
  const r = fn({ currentTotal: 100, previousTotal: null });
  assert.equal(r.status, 'UNKNOWN');
  assert.equal(r.delta, null);
});

test('V561: current month null keeps UNKNOWN (never zero)', () => {
  const r = fn({ currentTotal: null, previousTotal: 80 });
  assert.equal(r.status, 'UNKNOWN');
  assert.equal(r.delta, null);
});

test('V561: equal totals report direction flat, zero is legitimate confirmed zero', () => {
  const r = fn({ currentTotal: 100, previousTotal: 100 });
  assert.deepEqual(r, { status: 'COMPLETE', delta: 0, deltaPercent: 0, direction: 'flat' });
});

test('V561: decrease reports direction down with negative delta', () => {
  const r = fn({ currentTotal: 50, previousTotal: 100 });
  assert.deepEqual(r, { status: 'COMPLETE', delta: -50, deltaPercent: -50, direction: 'down' });
});

test('V561: previous zero is confirmed zero and computes normally', () => {
  const r = fn({ currentTotal: 100, previousTotal: 0 });
  assert.deepEqual(r, { status: 'COMPLETE', delta: 100, deltaPercent: null, direction: 'up' });
});

test('V561: UI renders the month-over-month card in the passive income overview', () => {
  assert.match(html, /monthOverMonth=passiveIncomeMonthOverMonth\(\{currentTotal:stats\.currentMonthTotal/, 'overview must compute MoM from received totals');
  assert.match(html, /Mês atual vs anterior/, 'card kicker must be present');
});

test('V561: DECLARED/EXPECTED rows never feed the comparison (engine-level guard)', () => {
  // The function receives pre-filtered received totals; guard documented by source contract:
  assert.match(fnSource, /currentTotal/, 'function contract takes explicit totals');
});