const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Phase 3.2.5C: tabela agrupada preserva todas as colunas historicas no desktop', () => {
  assert.match(source, /<th>Setor<\/th>/);
  assert.match(source, /<th class="num">Preço médio<\/th>\s*<th class="num">Preço atual \/ posição<\/th>/);
  assert.match(source, /<th>Investido<\/th>\s*<th class="num">Resultado R\$<\/th>/);
  assert.match(source, /<th class="num">Valor total<\/th>\s*<th class="num">% carteira<\/th>/);
  assert.match(source, /<th class="num">DY<\/th>\s*<th class="num">Estimativa mensal<\/th>\s*<th>Ações<\/th>/);
  assert.match(source, /ag-table \.tw table\{[\s\S]*?min-width:1580px/);
  assert.match(source, /ag-table \.tw table th:nth-child\(3\),[\s\S]*?display:table-cell/);
});

test('Phase 3.2.5C: mobile preserva a área secundaria completa sem nova tabela', () => {
  for (const label of ['Setor', 'Quantidade', 'Preço médio', 'Investido', 'DY', 'Estimativa mensal']) {
    assert.match(source, new RegExp(`asset-premium-card-row"><span>${label.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`));
  }
  // Ações canônicas continuam disponíveis no cartão via menu acessível.
  assert.match(source, /role="menu" aria-label="Ações para /);
  assert.match(source, /onclick='openAssetQuickMovement\(\$\{JSON\.stringify\(id\)\}, "compra"\)'>Comprar<\/button>/);
  assert.match(source, /onclick='openAssetQuickMovement\(\$\{JSON\.stringify\(id\)\}, "venda"\)'>Vender<\/button>/);
  assert.match(source, /onclick='edA\(\$\{JSON\.stringify\(id\)\}\)'>Editar<\/button>/);
});

test('Phase 3.2.5C: coluna de ações permanece sticky e a Renda Fixa continua dedicada', () => {
  assert.match(source, /ag-table \.tw table th:last-child,[\s\S]*?position:sticky/);
  assert.match(source, /onclick="go\('renda-fixa'\)"/);
  assert.match(source, /const rfSummaryCards = typeDisplayAssets\.map\(a => \{/);
});
