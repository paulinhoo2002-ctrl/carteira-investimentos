const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const designSystem = fs.readFileSync(path.join(repoRoot, 'docs/ai/DESIGN_SYSTEM.md'), 'utf8');

test('piloto visual define aliases sem remover tokens existentes', () => {
  for (const token of [
    '--ds-surface:', '--ds-surface-elevated:', '--ds-border:', '--ds-text-primary:',
    '--ds-text-secondary:', '--ds-positive:', '--ds-negative:', '--ds-warning:',
    '--ds-info:', '--ds-accent:', '--ds-control-height:', '--ds-icon-size:',
  ]) {
    assert.match(index, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const token of ['--surface:', '--panel:', '--border:', '--text:', '--muted:', '--success:', '--danger:']) {
    assert.match(index, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(index, /class="card al metas-kpi-card ds-kpi ds-kpi--warning"/);
  assert.match(index, /class="metas-summary-bar ds-panel ds-panel--compact"/);
  assert.match(index, /class="wave-b-icon ds-icon-container"/);
});

test('primitives mantem variantes sem carregar semantica financeira', () => {
  for (const variant of ['positive', 'negative', 'warning', 'informational']) {
    assert.match(index, new RegExp(`\\.ds-kpi--${variant}`));
  }
  for (const variant of ['primary', 'secondary', 'ghost', 'danger', 'icon']) {
    assert.match(index, new RegExp(`\\.ds-button--${variant}`));
  }
  for (const variant of ['positive', 'negative', 'warning', 'info']) {
    assert.match(index, new RegExp(`\\.ds-badge--${variant}`));
  }
  assert.match(index, /ds-empty-state/);
  assert.match(designSystem, /VALID_ZERO_IS_NOT_MISSING=true/);
  assert.match(designSystem, /must not calculate/);
});

test('piloto nao acopla o legado ao frontend moderno', () => {
  const pilotBlock = index.match(/\.ds-kpi\{[\s\S]*?\.ds-empty-state\{[\s\S]*?\}/)?.[0] || '';
  assert.doesNotMatch(pilotBlock, /modern\/src|React|import /i);
  assert.match(index, /class="card al metas-kpi-card/);
  assert.match(index, /metas-kpi-value ds-kpi__value/);
});
