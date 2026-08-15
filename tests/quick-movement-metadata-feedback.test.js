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
  extractFunctionSource('inferTickerMetadata', 'function resolveAssetMetadata'),
  extractFunctionSource('resolveAssetMetadata', 'function metaTicker'),
  extractFunctionSource('quickMovementMetadataFeedbackHtml', 'function quickMovementAssetSummaryHtml'),
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
  vm.runInNewContext(`${indexHtml.slice(metaStart, metaEnd)}\n${metadataSource}\nthis.feedback=quickMovementMetadataFeedbackHtml;`, context);
  return context;
}

test('PETR4 mostra Identificado pelo catálogo', () => {
  const context = makeContext();
  const html = context.feedback('PETR4', '', '', false, false);
  assert.match(html, /Identificado pelo catálogo/);
  assert.doesNotMatch(html, /não reconhecido/i);
});

test('ticker já existente em S.assets mostra Identificado pela carteira', () => {
  const context = makeContext({ S: { assets: [{ ticker: 'PETR4', type: 'Ação', sector: 'Petróleo' }], learnMeta: {} } });
  const html = context.feedback('PETR4', '', '', false, false);
  assert.match(html, /Identificado pela carteira/);
});

test('learned mostra Identificado pelo histórico', () => {
  const context = makeContext({ S: { assets: [], learnMeta: { PETR4: { type: 'Ação', sector: 'Petróleo' } } } });
  const html = context.feedback('PETR4', '', '', false, false);
  assert.match(html, /Identificado pelo histórico/);
});

test('inference mostra Identificado automaticamente', () => {
  const context = makeContext();
  const html = context.feedback('ZZZZ11', '', '', false, false);
  assert.match(html, /Identificado automaticamente/);
});

test('manual mostra Definido manualmente', () => {
  const context = makeContext();
  const htmlType = context.feedback('PETR4', 'BDR', 'Manual', true, false);
  assert.match(htmlType, /Definido manualmente/);
  const htmlSector = context.feedback('PETR4', '', 'Manual', false, true);
  assert.match(htmlSector, /Definido manualmente/);
});

test('PETR44 mostra Ticker não reconhecido e aviso de revisão', () => {
  const context = makeContext();
  const html = context.feedback('PETR44', '', '', false, false);
  assert.match(html, /Ticker não reconhecido/);
  assert.match(html, /Revise tipo e setor antes de salvar/);
});

test('PETR44 continua podendo ser salvo sem bloqueio', () => {
  const context = makeContext();
  const feedback = context.feedback('PETR44', '', '', false, false);
  assert.match(feedback, /Ticker não reconhecido/);
  assert.equal(feedback.includes('Ticker não reconhecido') && typeof feedback === 'string', true);
  assert.doesNotMatch(feedback, /bloqueado|não pode ser salvo/i);
  const buildStart = indexHtml.indexOf('function quickMovementBuildAporteFromFields');
  const saveStart = indexHtml.indexOf('function saveQuickMovement');
  const buildSave = indexHtml.slice(buildStart, indexHtml.indexOf('function isRendaFixaAsset', saveStart));
  assert.doesNotMatch(buildSave, /Ticker não reconhecido|retorn\s*\{error:[^}]*reconhecid/i);
});

test('nenhum aviso unknown aparece para PETR4, MXRF11 e BOVA11', () => {
  const context = makeContext();
  ['PETR4', 'MXRF11', 'BOVA11'].forEach((ticker) => {
    const html = context.feedback(ticker, '', '', false, false);
    assert.doesNotMatch(html, /Ticker não reconhecido/i);
    assert.doesNotMatch(html, /Revise tipo e setor/i);
  });
});

test('CSS do feedback previne overflow e permite quebra em mobile', () => {
  const feedbackCss = indexHtml.match(/\.quick-movement-meta-feedback\{[^}]+\}/);
  assert.ok(feedbackCss, 'Classe .quick-movement-meta-feedback ausente');
  assert.match(feedbackCss[0], /flex-wrap:\s*wrap/);
  assert.match(feedbackCss[0], /min-width:\s*0/);
  assert.match(indexHtml, /\.quick-movement-meta-feedback \.analysis-pill\{white-space:normal;text-align:left\}/);
  assert.match(indexHtml, /@media\(max-width:768px\)[\s\S]*?\.quick-movement-modal \.sec-body\{grid-template-columns:1fr!important\}/);
});

test('campos tipo/setor continuam editáveis e valores manuais preservados', () => {
  assert.match(indexHtml, /<select id="qm-type"[^>]*onchange="setQuickMovementField\('type', this\.value\)"/);
  assert.match(indexHtml, /<input id="qm-sector"[^>]*oninput="setQuickMovementField\('sector', this\.value\)"/);
  const quickMovFieldStart = indexHtml.indexOf('function setQuickMovementField');
  const quickMovFieldEnd = indexHtml.indexOf('function quickMovementModal', quickMovFieldStart);
  const source = indexHtml.slice(quickMovFieldStart, quickMovFieldEnd);
  assert.match(source, /if\(field==='type'\) S\.quickMovementDraft\.manualType=true/);
  assert.match(source, /if\(field==='sector'\) S\.quickMovementDraft\.manualSector=true/);
});

test('preview e resumo chamam o feedback apenas nos fluxos de mercado', () => {
  const summaryStart = indexHtml.indexOf('function quickMovementAssetSummaryHtml');
  const previewStart = indexHtml.indexOf('function quickMovementPreviewHtml');
  const summarySource = indexHtml.slice(summaryStart, previewStart);
  assert.match(summarySource, /quickMovementMetadataFeedbackHtml\(/);
  const previewSource = indexHtml.slice(previewStart, indexHtml.indexOf('function refreshQuickMovementPreview', previewStart));
  assert.match(previewSource, /quickMovementMetadataFeedbackHtml\(draft\.ticker, draft\.type, draft\.sector, draft\.manualType, draft\.manualSector\)/);
});