'use strict';

// IR2026 — P5 matcher tests (synthetic tickers only).

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTicker, matchAsset, registerAliasGroup, resetAliases } = require('../ir2026/matcher');

test('P5: exact ticker match', () => {
  const m = matchAsset('DEMO4', ['DEMO4', 'DEMO11']);
  assert.equal(m.MATCH, 'EXACT');
  assert.equal(m.ASSET, 'DEMO4');
});

test('P5: case/whitespace normalization still matches EXACT', () => {
  const m = matchAsset('  demo4 ', ['DEMO4']);
  assert.equal(m.MATCH, 'EXACT');
});

test('P5: suffix normalization matches NORMALIZED_EXACT', () => {
  const m = matchAsset('DEMO4-B', ['DEMO4']);
  assert.equal(m.MATCH, 'NORMALIZED_EXACT');
  assert.equal(m.ASSET, 'DEMO4');
});

test('P5: certified alias group resolves ALIAS_CERTIFIED', () => {
  resetAliases();
  registerAliasGroup({ aliases: ['DEMOOLD', 'DEMONEW'], canonical: 'DEMONEW', basis: 'TICKER_CHANGE_EVENT' });
  const m = matchAsset('DEMOOLD', ['DEMONEW']);
  assert.equal(m.MATCH, 'ALIAS_CERTIFIED');
  assert.equal(m.ASSET, 'DEMONEW');
  assert.equal(m.BASIS, 'TICKER_CHANGE_EVENT');
});

test('P5: uncertified alias is NO_MATCH (never guessed)', () => {
  resetAliases();
  const m = matchAsset('DEMOX', ['DEMOY']);
  assert.equal(m.MATCH, 'NO_MATCH');
});

test('P5: multiple same-base candidates are AMBIGUOUS', () => {
  const m = matchAsset('DEMOZ33', ['DEMOZ', 'DEMOZ34']);
  assert.equal(m.MATCH, 'AMBIGUOUS');
  assert.ok(m.CANDIDATES.includes('DEMOZ'));
});

test('P5: single same-base candidate resolves by series normalization', () => {
  const m = matchAsset('DEMOQ34', ['DEMOQ']);
  assert.equal(m.MATCH, 'NORMALIZED_EXACT');
  assert.equal(m.ASSET, 'DEMOQ');
});

test('P5: empty input is NO_MATCH with reason', () => {
  const m = matchAsset('', ['DEMO4']);
  assert.equal(m.MATCH, 'NO_MATCH');
  assert.equal(m.REASON, 'EMPTY');
});

test('P5: normalizeTicker strips known suffixes deterministically', () => {
  assert.equal(normalizeTicker('DEMO11'), 'DEMO');
  assert.equal(normalizeTicker('DEMO-B'), 'DEMO');
  assert.equal(normalizeTicker('demo4'), 'DEMO4');
});
