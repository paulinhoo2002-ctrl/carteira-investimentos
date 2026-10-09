const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// V345: sale branch must read the fees input that the sale form actually renders.
test('V345 RED->GREEN: sale branch reads qm-sell-fees, not qm-buy-fees', () => {
  const start = html.indexOf("if(next==='venda'){", html.indexOf('function quickMovementBuildAporteFromFields'));
  const saleBranch = html.slice(start, html.indexOf("const ticker=normalizeMetadataTicker", start));
  assert.ok(saleBranch.length > 0, 'sale branch not found');
  assert.match(saleBranch, /qm-sell-fees/, 'sale validation must read qm-sell-fees');
  assert.doesNotMatch(saleBranch, /qm-buy-fees/, 'sale validation must not read qm-buy-fees');
});

test('V345 RED->GREEN: pnl helper passes fees=null through as UNKNOWN, never as confirmed zero', () => {
  const helper = html.slice(html.indexOf('function quickMovementSaleRealizedPnl'), html.indexOf('function quickMovementSalePreviewHtml'));
  assert.ok(helper.length > 0, 'pnl helper not found');
  assert.doesNotMatch(helper, /fees\s*\|\|\s*0/, 'fees||0 turns UNKNOWN into confirmed zero');
  // fees must be forwarded raw so the engine can flag MISSING_FEES
  assert.match(helper, /fees:\s*fees(?!\s*\|\|)/, 'candidate must carry fees exactly as received (null stays null)');
});

test('V345 RED->GREEN: buy branch keeps qm-buy-fees (unchanged behavior)', () => {
  const buyBranch = html.slice(html.indexOf('function quickMovementBuildAporteFromFields'));
  assert.match(buyBranch, /qm-buy-fees/, 'buy branch keeps its own fees field');
});
