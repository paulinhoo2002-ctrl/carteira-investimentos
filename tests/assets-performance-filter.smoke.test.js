const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function browserPath() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(file => { try { fs.accessSync(file); return true; } catch { return false; } });
}

async function startServer(root) {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
    const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
    if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

test('filtro de performance preserva estados oficiais e combina filtros', async () => {
  const executable = browserPath();
  assert.ok(executable, 'Chrome/Edge nao encontrado');
  const { chromium } = await import('playwright-core');
  const harness = await startServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: executable, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => {
      S.assets = [
        { id: 'positive', ticker: 'POS', type: 'FII', qty: 1, avg_price: 100, current_price: 120 },
        { id: 'negative', ticker: 'NEG', type: 'FII', qty: 1, avg_price: 100, current_price: 80 },
        { id: 'neutral', ticker: 'NEU', type: 'Ação', qty: 1, avg_price: 100, current_price: 100 },
        { id: 'incomplete', ticker: 'INC', type: 'ETF', qty: 1, avg_price: 0, current_price: 50 },
      ];
      S.assetsSearch=''; S.assetsFilterClasses=[]; S.assetReviewFilter=null;
    await page.setViewportSize({ width: 1366, height: 768 });
    const result = await page.evaluate(() => {
      S.assets = [
        { id: 'positive', ticker: 'POS', type: 'FII', sector: 'Bancos', qty: 1, avg_price: 100, current_price: 120, dy: 8 },
        { id: 'negative', ticker: 'NEG', type: 'FII', sector: 'Papel', qty: 1, avg_price: 100, current_price: 80, dy: 4 },
        { id: 'neutral', ticker: 'NEU', type: 'Ação', sector: 'Bancos', qty: 1, avg_price: 100, current_price: 100, dy: 6 },
        { id: 'incomplete', ticker: 'INC', type: 'ETF', sector: 'ETF', qty: 1, avg_price: 0, current_price: 50 },
      ];
      S.assetsSearch=''; S.assetsFilterClasses=[]; S.assetsSectorFilter='all'; S.assetReviewFilter=null;
      const pick = filter => { S.assetsPerformanceFilter=filter; return filterAssetsForDisplay(S.assets).map(asset => asset.id); };
      const positive = pick('positive');
      const negative = pick('negative');
      const neutral = pick('neutral');
      const all = pick('all');
      S.assetsPerformanceFilter='positive'; S.assetsFilterClasses=['FII'];
      const classAndPerformance = filterAssetsForDisplay(S.assets).map(asset => asset.id);
      S.assetsFilterClasses=[]; S.assetsSearch='pos';
      const searchAndPerformance = filterAssetsForDisplay(S.assets).map(asset => asset.id);
      S.assetsSearch=''; S.assetsFilterClasses=[]; S.assetsPerformanceFilter='negative';
      const countBeforeClear = assetsFilterCount();
      clearAssetsFilters();
      return { positive, negative, neutral, all, classAndPerformance, searchAndPerformance, countBeforeClear, cleared: { search: S.assetsSearch, classes: S.assetsFilterClasses, performance: S.assetsPerformanceFilter } };
      S.assetsSearch=''; S.assetsPerformanceFilter='all'; S.assetsSectorFilter='Bancos';
      const sectorOnly = filterAssetsForDisplay(S.assets).map(asset => asset.id);
      S.assetsPerformanceFilter='positive'; S.assetsSectorFilter='all'; S.assetsFilterClasses=['FII'];
      const composed = filterAssetsForDisplay(S.assets).map(asset => asset.id);
      S.assetsFilterClasses=[]; S.assetsSectorFilter='all'; S.assetsSearch='';
      S.assetSort={Todos:{field:'result',dir:'asc'}};
      const resultAsc = sortAssetsByGroup('Todos', S.assets, 0).map(asset => asset.id);
      S.assetSort={Todos:{field:'result',dir:'desc'}};
      const resultDesc = sortAssetsByGroup('Todos', S.assets, 0).map(asset => asset.id);
      S.assetSort={Todos:{field:'dy',dir:'desc'}};
      const dyDesc = sortAssetsByGroup('Todos', S.assets, 0).map(asset => asset.id);
      S.assetSort={Todos:{field:'divMonth',dir:'desc'}};
      const divMonthDesc = sortAssetsByGroup('Todos', S.assets, 0).map(asset => asset.id);
      S.assets.push(
        { id: 'zero-dy', ticker: 'ZER', type: 'ETF', sector: 'ETF', qty: 1, avg_price: 100, current_price: 100, dy: 0 },
        { id: 'bad-dy', ticker: 'BAD', type: 'ETF', sector: 'ETF', qty: 1, avg_price: 100, current_price: 110, dy: 'n/a' },
      );
      S.assetSort={Todos:{field:'dy',dir:'asc'}};
      const dyAsc = sortAssetsByGroup('Todos', S.assets, 0).map(asset => asset.id);
      const source = document.documentElement.innerHTML;
      const rendered = {
        resultColorContract: source.includes("resultClass = result==null ? 'neutral' : result > 0 ? 'pos' : result < 0 ? 'neg' : 'neutral'") && source.includes('result-indicator ${resultClass}'),
        dyZeroAndMissingContract: source.includes("Number.isFinite(dy)?dy+'%':'—'") && source.includes("dm!=null?fmt(dm):'—'"),
      };
      S.assetsSectorFilter='Bancos'; S.assetsPerformanceFilter='positive'; S.assetsFilterClasses=[];
      const countBeforeClear = assetsFilterCount();
      clearAssetsFilters();
      return { positive, negative, neutral, all, classAndPerformance, searchAndPerformance, sectorOnly, composed, resultAsc, resultDesc, dyDesc, divMonthDesc, dyAsc, rendered, countBeforeClear, cleared: { search: S.assetsSearch, classes: S.assetsFilterClasses, sector: S.assetsSectorFilter, performance: S.assetsPerformanceFilter } };
    });
    assert.deepEqual(result.positive, ['positive']);
    assert.deepEqual(result.negative, ['negative']);
    assert.deepEqual(result.neutral, ['neutral']);
    assert.deepEqual(result.all, ['positive', 'negative', 'neutral', 'incomplete']);
    assert.deepEqual(result.classAndPerformance, ['positive']);
    assert.deepEqual(result.searchAndPerformance, ['positive']);
    assert.equal(result.countBeforeClear, 1);
    assert.deepEqual(result.cleared, { search: '', classes: [], performance: 'all' });
    assert.deepEqual(result.sectorOnly, ['positive', 'neutral']);
    assert.deepEqual(result.composed, ['positive']);
    assert.deepEqual(result.resultAsc, ['negative', 'neutral', 'positive', 'incomplete']);
    assert.deepEqual(result.resultDesc, ['positive', 'neutral', 'negative', 'incomplete']);
    assert.deepEqual(result.dyDesc, ['positive', 'neutral', 'negative', 'incomplete']);
    assert.deepEqual(result.divMonthDesc, ['positive', 'neutral', 'negative', 'incomplete']);
    assert.deepEqual(result.dyAsc, ['zero-dy', 'negative', 'neutral', 'positive', 'bad-dy', 'incomplete']);
    assert.equal(result.rendered.resultColorContract, true);
    assert.equal(result.rendered.dyZeroAndMissingContract, true);
    assert.equal(result.countBeforeClear, 2);
    assert.deepEqual(result.cleared, { search: '', classes: [], sector: 'all', performance: 'all' });
  } finally {
    await browser.close();
    harness.server.close();
  }
});
