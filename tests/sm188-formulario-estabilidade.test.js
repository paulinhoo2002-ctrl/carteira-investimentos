'use strict';
// SM188 — estabilidade do formulário rápido: atualizações em segundo plano não reconstroem a tela com o formulário aberto.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Corpo de fetchQuotes: do início até a próxima função (síncrona ou async).
function fetchQuotesBody() {
  const start = html.indexOf('async function fetchQuotes(manual');
  assert.notEqual(start, -1, 'fetchQuotes existe');
  const rest = html.slice(start + 10);
  const end = rest.search(/\n(async )?function /);
  assert.notEqual(end, -1, 'limite de fetchQuotes encontrado');
  return html.slice(start, start + 10 + end);
}

test('fetchQuotes não reconstrói a tela com formulário rápido aberto (início e fim)', () => {
  const body = fetchQuotesBody();
  const guarded = body.match(/if\(!S\.quickMovementOpen\) render\(\);/g) || [];
  const total = (body.match(/render\(\);/g) || []).length;
  assert.equal(guarded.length, 2, 'duas reconstruções protegidas');
  assert.equal(total - guarded.length, 0, 'nenhuma reconstrução solta dentro de fetchQuotes');
});

test('temporizador de sincronização pendente não reconstrói com formulário aberto', () => {
  const idx = html.indexOf('window.__pendingCountInterval');
  assert.notEqual(idx, -1);
  const block = html.slice(idx, idx + 800);
  assert.match(block, /typeof render === 'function' && !S\.quickMovementOpen/);
});

test('campos do formulário gravam no rascunho a cada tecla (valor digitado sobrevive a re-renderização)', () => {
  assert.match(html, /id="qm-qty"[^>]*oninput="setQuickMovementField\('qty', this\.value\)"/);
  assert.match(html, /id="qm-price"[^>]*oninput="setQuickMovementField\('price', this\.value\)"/);
  assert.match(html, /id="qm-sell-fees"[^>]*oninput="setQuickMovementField\('fees', this\.value\)"/);
});
