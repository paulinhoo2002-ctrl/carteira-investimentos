const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const parserModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'domain',
  'fixedIncome',
  'fixedIncomeRateParser.ts',
);

async function loadParser() {
  return import(pathToFileURL(parserModulePath).href);
}

test('parseContractRate: aceita formato basico 10%', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('10%'), 0.10);
});

test('parseContractRate: aceita 10% aa', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('10% aa'), 0.10);
});

test('parseContractRate: aceita 10% a.a.', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('10% a.a.'), 0.10);
});

test('parseContractRate: aceita virgula decimal 8,5% aa', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('8,5% aa'), 0.085);
});

test('parseContractRate: aceita ponto decimal 8.5% a.a.', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('8.5% a.a.'), 0.085);
});

test('parseContractRate: rejeita CDI + 1,10%', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('CDI + 1,10%'), null);
});

test('parseContractRate: rejeita IPCA + 5,80% aa', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('IPCA + 5,80% aa'), null);
});

test('parseContractRate: rejeita 100% CDI', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('100% CDI'), null);
});

test('parseContractRate: rejeita PRE 10% aa', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('PRE 10% aa'), null);
});

test('parseContractRate: rejeita POS', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('POS'), null);
});

test('parseContractRate: rejeita 5% a.m.', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('5% a.m.'), null);
});

test('parseContractRate: rejeita 10% ao ano', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('10% ao ano'), null);
});

test('parseContractRate: rejeita zero por cento', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('0%'), null);
});

test('parseContractRate: rejeita negativo', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate('-5% aa'), null);
});

test('parseContractRate: rejeita string vazia', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate(''), null);
});

test('parseContractRate: rejeita null', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate(null), null);
});

test('parseContractRate: rejeita undefined', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate(undefined), null);
});

test('parseContractRate: rejeita objeto', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate({}), null);
});

test('parseContractRate: rejeita numero puro', async () => {
  const { parseContractRate } = await loadParser();
  assert.equal(parseContractRate(10), null);
});
