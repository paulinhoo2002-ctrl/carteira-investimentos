const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Phase 3.2.5D: Renda Fixa mantém resumo rico e resultado explícito', () => {
  assert.match(source, /Aplicado<\/small><b>\$\{fmt\(applied\)\}<\/b>/);
  assert.match(source, /Atual<\/small><b>\$\{Number\.isFinite\(current\)\?fmt\(current\):'—'\}<\/b>/);
  assert.match(source, /Resultado<\/small><b>\$\{Number\.isFinite\(profit\)\?assetSignedMoneyText\(profit\):'—'\}<\/b>/);
  assert.match(source, /Rentab\.<\/small><b>\$\{Number\.isFinite\(rentab\)\?fmtP\(rentab\):'—'\}<\/b>/);
  assert.match(source, /Gestão detalhada em Renda Fixa/);
  assert.match(source, /onclick="go\('renda-fixa'\)"/);
});

test('Phase 3.2.5D: resumo de Renda Fixa é legível no mobile', () => {
  assert.match(source, /@media\(max-width:767px\)\{[\s\S]*?rf-category-row\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(source, /rf-category-identity\{grid-column:1\/-1\}/);
  assert.match(source, /rf-category-row>div:last-child \.asset-action\{flex:1 1 0\}/);
});

test('Phase 3.2.5D: menu secundário de ativos escapa do empilhamento da tabela', () => {
  assert.match(source, /menu\.__assetMenuParent=menu\.parentElement/);
  assert.match(source, /document\.body\.appendChild\(menu\)/);
  assert.match(source, /menu\.style\.position='fixed'/);
  assert.match(source, /menu\.__assetMenuParent\.insertBefore\(menu,menu\.__assetMenuNextSibling\)/);
});

test('Phase 3.2.5E: grouped e todos os ativos preservam o cabeçalho histórico', () => {
  assert.equal((source.match(/class="assets-table-caption"/g) || []).length, 2);
  assert.match(source, /class="assets-table-caption">Posições atuais, custo, valor de mercado, resultado e peso na carteira<\/caption>/);
});
