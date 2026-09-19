'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const index = fs.readFileSync('index.html', 'utf8');

test('V215 loads the pure fixed-income trust helper before the app renderer', () => {
  assert.match(index, /<script src="fixed-income-trust\.js"><\/script>/);
  assert.ok(index.indexOf('fixed-income-trust.js') < index.indexOf('function rendaFixaTab()'));
});

test('Renda Fixa exposes accessible trust controls without adding write handlers', () => {
  assert.match(index, /aria-label="Buscar título de renda fixa"/);
  assert.match(index, /aria-label="Filtrar status do valuation"/);
  assert.match(index, /aria-label="Ordenar posições de renda fixa"/);
  assert.match(index, /Valor manual continua sendo a autoridade/);
  assert.doesNotMatch(index, /setRfTrustSearch\([^)]*save|setRfTrustFilter\([^)]*save/i);
});

test('Renda Fixa keeps unavailable current values out of numeric result output', () => {
  assert.match(index, /const current=Number\.isFinite\(vals\.current\) \? Number\(vals\.current\) : null/);
  assert.match(index, /Number\.isFinite\(r\.current\)\?r\.current:0/);
  assert.match(index, /trustSummary/);
});

test('protected financial and modern surfaces remain untouched by V215 source references', () => {
  const helper = fs.readFileSync('fixed-income-trust.js', 'utf8');
  assert.doesNotMatch(helper, /finance-core|persistence-core|firebase|modern\/src/i);
  assert.doesNotMatch(helper, /localStorage|Firestore|fetch\s*\(/i);
});
