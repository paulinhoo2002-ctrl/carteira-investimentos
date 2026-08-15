const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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

const flowSource = [
  extractFunctionSource('normalizeQuickMovementKind', 'function quickMovementKindLabel'),
  extractFunctionSource('findQuickMovementAssetByTicker', 'function quickMovementDefaultDraft'),
  extractFunctionSource('quickMovementDefaultDraft', 'function quickMovementKindOptions'),
  extractFunctionSource('openQuickMovement', 'function closeQuickMovement'),
  extractFunctionSource('closeQuickMovement', 'function rfExistingAssetOptionsHtml'),
  extractFunctionSource('setQuickMovementField', 'function quickMovementModal'),
  extractFunctionSource('saveQuickMovement', 'function isRendaFixaAsset'),
].join('\n');

const metaStart = indexHtml.indexOf('const META=');
const metaEnd = indexHtml.indexOf('// ── DY automático', metaStart);
assert.notEqual(metaStart, -1);
assert.notEqual(metaEnd, -1);

function makeContext(overrides = {}) {
  const context = {
    S: {
      assets: [],
      learnMeta: {},
      aportes: [],
      proventos: [],
      quickMovementDraft: null,
      quickMovementOpen: false,
      quickMovementEditId: null,
      quickMovementSaving: false,
      quickMovementRfTab: 'aplicar',
      showA: false,
      showP: false,
      showD: false,
      editId: null,
      editPId: null,
      ...(overrides.S || {}),
    },
    META: undefined,
    TYPE_CHOICES: ['Ação', 'FII', 'ETF', 'Renda Fixa', 'BDR', 'Stock', 'Reit'],
    TYPE_ALIAS_LOOKUP: { ACAO: 'Ação', FII: 'FII', ETF: 'ETF', 'RENDA FIXA': 'Renda Fixa', BDR: 'BDR', STOCK: 'Stock', REIT: 'Reit' },
    render: () => {},
    refreshQuickMovementPreview: () => {},
    withScrollPreserved: (fn) => fn(),
    canEditFromThisTab: () => true,
    toast: () => {},
    quickMovementBuildAporteFromFields: () => ({ reg: { id: 'r1', ticker: 'PETR4', type: 'Ação', sector: 'Petróleo' } }),
    save: () => {},
    learnTickerMeta: () => {},
    syncAssetsFromAportes: () => {},
    fetchQuotes: () => {},
    scheduleAutoProventosGratis: () => {},
    alert: () => {},
    setTimeout: (fn) => { fn(); },
    console,
  };
  vm.runInNewContext(`${indexHtml.slice(metaStart, metaEnd)}\n${metadataSource}\n${flowSource}\nthis.open=openQuickMovement; this.set=setQuickMovementField; this.close=closeQuickMovement; this.saveM=saveQuickMovement;`, context);
  return context;
}

test('compra -> provento -> compra preserva tipo manual', () => {
  const context = makeContext({ S: { assets: [{ ticker: 'PETR4', type: 'Ação', sector: 'Petróleo' }] } });
  context.open('compra');
  context.set('ticker', 'PETR4');
  context.set('type', 'BDR');
  assert.equal(context.S.quickMovementDraft.type, 'BDR');
  assert.equal(context.S.quickMovementDraft.manualType, true);
  context.open('provento');
  context.open('compra');
  assert.equal(context.S.quickMovementDraft.type, 'BDR');
  assert.equal(context.S.quickMovementDraft.manualType, true);
});

test('compra -> provento -> compra preserva setor manual', () => {
  const context = makeContext({ S: { assets: [{ ticker: 'PETR4', type: 'Ação', sector: 'Petróleo' }] } });
  context.open('compra');
  context.set('ticker', 'PETR4');
  context.set('sector', 'Setor Manual');
  assert.equal(context.S.quickMovementDraft.sector, 'Setor Manual');
  assert.equal(context.S.quickMovementDraft.manualSector, true);
  context.open('provento');
  context.open('compra');
  assert.equal(context.S.quickMovementDraft.sector, 'Setor Manual');
  assert.equal(context.S.quickMovementDraft.manualSector, true);
});

