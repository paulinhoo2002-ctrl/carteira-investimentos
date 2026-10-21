const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Phase 3.2.1: Ativos e Renda Fixa usam rotas independentes', () => {
  assert.match(source, /if\(S\.tab==='renda-fixa'\)return rendaFixaTab\(\);/);
  assert.match(source, /if\(t==='renda-fixa'\)\{\s*S\.tab='renda-fixa';/);
  assert.match(source, /navItem\('renda-fixa','Renda Fixa','🧾',S\.tab==='renda-fixa'\)/);
  assert.match(source, /if\(t==='ativos'\)\{[\s\S]*?S\.assetsInnerTab='patrimonio';[\s\S]*?S\.activeAssetsGroup='';/);
});

test('Phase 3.2.1: Ativos prioriza categorias recolhíveis e não duplica a tabela de RF', () => {
  // Categorias seguem acordeões <details>; a abertura transitória é controlada
  // pelos filtros ativos, sem persistir estado de acordeão.
  assert.match(source, /const categoryOpen = assetFiltersActive && typeDisplayAssets\.length > 0;/);
  assert.match(source, /<details class="accordion-category ag" data-asset-group="\$\{esc\(type\)\}"\$\{categoryOpen \? ' open' : ''\}>/);
  assert.match(source, /Gestão detalhada em Renda Fixa/);
  assert.match(source, /onclick="go\('renda-fixa'\)"\>Ver Renda Fixa/);
  assert.doesNotMatch(source, /id="assets-premium-rf-table-desktop"/);
  // A categoria RF renderiza o resumo por título e retorna antes da tabela genérica.
  assert.match(source, /if \(type === 'Renda Fixa'\) \{[\s\S]*?const rfSummaryCards = typeDisplayAssets\.map\(a => \{[\s\S]*?rf-category-summary[\s\S]*?return `<details class="accordion-category ag" data-asset-group="\$\{esc\(type\)\}"/);
});

test('Phase 3.2.1: busca e limpeza controlam a abertura transitória sem persistir acordeão', () => {
  assert.match(source, /S\.assetsSearch = normalized;\s*\r?\n\s*S\.activeAssetsGroup='';/);
  assert.match(source, /S\.activeAssetsGroup='';\s*S\.assetsFilterPanelOpen=false;/);
  assert.match(source, /function toggleAssetGroup\(type, evOrOpen\)/);
  assert.doesNotMatch(source, /save\(\)[^\n]*activeAssetsGroup/);
});

test('Phase 3.2.1: filtros continuam aplicados ao agrupamento por categoria', () => {
  assert.match(source, /const displayAssets = filterAssetsForDisplay\(S\.assets\);/);
  assert.match(source, /const filteredAssets = assets\.filter\(a => displayAssets\.includes\(a\)\);/);
  assert.match(source, /if \(filteredAssets\.length === 0\) return '';/);
  assert.match(source, /setAssetsSectorFilter\(this\.value\)/);
  assert.match(source, /setAssetsPerformanceFilter\(this\.value\)/);
});
