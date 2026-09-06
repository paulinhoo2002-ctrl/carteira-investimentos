const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Phase 3.2.5C: tabela agrupada preserva todas as colunas historicas no desktop', () => {
  assert.match(source, /<th>Tipo<\/th><th>Setor<\/th>/);
  assert.match(source, /<th>Resultado R\$<\/th><th>Rentab\. %<\/th><th>Alvo<\/th>/);
  assert.match(source, /<th>Valor total<\/th><th>% carteira<\/th><th>% ideal<\/th>/);
  assert.match(source, /<th>Div\. est\.\/mês<\/th><th>DY<\/th><th>Ações<\/th>/);
  assert.match(source, /ag-table \.tw table\{[\s\S]*?min-width:1580px/);
  assert.match(source, /ag-table \.tw table th:nth-child\(3\),[\s\S]*?display:table-cell/);
});

test('Phase 3.2.5C: mobile preserva a área secundaria completa sem nova tabela', () => {
  for (const label of ['Setor', 'Preço alvo', '% Ideal', 'DY', 'Div. est./mês']) {
    assert.match(source, new RegExp(`asset-premium-card-label">${label.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`));
  }
  assert.match(source, /asset-premium-card-action[^>]*>Comprar<\/button>/);
  assert.match(source, /asset-premium-card-action[^>]*>Vender<\/button>/);
  assert.match(source, /asset-premium-card-action[^>]*>Editar<\/button>/);
});

test('Phase 3.2.5C: coluna de ações permanece sticky e a Renda Fixa continua dedicada', () => {
  assert.match(source, /ag-table \.tw table th:last-child,[\s\S]*?position:sticky/);
  assert.match(source, /onclick="go\('renda-fixa'\)"/);
  assert.match(source, /const premiumRfRows = ''/);
});