test('provento -> compra -> provento preserva overrides', () => {
  const context = makeContext({ S: { assets: [{ ticker: 'PETR4', type: 'Ação', sector: 'Petróleo' }] } });
  context.open('provento');
  context.set('ticker', 'PETR4');
  context.set('type', 'BDR');
  context.set('sector', 'Setor Manual');
  context.open('compra');
  context.open('provento');
  assert.equal(context.S.quickMovementDraft.type, 'BDR');
  assert.equal(context.S.quickMovementDraft.sector, 'Setor Manual');
  assert.equal(context.S.quickMovementDraft.manualType, true);
  assert.equal(context.S.quickMovementDraft.manualSector, true);
});

test('troca real PETR4 -> VALE3 reseta overrides', () => {
  const context = makeContext({ S: { assets: [{ ticker: 'PETR4', type: 'Ação', sector: 'Petróleo' }] } });
  context.open('compra');
  context.set('ticker', 'PETR4');
  context.set('type', 'BDR');
  context.set('sector', 'Setor Manual');
  assert.equal(context.S.quickMovementDraft.manualType, true);
  context.set('ticker', 'VALE3');
  assert.equal(context.S.quickMovementDraft.manualType, false);
  assert.equal(context.S.quickMovementDraft.manualSector, false);
  assert.notEqual(context.S.quickMovementDraft.type, 'BDR');
});

test('PETR4.SA -> petr4 nao e troca real de ativo', () => {
  const context = makeContext({ S: { assets: [{ ticker: 'PETR4', type: 'Ação', sector: 'Petróleo' }] } });
  context.open('compra');
  context.set('ticker', 'PETR4.SA');
  context.set('type', 'BDR');
  assert.equal(context.S.quickMovementDraft.manualType, true);
  context.set('ticker', 'petr4');
  assert.equal(context.S.quickMovementDraft.manualType, true);
  assert.equal(context.S.quickMovementDraft.type, 'BDR');
});

test('fechar modal reseta draft', () => {
  const context = makeContext();
  context.open('compra');
  context.set('ticker', 'PETR4');
  assert.ok(context.S.quickMovementDraft);
  context.close();
  assert.equal(context.S.quickMovementDraft, null);
});

test('salvar movimentacao reseta draft', () => {
  const context = makeContext();
  context.open('outro');
  context.set('outroTitle', 'Ajuste interno');
  assert.ok(context.S.quickMovementDraft);
  context.saveM();
  assert.equal(context.S.quickMovementDraft, null);
});

test('fluxo de venda continua com comportamento atual', () => {
  const context = makeContext({ S: { assets: [{ ticker: 'PETR4', type: 'Ação', sector: 'Petróleo' }] } });
  context.open('compra');
  context.set('ticker', 'PETR4');
  context.open('venda');
  assert.equal(context.S.quickMovementDraft.kind, 'venda');
  assert.equal(context.S.quickMovementDraft.ticker, '');
  assert.equal(context.S.quickMovementDraft.assetName, '');
});

test('auto-metadata continua funcionando apos a troca de ticker', () => {
  const context = makeContext();
  context.open('compra');
  context.set('ticker', 'PETR4');
  assert.equal(context.S.quickMovementDraft.type, 'Ação');
  assert.equal(context.S.quickMovementDraft.sector, 'Petróleo');
});

test('metadata de ticker desconhecido nao bloqueia apos troca real', () => {
  const context = makeContext();
  context.open('compra');
  context.set('ticker', 'ZZZZ9');
  assert.equal(context.S.quickMovementDraft.type, 'Ação');
  context.set('type', 'BDR');
  assert.equal(context.S.quickMovementDraft.manualType, true);
  context.set('ticker', 'PETR4');
  assert.equal(context.S.quickMovementDraft.manualType, false);
  assert.equal(context.S.quickMovementDraft.type, 'Ação');
});