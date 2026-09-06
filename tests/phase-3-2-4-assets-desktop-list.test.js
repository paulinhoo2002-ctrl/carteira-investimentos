const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Phase 3.2.4: Ativos usa linhas de categoria em largura total no desktop', () => {
  assert.match(source, /Phase 3\.2\.4: desktop Ativos uses full-width category rows/);
  assert.match(source, /\.assets-premium-shell \.ag-wrap\{\n    display:flex!important;flex-direction:column/);
  assert.match(source, /grid-template-columns:minmax\(240px,1\.1fr\) minmax\(0,3fr\) 32px/);
});

test('Phase 3.2.4: tabela expandida permanece contida e com colunas financeiras explícitas', () => {
  assert.match(source, /\.assets-premium-shell \.ag-table \.ts\{overflow-x:auto\}/);
  assert.match(source, /\.assets-premium-shell \.ag-mobile-list\{display:flex;flex-direction:column;gap:8px\}/);
  assert.match(source, /\.assets-premium-shell \.ag-table\{display:none!important\}/);
  assert.match(source, /<th>Nome<\/th>/);
  assert.match(source, /<th>Valor atual<\/th><th>Resultado R\$<\/th><th>Resultado %<\/th>/);
  assert.match(source, /<th>DY<\/th><th>Div\. est\.\/mês<\/th><th>Participação<\/th><th>Ações<\/th>/);
  assert.match(source, /asset-group-table-name/);
});

test('Phase 3.2.4: Renda Fixa continua resumida em Ativos e dedicada à rota própria', () => {
  assert.match(source, /Gestão detalhada em Renda Fixa/);
  assert.match(source, /onclick="go\('renda-fixa'\)"/);
  assert.match(source, /const premiumRfRows = ''/);
});

test('Phase 3.2.4: busca revela a categoria filtrada e limpar retorna ao estado fechado', () => {
  assert.match(source, /S\.activeAssetsGroup='';\n      render\(\);/);
  assert.match(source, /S\.assetsSearchTimer = setTimeout\(\(\) => \{\n      S\.assetsSearch = normalized;\n      S\.activeAssetsGroup='';/);
});
