const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const engineSource = fs.readFileSync('asset-detail-intelligence.js', 'utf8');

test('V260 conecta os motores certificados ao detalhe do ativo sem duplicar cálculo', () => {
  assert.match(html, /<script src="asset-detail-intelligence\.js"><\/script>/);
  assert.match(html, /options:detailIntelligenceOptions/);
  assert.match(html, /v257QualityModel\(\)/);
  assert.match(html, /v258MonitoringModel\(detailQualityModel\)/);
  assert.match(html, /quoteTrustMeta\(asset\)/);
  assert.match(html, /buildAssetDetailIntelligence/);
  assert.match(html, /TaxCostBasisIntelligence\?\.buildTaxIntelligence/);
  assert.match(html, /HistoricalReconstructionHardening\?\.buildHistoricalReconstructionAudit/);
});

test('V260 consolida renda, custo-base, histórico, qualidade e eventos na aba Inteligência', () => {
  const start = html.indexOf('const intelligenceHtml=');
  const end = html.indexOf('const interpretation=', start);
  const block = html.slice(start, end);
  assert.match(block, /Renda paga no ano/);
  assert.match(block, /Renda paga 12M/);
  assert.match(block, /Custo-base/);
  assert.match(block, /Resultado realizado/);
  assert.match(block, /Transações do ativo/);
  assert.match(block, /Reconciliação da posição/);
  assert.match(block, /Pendências de qualidade/);
  assert.match(block, /Alertas de monitoramento/);
  assert.match(block, /Eventos corporativos/);
  assert.match(block, /Proveniência/);
  assert.match(block, /===null\?'—'/);
  assert.doesNotMatch(block, /onclick|submit|persist|save/i);
});

test('V260 preserva semântica truthful: unknown não vira zero e writes permanecem desabilitados', () => {
  assert.match(engineSource, /if \(value === null \|\| value === undefined \|\| value === ''\) return null;/);
  assert.match(engineSource, /V260_ASSET_DETAIL_INTELLIGENCE_V1/);
  assert.match(engineSource, /announcedIsNotPaid: true/);
  assert.match(engineSource, /unknownIsNotZero: true/);
  assert.doesNotMatch(engineSource, /writeEnabled: true/);
});
