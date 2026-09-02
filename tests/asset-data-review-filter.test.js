const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `snippet not found: ${startMarker}`);
  return source.slice(start, end);
}

function buildReviewContext(issues, assets) {
  const context = {
    S: { assets, assetReviewFilter: null },
    dataQualitySnapshot: () => ({ issues }),
    dataQualityAssetKey: asset => [asset.ticker, asset.type, asset.currency || ''].join('|'),
    dataQualityText: value => String(value || ''),
    go: route => { context.lastRoute = route; },
    render: () => { context.rendered = true; }
  };
  vm.runInNewContext(`${extract('function assetReviewQualityData(', 'function assetReviewFilterIsActive')}
${extract('function assetReviewFilterIsActive()', 'function openIncompleteAssetsReview')}
${extract('function openIncompleteAssetsReview()', 'function clearIncompleteAssetsReview')}
${extract('function clearIncompleteAssetsReview()', 'function assetReviewReasonText')}
${extract('function assetReviewReasonText(asset)', 'function setDataAuditSeverity')}
this.assetReviewQualityData=assetReviewQualityData;`, context);
  return context;
}

const assetA = { id: 'a-1', ticker: 'PETR4', type: 'Ação', currency: 'BRL' };
const assetB = { id: 'a-2', ticker: 'VALE3', type: 'Ação', currency: 'BRL' };
const issue = (id, field, identityKey = 'PETR4|Ação|BRL') => ({ entityType: 'Ativo', entityId: id, field, identityKey });

test('quality review uses official asset identity and deduplicates assets', () => {
  const context = buildReviewContext([issue('a-1', 'currency'), issue('a-1', 'current_price')], [assetA, assetB]);
  const result = context.assetReviewQualityData();
  assert.deepEqual(Array.from(result.ids), ['a-1']);
  assert.equal(result.issueCount, 2);
  assert.deepEqual(Array.from(result.reasons['a-1']), ['currency', 'current_price']);
});

test('stale identity is rejected instead of selecting a replacement asset', () => {
  const context = buildReviewContext([issue('a-1', 'currency', 'OTHER|Ação|BRL')], [assetA, assetB]);
  assert.deepEqual(Array.from(context.assetReviewQualityData().ids), []);
});

test('only explicit session filter state is wired and is not persisted', () => {
  assert.match(source, /assetReviewFilter:null/);
  assert.match(source, /filterAssetsForDisplay\(assets\)/);
  assert.match(source, /allowed\.has\(String\(a\?\.id\)\)/);
  assert.match(source, /openIncompleteAssetsReview\(\)/);
  assert.match(source, /clearIncompleteAssetsReview\(\)/);
  assert.doesNotMatch(source, /localStorage\.setItem\([^\n]*assetReviewFilter/);
  assert.match(source, /dataQualityAssetKey\(asset\)/);
});

test('audit entry reuses the official Ativos route and editor contract', () => {
  assert.match(source, /onclick="openIncompleteAssetsReview\(\)">Revisar/);
  assert.match(source, /function dataQualityRunAction\(issue\)/);
  assert.match(source, /return edA\(action\.id\)/);
  assert.match(source, /function edA\(id\)/);
});
