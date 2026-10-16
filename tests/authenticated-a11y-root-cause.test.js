const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('shared header status and quote metadata use theme-aware semantic colors', () => {
  const cloudStatus = html.slice(html.indexOf('function cloudStatus(){'), html.indexOf('function authBox(){'));
  const appStart = html.indexOf('function app(){');
  const appHeader = html.slice(appStart, appStart + 7000);
  assert.ok(cloudStatus.includes(`var(--success)`), 'connected state must use success token');
  assert.ok(cloudStatus.includes(`var(--warning)`), 'sync state must use warning token');
  assert.ok(cloudStatus.includes(`var(--negative)`), 'error state must use negative token');
  assert.ok(cloudStatus.includes(`var(--muted)`), 'local state must use muted token');
  assert.ok(!/#(?:34d399|fbbf24|f87171|64748b)/i.test(cloudStatus), 'status must not use low-contrast fixed colors');
  assert.ok(/font-size:11px;color:var\(--muted\)/.test(appHeader), 'date must use theme-aware muted color');
  assert.ok(/font-size:10px;color:var\(--muted\)/.test(appHeader), 'quote metadata must use theme-aware muted color');
});

test('asset actions use existing primary and secondary button variants', () => {
  assert.ok(/<button class="btn bgh" onclick="exportData\(\)"/.test(html), 'Export must use the existing ghost button style');
  assert.ok(/<button class="btn bp" onclick="openAssetModal\(\)"/.test(html), 'New Asset must use the existing primary button style');
});

test('patrimony month history is a named keyboard-focusable region', () => {
  assert.ok(/<div class="patrimony-month-list" tabindex="0" role="region" aria-label="Aportes líquidos por mês">/.test(html));
});

test('dividend recent-list count is fully opaque and readable in both themes', () => {
  assert.ok(/\.div-premium \.div-recent-more\{font-size:12px;line-height:1\.35;color:var\(--muted\);opacity:1\}/.test(html));
});

test('light financial negatives and patrimonio rank use accessible palette', () => {
  assert.ok(/html\[data-theme="light"\] \.rd,html\[data-theme="light"\] \.premium-rf-row-meta\.neg\{color:var\(--negative\)\}/.test(html));
  assert.ok(/html\[data-theme="light"\] \.patrimonio-top-asset-rank\{color:#3730a3\}/.test(html));
  assert.ok(/html\[data-theme="light"\] \.div-type-badge\.dividendo\{color:#1d4ed8\}/.test(html));
  assert.ok(/html\[data-theme="light"\] \.div-type-badge\.jcp\{color:#8a5a00\}/.test(html));
  assert.ok(/html\[data-theme="light"\] \.div-rf-money-item span\{color:#334155\}/.test(html));
});
