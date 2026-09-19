const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('reuses the V213 helper for asset history and provenance', () => {
  assert.match(html, /V213TransactionTrust\?\.assetTransactions/);
  assert.match(html, /V213TransactionTrust\?\.provenanceFacts/);
});

test('keeps asset detail history and income as separate read-only panels', () => {
  assert.match(html, /Histórico de movimentações/);
  assert.match(html, /Proventos do ativo/);
  assert.match(html, /Sem comparação artificial quando a data-base não é comparável/);
});

test('renders unavailable asset values as a dash', () => {
  assert.match(html, /const valueText=Number\.isFinite\(current\)\?fmt\(current\):'—'/);
  assert.match(html, /Number\.isFinite\(result\)\?assetSignedMoneyText\(result\):'—'/);
});

test('preserves manual fixed-income authority language', () => {
  assert.match(html, /O detalhe preserva a autoridade do valor já cadastrado/);
  assert.match(html, /Valuation automático indisponível/);
});
