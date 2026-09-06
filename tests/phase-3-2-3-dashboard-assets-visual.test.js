const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Phase 3.2.3: recebimentos usam superfície transparente e não o fundo cinza do botão', () => {
  assert.match(source, /Phase 3\.2\.3: visual hierarchy refinement/);
  assert.match(source, /dashboard-receipts-card \.dash-receipt-row\{[\s\S]*?background:transparent/);
  assert.match(source, /dashboard-receipts-card button\.dash-receipt-row\{width:100%;font:inherit/);
});

test('Phase 3.2.3: Dashboard reduz ruído sem alterar valores financeiros', () => {
  assert.match(source, /canon-dashboard \.premium-metric:after\{display:none\}/);
  assert.match(source, /dashboard-evolution-card svg\{height:174px\}/);
  assert.match(source, /dashboard-executive-kpis \.premium-metric-note\{display:-webkit-box/);
});

test('Phase 3.2.3: destaques móveis mantêm alinhamento e leitura contextual', () => {
  assert.match(source, /dashboard-highlight-row \.dashboard-highlight-details\{\n    display:grid;grid-column:1\/-1/);
  assert.match(source, /dashboard-highlight-row \.dashboard-highlight-bar\{\n    display:block;grid-column:1\/-1/);
});

test('Phase 3.2.3: Ativos mantém acordeões e compacta cartões sem reduzir alvos de ação', () => {
  assert.match(source, /assets-premium-shell \.ag-wrap\{gap:7px\}/);
  assert.match(source, /assets-premium-shell \.ag-v\{font-size:10px;letter-spacing:-\.03em;white-space:nowrap;overflow:visible;text-overflow:clip\}/);
  assert.match(source, /assets-premium-shell \.asset-premium-card-action\{min-height:44px/);
  assert.match(source, /activeAssetsGroup/);
  assert.match(source, /toggleAssetGroup\(/);
});
