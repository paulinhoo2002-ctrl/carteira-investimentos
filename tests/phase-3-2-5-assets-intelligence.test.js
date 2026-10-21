const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Phase 3.2.5: grupos reutilizam análise, filtros, ordenação e ações canônicas', () => {
  assert.match(source, /const canonicalAnalysisByTicker = new Map\(assetAnalysisRows\(\)\.map\(row => \[row\.ticker, row\]\)\)/);
  assert.match(source, /const typeDisplayAssets = sortAssetsByGroup\(type, filteredAssets, portfolioTotal\)/);
  assert.match(source, /assetActionMenuHtml\(a, isRF, 'desktop'\)/);
  assert.match(source, /assetActionMenuHtml\(a, isRF, 'mobile'\)/);
  assert.match(source, /openAssetQuickMovement/);
  assert.match(source, /edA/);
});

test('Phase 3.2.5: tabela agrupada restaura inteligência financeira rica', () => {
  assert.match(source, /<th>Setor<\/th>/);
  assert.match(source, /<th class="num">Preço médio<\/th>\s*<th class="num">Preço atual \/ posição<\/th>/);
  assert.match(source, /<th>Investido<\/th>\s*<th class="num">Resultado R\$<\/th>\s*<th class="num">Rentabilidade<\/th>/);
  assert.match(source, /<th class="num">Valor total<\/th>\s*<th class="num">% carteira<\/th>/);
  assert.match(source, /<th class="num">DY<\/th>/);
  assert.match(source, /<th class="num">Estimativa mensal<\/th>/);
  assert.match(source, /Sem estimativa mensal validada/);
});

test('Phase 3.2.5: cores semânticas distinguem positivo, negativo, zero e ausência', () => {
  assert.match(source, /result>0\?'pos':result<0\?'neg':'neutral'/);
  assert.match(source, /returnPct == null \? '' : returnPct > 0 \? 'positive-text' : returnPct < 0 \? 'negative-text' : ''/);
  assert.match(source, /var\(--success\)/);
  assert.match(source, /var\(--danger\)/);
  assert.match(source, /var\(--muted\)/);
  assert.match(source, /Number\.isFinite\(result\).*'—'/);
});

test('Phase 3.2.5: mobile preserva cartões compactos com contexto adicional', () => {
  assert.match(source, /asset-premium-card-row"><span>\$\{resultLabel\} R\$<\/span>/);
  assert.match(source, /asset-premium-card-row"><span>\$\{returnLabel\}<\/span>/);
  assert.match(source, /asset-premium-card-row"><span>Setor<\/span>/);
  assert.match(source, /asset-premium-card-row"><span>Preço médio<\/span>/);
  assert.match(source, /asset-premium-card-row"><span>DY<\/span>/);
});

test('Phase 3.2.5: Renda Fixa segue resumida em Ativos e dedicada à própria rota', () => {
  assert.match(source, /const rfSummaryCards = typeDisplayAssets\.map\(a => \{/);
  assert.match(source, /assetActionMenuHtml\(a, true, `group-rf-\$\{a\.id\}`\)/);
  assert.match(source, /onclick="go\('renda-fixa'\)"/);
  assert.match(source, /Gestão detalhada em Renda Fixa/);
});

test('Phase 3.2.5: CTA de rebalanceamento abre o destino canônico', () => {
  // O destino canônico de rebalanceamento continua 'ajudar': a navegação usa a
  // rota direta e qualquer destino legado é redirecionado para ela.
  assert.match(source, /mobileMenuClose\(\);go\('ajudar'\)"/);
  assert.match(source, /if\(t==='rebalancear'\) t='ajudar';/);
  assert.doesNotMatch(source, /assets-allocation-link[^>]*onclick="go\('rebalancear'\)"/);
});
