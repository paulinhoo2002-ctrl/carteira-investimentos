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
  // Contrato V16: rolagem contida no componente (.assets-table-wrap), cartões no mobile e colunas financeiras explícitas.
  assert.match(source, /#ativosAccordion .assets-table-wrap\{overflow-x:auto/);
  assert.match(source, /class="asset-mobile-cards"/);
  assert.match(source, /data-testid="col-ticker"/);
  assert.match(source, /<th class="num">Preço médio<\/th>\s*<th class="num">Preço atual \/ posição<\/th>/);
  assert.match(source, /assetSortableHeader\(type,\'pm\',\'Investido\'\)[\s\S]*?assetSortableHeader\(type,\'result\',\'Resultado R\$\'\)[\s\S]*?assetSortableHeader\(type,\'rentability\',\'Rentabilidade\'\)/);
  assert.match(source, /assetSortableHeader\(type,\'total\',\'Valor total\'\)[\s\S]*?assetSortableHeader\(type,\'share\',\'% carteira\'\)/);
  assert.match(source, /assetSortableHeader\(type,\'dy\',\'DY\'\)/);
  assert.match(source, /<th>Ações<\/th>/);
  assert.match(source, /data-asset-group="\$\{esc\(type\)}"/);
});

test('Ativos Premium usa texto semântico nas colunas de identidade e valor total', () => {
  assert.match(source, /\.assets-premium-table \.col-ticker\{[^}]*color:var\(--text\)/);
  assert.match(source, /\.assets-premium-table \.col-total\{[^}]*color:var\(--text\)/);
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
