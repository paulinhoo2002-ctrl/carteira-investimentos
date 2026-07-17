const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const { assertPhase202FutureSequence, assertPhase202RoadmapOpen } = require('./phase-202-assets-performance-overview.guard');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertUtf8WithoutBom(relativePath) {
  const buffer = fs.readFileSync(path.join(repoRoot, relativePath));
  assert.equal(buffer[0], 0x23, `${relativePath} precisa comecar com # e sem BOM`);
}

function assertNoMojibake(text, label) {
  for (const token of ['\uFFFD', '\u00C3', '\u00C2', '\u0153']) {
    assert.equal(text.includes(token), false, `${label} nao pode conter ${token}`);
  }
}

test('fase 202 painel de desempenho usa fontes oficiais e roteiro correto', () => {
  const roadmap = read('docs/project-phases-roadmap.md');
  const phaseDoc = read('docs/phase-202-assets-performance-overview.md');
  const indexHtml = read('index.html');

  assertUtf8WithoutBom('docs/project-phases-roadmap.md');
  assertUtf8WithoutBom('docs/phase-202-assets-performance-overview.md');
  assertNoMojibake(roadmap, 'roadmap');
  assertNoMojibake(phaseDoc, 'phaseDoc');

  assertPhase202RoadmapOpen(roadmap);
  assertPhase202FutureSequence(roadmap);

  assert.match(phaseDoc, /# Fase 202 - Painel consolidado de desempenho dos ativos/);
  assert.match(phaseDoc, /## Contexto/);
  assert.match(phaseDoc, /## Objetivo/);
  assert.match(phaseDoc, /## Fontes oficiais/);
  assert.match(phaseDoc, /## Escopo/);
  assert.match(phaseDoc, /## Fora de escopo/);
  assert.match(phaseDoc, /## Riscos/);
  assert.match(phaseDoc, /## Criterios de conclusao/);
  assert.match(phaseDoc, /## Rollback/);
  assert.match(phaseDoc, /shell moderno permanece readonly/);
  assert.match(phaseDoc, /- iniciar a Fase 204\./);

  assert.match(indexHtml, /function assetPerformanceOverviewPanel\(\)/);
  assert.match(indexHtml, /function hasOwnFiniteNumber\(source, keys\)/);
  assert.match(indexHtml, /function assetPerformanceOverviewSortRows\(rows, sortBy\)/);
  assert.match(indexHtml, /setAssetsInnerTab\('desempenho'\)/);
  assert.match(indexHtml, /if\(t==='desempenho'\) S\.assetsInnerTab='desempenho';/);
  assert.match(indexHtml, /if\(S\.tab==='desempenho'\)return ativos\(\);/);
  assert.match(indexHtml, /Painel consolidado de desempenho dos ativos/);
  assert.match(indexHtml, /Melhores ativos/);
  assert.match(indexHtml, /Piores ativos/);
  assert.match(indexHtml, /Resultado consolidado/);
  assert.match(indexHtml, /Sem base/);
  assert.match(indexHtml, /Filtros oficiais/);
  assert.match(indexHtml, /Ordenacao/);
  assert.match(indexHtml, /Visao da base/);
  assert.match(indexHtml, /Lista consolidada/);
  assert.match(indexHtml, /Dados insuficientes/);
  assert.match(indexHtml, /Nenhum ativo combina com os filtros atuais/);
  assert.match(indexHtml, /Nenhum ativo com resultado positivo na visao atual/);
  assert.match(indexHtml, /Nenhum ativo com resultado negativo na visao atual/);
  assert.match(indexHtml, /assetCurrentValue/);
  assert.match(indexHtml, /assetAppliedValue/);
  assert.match(indexHtml, /assetJurosValue/);
  assert.match(indexHtml, /assetRentabPct/);
  assert.match(indexHtml, /TYPE_ORDER/);
  assert.match(indexHtml, /result-desc/);
  assert.match(indexHtml, /pct-desc/);
  assert.match(indexHtml, /current-desc/);
  assert.match(indexHtml, /share-desc/);
  assert.match(indexHtml, /ticker-asc/);
  assert.match(indexHtml, /@media\(max-width:768px\)/);
  assert.match(indexHtml, /perf-grid/);

  assert.equal(indexHtml.includes('current.totalValue + amount'), false, 'painel 202 nao pode criar formula financeira nova');
  assert.equal(indexHtml.includes('score: Number(row?.score) || 0'), false, 'painel 202 nao pode herdar regressoes de encoding');

  const listed = execFileSync('git', ['ls-files', 'modern/dist'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(listed.trim(), '', 'modern/dist nao pode entrar no indice');
});
