const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../dividend-intelligence');

const rows = [
  { id: 'd1', date: '2026-01-15', ticker: 'AAA3', type: 'Dividendo', value: 100, assetClass: 'Ação', source: 'ledger' },
  { id: 'j1', date: '2026-01-20', ticker: 'AAA3', type: 'JCP', value: 50, assetClass: 'Ação', source: 'ledger' },
  { id: 'f1', date: '2026-02-10', ticker: 'BBB11', type: 'Rendimento', value: 80, assetClass: 'FII', source: 'ledger' },
  { id: 'a1', date: '2026-03-10', ticker: 'CCC3', type: 'Dividendo', value: 90, assetClass: 'Ação', state: 'ANNOUNCED', source: 'official' },
  { id: 'e1', date: '2026-04-10', ticker: 'DDD3', type: 'Dividendo', value: 70, state: 'ESTIMATED', source: 'model' },
];

test('separa pagos de anunciados e estimados sem writes', () => {
  const result = D.buildDividendIntelligence({ rows, now: new Date('2026-04-30T12:00:00') });
  assert.equal(result.writeEnabled, false);
  assert.equal(result.monthly.total, 230);
  assert.equal(result.ytdPaidIncome, 230);
  assert.equal(result.calendar.length, 4);
  assert.equal(result.semantics.announcedIsNotPaid, true);
});

test('deduplica apenas identidade repetida e reconcilia por classe/tipo', () => {
  const result = D.buildDividendIntelligence({ rows: [...rows, { ...rows[0] }], now: new Date('2026-04-30T12:00:00') });
  assert.equal(result.paidEvents.length, 3);
  assert.equal(result.byClass.find(row => row.name === 'Ação').paidIncome, 150);
  assert.equal(result.byType.find(row => row.name === 'FII_INCOME').paidIncome, 80);
});

test('sobreposição entre fontes usa identidade econômica quando não há ID canônico', () => {
  const result = D.buildDividendIntelligence({ rows: [
    { id: 'b3-1', date: '2026-02-10', ticker: 'BBB11', type: 'Rendimento', value: 80, assetClass: 'FII', source: 'B3' },
    { id: 'ref-1', date: '2026-02-10', ticker: 'BBB11', type: 'Rendimento', value: 80, assetClass: 'FII', source: 'reference' },
  ] });
  assert.equal(result.paidEvents.length, 1);
  assert.equal(result.monthly.total, 80);
});

test('datas legadas e cobertura desconhecida permanecem explícitas', () => {
  assert.equal(D.normalizeIncomeEvent({ date: '15/02/2026', type: 'Rendimento FII', value: 10 }).date, '2026-02-15');
  const result = D.buildDividendIntelligence({ rows: [{ ticker: 'AAA3', value: 10, type: 'Dividendo' }] });
  assert.equal(result.monthly.coverage, 'UNAVAILABLE');
  assert.equal(result.ytdPaidIncome, 0);
});

test('zero legítimo não é ausência e mês é timezone-safe', () => {
  const result = D.buildDividendIntelligence({ rows: [{ id: 'z', date: '2026-02-01', ticker: 'AAA3', type: 'Dividendo', value: 0 }], now: new Date('2026-02-15T12:00:00') });
  assert.equal(result.monthly.total, 0);
  assert.equal(result.monthly.eventCount, 1);
  assert.equal(result.monthly.coverage, 'FULL_COVERAGE');
});
