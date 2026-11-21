const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');

const chrome = require('./helpers/chrome-path').resolveChromePath();

async function withApp(run, viewport = { width: 1366, height: 768 }) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(5000);
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyRichFixture(page);
    await page.waitForSelector('.fp-dashboard', { state: 'visible' });
    await run(page);
  } finally {
    if (browser) await browser.close();
    harness.server.close();
  }
}

test('FP design system - tokens semânticos existem e mudam entre tema escuro e claro', async () => {
  await withApp(async page => {
    const read = theme => page.evaluate(name => {
      applyTheme(name);
      const style = getComputedStyle(document.documentElement);
      return ['--fp-canvas', '--fp-text', '--fp-pos', '--fp-neg', '--fp-accent'].map(token => style.getPropertyValue(token).trim());
    }, theme);
    const dark = await read('dark');
    const light = await read('light');
    assert.ok(dark.every(Boolean) && light.every(Boolean), 'todos os tokens definidos nos dois temas');
    assert.notDeepEqual(dark, light, 'temas têm valores distintos');
    const legacy = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--panel').trim());
    assert.equal(legacy, light[0] === '#f4f6fa' ? '#ffffff' : legacy, 'alias legado aponta para o token de superfície');
  });
});

test('FP design system - primeiro bloco do Dashboard tem exatamente Patrimônio, Valor investido e Recebido no mês', async () => {
  await withApp(async page => {
    const labels = await page.locator('.dashboard-executive-kpis .premium-metric-label').allInnerTexts();
    assert.deepEqual(labels.map(label => label.trim().toLowerCase()), ['patrimônio atual', 'valor investido', 'recebido no mês']);
    const performance = await page.locator('.fp-performance .premium-metric-label').allInnerTexts();
    assert.ok(performance.some(label => /resultado da posição/i.test(label)), 'resultado fica no painel de rentabilidade');
    assert.ok(performance.some(label => /variação diária/i.test(label)), 'variação diária fica separada do resultado acumulado');
  });
});

test('FP design system - privacidade: botão com aria-pressed sincronizado com Configurações e valores protegidos', async () => {
  await withApp(async page => {
    const toggle = page.locator('.tabs-desktop .side-utilities button', { hasText: /valores/i });
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    await toggle.click();
    assert.equal(await page.locator('.tabs-desktop .side-utilities button', { hasText: /valores/i }).getAttribute('aria-pressed'), 'true');

    const text = await page.locator('.fp-dashboard').innerText();
    assert.doesNotMatch(text, /R\$\s*[\d.,]+/, 'nenhum valor monetário visível no Dashboard');
    assert.doesNotMatch(text, /[+-]?\d+[.,]\d+%/, 'percentuais protegidos');
    const accessible = await page.evaluate(() => [...document.querySelectorAll('.fp-dashboard [aria-label],.fp-dashboard [title]')]
      .flatMap(node => [node.getAttribute('aria-label') || '', node.getAttribute('title') || '']).filter(value => /R\$\s*\d/.test(value)));
    assert.deepEqual(accessible, [], 'atributos acessíveis sem valores');

    await page.evaluate(() => go('settings'));
    const sw = page.locator('[role="switch"][aria-checked]').first();
    assert.equal(await sw.getAttribute('aria-checked'), 'true', 'Configurações reflete o mesmo estado');
    assert.equal(await sw.getAttribute('tabindex'), '0', 'interruptor operável por teclado');
    await sw.press('Enter');
    assert.equal(await page.evaluate(() => S.hideValues), false, 'Enter alterna a preferência');
  });
});

test('FP design system - navegação com ícones SVG, um único landmark main e rótulos acessíveis', async () => {
  await withApp(async page => {
    const items = await page.locator('.tabs-desktop button.tab:not(.side-utility)').count();
    assert.ok(items >= 10, 'itens de navegação presentes');
    assert.equal(await page.locator('.tabs-desktop button.tab:not(.side-utility) .side-nav-icon svg').count(), items, 'todo item de navegação tem ícone SVG');
    assert.equal(await page.locator('[role="main"], main').count(), 1, 'um único landmark principal');
    assert.equal(await page.locator('.tabs-desktop button.tab[aria-current="page"]').count(), 1, 'um item atual');
    assert.equal(await page.locator('.fp-dashboard h1').count(), 1, 'um único h1');
  });
});

test('FP design system - seletor de período expõe estado e filtra o gráfico', async () => {
  await withApp(async page => {
    const buttons = page.locator('.dashboard-period-selector button');
    assert.equal(await buttons.count(), 4);
    assert.equal(await page.locator('.dashboard-period-selector button[aria-pressed="true"]').count(), 1);
    await page.locator('.dashboard-period-selector button', { hasText: '24M' }).click();
    assert.equal(await page.locator('.dashboard-period-selector button[aria-pressed="true"]').innerText(), '24M');
  });
});
