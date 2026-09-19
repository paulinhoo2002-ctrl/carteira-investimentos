const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('loads the V213 transaction trust helper before the application', () => {
  assert.match(html, /<script src="v213-transaction-trust\.js"><\/script>/);
});

test('keeps accessible read-only transaction productivity controls', () => {
  assert.match(html, /aria-label="Buscar aportes por ticker/);
  assert.match(html, /aria-label="Ordenar histórico de movimentações"/);
  assert.match(html, /function setAportesSort\(sort\)/);
  assert.match(html, /function setAportesFilter\(filter\)/);
  assert.match(html, /Mostrando \$\{from\}–\$\{to\} de \$\{total\} movimentações/);
});

test('uses the V213 helper for transaction filtering and sorting', () => {
  assert.match(html, /V213TransactionTrust\?\.filterTransactions/);
  assert.match(html, /V213TransactionTrust\?\.sortTransactions/);
});

test('keeps transaction writes behind explicit existing actions', () => {
  assert.match(html, /onclick='edP\(/);
  assert.match(html, /onclick='repeatContribution\(/);
  assert.match(html, /deleteMovementLaunch\(/);
});
