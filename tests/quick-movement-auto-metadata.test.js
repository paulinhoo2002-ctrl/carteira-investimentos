const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const persistenceCore = require('../persistence-core.js');

function extractFunctionSource(name, nextMarker) {
  const start = indexHtml.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Função não encontrada: ${name}`);
  const end = indexHtml.indexOf(nextMarker, start);
  assert.notEqual(end, -1, `Marcador final não encontrado para: ${name}`);
  return indexHtml.slice(start, end);
}

const metadataSource = [
  extractFunctionSource('tickerValidoB3', 'function isMarketTicker'),
  extractFunctionSource('cleanAssetCode', 'function normalizeMetadataTicker'),
  extractFunctionSource('normalizeMetadataTicker', 'function isRendaFixaText'),
  extractFunctionSource('isRendaFixaText', 'function isEmprestimoSheet'),
  extractFunctionSource('rfMetaFromText', 'function tipoPorAbaB3'),
  extractFunctionSource('normalizeType', 'function typeAccentColor'),
  extractFunctionSource('learnedMetaFor', 'function learnTickerMeta'),
  extractFunctionSource('learnTickerMeta', 'function rebuildLearnMeta'),
  extractFunctionSource('inferTickerMetadata', 'function resolveAssetMetadata'),
  extractFunctionSource('resolveAssetMetadata', 'function metaTicker'),
  extractFunctionSource('metaTicker', 'function applyMetaToAporte'),
].join('\n');

const metaStart = indexHtml.indexOf('const META=');
const metaEnd = indexHtml.indexOf('// ── DY automático', metaStart);
assert.notEqual(metaStart, -1);
assert.notEqual(metaEnd, -1);

function makeContext(overrides = {}) {
  const context = {
    S: { assets: [], learnMeta: {}, ...(overrides.S || {}) },
    META: undefined,
    TYPE_CHOICES: ['Ação', 'FII', 'ETF', 'Renda Fixa', 'BDR', 'Stock', 'Reit'],
    TYPE_ALIAS_LOOKUP: { ACAO: 'Ação', FII: 'FII', ETF: 'ETF', 'RENDA FIXA': 'Renda Fixa', BDR: 'BDR', STOCK: 'Stock', REIT: 'Reit' },
    console,
  };
  vm.runInNewContext(`${indexHtml.slice(metaStart, metaEnd)}\n${metadataSource}\nthis.resolve=resolveAssetMetadata; this.learn=learnTickerMeta;`, context);
  return context;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('normaliza PETR4, PETR4.SA e petr4.sa para PETR4', () => {
  const context = makeContext();
  assert.equal(context.resolve('PETR4').ticker, 'PETR4');
  assert.equal(context.resolve('PETR4.SA').ticker, 'PETR4');
  assert.equal(context.resolve('petr4.sa').ticker, 'PETR4');
});

test('usa META para FII e ETF conhecidos', () => {
  const context = makeContext();
  assert.deepEqual(plain(context.resolve('MXRF11')), { ticker: 'MXRF11', type: 'FII', sector: 'Papel', name: '', source: 'catalog' });
  assert.deepEqual(plain(context.resolve('BOVA11')), { ticker: 'BOVA11', type: 'ETF', sector: 'Ibovespa', name: '', source: 'catalog' });
});

test('precedência é manual, ativo, learnMeta, catálogo e inferência', () => {
  const context = makeContext({
    S: {
      assets: [{ ticker: 'PETR4', type: 'ETF', sector: 'Carteira' }],
      learnMeta: { PETR4: { type: 'FII', sector: 'Aprendido' } },
    },
  });
  assert.equal(context.resolve('PETR4', { manual: { type: 'BDR', sector: 'Manual' } }).type, 'BDR');
  assert.equal(context.resolve('PETR4', { manual: { type: 'BDR', sector: 'Manual' } }).sector, 'Manual');
  assert.equal(context.resolve('PETR4').type, 'ETF');
  assert.equal(context.resolve('PETR4').sector, 'Carteira');

  const learned = makeContext({ S: { assets: [], learnMeta: { PETR4: { type: 'FII', sector: 'Aprendido' } } } });
  assert.equal(learned.resolve('PETR4').type, 'FII');
  assert.equal(learned.resolve('PETR4').sector, 'Aprendido');

  const catalog = makeContext();
  assert.equal(catalog.resolve('PETR4').type, 'Ação');
  assert.equal(catalog.resolve('PETR4').sector, 'Petróleo');
});

test('ticker desconhecido não bloqueia e mantém fallback explícito', () => {
  const context = makeContext();
  assert.deepEqual(plain(context.resolve('ZZZZ9')), { ticker: 'ZZZZ9', type: 'Ação', sector: '', name: '', source: 'unknown' });
});

test('Renda Fixa permanece separada da classificação de mercado', () => {
  const context = makeContext();
  assert.deepEqual(plain(context.resolve('CDB BANCO X 2028')), { ticker: 'CDB BANCO X 2028', type: 'Renda Fixa', sector: 'CDB', name: '', source: 'inference' });
});

test('learnTickerMeta grava a chave canônica sem reclassificar registros antigos', () => {
  const oldAsset = { ticker: 'PETR4.SA', type: 'Ação', sector: 'Petróleo' };
  const context = makeContext({ S: { assets: [oldAsset], learnMeta: {} } });
  context.learn('PETR4.SA', 'Ação', 'Petróleo', true);
  assert.deepEqual(oldAsset, { ticker: 'PETR4.SA', type: 'Ação', sector: 'Petróleo' });
  assert.deepEqual(plain(context.S.learnMeta.PETR4), { type: 'Ação', sector: 'Petróleo' });

  const stored = persistenceCore.buildStoredState({ assets: [oldAsset], learnMeta: context.S.learnMeta });
  assert.deepEqual(stored.assets, [oldAsset]);
  assert.deepEqual(plain(stored.learnMeta), { PETR4: { type: 'Ação', sector: 'Petróleo' } });
});

test('fluxos usam o resolvedor sem alterar contratos de compra, venda e provento', () => {
  const buildStart = indexHtml.indexOf('function quickMovementBuildAporteFromFields');
  const saveStart = indexHtml.indexOf('function saveQuickMovement');
  const buildSource = indexHtml.slice(buildStart, saveStart);
  assert.match(buildSource, /resolveAssetMetadata\(ticker/);
  assert.match(buildSource, /movementKind:next/);
  assert.match(buildSource, /operation:next/);
  assert.match(indexHtml.slice(saveStart, indexHtml.indexOf('function isRendaFixaAsset', saveStart)), /S\.proventos\.unshift\(reg\)/);
  assert.match(indexHtml.slice(saveStart, indexHtml.indexOf('function isRendaFixaAsset', saveStart)), /S\.aportes\.unshift\(reg\)/);
});
