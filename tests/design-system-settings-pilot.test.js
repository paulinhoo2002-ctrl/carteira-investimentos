const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('settings pilot adopts primitives only in safe sections', () => {
  assert.match(html, /premium-settings-section ds-panel[\s\S]*Aparência/);
  assert.match(html, /premium-settings-section ds-panel[\s\S]*Sobre/);
  assert.match(html, /premium-settings-section-icon ds-icon-container[\s\S]*Aparência/);
  assert.match(html, /ds-button ds-button--ghost[\s\S]*toggleTheme/);
  assert.match(html, /ds-badge ds-badge--positive ok/);
});

test('protected settings flows remain owned by existing handlers', () => {
  assert.match(html, /onclick="openBackupCenter\(\)"/);
  assert.match(html, /onclick="resetPortfolio\(\)"/);
  assert.match(html, /onclick="deleteWallet\(\)"/);
  assert.match(html, /function confirmBackupImport\(\)/);
  assert.match(html, /function applyBackupData\(parsed\)/);
  assert.match(html, /S\.rfEvents=\[\];/);
  assert.doesNotMatch(html, /premium-settings-danger[^]*ds-button--danger/);
});

test('settings pilot does not create KPI or empty-state semantics', () => {
  const settingsStart = html.indexOf('function settingsTab(){');
  const settingsEnd = html.indexOf('function closeWalletMenus(){', settingsStart);
  const settings = html.slice(settingsStart, settingsEnd);
  assert.doesNotMatch(settings, /ds-kpi/);
  assert.doesNotMatch(settings, /ds-empty-state/);
});
