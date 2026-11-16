'use strict';
// SM184 — regressão: título de renda fixa (sem ticker) precisa ser excluível pelo menu Ativos.
// Causa raiz: o menu chamava deleteAssetFull('') para renda fixa e o fluxo parava em "Ticker inválido".
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function functionBody(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `função ${name} ausente`);
  const next = html.indexOf('\nfunction ', start + 10);
  return html.slice(start, next === -1 ? start + 4000 : next);
}

test('menu Ativos: título de renda fixa chama deleteRfPosition pelo id, não pelo ticker vazio', () => {
  const line = html.split('\n').find(l => l.includes('asset-action-danger') && l.includes('Excluir ativo'));
  assert.ok(line, 'botão Excluir ativo do menu não encontrado');
  assert.match(line, /isRF \? `deleteRfPosition\(\$\{JSON\.stringify\(rfAssetEventId\(asset\)\)\}\)`/);
  assert.match(line, /deleteAssetFull\(\$\{JSON\.stringify\(String\(asset\.ticker\|\|''\)\)\}\)/, 'ações e FIIs mantêm a exclusão por ticker');
});

test('deleteRfPosition exige permissão, confirma, remove título, lançamentos e proventos vinculados e reverte em falha', () => {
  const body = functionBody('deleteRfPosition');
  assert.match(body, /canEditFromThisTab\('excluir ativo'\)/);
  assert.match(body, /getRfAssetByEventId\(assetId\)/);
  assert.match(body, /confirm\(`Excluir /, 'confirmação com nome do ativo e consequências');
  assert.match(body, /S\.rfEvents=normalizeRfEvents/);
  assert.match(body, /S\.proventos=\(S\.proventos/);
  assert.match(body, /S\.assets=\(S\.assets\|\|\[\]\)\.filter\(a=>rfAssetEventId\(a\)!==rfAssetEventId\(asset\)\)/);
  assert.match(body, /snapshotFinancialImportState\(\['rfEvents','assets','proventos','aportes','rfMovementEditor'\]\)/);
  assert.match(body, /S\.aportes=\(S\.aportes\|\|\[\]\)\.filter\(a=>String\(a\?\.id\|\|''\)!==rfAssetEventId\(asset\)\)/, 'lançamento de cadastro do título sai junto (sem órfão)');
  assert.match(body, /if\(!persistFinancialImportState\(beforeSave\)\)/, 'falha de gravação restaura o estado anterior');
});

test('deleteRfPosition não usa ticker nem apaga por ticker (sem efeito em ações/FIIs)', () => {
  const body = functionBody('deleteRfPosition');
  assert.doesNotMatch(body, /matchTicker|ticker\s*===|\.ticker\)/);
});

// SM184 — CSP/Yahoo: o navegador não pode chamar query1.finance.yahoo.com (bloqueado pela CSP).
const fsCsp = require('node:fs');
test('sincronização de eventos não chama o Yahoo direto do navegador e não amplia connect-src', () => {
  const start = html.indexOf('function startPublicEventsSync(');
  assert.notEqual(start, -1);
  const body = html.slice(start, html.indexOf('\nfunction ', start + 10));
  assert.doesNotMatch(body, /createYahooProvider\(/);
  assert.doesNotMatch(body, /query1\.finance\.yahoo\.com/);
  const vercel = fsCsp.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8');
  assert.doesNotMatch(vercel, /query1\.finance\.yahoo\.com/, 'CSP não deve liberar o Yahoo');
  // wildcard solto (token "*") é proibido; wildcard de porta em loopback (127.0.0.1:*) já existia e é permitido
  assert.doesNotMatch(vercel, /connect-src[^;"]*\s\*(?=[\s;"])/, 'connect-src sem wildcard solto');
});
