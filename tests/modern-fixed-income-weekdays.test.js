const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const weekdaysModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'domain',
  'fixedIncome',
  'fixedIncomeWeekdays.ts',
);

async function loadWeekdays() {
  return import(pathToFileURL(weekdaysModulePath).href);
}

test('countWeekdays: segunda a sexta = 4 (exclui inicial, inclui final)', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-05', '2026-01-09'), 4);
});

test('countWeekdays: mesma data = 0', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-05', '2026-01-05'), 0);
});

test('countWeekdays: segunda a terca = 1', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-05', '2026-01-06'), 1);
});

test('countWeekdays: sexta a segunda = 1', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-09', '2026-01-12'), 1);
});

test('countWeekdays: segunda a domingo = 4', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-05', '2026-01-11'), 4);
});

test('countWeekdays: sabado a sabado = 0', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-10', '2026-01-10'), 0);
});

test('countWeekdays: intervalo negativo retorna null', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-06-30', '2026-01-01'), null);
});

test('countWeekdays: data invalida 2026-02-30 retorna null', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-02-30', '2026-03-01'), null);
});

test('countWeekdays: fromISO invalido retorna null', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('not-a-date', '2026-01-10'), null);
});

test('countWeekdays: toISO invalido retorna null', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-10', 'not-a-date'), null);
});

test('countWeekdays: aceita timestamp ISO valido e extrai parte calendario UTC', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-05T10:30:00.000Z', '2026-01-09T15:00:00.000Z'), 4);
});

test('countWeekdays: sexta a segunda com timestamp ISO', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-09T23:59:59.000Z', '2026-01-12T00:00:00.000Z'), 1);
});

test('countWeekdays: 2026-02-30T00:00:00Z retorna null', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-02-30T00:00:00Z', '2026-03-01'), null);
});

test('countWeekdays: 2026-04-31T10:30:00-03:00 retorna null', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-03-01', '2026-04-31T10:30:00-03:00'), null);
});

test('countWeekdays: 01/05/2026 retorna null', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('01/05/2026', '2026-01-10'), null);
});

test('countWeekdays: 2026/01/05 retorna null', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026/01/05', '2026-01-10'), null);
});

test('countWeekdays: Jan 5 2026 retorna null', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('Jan 5 2026', '2026-01-10'), null);
});

test('countWeekdays: timestamp ISO com offset valido', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-05T10:30:00+03:00', '2026-01-09T15:00:00+03:00'), 4);
});

test('countWeekdays: timestamp ISO com offset negativo valido', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-05T10:30:00-03:00', '2026-01-09T15:00:00-03:00'), 4);
});

test('countWeekdays: timestamp sem timezone retorna null', async () => {
  const { countWeekdays } = await loadWeekdays();
  assert.equal(countWeekdays('2026-01-05T10:30:00', '2026-01-09T15:00:00'), null);
});
