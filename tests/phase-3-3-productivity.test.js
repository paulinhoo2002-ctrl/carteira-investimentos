import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Phase 3.3 search exposes safe transaction to asset navigation', () => {
  assert.match(source, /function portfolioSearchAssetForMovement\(move\)/);
  assert.match(source, /move\?\.assetId,move\?\.asset_id,move\?\.assetID/);
  assert.match(source, /byTicker\.length===1 \? byTicker\[0\] : null/);
  assert.match(source, /function portfolioSearchContextSelect\(index,event\)/);
  assert.match(source, /openRentabilityAsset\(entry\.relatedAssetId,entry\.relatedAssetTicker\|\|''\)/);
  assert.match(source, /contextAction:relatedAsset\?'Ver ativo':''/);
  assert.match(source, /portfolio-search-result-context/);
});

test('Phase 3.3 contextual shortcut cannot use approximate identity or mutate data', () => {
  const searchStart = source.indexOf('function portfolioSearchAssetForMovement');
  const searchEnd = source.indexOf('function portfolioSearchBuildEntries', searchStart);
  const helper = source.slice(searchStart, searchEnd);
  assert.doesNotMatch(helper, /includes\(|startsWith\(|localeCompare\(/);
  const contextStart = source.indexOf('function portfolioSearchContextSelect');
  const contextEnd = source.indexOf('function portfolioSearchSelect', contextStart);
  const context = source.slice(contextStart, contextEnd);
  assert.doesNotMatch(context, /save\(|localStorage|S\.assets\s*=|S\.aportes\s*=/);
});

