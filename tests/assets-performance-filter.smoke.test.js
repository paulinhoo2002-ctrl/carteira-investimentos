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

test('Ativos mobile compacta cartões e controles sem perder dados, filtros ou ações', async () => {
  const executable = browserPath();
  assert.ok(executable, 'Chrome/Edge nao encontrado');
  const { chromium } = await import('playwright-core');
  const harness = await startServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: executable, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(`${harness.url}&testReadOnly=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__LOCAL_TEST_READ_ONLY__ === true);
    const syntheticAssets = [
      { id: 'alpha', ticker: 'ALFA', name: 'Alfa Participações', type: 'FII', sector: 'Bancos', qty: 10, avg_price: 100, current_price: 100 },
      { id: 'unknown', ticker: 'SEMBASE', name: 'Sem preço atualizado', type: 'FII', sector: 'Papel', qty: 2, avg_price: 0, current_price: null },
      { id: 'no-basis', ticker: 'SEMBASE2', name: 'Sem custo confirmado', type: 'FII', sector: 'Papel', qty: 2, avg_price: 0, current_price: 80 },
    ];
    await page.evaluate(() => {
      S.assetsSearch = ''; S.assetsFilterClasses = []; S.assetsSectorFilter = 'all';
      S.assetsClassFilter = 'all'; S.assetsPerformanceFilter = 'all'; S.assetReviewFilter = null;
      S.assetsSortMode = 'ticker-asc'; S.assetsInnerTab = 'patrimonio';
    });
    await page.evaluate(assets => { S.assets = assets; go('ativos'); }, syntheticAssets);
    let originalFixture = await page.evaluate(() => JSON.stringify(S.assets));
    const screenshots = path.join(__dirname, '..', '.qa-state', 'mega10-assets');
    fs.mkdirSync(screenshots, { recursive: true });

    for (const width of [360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      const metrics = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        controlHeight: document.querySelector('.assets-premium-controls').getBoundingClientRect().height,
        searchWidth: document.querySelector('.assets-premium-search').getBoundingClientRect().width,
        cardHeight: document.querySelector('.asset-premium-card-summary').getBoundingClientRect().height,
        sortTop: document.querySelector('.assets-premium-sort').getBoundingClientRect().top,
        countTop: document.querySelector('.assets-filter-summary').getBoundingClientRect().top,
        countText: document.querySelector('.assets-filter-summary').innerText,
        cardText: document.querySelector('.asset-premium-card-summary').innerText,
      }));
      assert.equal(metrics.documentWidth, width, `overflow horizontal em ${width}px`);
      assert.ok(metrics.controlHeight <= 96, `toolbar cresceu em ${width}px: ${metrics.controlHeight}`);
      assert.ok(metrics.searchWidth >= width - 140, `busca estreita em ${width}px: ${metrics.searchWidth}`);
      assert.ok(metrics.cardHeight <= 120, `cartão não compactou em ${width}px: ${metrics.cardHeight}`);
      assert.equal(metrics.sortTop, metrics.countTop, `ordenação e contagem separaram em ${width}px`);
      assert.match(metrics.countText, /ativos na carteira/);
      for (const label of ['Tipo', 'Valor da posição', 'Resultado R$', 'Rentabilidade', '% Carteira']) assert.ok(metrics.cardText.includes(label), `campo ${label} sumiu do resumo`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(screenshots, 'ativos-390-dark.png'), fullPage: true });
    await page.evaluate(() => toggleTheme());
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.waitForTimeout(3200);
    await page.screenshot({ path: path.join(screenshots, 'ativos-390-light.png'), fullPage: true });
    await page.evaluate(() => toggleTheme());
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.waitForTimeout(3200);
    const unknownCard = page.locator('.asset-premium-card[data-id="unknown"]');
    assert.match(await unknownCard.locator('summary').innerText(), /Valor da posição\s+—/);
    assert.match(await unknownCard.locator('summary').innerText(), /Resultado R\$\s+—/);
    const noBasisCard = page.locator('details.asset-premium-card[data-id="no-basis"]');
    assert.match(await noBasisCard.locator('summary').innerText(), /Resultado R\$\s+—/);
    assert.match(await noBasisCard.locator('summary').innerText(), /Rentabilidade · % Carteira\s+— · —/);
    assert.match(await page.locator('details.asset-premium-card[data-id="alpha"] summary').innerText(), /Resultado R\$\s+R\$ 0,00/);
    await noBasisCard.locator('summary').click();
    assert.match(await noBasisCard.innerText(), /Investido\s+—/);
    await page.locator('.asset-premium-card[data-id="alpha"] > summary').click();
    const expanded = page.locator('details.asset-premium-card[data-id="alpha"]');
    await expanded.scrollIntoViewIfNeeded();
    for (const label of ['Setor', 'Quantidade', 'Preço médio', 'Preço atual / posição', 'Investido', 'Rentabilidade', '% Carteira', 'DY', 'Fonte / atualização']) {
      assert.ok((await expanded.innerText()).includes(label), `detalhe ${label} não está disponível`);
    }
    for (const action of ['Detalhes', 'Comprar', 'Vender']) assert.ok(await expanded.getByRole('button', { name: action }).count(), `ação ${action} ausente`);
    assert.ok(await expanded.getByRole('button', { name: 'Editar ALFA' }).count(), 'ação Editar ausente');
    const actionHeights = await expanded.locator('.asset-premium-card-actions button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height));
    assert.ok(actionHeights.length > 0 && actionHeights.every(height => height >= 44), `alvo de ação menor que 44px: ${actionHeights}`);
    await expanded.screenshot({ path: path.join(screenshots, 'ativos-390-expanded.png') });
    await expanded.locator('summary').click();
    await noBasisCard.locator('summary').click();
    await page.getByRole('button', { name: /Filtros/ }).click();
    const filterPanel = page.locator('#assets-filter-panel');
    assert.equal(await filterPanel.isVisible(), true);
    const panelState = await filterPanel.evaluate(panel => ({ height: panel.getBoundingClientRect().height, maxHeight: getComputedStyle(panel).maxHeight, scrollHeight: panel.scrollHeight }));
    assert.ok(panelState.height >= 300, `painel de filtros continua baixo: ${JSON.stringify(panelState)}`);
    assert.ok(panelState.scrollHeight > panelState.height, 'fixture não exercitou painel rolável');
    for (const label of ['Filtrar por setor', 'Filtrar por classe', 'Filtrar por performance']) assert.ok(await page.getByRole('combobox', { name: label }).isVisible(), `filtro ${label} inacessível`);

    await page.getByRole('button', { name: /Filtros/ }).click();
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(screenshots, 'ativos-1366-dark.png'), fullPage: true });
    assert.equal(await page.locator('html').evaluate(node => node.scrollWidth <= innerWidth), true, 'overflow horizontal desktop');
    const noBasisRow = page.locator('tr').filter({ hasText: 'SEMBASE2' });
    const noBasisCells = await noBasisRow.locator('td.num').allInnerTexts();
    assert.equal(noBasisCells[3], '—', 'custo aplicado desconhecido não deve virar zero na tabela');
    assert.equal(noBasisCells[4], '—', 'resultado sem base confirmada deve ficar indisponível na tabela');
    assert.equal(noBasisCells[5], '—', 'rentabilidade sem base confirmada deve ficar indisponível na tabela');
    const zeroResultCells = await page.locator('tr[data-id="alpha"] td.num').allInnerTexts();
    assert.match(zeroResultCells[4], /R\$\s*0,00/, 'zero confirmado deve continuar visível');
    assert.equal(await page.evaluate(() => JSON.stringify(S.assets)), originalFixture, 'QA alterou dados sintéticos');
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser.close();
    harness.server.close();
  }
});
