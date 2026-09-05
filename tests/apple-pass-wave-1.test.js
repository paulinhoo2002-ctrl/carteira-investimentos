const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const waveStart = html.indexOf('<style id="apple-pass-wave-1">');
const waveEnd = html.indexOf('</style>', waveStart);
const wave = html.slice(waveStart, waveEnd);

test('Apple Pass Wave 1 exposes an explicit interaction contract', () => {
  assert.notEqual(waveStart, -1);
  assert.match(wave, /button:focus-visible/);
  assert.match(wave, /a:focus-visible/);
  assert.match(wave, /\[role="tab"\]:focus-visible/);
  assert.match(wave, /transition-property:background-color,border-color,color,box-shadow,opacity,transform/);
  assert.match(wave, /transition-duration:var\(--apple-pass-motion-duration\)/);
  assert.doesNotMatch(wave, /transition\s*:\s*all/);
});

test('Apple Pass Wave 1 supports reduced motion without changing semantics', () => {
  assert.match(wave, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(wave, /animation-duration:\.01ms!important/);
  assert.match(wave, /transition-duration:\.01ms!important/);
  assert.match(wave, /transform:none!important/);
  assert.doesNotMatch(wave, /innerHTML|onclick|localStorage|save\(\)/);
});

test('protected handlers remain present and the modern bridge is untouched', () => {
  assert.match(html, /function resetPortfolio\(\)/);
  assert.match(html, /function openBackupCenter\(\)/);
  assert.match(html, /function confirmBackupImport\(\)/);
  assert.match(html, /function dataAuditTab\(\)/);
  assert.match(html, /function rfIntelligenceSnapshot\(\)/);
  assert.doesNotMatch(wave, /modern\/src|createRoot|ReactDOM/);
});
