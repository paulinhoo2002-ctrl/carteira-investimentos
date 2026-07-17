const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
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

function extractFunctionBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} precisa existir`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `${endMarker} precisa existir depois de ${startMarker}`);
  return source.slice(start, end);
}

function loadAssetPerformanceOverviewRows(assets) {
  const indexHtml = read('index.html');
  const hasOwnFiniteNumberSource = extractFunctionBlock(
    indexHtml,
    'function hasOwnFiniteNumber(source, keys){',
    'function assetPerformanceOverviewRows(){',
  );
  const rowsSource = extractFunctionBlock(
    indexHtml,
    'function assetPerformanceOverviewRows(){',
    'function assetPerformanceOverviewSortRows(rows, sortBy){',
  );

  const context = {
    S: { assets },
    assetCurrentValue(asset) {
      return asset?.currentPrice ?? asset?.current_price ?? asset?.currentValue ?? asset?.current_value ?? null;
    },
    assetAppliedValue(asset) {
      return asset?.appliedPrice ?? asset?.applied_price ?? asset?.appliedValue ?? asset?.applied_value ?? null;
    },
    assetJurosValue(asset) {
      return asset?.result ?? null;
    },
    assetRentabPct(asset) {
      return asset?.resultPct ?? null;
    },
    assetRfName() {
      return '';
    },
    normalizeType(value, fallback) {
      return value || fallback || 'Ação';
    },
    metaTicker() {
      return { type: 'Ação' };
    },
    normTypeKey(value) {
      return String(value || '').toLowerCase();
    },
  };

  return vm.runInNewContext(`${hasOwnFiniteNumberSource}\n${rowsSource}\nassetPerformanceOverviewRows;`, context);
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
  assert.equal(indexHtml.includes('function firstOwnFiniteNumber(source, keys){'), false, 'helper sem uso deve sair');
  assert.match(indexHtml, /setAssetsInnerTab\('desempenho'\)/);
  assert.match(indexHtml, /if\(t==='desempenho'\) S\.assetsInnerTab='desempenho';/);
  assert.match(indexHtml, /if\(S\.tab==='desempenho'\)return ativos\(\);/);
  assert.match(indexHtml, /const hasPerformanceData=hasCurrentSource && hasAppliedSource;/);
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

test('fase 202 trata base completa e incompleta sem inverter a semantica', () => {
  const rows = loadAssetPerformanceOverviewRows([
    { ticker: 'AAA1', name: 'Completo positivo', type: 'Acao', current_price: 120, avg_price: 100, result: 20, resultPct: 20 },
    { ticker: 'BBB1', name: 'So aplicado', type: 'Acao', avg_price: 100, result: 999, resultPct: 999 },
    { ticker: 'CCC1', name: 'So atual', type: 'Acao', current_price: 120, result: 999, resultPct: 999 },
    { ticker: 'DDD1', name: 'Sem base', type: 'Acao' },
    { ticker: 'EEE1', name: 'Zero real', type: 'Acao', current_price: 0, avg_price: 0, result: 0, resultPct: 0 },
    { ticker: 'FFF1', name: 'Aplicado zero', type: 'Acao', current_price: 10, avg_price: 0, result: 10, resultPct: null },
  ])();

  assert.equal(rows.length, 6);
  assert.equal(rows[0].hasAnyFinancialSource, true);
  assert.equal(rows[0].hasPerformanceData, true);
  assert.equal(rows[0].statusLabel, 'Positivo');
  assert.equal(rows[0].result, 20);
  assert.equal(rows[0].resultPct, 20);

  assert.equal(rows[1].hasAnyFinancialSource, true);
  assert.equal(rows[1].hasPerformanceData, false);
  assert.equal(rows[1].statusLabel, 'Dados insuficientes');
  assert.equal(rows[1].result, null);
  assert.equal(rows[1].resultPct, null);

  assert.equal(rows[2].hasAnyFinancialSource, true);
  assert.equal(rows[2].hasPerformanceData, false);
  assert.equal(rows[2].statusLabel, 'Dados insuficientes');
  assert.equal(rows[2].result, null);
  assert.equal(rows[2].resultPct, null);

  assert.equal(rows[3].hasAnyFinancialSource, false);
  assert.equal(rows[3].hasPerformanceData, false);
  assert.equal(rows[3].statusLabel, 'Dados insuficientes');
  assert.equal(rows[3].result, null);
  assert.equal(rows[3].resultPct, null);

  assert.equal(rows[4].hasAnyFinancialSource, true);
  assert.equal(rows[4].hasPerformanceData, true);
  assert.equal(rows[4].statusLabel, 'Estavel');
  assert.equal(rows[4].result, 0);
  assert.equal(rows[4].resultPct, 0);

  assert.equal(rows[5].hasAnyFinancialSource, true);
  assert.equal(rows[5].hasPerformanceData, true);
  assert.equal(rows[5].statusLabel, 'Positivo');
  assert.equal(rows[5].result, 10);
  assert.equal(rows[5].resultPct, null);

  const validRows = rows.filter((row) => row.hasPerformanceData);
  const insufficientRows = rows.filter((row) => !row.hasPerformanceData);
  const positiveRows = validRows.filter((row) => Number.isFinite(row.result) && row.result > 0);
  const negativeRows = validRows.filter((row) => Number.isFinite(row.result) && row.result < 0);
  const stableRows = validRows.filter((row) => Number.isFinite(row.result) && row.result === 0);

  assert.deepEqual(validRows.map((row) => row.ticker), ['AAA1', 'EEE1', 'FFF1']);
  assert.deepEqual(insufficientRows.map((row) => row.ticker), ['BBB1', 'CCC1', 'DDD1']);
  assert.deepEqual(positiveRows.map((row) => row.ticker), ['AAA1', 'FFF1']);
  assert.deepEqual(negativeRows, []);
  assert.deepEqual(stableRows.map((row) => row.ticker), ['EEE1']);
  assert.equal(validRows.length, 3);
  assert.equal(insufficientRows.length, 3);
  assert.equal(positiveRows.length, 2);
  assert.equal(negativeRows.length, 0);
  assert.equal(stableRows.length, 1);
});
