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
    });
    assert.deepEqual(result.positive, ['positive']);
    assert.deepEqual(result.negative, ['negative']);
    assert.deepEqual(result.neutral, ['neutral']);
    assert.deepEqual(result.all, ['positive', 'negative', 'neutral', 'incomplete']);
    assert.deepEqual(result.classAndPerformance, ['positive']);
    assert.deepEqual(result.searchAndPerformance, ['positive']);
    assert.equal(result.countBeforeClear, 1);
    assert.deepEqual(result.cleared, { search: '', classes: [], performance: 'all' });
  } finally {
    await browser.close();
    harness.server.close();
  }
});
