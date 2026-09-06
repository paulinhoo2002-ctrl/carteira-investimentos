const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Phase 3.2.5: grupos reutilizam análise, filtros, ordenação e ações canônicas', () => {
  assert.match(source, /const canonicalAnalysisByTicker = new Map\(assetAnalysisRows\(\)/);
  assert.match(source, /filterAssetsForDisplay\(items\)/);
  assert.match(source, /sortAssetsByGroup\(type, displayItems, portfolioTotal\)/);
  assert.match(source, /assetActionMenuHtml\(a, false, `group-\$\{groupKey\}`\)/);
  assert.match(source, /openAssetQuickMovement/);
  assert.match(source, /edA/);
});

test('Phase 3.2.5: tabela agrupada restaura inteligência financeira rica', () => {
  assert.match(source, /<th>Tipo<\/th><th>Setor<\/th>/);
  assert.match(source, /<th>Resultado R\$<\/th><th>Rentab\. %<\/th><th>Alvo<\/th><th>Valor total<\/th><th>% carteira<\/th><th>% ideal<\/th><th>Div\. est\.\/mês<\/th><th>DY<\/th>/);
  assert.match(source, /const alvo=Number\(a\.price_target\)/);
  assert.match(source, /Number\(a\.ideal_pct\)>0/);
  assert.match(source, /const dm=Number\.isFinite\(marketValue\)&&Number\.isFinite\(dy\)/);
  assert.match(source, /class="result-indicator \$\{resultClass\}"/);
});

test('Phase 3.2.5: cores semânticas distinguem positivo, negativo, zero e ausência', () => {
  assert.match(source, /result>0\?'pos':result<0\?'neg':'neutral'/);
  assert.match(source, /rentab>0\?'pos':rentab<0\?'neg':'neutral'/);
  assert.match(source, /var\(--success\)/);
  assert.match(source, /var\(--danger\)/);
  assert.match(source, /var\(--muted\)/);
  assert.match(source, /Number\.isFinite\(result\).*'—'/);
});

test('Phase 3.2.5: mobile preserva cartões compactos com contexto adicional', () => {
  assert.match(source, /asset-premium-card-row.*Resultado/);
  assert.match(source, /asset-premium-card-row.*Rentab\./);
  assert.match(source, /% ideal/);
  assert.match(source, /Div\. est\.\/mês/);
});

test('Phase 3.2.5: Renda Fixa segue resumida em Ativos e dedicada à própria rota', () => {
  assert.match(source, /const rfSummaryCards=/);
  assert.match(source, /assetActionMenuHtml\(a,true,'group-rf-'\+groupKey\)/);
  assert.match(source, /onclick="go\('renda-fixa'\)"/);
  assert.match(source, /const premiumRfRows = ''/);
});

test('Phase 3.2.5: CTA de rebalanceamento abre o destino canônico', () => {
  assert.match(source, /assets-allocation-link[^>]*onclick="go\('ajudar'\)"/);
  assert.doesNotMatch(source, /assets-allocation-link[^>]*onclick="go\('rebalancear'\)"/);
});
