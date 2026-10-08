const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
function runtime() {
  const context = { Date, console, DividendIntelligence: require('../dividend-intelligence.js'), esc: String, fmt: n => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function dividendAnnualMatrixData('), source.indexOf('function dividendAnnualMatrixToggleButton(')), context);
  return context;
}
const year = new Date().getFullYear() - 1;
const key = month => `${year}-${String(month).padStart(2, '0')}`;
const complete = { state: 'COMPLETE', source: 'synthetic-month-statement', fullMonthConfirmed: true };
test('complete empty month alone permits confirmed zero; unknown/partial never do', () => {
  const ctx = runtime();
  const rows = ctx.dividendAnnualMatrixData([], { [key(1)]: complete, [key(2)]: { state: 'PARTIAL' }, [key(3)]: { state: 'COMPLETE' } });
  assert.equal(rows[0].months[0].coverage, 'COMPLETE');
  assert.equal(rows[0].months[0].total, 0);
  assert.equal(rows[0].months[1].coverage, 'PARTIAL');
  assert.equal(rows[0].months[1].total, null);
  assert.equal(rows[0].months[2].coverage, 'UNKNOWN');
  const html = ctx.dividendAnnualMatrixView(rows);
  assert.match(html, /R\$\s*0,00/);
  assert.match(html, /Cobertura de dados não confirmada/);
  assert.match(html, /Parcial/);
  const invalid = ctx.dividendAnnualMatrixData([{ monthKey: key(1), value: null, state: 'PAID' }], { [key(1)]: complete })[0];
  assert.equal(invalid.months[0].coverage, 'PARTIAL');
  assert.equal(invalid.months[0].total, null, 'Valor ausente não permite zero nem cobertura completa');
});
test('average/projection only use complete months; annual received excludes announced/estimated/future', () => {
  const ctx = runtime();
  const records = [
    { monthKey: key(1), value: 100, state: 'PAID' },
    { monthKey: key(2), value: 200, state: 'PAID' },
    { monthKey: key(3), value: 300, state: 'PAID' },
    { monthKey: key(1), value: 999, state: 'ANNOUNCED' },
    { monthKey: key(1), value: 999, state: 'ESTIMATED' },
    { monthKey: key(1), value: 999, state: 'DECLARED' },
    { monthKey: key(1), value: 999, state: 'EXPECTED' },
  ];
  const row = ctx.dividendAnnualMatrixData(records, { [key(1)]: complete, [key(4)]: complete, [key(3)]: { state: 'PARTIAL' } })[0];
  assert.equal(row.annualTotal, 600);
  assert.equal(row.completeCount, 2);
  assert.equal(row.annualMean, 50);
  assert.equal(row.annualProjection, 600);
  assert.equal(ctx.dividendAnnualMatrixData(records)[0].annualMean, null);
  assert.equal(ctx.dividendAnnualMatrixData(records)[0].annualProjection, null);
  const futureKey = `${year + 2}-01`;
  const future = ctx.dividendAnnualMatrixData([{ monthKey: futureKey, value: 99, state: 'PAID' }], { [futureKey]: complete })[0];
  assert.equal(future.months[0].coverage, 'FUTURE');
  assert.equal(future.months[0].total, null);
  assert.equal(future.annualTotal, null);
  assert.doesNotMatch(ctx.dividendAnnualMatrixView([future]), /R\$\s*99,00/);
});
