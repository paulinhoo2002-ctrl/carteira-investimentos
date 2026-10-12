'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const FixedIncomeTrust = require('../fixed-income-trust.js');

test('sorts by issuer and keeps missing issuers last', () => {
  const rows = [
    { ticker: 'Z', issuer: 'Banco Z' },
    { ticker: 'B', issuer: '' },
    { ticker: 'A', issuer: 'Banco A' },
  ];
  assert.deepEqual(FixedIncomeTrust.sortRows(rows, 'issuer', 'asc').map(row => row.ticker), ['A', 'Z', 'B']);
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(source.includes('value="issuer-asc"'));
  assert.ok(source.includes('>Instituição A–Z<'));
  assert.ok(source.includes('premium-rf-row-issuer'));
});

test('sorts by product type and leaves missing types last', () => {
  const rows = [
    { ticker: 'Z', category: 'Tesouro' },
    { ticker: 'B', category: '' },
    { ticker: 'A', category: 'CDB' },
    { ticker: 'A2', category: 'CDB' },
  ];
  assert.deepEqual(FixedIncomeTrust.sortRows(rows, 'category', 'asc').map(row => row.ticker), ['A', 'A2', 'Z', 'B']);
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(source.includes('value="type-asc"'));
  assert.ok(source.includes('>Tipo do produto A–Z<'));
});
