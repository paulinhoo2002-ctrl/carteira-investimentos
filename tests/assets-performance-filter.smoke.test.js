const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer } = require('./local-http-server');

function browserPath() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(file => { try { fs.accessSync(file); return true; } catch { return false; } });
}

async function startServer(root) {
  return startLocalHttpServer(root);
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
      S.assetsSectorFilter='Bancos'; S.assetsPerformanceFilter='positive'; S.assetsFilterClasses=[];
      const countBeforeClear = assetsFilterCount();
      clearAssetsFilters();
      return { positive, negative, neutral, all, classAndPerformance, searchAndPerformance, sectorOnly, composed, resultAsc, resultDesc, dyDesc, divMonthDesc, dyAsc, countBeforeClear, cleared: { search: S.assetsSearch, classes: S.assetsFilterClasses, sector: S.assetsSectorFilter, performance: S.assetsPerformanceFilter } };
    });
    assert.deepEqual(result.positive, ['positive']);
    assert.deepEqual(result.negative, ['negative']);
    assert.deepEqual(result.neutral, ['neutral']);
    assert.deepEqual(result.all, ['positive', 'negative', 'neutral', 'incomplete']);
    assert.deepEqual(result.classAndPerformance, ['positive']);
    assert.deepEqual(result.searchAndPerformance, ['positive']);
    assert.equal(result.countBeforeClear, 2);
    assert.deepEqual(result.cleared, { search: '', classes: [], sector: 'all', performance: 'all' });
    assert.deepEqual(result.sectorOnly, ['positive', 'neutral']);
    assert.deepEqual(result.composed, ['positive']);
    assert.deepEqual(result.resultAsc, ['negative', 'neutral', 'positive', 'incomplete']);
    assert.deepEqual(result.resultDesc, ['positive', 'neutral', 'negative', 'incomplete']);
    assert.deepEqual(result.dyDesc, ['positive', 'neutral', 'negative', 'incomplete']);
    assert.deepEqual(result.divMonthDesc, ['positive', 'neutral', 'negative', 'incomplete']);
    assert.deepEqual(result.dyAsc, ['zero-dy', 'negative', 'neutral', 'positive', 'bad-dy', 'incomplete']);
    assert.equal(result.countBeforeClear, 2);
    assert.deepEqual(result.cleared, { search: '', classes: [], sector: 'all', performance: 'all' });
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('ordenacao de ativos controla tabela e cards sem promover resultado desconhecido', async () => {
  const executable = browserPath();
  assert.ok(executable, 'Chrome/Edge nao encontrado');
  const { chromium } = await import('playwright-core');
  const harness = await startServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: executable, headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const firebaseRequests = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on('request', request => {
    if (/firebaseio\.com|firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com/i.test(request.url())) firebaseRequests.push(request.url());
  });
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__qaStorageWrites = [];
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      window.__qaStorageWrites.push(String(key));
      return originalSetItem.call(this, key, value);
    };
  });
  try {
    await page.goto(`${harness.url}&testReadOnly=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__LOCAL_TEST_READ_ONLY__ === true);
    await page.evaluate(() => {
      S.assets = [
        { id: 'alpha', ticker: 'ALFA', name: 'Alfa', type: 'FII', qty: 1, avg_price: 100, current_price: 110 },
        { id: 'beta', ticker: 'BETA', name: 'Beta', type: 'FII', qty: 1, avg_price: 100, current_price: 150 },
        { id: 'unknown', ticker: 'SEMBASE', name: 'Sem base', type: 'FII', qty: 1, avg_price: 0, current_price: 80 },
      ];
      S.assetsSearch = '';
      S.assetsFilterClasses = [];
      S.assetsSectorFilter = 'all';
      S.assetsClassFilter = 'all';
      S.assetsPerformanceFilter = 'all';
      S.assetReviewFilter = null;
      S.assetSort = {};
      S.assetsInnerTab = 'patrimonio';
      go('ativos');
    });
    const fixtureBefore = await page.evaluate(() => JSON.stringify(S.assets));
    const storageWritesBefore = await page.evaluate(() => window.__qaStorageWrites.length);
    const sort = page.getByRole('combobox', { name: 'Ordenar posições de ativos' });
    await sort.selectOption('result-desc');
    const desktopOrder = await page.locator('.ag-table tbody tr').evaluateAll(rows => rows.map(row => row.dataset.id));
    assert.deepEqual(desktopOrder, ['beta', 'alpha', 'unknown']);
    await sort.selectOption('rentability-asc');
    const rentabilityOrder = await page.locator('.ag-table tbody tr').evaluateAll(rows => rows.map(row => row.dataset.id));
    assert.deepEqual(rentabilityOrder, ['alpha', 'beta', 'unknown']);
    await sort.selectOption('result-desc');
    for (const width of [360, 390, 430, 768, 1366, 1440, 1536, 1920]) {
      await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
      assert.equal(await sort.isVisible(), true, `seletor inacessível em ${width}px`);
      assert.equal(await page.locator('html').evaluate(node => node.scrollWidth <= innerWidth), true, `overflow horizontal global em ${width}px`);
      if (width <= 430) {
        const mobileOrder = await page.locator('.asset-mobile-cards > details').evaluateAll(cards => cards.map(card => card.dataset.id));
        assert.deepEqual(mobileOrder, desktopOrder, `ordem móvel divergiu em ${width}px`);
      }
    }
    assert.equal(await page.evaluate(() => JSON.stringify(S.assets)), fixtureBefore, 'ordenação alterou a fixture financeira');
    assert.equal(await page.evaluate(() => window.__qaStorageWrites.length), storageWritesBefore, 'ordenação gravou no armazenamento local');
    assert.deepEqual(firebaseRequests, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser.close();
    harness.server.close();
  }
});
