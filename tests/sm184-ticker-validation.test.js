'use strict';
// SM184/SM185 — validação de ticker sem Yahoo: catálogo B3 local (ou ativo já na carteira) + checagem de posição após a compra.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function fnBody(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `função ${name} ausente`);
  const next = html.indexOf('\nfunction ', start + 10);
  return html.slice(start, next === -1 ? start + 12000 : next);
}

test('gate de compra/venda usa marketTickerValidation antes do snapshot e da gravação', () => {
  const body = fnBody('saveQuickMovement');
  const gate = body.indexOf("if(kind==='compra'||kind==='venda')");
  const snapshot = body.indexOf('const financialSnapshot=snapshotFinancialImportState');
  assert.ok(gate > 0 && snapshot > 0, 'gate de validação presente');
  assert.ok(gate < snapshot, 'validação ocorre antes do snapshot e da gravação');
  assert.match(body.slice(gate, snapshot), /marketTickerValidation\(reg\.ticker\)/);
  assert.doesNotMatch(body.slice(gate, snapshot), /inference|learned|learnedMetaFor/, 'formato B3 e aprendizado manual não bastam');
});

test('marketTickerValidation diferencia formato inválido, fora do catálogo e ativo já na carteira', () => {
  const body = fnBody('marketTickerValidation');
  assert.match(body, /S\.assets/, 'ativo já na carteira é aceito');
  assert.match(body, /INVALID_FORMAT[\s\S]*Ativo não reconhecido\. Verifique o código informado\./);
  assert.match(body, /NOT_IN_CATALOG[\s\S]*catálogo B3 local[\s\S]*Nada foi gravado\./);
  assert.match(body, /isKnownB3Code\(code\)/);
});

test('catálogo B3 não consulta learnMeta nem rede', () => {
  const body = fnBody('isKnownB3Code');
  assert.match(body, /META\[code\]/);
  assert.match(body, /B3Catalog/);
  assert.doesNotMatch(body, /learnMeta|learned|await|fetch\(/, 'learnMeta não é autoridade; validação não depende de rede');
});

test('checagem pós-sincronização exige quantidade consistente com o lançamento e não usa quarentena', () => {
  const body = fnBody('saveQuickMovement');
  const check = body.indexOf('const qtyAfterSync=assetQtyForTicker(reg.ticker)');
  const persist = body.indexOf("if(!persistFinancialImportState(financialSnapshot)) throw new Error('QUICK_MOVEMENT_PERSIST_FAILED');", check);
  assert.ok(check > 0, 'checagem de quantidade após a sincronização');
  assert.ok(persist > check, 'checagem ocorre antes da persistência');
  assert.match(body.slice(check, persist), /Nada foi gravado\./);
  assert.match(body.slice(check, persist), /PENDING_RECONCILIATION/, 'venda pendente não move a posição');
  assert.doesNotMatch(body.slice(check, persist), /restoreFinancialImportState/, 'não usa quarentena para erro de validação');
});

test('saveQuickMovement não depende de rede para validar ativo', () => {
  const body = fnBody('saveQuickMovement');
  assert.doesNotMatch(body, /await|fetch\(/, 'gravação não depende de rede');
});

test('sincronização: posição LEDGER segue o ledger; legado congelado continua bloqueado; RF fora do caminho novo', () => {
  const body = fnBody('syncAssetsFromAportes');
  assert.match(body, /if\(!isLedgerPosition\(asset\)\) blockedTickers\.add\(ticker\)/, 'posição legada congelada segue preservada');
  assert.match(body, /ledgerCreatable=movementType!=='Renda Fixa'\s*&&\s*isKnownB3Code\(ticker\)/, 'criação só para código do catálogo e fora de RF');
  assert.match(body, /position_source:'LEDGER'/, 'posição criada pelo ledger é marcada');
  assert.match(body, /history_coverage:hasCompleteCoverage\(g\.ticker\)\?'COMPLETE':'UNPROVEN'/, 'cobertura histórica fica explícita');
});

test('formulário de cadastro mostra a validação de ticker pelo mesmo helper', () => {
  const feedback = fnBody('quickMovementMetadataFeedbackHtml');
  assert.match(feedback, /resolveAssetMetadata\(t,/);
});
