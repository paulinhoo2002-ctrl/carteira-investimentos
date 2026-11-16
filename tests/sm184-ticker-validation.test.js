'use strict';
// SM184 — decisão de produto: ação/FII com ticker não reconhecido não pode gerar lançamento sem posição.
// Validação local (sem consulta de cotação) antes da gravação + checagem de posição após a compra.
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

test('ticker inválido/não reconhecido bloqueia compra e venda antes de qualquer gravação', () => {
  const body = fnBody('saveQuickMovement');
  const gate = body.indexOf("if(kind==='compra'||kind==='venda')");
  const snapshot = body.indexOf('const financialSnapshot=snapshotFinancialImportState');
  assert.ok(gate > 0 && snapshot > 0, 'gate de validação presente');
  assert.ok(gate < snapshot, 'validação ocorre antes do snapshot e da gravação');
  assert.match(body, /\['asset','catalog','inference'\]\.includes\(known\)/, 'aceita só asset/catalog/inference');
  assert.match(body, /Ativo não reconhecido\. Verifique o código informado\./);
  assert.doesNotMatch(body.slice(gate, snapshot), /'learned'/, 'ticker só aprendido por digitação não conta como reconhecido');
});

test('compra sem posição correspondente após sincronização não é gravada (sem lançamento fantasma)', () => {
  const body = fnBody('saveQuickMovement');
  const check = body.indexOf("if(kind==='compra' && !(S.assets||[])");
  const persist = body.indexOf("if(!persistFinancialImportState(financialSnapshot)) throw new Error('QUICK_MOVEMENT_PERSIST_FAILED');", check);
  assert.ok(check > 0, 'checagem de posição após compra');
  assert.ok(persist > check, 'checagem ocorre antes da persistência da compra');
  assert.match(body.slice(check, persist), /Nada foi gravado\./);
  assert.doesNotMatch(body.slice(check, persist), /restoreFinancialImportState/, 'não usa quarentena para erro de validação');
});

test('mensagem de consulta indisponível não é usada: validação não depende de provedor', () => {
  const body = fnBody('saveQuickMovement');
  assert.doesNotMatch(body, /await|fetch\(/, 'gravação não depende de rede para validar ativo');
});

test('formulário e gravação usam a mesma regra de reconhecimento (resolveAssetMetadata)', () => {
  const body = fnBody('saveQuickMovement');
  assert.match(body, /resolveAssetMetadata\(reg\.ticker\)/);
  const feedback = fnBody('quickMovementMetadataFeedbackHtml');
  assert.match(feedback, /resolveAssetMetadata\(t,/);
});
