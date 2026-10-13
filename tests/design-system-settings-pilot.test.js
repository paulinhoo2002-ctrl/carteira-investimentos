const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const settings = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'js', 'screens', 'settings.js'), 'utf8');

test('settings pilot adopts primitives only in safe sections', () => {
  assert.match(settings, /premium-settings-section ds-panel[\s\S]*Aparência/);
  assert.match(settings, /premium-settings-section ds-panel[\s\S]*Sobre/);
  assert.match(settings, /premium-settings-section-icon ds-icon-container[\s\S]*Aparência/);
  assert.match(settings, /ds-button ds-button--ghost[\s\S]*toggleTheme/);
  assert.match(settings, /ds-badge ds-badge--positive ok/);
});

test('protected settings flows remain owned by existing handlers', () => {
  assert.match(settings, /onclick="openBackupCenter\(\)"/);
  assert.match(settings, /onclick="resetPortfolio\(event\)"/);
  assert.match(settings, /onclick="deleteWallet\(\)"/);
  assert.match(html, /function confirmBackupImport\(\)/);
  assert.match(html, /function applyBackupData\(parsed\)/);
  assert.match(html, /S\.rfEvents=\[\];/);
  assert.doesNotMatch(html, /premium-settings-danger[^]*ds-button--danger/);
});

test('settings pilot does not create KPI or empty-state semantics', () => {
  assert.doesNotMatch(settings, /ds-kpi/);
  assert.doesNotMatch(settings, /ds-empty-state/);
});
