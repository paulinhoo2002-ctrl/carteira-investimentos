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
  assert.match(source, /const isOpen=S\.activeAssetsGroup===type \|\| \(!S\.activeAssetsGroup && !!S\.assetsSearch && idx===0\)/);
  assert.match(source, /<details class="assets-all-assets" ontoggle=/);
  assert.match(source, /Gestão detalhada em Renda Fixa/);
  assert.match(source, /onclick="go\('renda-fixa'\)"\>Ver Renda Fixa/);
  assert.doesNotMatch(source, /id="assets-premium-rf-table-desktop"/);
});

test('Phase 3.2.1: busca e limpeza controlam a abertura transitória sem persistir acordeão', () => {
  assert.match(source, /if\(!normalized\) S\.activeAssetsGroup='';/);
  assert.match(source, /S\.activeAssetsGroup='';\s*S\.assetsFilterPanelOpen=false;/);
  assert.match(source, /function toggleAssetGroup\(type, evOrOpen\)/);
  assert.doesNotMatch(source, /save\(\)[^\n]*activeAssetsGroup/);
});

test('Phase 3.2.1: filtros continuam aplicados ao agrupamento por categoria', () => {
  assert.match(source, /const displayItems = filterAssetsForDisplay\(items\);/);
  assert.match(source, /groupNames\.filter\(type=>filterAssetsForDisplay\(grouped\.get\(type\)\)\.length\)/);
  assert.match(source, /setAssetsSectorFilter\(this\.value\)/);
  assert.match(source, /setAssetsPerformanceFilter\(this\.value\)/);
});
