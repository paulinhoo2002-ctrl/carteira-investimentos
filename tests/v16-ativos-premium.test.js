const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function withAtivos(run, viewport = { width: 1366, height: 768 }) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyRichFixture(page);
    await page.evaluate(() => go('ativos'));
    await page.waitForSelector('#ativosAccordion', { state: 'visible' });
    await run(page);
    assert.deepEqual(errors, [], 'sem erros de página');
  } finally {
    if (browser) await browser.close();
    harness.server.close();
  }
}

const openFirstGroup = page => page.locator('#ativosAccordion details.accordion-category').first().locator('summary').first().click();
const tickers = page => page.locator('#ativosAccordion details.accordion-category').first().locator('tbody tr .asset-name').allInnerTexts();

test('Ativos premium - KPIs proporcionais, rótulos em caixa de frase e sem overflow', async () => {
  await withAtivos(async page => {
    const labels = await page.locator('.assets-kpi-card .assets-kpi-label').allInnerTexts();
    assert.deepEqual(labels, ['Total investido', 'Valor atual', 'Lucro/prejuízo', 'Rentabilidade']);
    const widths = await page.locator('.assets-kpi-card').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().width)));
    assert.ok(Math.max(...widths) - Math.min(...widths) <= 2, 'quatro cartões com a mesma largura: ' + widths);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  });
});

test('Ativos premium - ordenação funcional por cabeçalho com aria-sort', async () => {
  await withAtivos(async page => {
    await openFirstGroup(page);
    assert.deepEqual(await tickers(page), ['QAAA3', 'QABB4', 'QACC3', 'QADD3'], 'ordem inicial por ticker');
    await page.locator('#ativosAccordion thead .asset-sort-btn', { hasText: 'Rentabilidade' }).first().click();
    // rentabilidade decrescente: +29,9% (QAAA3), +16,3% (QABB4), -7,4% (QADD3), -20,9% (QACC3)
    assert.deepEqual(await tickers(page), ['QAAA3', 'QABB4', 'QADD3', 'QACC3']);
    assert.equal(await page.locator('#ativosAccordion details.accordion-category').first().locator('th[aria-sort="descending"]').count(), 1);
    await page.locator('#ativosAccordion thead .asset-sort-btn', { hasText: 'Rentabilidade' }).first().click();
    assert.deepEqual(await tickers(page), ['QACC3', 'QADD3', 'QABB4', 'QAAA3'], 'segundo clique inverte');
    assert.equal(await page.locator('#ativosAccordion details.accordion-category').first().locator('th[aria-sort="ascending"]').count(), 1);
  });
});

test('Ativos premium - ações Comprar, Vender e Mais ficam alcançáveis em 1366px', async () => {
  await withAtivos(async page => {
    await openFirstGroup(page);
    const geometry = await page.evaluate(() => {
      const wrap = document.querySelector('#ativosAccordion .assets-table-wrap').getBoundingClientRect();
      const row = document.querySelector('#ativosAccordion tbody tr');
      const inside = selector => { const box = row.querySelector(selector).getBoundingClientRect(); return box.left >= wrap.left - 1 && box.right <= wrap.right + 1 && box.width > 0; };
      return { buy: inside('.asset-quick.bsv'), sell: inside('.asset-quick-sell'), more: inside('.asset-action-trigger') };
    });
    assert.deepEqual(geometry, { buy: true, sell: true, more: true });
  });
});

test('Ativos premium - busca, filtro sem resultado e estado vazio com mensagem', async () => {
  await withAtivos(async page => {
    await page.locator('#assets-premium-search').fill('QAFI');
    await page.waitForFunction(() => document.querySelectorAll('#ativosAccordion details.accordion-category').length === 1);
    assert.match(await page.locator('.assets-filter-summary').innerText(), /1\s+ativos? exibidos? de 8/);
    await page.locator('#assets-premium-search').fill('ZZZ-inexistente');
    await page.waitForSelector('.assets-premium-empty');
    assert.match(await page.locator('.assets-premium-empty').innerText(), /Nenhum ativo corresponde aos filtros/);
  });
});

test('Ativos premium - mobile mostra cartões com todos os detalhes e sem overflow', async () => {
  await withAtivos(async page => {
    await openFirstGroup(page);
    const card = page.locator('#ativosAccordion details.asset-premium-card').first();
    await card.locator('summary').click();
    const text = await card.innerText();
    for (const label of ['Quantidade', 'Preço médio', 'Resultado', 'Rentabilidade']) assert.ok(text.includes(label), 'detalhe ausente: ' + label);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }, { width: 390, height: 844 });
});

test('Ativos premium - privacidade oculta valores, quantidades e percentuais', async () => {
  await withAtivos(async page => {
    await page.evaluate(() => { S.hideValues = true; render(); });
    await openFirstGroup(page);
    const text = await page.locator('.wrap').innerText();
    assert.doesNotMatch(text, /R\$\s*[\d.,]+/);
    assert.doesNotMatch(text, /[+-]?\d+[.,]\d+%/);
    const attrs = await page.evaluate(() => [...document.querySelectorAll('.wrap [aria-label],.wrap [title]')]
      .flatMap(node => [node.getAttribute('aria-label') || '', node.getAttribute('title') || '']).filter(value => /R\$\s*\d/.test(value)));
    assert.deepEqual(attrs, []);
  });
});
