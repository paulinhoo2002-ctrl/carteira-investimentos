const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const waveStart = html.indexOf('<style id="apple-pass-wave-2">');
const waveEnd = html.indexOf('</style>', waveStart);
const wave = html.slice(waveStart, waveEnd);

test('Wave 2 keeps the Rentabilidade mobile KPI rhythm local', () => {
  assert.notEqual(waveStart, -1);
  assert.match(wave, /@media\(max-width:767px\)/);
  assert.match(wave, /\.rent-premium \.rent-side \.rent-card:last-child/);
  assert.match(wave, /grid-column:1\/-1/);
  assert.doesNotMatch(wave, /go\(|save\(|assetAnalysisRows|rfIntelligenceSnapshot/);
});

test('Wave 2 does not introduce new layout architecture or financial semantics', () => {
  assert.doesNotMatch(wave, /grid-template|display:flex|position:fixed|@keyframes|transition/);
  assert.doesNotMatch(wave, /modern\/src|createRoot|ReactDOM|localStorage/);
});
