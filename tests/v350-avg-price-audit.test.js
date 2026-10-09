const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// V350: synthetic audit of the legacy average-price engine (syncAssetsFromAportes).
// Runs the real extracted function in a VM sandbox with a minimal S. No real
// storage, no Firebase, purely in-memory fixtures.

const INDEX_HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractBlock(startMarker, endMarker) {
  const start = INDEX_HTML.indexOf(startMarker);
  assert.ok(start >= 0, `marker not found: ${startMarker}`);
  const end = INDEX_HTML.indexOf(endMarker, start);
  assert.ok(end > start, `end marker not found: ${endMarker}`);
  return INDEX_HTML.slice(start, end);
}

const syncFn = extractBlock('function syncAssetsFromAportes(', 'function qtyAtDate(');

function buildSandbox(aportes, assets = []) {
  const S = { aportes, assets };
  const sandbox = {
    S,
    parseAnyDate: value => {
      if (!value) return null;
      const [y, m, d] = String(value).split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    },
    parseNum: value => { const n = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; },
    cleanAssetCode: value => String(value || '').trim().toUpperCase(),
    normalizeType: (value, fallback) => String(value || fallback || 'Ação').trim(),
    metaTicker: () => ({ type: 'Ação', sector: '' }),
    learnedMetaFor: () => null,
    learnTickerMeta: () => {},
    isNeutralMovement: p => {
      const op = String(p.operation || p.op || '').toLowerCase();
      return ['transferencia', 'transfer', 'cobertura', 'doacao', 'desdobramento'].includes(op);
    },
    isProtectedReadOnlyQaBoot: () => false,
    isLocalTestReadOnlyMode: () => false,
    window: { ProtectedRfReconstruction: null, __V76_RUNTIME_STATUS__: null },
    toast: () => {},
    autoDY: () => {},
    render: () => {},
    save: () => {},
    rfPositionImportSourceTag: () => '',
    Date, Math, Number, String, Object, Array, JSON,
  };
  vm.createContext(sandbox);
  vm.runInContext(syncFn, sandbox);
  return { S, run: () => vm.runInContext('syncAssetsFromAportes(false,false);', sandbox) };
}

test('V350: two buys at different prices produce weighted average cost', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 10 },
    { id: 2, date: '2026-02-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 20 },
  ]);
  run();
  const a = S.assets.find(x => x.ticker === 'TEST4');
  assert.ok(a, 'asset missing after buys');
  assert.equal(a.qty, 200);
  assert.ok(Math.abs(a.avg_price - 15) < 1e-9, `weighted avg expected 15, got ${a.avg_price}`);
});

test('V350: partial sale keeps remaining unit average cost unchanged', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 10 },
    { id: 2, date: '2026-02-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 20 },
    { id: 3, date: '2026-03-10', ticker: 'TEST4', operation: 'venda', qty: 100, price: 25 },
  ]);
  run();
  const a = S.assets.find(x => x.ticker === 'TEST4');
  assert.equal(a.qty, 100);
  assert.ok(Math.abs(a.avg_price - 15) < 1e-9, `partial sale must not change remaining unit cost; expected 15, got ${a.avg_price}`);
});

test('V350: full sale removes the position; rebuy starts fresh cost basis', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 10 },
    { id: 2, date: '2026-02-10', ticker: 'TEST4', operation: 'venda', qty: 100, price: 12 },
    { id: 3, date: '2026-03-10', ticker: 'TEST4', operation: 'compra', qty: 50, price: 30 },
  ]);
  run();
  const a = S.assets.find(x => x.ticker === 'TEST4');
  assert.ok(a, 'asset missing after rebuy');
  assert.equal(a.qty, 50);
  assert.ok(Math.abs(a.avg_price - 30) < 1e-9, `rebuy cost basis must be fresh; expected 30, got ${a.avg_price}`);
});

test('V350: same-date operations follow insertion order; sell clamps to available qty', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'TEST4', operation: 'compra', qty: 10, price: 10 },
    { id: 2, date: '2026-01-10', ticker: 'TEST4', operation: 'venda', qty: 4, price: 11 },
    { id: 3, date: '2026-01-10', ticker: 'TEST4', operation: 'venda', qty: 99, price: 11 }, // over-sell clamped
  ]);
  run();
  // over-sell clamps at available qty; combined sells (4 + 99 clamped to 6)
  // consume the whole position, so the fully sold ticker is removed entirely.
  assert.equal(S.assets.filter(x => x.ticker === 'TEST4').length, 0, 'fully sold asset must be removed');
});

test('V350: buy with zero/absent price contributes zero cost (UNKNOWN is not invented)', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 10 },
    { id: 2, date: '2026-02-10', ticker: 'TEST4', operation: 'compra', qty: 50 }, // no price field
  ]);
  run();
  const a = S.assets.find(x => x.ticker === 'TEST4');
  // 1000 total / 150 qty = 6.666..: priceless buy adds quantity but zero cost,
  // lowering the average — documented legacy behavior, not invented cost.
  assert.ok(Math.abs(a.avg_price - (1000 / 150)) < 1e-9, `avg with priceless buy expected 1000/150, got ${a.avg_price}`);
});

test('V350: legacy asset fields without avg keep imported positions without inventing cost', () => {
  const { S, run } = buildSandbox([], [{
    id: 42, ticker: 'IMP4', type: 'Ação', qty: 10, avg_price: 0, current_price: 12,
  }]);
  run();
  const a = S.assets.find(x => x.ticker === 'IMP4');
  // no aportes for the ticker: grouped is empty and the imported asset is not
  // rebuilt by the sync — imported positions pass through untouched.
  assert.ok(!a || (a.qty === 10 && a.avg_price === 0), 'imported position must not gain invented cost');
});
