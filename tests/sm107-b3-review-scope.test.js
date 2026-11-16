'use strict';
// SM107: a revisão de posição B3 (b3ReviewModal) referenciava `proventoSummaryCards`, variável local de
// b3ProventosReviewModal. Fora desse escopo o acesso lança ReferenceError antes do fallback e a tela cai em
// "Inicialização protegida" após prévia de PDF/XLSX de posição. Este teste trava a regressão no código-fonte.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function functionBody(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `função ${name} precisa existir`);
  const next = html.indexOf('\nfunction ', start + 10);
  return html.slice(start, next < 0 ? undefined : next);
}

test('b3ReviewModal não referencia proventoSummaryCards (variável de outro escopo)', () => {
  assert.equal(functionBody('b3ReviewModal').includes('proventoSummaryCards'), false);
});

test('proventoSummaryCards continua restrito a b3ProventosReviewModal', () => {
  assert.equal(functionBody('b3ProventosReviewModal').includes('const proventoSummaryCards'), true);
});
