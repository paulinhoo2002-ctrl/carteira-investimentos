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
  return indexHtml.slice(start, end).replace(/\r\n/g, '\n');
}

const MODAL_SOURCE = extractFunctionSource('quickMovementModal', 'function aporteMovementKind');
const BUY_REGION = indexHtml.slice(
  indexHtml.indexOf("const buySellFields = `"),
  indexHtml.indexOf("const proventoFields = `")
);
const SALE_REGION = indexHtml.slice(
  indexHtml.indexOf("const saleFields = `"),
  indexHtml.indexOf("const rfMovEditorAsset=")
);

test('quickMovementModal continua uma função JS válida (compile check)', () => {
  assert.doesNotThrow(() => new vm.Script(MODAL_SOURCE));
});

test('modal expõe dialog acessível com rótulo', () => {
  assert.match(MODAL_SOURCE, /role="dialog"\s+aria-modal="true"\s+aria-label="Nova movimentação"/);
});

test('abas de tipo são botões com aria-pressed', () => {
  assert.match(MODAL_SOURCE, /<button type="button" class="dash-chip \$\{kind===next\?'on':''\}" aria-pressed="\$\{kind===next\?'true':'false'\}"/);
});

test('seções Ativo e Dados da operação organizam a compra', () => {
  assert.match(BUY_REGION, /<div class="cl" style="margin-bottom:8px">Ativo<\/div>/);
  assert.match(BUY_REGION, /<div class="cl" style="margin:12px 0 8px">Dados da operação<\/div>/);
});

test('compra usa resumo de ativo dinâmico e mantém campos essenciais', () => {
  assert.match(BUY_REGION, /<div id="quick-movement-asset-summary">\$\{kind==='compra'\?quickMovementAssetSummaryHtml\(\):''\}<\/div>/);
  for (const field of ['qm-dt', 'qm-ti', 'qm-type', 'qm-sector', 'qm-qty', 'qm-price', 'qm-note']) {
    assert.match(BUY_REGION, new RegExp(`id="${field}"`), `Campo ausente na compra: ${field}`);
  }
});

test('campos da compra têm aria-label próprio', () => {
  for (const label of ['Data', 'Ticker', 'Tipo de ativo', 'Setor', 'Quantidade', 'Preço unitário', 'Observação']) {
    assert.match(BUY_REGION, new RegExp(`aria-label="${label}"`), `aria-label ausente: ${label}`);
  }
});

test('venda mantém seletor de posição e chips com aria-pressed', () => {
  assert.match(SALE_REGION, /<div class="cl" style="margin-bottom:8px">Ativo<\/div>/);
  assert.match(SALE_REGION, /<div class="cl" style="margin:12px 0 8px">Dados da operação<\/div>/);
  assert.match(SALE_REGION, /select id="qm-sale-asset" aria-label="Ativo para venda"/);
  assert.match(SALE_REGION, /class="dash-chip \$\{saleType==='parcial'\?'on':''\}" aria-pressed="\$\{saleType==='parcial'\?'true':'false'\}"/);
  assert.match(SALE_REGION, /class="dash-chip \$\{saleType==='total'\?'on':''\}" aria-pressed="\$\{saleType==='total'\?'true':'false'\}"/);
});

test('CTA de salvar usa rótulos por tipo (confirmar compra/venda)', () => {
  assert.match(MODAL_SOURCE, /'Registrar provento'/);
  assert.match(MODAL_SOURCE, /'Salvar renda fixa'/);
  assert.match(MODAL_SOURCE, /'Salvar registro'/);
  assert.match(MODAL_SOURCE, /\(kind==='venda' \? 'Confirmar venda' : 'Confirmar compra'\)/);
});

test('sidebar de revisão é rotulada e embrulha a prévia', () => {
  assert.match(MODAL_SOURCE, /<div class="cl">Revisão<\/div>\s*<div id="quick-movement-preview">/);
});

test('CSS do modal fornece foco visível para chips e campos', () => {
  assert.match(indexHtml, /\.quick-movement-modal \.dash-chip:focus-visible/);
  assert.match(indexHtml, /\.quick-movement-modal \.fg input:focus-visible/);
  assert.match(indexHtml, /\.quick-movement-modal \.fg select:focus-visible/);
});

test('quickMovementAssetSummaryHtml continua definida para o resumo da compra', () => {
  const source = extractFunctionSource('quickMovementAssetSummaryHtml', 'function quickMovementSalePreviewHtml');
  assert.match(source, /if\(kind==='venda'\) return '';/);
  assert.match(source, /Resumo do ativo/);
});
