const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Phase 3.2.5B: categoria aberta mantém a coluna de ações acessível no desktop', () => {
  assert.match(source, /ag-table \.tw table th:last-child,[\s\S]*?position:sticky/);
  assert.match(source, /ag-table \.tw table td:last-child[\s\S]*?background:var\(--panel\)/);
  assert.match(source, /box-shadow:-8px 0 12px/);
});

test('Phase 3.2.5B: detalhes mobile permanecem legíveis e com ações protegidas', () => {
  assert.match(source, /asset-premium-card-expanded[\s\S]*?background:var\(--surface\)/);
  assert.match(source, /asset-premium-card-actions[\s\S]*?z-index:1/);
  assert.match(source, /asset-premium-card-action\{[^}]*min-height:48px/);
});
