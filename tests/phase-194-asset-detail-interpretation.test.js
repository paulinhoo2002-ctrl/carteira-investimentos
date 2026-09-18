const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('asset detail exposes read-only interpretation using existing trust/value helpers', () => {
  const start = source.indexOf('function assetDetailPage(asset){');
  const end = source.indexOf('\nfunction analysisDestination(){', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /Como ler esta posição/);
  assert.match(block, /assetDetailTrust\(asset,isRF\)/);
  assert.match(block, /assetDetailText\(/);
  assert.match(block, /'—'/);
  assert.doesNotMatch(block, /localStorage|save\(|persistence|FinanceCore/);
});
