const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('V253 carrega engine puro antes do bootstrap da tela', () => {
  assert.match(html, /<script src="dividend-intelligence\.js"><\/script>/);
  assert.match(html, /function v253DividendIntelligencePanel\(rows\)/);
  assert.match(html, /v253-income-intelligence/);
});

test('painel V253 explicita estados de renda sem oferecer escrita', () => {
  assert.match(html, /anunciados ficam fora do recebido/);
  assert.match(html, /não são recebimentos/);
  assert.doesNotMatch(html, /confirmar.*provento/i);
});
