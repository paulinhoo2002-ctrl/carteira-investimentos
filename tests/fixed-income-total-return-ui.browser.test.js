'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server.js');

const executablePath = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean).find(candidate => { try { fs.accessSync(candidate); return true; } catch { return false; } });

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`RF semantic presentation stays readable and non-misleading at ${viewport.width}px`, async () => {
    assert.ok(executablePath, 'Chrome/Edge não encontrado');
    const harness = await startLocalHttpServer(path.join(__dirname, '..'));
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({ viewport, isMobile: viewport.width <= 430, hasTouch: viewport.width <= 430 });
    const page = await context.newPage();
    page.setDefaultTimeout(3000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('dashboard'));
      const dashboard = await page.locator('.premium-dashboard.canon-dashboard').innerText();
      assert.match(dashboard, /Resultado sobre capital cadastrado/i);
      assert.match(dashboard, /Renda recebida no mês/i);
      assert.match(dashboard, /Resultado total: Em consolidação/i);
      assert.doesNotMatch(dashboard, /Ganho de capital \+/);
      if (viewport.width <= 900) {
        const labels = await page.locator('.premium-dashboard .premium-metric-label').evaluateAll(elements => elements.map(element => ({
          clipped: element.scrollWidth > element.clientWidth || getComputedStyle(element).overflow === 'hidden' || getComputedStyle(element).whiteSpace === 'nowrap'
        })));
        assert.ok(labels.every(label => !label.clipped), 'rótulo de KPI cortado no Dashboard mobile/tablet');
      }

      const ticker = await page.evaluate(() => {
        const asset = S.assets.find(item => normalizeType(item.type || '', '') === 'Renda Fixa');
        if (!asset) throw new Error('fixture sintética sem posição RF');
        const assetId = rfAssetEventId(asset);
        S.rfEvents = (S.rfEvents || []).filter(event => event.assetId !== assetId && event.ticker !== asset.ticker);
        S.rfEvents.push(
          { id: 'ui-coupon', assetId, ticker: asset.ticker, date: '2026-01-02', type: 'juros', grossValue: 987.65, ir: 12.34, iof: 3.21, netValue: 972.10, principalDelta: 0 },
          { id: 'ui-amortization', assetId, ticker: asset.ticker, date: '2026-01-03', type: 'amortizacao', grossValue: 123.45, netValue: 123.45, principalDelta: 123.45 },
          { id: 'ui-redemption', assetId, ticker: asset.ticker, date: '2026-01-04', type: 'resgate_parcial', grossValue: 543.21, netValue: 543.21, principalDelta: 543.21 },
          { id: 'ui-tax', assetId, ticker: asset.ticker, date: '2026-01-05', type: 'ir', grossValue: 0, ir: 12.34, netValue: -12.34, principalDelta: 0 }
        );
        go('renda-fixa');
        return asset.ticker;
      });
      await page.waitForSelector('.premium-rf-page');
      const positionDetails = page.getByTestId('rf-position-detail');
      await positionDetails.locator('summary').first().focus();
      await page.keyboard.press('Space');
      assert.equal(await positionDetails.evaluate(node => node.open), true, 'detalhamento completo deve abrir por teclado');
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        cards: getComputedStyle(document.querySelector('.rf-responsive-cards')).display !== 'none',
        summaryText: document.querySelector('.rf-responsive-card summary')?.innerText || '',
        table: getComputedStyle(document.querySelector('.rf-table-wrap')).display !== 'none',
      }));
      assert.equal(layout.overflow, false, `overflow horizontal em ${viewport.width}px`);
      assert.equal(layout.cards, viewport.width <= 1199, `representação adaptativa inesperada em ${viewport.width}px`);
      assert.equal(layout.table, viewport.width > 1199, `tabela desktop inesperada em ${viewport.width}px`);

      if (viewport.width <= 1199) {
        const card = page.locator('.rf-responsive-card:visible').first();
        await card.locator('summary').focus();
        await page.keyboard.press('Space');
        assert.equal(await card.evaluate(node => node.open), true, 'detalhes da posição devem abrir por teclado');
        const summaryText = await card.locator('summary').innerText();
        assert.match(summaryText, /Valor atual/);
        assert.match(summaryText, /Resultado da posição/);
        assert.match(summaryText, /Rentabilidade da posição/);
        assert.match(summaryText, /Vencimento/);
        const text = await card.innerText();
        assert.match(text, /Rendimentos líquidos recebidos\s+(?:Parcial|Indisponível)/);
        assert.match(text, /Impostos pagos\s+(?:Parcial|Indisponível)/);
        assert.match(text, /Principal devolvido\s+Parcial/);
        assert.match(text, /Resultado econômico total\s+Em consolidação/);
        assert.match(text, /Rentabilidade total simples\s+Em consolidação/);
        for (const amount of ['987,65', '972,10', '123,45', '543,21', '12,34']) assert.equal(text.includes(amount), false, `agregado de evento não classificado exposto: ${amount}`);
      } else {
        const row = page.locator('.rf-table-wrap:visible .rf-table tbody tr:visible').filter({ hasText: ticker }).first();
        await row.waitFor({ state: 'visible' });
        const text = await row.innerText();
        assert.match(text, /Parcial|Indisponível/);
        assert.match(text, /Em consolidação/);
        const details = row.locator('.rf-economic-status-details');
        await details.locator('summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await details.evaluate(node => node.open), true, 'detalhes econômicos devem abrir por teclado');
        const detailsText = await details.innerText();
        assert.match(detailsText, /Impostos pagos\s+Parcial/);
        assert.match(detailsText, /Principal devolvido\s+Parcial/);
        const disclosureGeometry = await details.locator('dl').evaluate(node => {
          const rect = node.getBoundingClientRect();
          const wrap = node.closest('.rf-table-wrap').getBoundingClientRect();
          return { left: rect.left, right: rect.right, wrapLeft: wrap.left, wrapRight: wrap.right, clipped: node.scrollWidth > node.clientWidth };
        });
        assert.ok(disclosureGeometry.left >= disclosureGeometry.wrapLeft - 1, 'detalhe econômico cortado à esquerda da tabela');
        assert.ok(disclosureGeometry.right <= disclosureGeometry.wrapRight + 1, 'detalhe econômico cortado à direita da tabela');
        assert.equal(disclosureGeometry.clipped, false, 'conteúdo do detalhe econômico cortado');
        for (const amount of ['987,65', '972,10', '123,45', '543,21', '12,34']) assert.equal(text.includes(amount), false, `agregado de evento não classificado exposto: ${amount}`);
      }
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}


