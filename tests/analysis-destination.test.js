import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Análise é uma rota dedicada que reutiliza o pipeline oficial', () => {
  assert.match(source, /if\(S\.tab==='analise'\)\s+return analysisDestination\(\);/);
  assert.match(source, /function analysisDestination\(\)\{[\s\S]*const rows=assetAnalysisRows\(\);[\s\S]*assetAnalysisBlock\(rows\)/);
  assert.match(source, /navItem\('analise','Análise'/);
  assert.doesNotMatch(source, /navItemInner\('analise','Fundos'/);
});

test('Análise é acessível no mobile e na busca global', () => {
  assert.match(source, /go\('analise'\)/);
  assert.match(source, /PORTFOLIO_SEARCH_GROUPS=.*analysis:'Análise'/);
  assert.match(source, /PORTFOLIO_SEARCH_GROUPS=.*analysis:'Navegação'/);
  assert.match(source, /kind:'analysis',id:'analise'.*route:'analise'/);
  assert.match(source, /'ia','analise','irpf','settings'/);
  assert.doesNotMatch(source, /class="asset-inner-tab[^>]*>Análise<\/button>/);
});

test('Análise não inventa dados nem cria caminho de persistência', () => {
  const destination = source.slice(source.indexOf('function analysisDestination()'), source.indexOf('// ══════════════════════════════════════', source.indexOf('function analysisDestination()')));
  assert.doesNotMatch(destination, /localStorage|firebase|fetch\(|save\(|S\.assets\s*=/);
  assert.match(destination, /assetAnalysisRows\(\)/);
});

test('Análise comunica estados vazios conhecidos sem placeholder ambíguo', () => {
  assert.match(source, /best\?[^:]+:'Nenhum'/);
  assert.match(source, /worst\?[^:]+:'Nenhuma'/);
});
