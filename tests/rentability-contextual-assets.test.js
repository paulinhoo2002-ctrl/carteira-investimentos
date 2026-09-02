import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const rentStart = source.indexOf('function rentabilidadeTab()');
const rentEnd = source.indexOf('\nfunction rebalanceScenarioValues', rentStart);
const rentability = source.slice(rentStart, rentEnd);
const openStart = source.indexOf('function openRentabilityAsset');
const openEnd = source.indexOf('\nfunction svA', openStart);
const opener = source.slice(openStart, openEnd);

test('rentability exposes one contextual action for the identifiable top asset', () => {
  assert.match(rentability, /openRentabilityAsset\(/);
  assert.match(rentability, /Maior posição/);
  assert.match(rentability, /Abrir ativo/);
  assert.match(rentability, /Ver Ativos/);
});

test('asset opening validates current id and ticker, then falls back to assets', () => {
  assert.match(opener, /const wantedId=String\(assetId\|\|''\)/);
  assert.match(opener, /const exact=wantedId \? matches\.filter/);
  assert.match(opener, /if\(exact\.length===1\)\{ go\('ativos'\); edA\(exact\[0\]\.id\)/);
  assert.match(opener, /go\('ativos'\);\s*\}/);
});

test('contextual rentability navigation does not add financial writes or calculations', () => {
  assert.doesNotMatch(opener, /S\.(assets|aportes|proventos|rfEvents|goals)\s*=/);
  assert.doesNotMatch(rentability, /assetRentabPct\(|assetCurrentValue\(|assetAppliedValue\(/);
});
