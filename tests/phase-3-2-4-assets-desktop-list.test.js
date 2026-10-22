const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Phase 3.2.4: Ativos usa linhas de categoria em largura total no desktop', () => {
  assert.match(source, /Phase 3\.2\.4: desktop Ativos uses full-width category rows/);
  assert.match(source, /\.assets-premium-shell \.ag-wrap\{\r?\n    display:flex!important;flex-direction:column/);
  assert.match(source, /grid-template-columns:minmax\(180px,1\.1fr\) repeat\(5,minmax\(0,1fr\)\) 30px/);
});

test('Phase 3.2.4: tabela expandida permanece contida e com colunas financeiras explícitas', () => {
  assert.match(source, /\.assets-premium-shell \.ag-table \.ts\{overflow-x:auto\}/);
  assert.match(source, /\.assets-premium-shell \.ag-mobile-list\{display:flex;flex-direction:column;gap:8px\}/);
  assert.match(source, /\.assets-premium-shell \.ag-table\{display:none!important\}/);
  assert.match(source, /<th>Ativo<\/th>/);
  assert.match(source, /<th class="num">Preço médio<\/th>\s*<th class="num">Preço atual \/ posição<\/th>/);
  assert.match(source, /<th>Investido<\/th>\s*<th class="num">Resultado R\$<\/th>\s*<th class="num">Rentabilidade<\/th>/);
  assert.match(source, /<th class="num">Valor total<\/th>\s*<th class="num">% carteira<\/th>/);
  assert.match(source, /<th class="num">DY<\/th>/);
  assert.match(source, /<th>Ações<\/th>/);
  assert.match(source, /data-asset-group="\$\{esc\(type\)\}"/);
});

test('Phase 3.2.4: Renda Fixa continua resumida em Ativos e dedicada à rota própria', () => {
  assert.match(source, /Gestão detalhada em Renda Fixa/);
  assert.match(source, /onclick="go\('renda-fixa'\)"/);
  // Resumo por título substitui a antiga exclusão premiumRfRows: a categoria RF
  // não renderiza a tabela genérica de ativos.
  assert.match(source, /const rfSummaryCards = typeDisplayAssets\.map\(a => \{/);
  assert.match(source, /rf-category-summary/);
});

test('Phase 3.2.4: busca revela a categoria filtrada e limpar retorna ao estado fechado', () => {
  assert.match(source, /S\.activeAssetsGroup='';\r?\n\s*render\(\);/);
  assert.match(source, /S\.assetsSearchTimer = setTimeout\(\(\) => \{\r?\n\s*S\.assetsSearch = normalized;\r?\n\s*S\.activeAssetsGroup='';/);
});
