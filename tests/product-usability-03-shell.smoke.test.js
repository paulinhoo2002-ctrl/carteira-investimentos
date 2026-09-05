const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('desktop shell keeps a stable content gutter after the sidebar', () => {
  assert.match(html, /@media\(min-width:1181px\)\{[\s\S]*?\.wrap\{max-width:1500px;padding:20px 28px 30px\}/);
  assert.match(html, /\.shell-main\{margin-left:194px\}/);
});

test('legacy assets navigation alias cannot render a blank primary route', () => {
  assert.match(html, /if\(t==='assets'\) t='ativos';/);
  assert.match(html, /<h1 id="assets-page-title" class="st">Ativos<\/h1>/);
  assert.match(html, /class="assets-premium-kpis"/);
  assert.match(html, /class="assets-premium-search"/);
  assert.match(html, /class="assets-all-assets"/);
});

test('assets result states retain explicit semantic colors', () => {
  assert.match(html, /\.asset-class-result-values \.good b\{color:#34d399\}/);
  assert.match(html, /\.asset-class-result-values \.neg b\{color:#f87171\}/);
  assert.match(html, /\.asset-class-result-values \.neutral b\{color:#c0cce0\}/);
});
