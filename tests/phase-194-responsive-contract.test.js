const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('V194 responsive presentation stacks new interpretation and chart summaries', () => {
  assert.match(source, /asset-detail-interpretation/);
  assert.match(source, /reports-evolution-summary/);
  assert.match(source, /@media\(max-width:560px\)/);
  assert.match(source, /min-height:44px/);
});

test('V194 does not introduce persistence or financial engine calls in presentation contract', () => {
  const marker = source.indexOf('asset-detail-interpretation');
  assert.ok(marker >= 0);
  const slice = source.slice(Math.max(0, marker - 1200), marker + 2200);
  assert.doesNotMatch(slice, /localStorage|firebase|save\(|FinanceCore/);
});
