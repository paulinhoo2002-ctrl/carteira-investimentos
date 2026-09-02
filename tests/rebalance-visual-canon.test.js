const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Rebalancear mantém a distribuição e a semântica oficial no markup', () => {
  assert.match(source, /rebalanceContributionDistribution\(aporte\)/);
  assert.match(source, /row\.gapPct>0\?'above':row\.gapPct<0\?'below'/);
  assert.match(source, /Acima da meta/);
  assert.match(source, /Abaixo da meta/);
  assert.match(source, /Não é recomendação de compra, venda ou manutenção/);
});

test('Rebalancear mantém cenários somente informativos e sem truncamento financeiro mobile', () => {
  assert.match(source, /Nada é executado ou gravado/);
  assert.match(source, /não representam recomendação, prioridade de mercado nem alteração da carteira/);
  assert.match(source, /\.rebalance-shell \.rebalance-scenario-results\{grid-template-columns:1fr\}/);
  assert.match(source, /\.rebalance-shell \.rebalance-summary-value\{white-space:normal;overflow-wrap:anywhere\}/);
});
