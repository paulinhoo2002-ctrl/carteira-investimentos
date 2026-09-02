import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = source.indexOf('function rfMaturityReviewGroups(data){');
const end = source.indexOf('function rendaFixaTab(){', start);
assert.ok(start >= 0 && end > start, 'review queue helper must remain discoverable');
const helper = `${source.slice(start, end)}; globalThis.rfMaturityReviewGroups=rfMaturityReviewGroups;`;
const evaluate = new Function(`${helper}\nreturn globalThis.rfMaturityReviewGroups;`);
const rfMaturityReviewGroups = evaluate();

test('groups RF positions by the official maturity bucket without overlap', () => {
  const rows = [
    { ticker: 'MISSING', bucket: 'Sem vencimento' },
    { ticker: 'SOON90', bucket: 'Próximos 90 dias' },
    { ticker: 'OVERDUE', bucket: 'Vencido' },
    { ticker: 'SOON30', bucket: 'Próximos 30 dias' },
  ];
  const groups = rfMaturityReviewGroups({ tableRows: rows });
  assert.deepEqual(groups.map(group => group.rows.map(row => row.ticker)), [
    ['OVERDUE'],
    ['SOON30'],
    ['SOON90'],
    ['MISSING'],
  ]);
  assert.equal(groups.reduce((total, group) => total + group.rows.length, 0), rows.length);
});

test('preserves the existing table order inside each review group', () => {
  const rows = [
    { ticker: 'LATER', bucket: 'Próximos 30 dias' },
    { ticker: 'EARLIER', bucket: 'Próximos 30 dias' },
  ];
  const group = rfMaturityReviewGroups({ tableRows: rows })[1];
  assert.deepEqual(group.rows.map(row => row.ticker), ['LATER', 'EARLIER']);
});

test('returns empty groups for a portfolio with no review points', () => {
  const groups = rfMaturityReviewGroups({ tableRows: [{ ticker: 'FUTURE', bucket: 'Acima de 12 meses' }] });
  assert.deepEqual(groups.map(group => group.rows.length), [0, 0, 0, 0]);
});