test('hide-values masks currency, percentages, and quantities across primary rendered routes', async () => {
  assert.ok(executablePath, 'Chrome/Edge não encontrado');
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    const routes = ['dashboard','patrimonio','ativos','renda-fixa','aportes','dividendos','rentabilidade','irpf'];
    const assertNoSensitiveValues = async route => {
      const surface = await page.evaluate(() => {
        const root=document.getElementById('root');
        const attributes=[...root.querySelectorAll('[aria-label],[title],[data-chart-tooltip],[alt]')].flatMap(node=>['aria-label','title','data-chart-tooltip','alt'].map(key=>node.getAttribute(key)||''));
        const svg=[...root.querySelectorAll('svg title,svg desc,svg text')].map(node=>node.textContent||'');
        const text=[root.innerText,...attributes,...svg].join(' ');
        return {text,empty:!root.innerText.trim(),currency:/[-+]?\s*R\$\s*[-+]?\s*[\d.,]+/.test(text),percentage:/\b[\d.,]+\s*%/.test(text),quantity:/\b[\d.,]+\s+(?:cotas?|ações?|acoes|unidades?|un\.|units?)\b/i.test(text)};
      });
      assert.equal(surface.empty,false,'rota '+route+' não renderizou');
      assert.equal(surface.currency,false,'valor monetário visível em '+route);
      assert.equal(surface.percentage,false,'percentual sensível visível em '+route);
      assert.equal(surface.quantity,false,'quantidade de posição visível em '+route);
    };
    const rateFixture=await page.evaluate(() => {
      const assets=S.assets.filter(item=>normalizeType(item.type||'','')==='Renda Fixa');
      if(!assets.length) throw new Error('fixture sintética sem posição RF');
      assets.forEach(asset=>{asset.rf_contract_rate='100,00';});
      S.hideValues=false;
      go('renda-fixa');
      return {count:assets.length,rate:assetRfContractRate(assets[0])};
    });
    assert.ok(rateFixture.count>0);
    assert.equal(rateFixture.rate,'100,00');
    const visibleContractRate=await page.locator('.premium-rf-row-main > .premium-rf-row-meta').first().innerText();
    assert.match(visibleContractRate,/100,00/,'fixture deve reproduzir taxa sem símbolo de porcentagem');
    await page.evaluate(() => { S.hideValues=true; go('renda-fixa'); });
    const hiddenContractRate=await page.locator('.premium-rf-row-main > .premium-rf-row-meta').first().innerText();
    assert.match(hiddenContractRate,/••••/,'taxa contratual deve ser ocultada junto aos valores da carteira');
    assert.doesNotMatch(hiddenContractRate,/\b100,00\b/,'taxa sem unidade não pode escapar do modo oculto');

    for (const route of routes) {
      await page.evaluate(route => { S.hideValues=true; go(route); }, route);
      await assertNoSensitiveValues(route);
      const collapsedCount=Math.min(await page.locator('#root details:not([open]) > summary:visible').count(),8);
      for(let index=0;index<collapsedCount;index++){
        await page.locator('#root details:not([open]) > summary:visible').first().click();
        await assertNoSensitiveValues(route+' após expandir detalhes');
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
    await browser.close();
    harness.server.close();
  }
});

test('complete synthetic RF evidence renders derived totals and hide-values masks them', async () => {
  assert.ok(executablePath, 'Chrome/Edge não encontrado');
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  try {
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    const fixture = await page.evaluate(() => {
      const asset = S.assets.find(item => normalizeType(item.type || '', '') === 'Renda Fixa');
      if (!asset) throw new Error('fixture sintética sem posição RF');
      asset.name = 'Trend DI FIC RF Simples RL';
      const currentMarketValue = rfValues(asset).current;
      if (!Number.isFinite(currentMarketValue)) throw new Error('posição sintética sem valor atual explícito');
      const assetId = rfAssetEventId(asset);
      globalThis.FixedIncomeEconomicResultTestEvidence = {
        [assetId]: {
          remainingCostBasis: 100,
          contributions: [{ id: 'synthetic-application', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-06-01' }],
          events: [{ id: 'synthetic-coupon', type: 'COUPON', amount: 5, amountBasis: 'NET', status: 'RECEIVED', occurredOn: '2025-06-01' }],
          coverage: {
            currentPosition: 'COMPLETE', costBasis: 'COMPLETE', contributions: 'COMPLETE', income: 'COMPLETE',
            taxes: 'COMPLETE', capitalReturns: 'COMPLETE', principal: 'COMPLETE',
            history: { status: 'COMPLETE', periodStart: '2024-06-01', periodEnd: '2026-10-18', openingPosition: 'NONE', allEventsRepresented: true, duplicatesResolved: true },
          },
          returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
        },
      };
      go('renda-fixa');
      return { assetId, ticker: asset.ticker };
    });
    await page.evaluate(() => { document.getElementById('root').innerHTML = rendaFixaTab(); });
    await page.locator('details[data-testid="rf-position-detail"] > summary').click();
    const card = page.locator('.rf-responsive-card').filter({ hasText: fixture.ticker }).first();
    await card.locator('summary').click();
    const visible = await card.innerText();
    assert.match(visible, /Resultado econômico total/);
    assert.match(visible, /Rentabilidade total simples/);
    assert.match(visible, /Derivado do histórico completo/);
    assert.match(visible, /Resultado em aberto sobre a base remanescente/);

    const hidden = await page.evaluate(() => {
      S.hideValues = true;
      document.getElementById('root').innerHTML = rendaFixaTab();
      return document.getElementById('root').innerText;
    });
    assert.match(hidden, /R\$ ••••/);
    assert.match(hidden, /••••/);
    assert.doesNotMatch(hidden, /R\$ 100|R\$ 5,00|100,00%/);
    await page.evaluate(() => go('dashboard'));
    assert.match(await page.locator('.premium-dashboard.canon-dashboard').innerText(), /Resultado total: Em consolidação/);
  } finally {
    await context.close();
    await browser.close();
    harness.server.close();
  }
});
