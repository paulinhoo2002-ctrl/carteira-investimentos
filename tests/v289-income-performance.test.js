const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');

const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function withPage(viewport, run) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'), 45678);
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(5000);
    page.__v289Errors = { console: [], page: [] };
    page.on('console', message => { if (message.type() === 'error') page.__v289Errors.console.push(message.text()); });
    page.on('pageerror', error => page.__v289Errors.page.push(error.message));
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyV289VisualFixture(page, 'baseline');
    await page.evaluate(() => go('dividendos'));
    await page.locator('.div-premium').waitFor();
    await run(page);
  } finally {
    if (browser) await browser.close();
    harness.server.close();
  }
}

test('V292 D1 Dividendos leads with received income and exposes its distinct modes and action', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    const modes = ['Calendário', 'Evolução', 'Histórico'];
    for (const name of modes) {
      const button = page.getByRole('button', { name, exact: true });
      assert.equal(await button.isVisible(), true, `${name} must be discoverable from the initial route`);
    }

    const register = page.getByRole('button', { name: /Registrar provento/ });
    assert.equal(await register.isVisible(), true, 'The existing register action must remain reachable');

    const received = page.locator('.dividend-calendar-primary').getByText('Renda recebida', { exact: true });
    assert.equal(await received.isVisible(), true, 'Received income must lead the calendar view');

    for (const name of modes) {
      await page.getByRole('button', { name, exact: true }).click();
      assert.equal(await page.locator('.div-premium-tab.on').innerText(), name, `${name} must select its own view`);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.deepEqual(page.__v289Errors.console, []);
    assert.deepEqual(page.__v289Errors.page, []);
    assert.equal(overflow, false);
  });
});

test('V292 D1 announced and estimated rows never render as received income', async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    await page.evaluate(() => {
      S.proventos = [
        { id: 'QA_ANNOUNCED', date: '2026-10-01', paymentDate: '2026-10-12', ticker: 'QAXX3', assetName: 'Pagador anunciado sintético', type: 'Dividendo', value: 17.25, status: 'ANNOUNCED', source: 'QA_SYNTHETIC' },
        { id: 'QA_ESTIMATED', date: '2026-10-01', paymentDate: '2026-10-13', ticker: 'QAYY3', assetName: 'Pagador estimado sintético', type: 'Dividendo', value: 8.50, status: 'ESTIMATED', source: 'QA_SYNTHETIC' },
      ];
      S.rfEvents = [];
      render();
    });

    const primary = page.locator('.dividend-calendar-primary');
    assert.equal(await primary.locator('.div-receipt-card').count(), 0, 'Non-paid synthetic rows must not appear in received cards');
    const primaryText = await primary.innerText();
    assert.match(primaryText, /Nenhum recebimento pago identificado/);
    assert.doesNotMatch(primaryText, /QAXX3|QAYY3/);

    await page.locator('.dividend-secondary-disclosure > summary').click();
    const intelligence = page.locator('.v253-income-intelligence');
    await intelligence.waitFor({ state: 'visible' });
    assert.match(await intelligence.innerText(), /Anunciados[\s\S]*1/);
    assert.deepEqual(page.__v289Errors.console, []);
    assert.deepEqual(page.__v289Errors.page, []);
  });
});

test('V292 D1 Dividendos stays usable across approved viewport sizes and themes', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    const viewports = [
      [390, 844], [430, 932], [768, 1024], [1366, 768],
      [1440, 900], [1536, 864], [1920, 1080],
    ];
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      for (const theme of ['dark', 'light']) {
        await page.evaluate(themeName => {
          document.documentElement.dataset.theme = themeName;
          document.documentElement.style.colorScheme = themeName;
          render();
        }, theme);
        const layout = await page.evaluate(() => {
          const tabs = [...document.querySelectorAll('.div-premium-tabs > .div-premium-tab')];
          const title = document.querySelector('#dividends-page-title');
          const action = document.querySelector('.div-premium-canon-actions .btn.bp');
          const metrics = element => {
            const rect = element.getBoundingClientRect();
            return { width: rect.width, height: rect.height, font: Number.parseFloat(getComputedStyle(element).fontSize) };
          };
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            theme: document.documentElement.dataset.theme,
            title: title && metrics(title),
            action: action && metrics(action),
            tabs: tabs.map(metrics),
          };
        });
        assert.equal(layout.theme, theme, `${width}px should render ${theme} theme`);
        assert.equal(layout.overflow, false, `${width}px ${theme} must not overflow the page`);
        assert.ok(layout.title && layout.title.font >= (width <= 768 ? 16 : 20), `${width}px ${theme} title must remain readable`);
        assert.ok(layout.action && layout.action.height >= 44, `${width}px ${theme} primary action must meet touch target size`);
        assert.ok(layout.tabs.length >= 3 && layout.tabs.every(tab => tab.height >= 44 && tab.font >= 12), `${width}px ${theme} modes must remain readable and reachable`);
      }
    }
    assert.deepEqual(page.__v289Errors.console, []);
    assert.deepEqual(page.__v289Errors.page, []);
  });
});

test('V292 D2 Rentabilidade leads with result, period, benchmark basis, coverage, then chart', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await page.locator('.tabs-desktop button.tab[aria-label="Rentabilidade"]').click();
    const route = page.locator('.rent-premium');
    await route.waitFor({ state: 'attached' }).catch(async () => {
      const state = await page.evaluate(() => ({ tab: S.tab, root: document.getElementById('root')?.innerText.slice(0, 300) || '', renderError:(()=>{try{rentabilidadeTab();return ''}catch(error){return error.stack}})() }));
      assert.fail(`Rentabilidade route did not render: ${JSON.stringify(state)}; page errors=${page.__v289Errors.page.join(' | ')}`);
    });
    const order = await route.evaluate(root => {
      const selectors = [
        '.rent-primary-result',
        '[aria-label="Período da rentabilidade"]',
        '.rent-primary-context',
        '.rent-primary-coverage',
        '.rent-chartbox',
        '.rent-monthly-details > summary',
        '.rent-evidence-details > summary',
      ];
      const nodes = selectors.map(selector => root.querySelector(selector));
      return nodes.map((node, index) => ({ selector: selectors[index], present: !!node, text: node?.innerText || '' }));
    });
    assert.ok(order.every(item => item.present), `Rentabilidade hierarchy elements missing: ${JSON.stringify(order)}`);
    assert.deepEqual(order.map(item => item.selector), [
      '.rent-primary-result', '[aria-label="Período da rentabilidade"]', '.rent-primary-context',
      '.rent-primary-coverage', '.rent-chartbox', '.rent-monthly-details > summary', '.rent-evidence-details > summary',
    ]);
    assert.match(order[2].text, /fonte\/série histórica indisponível/);
    assert.match(order[2].text, /taxa fixa não é série datada/);
    assert.match(order[3].text, /UNKNOWN|indisponível|parcial|completa/i);
    assert.match(order[4].text, /Sem série histórica certificada|rent-performance-chart/);
    assert.match(await route.locator('.rent-primary-result').innerText(), /Indisponível/);
    await route.locator('.rent-secondary-disclosure > summary').click();
    assert.match(await route.locator('.rent-analysis-note').innerText(), /Proventos no recorte\s+Indisponível/);
    assert.deepEqual(page.__v289Errors.console, []);
    assert.deepEqual(page.__v289Errors.page, []);
  });
});

test('V292 D2 Rentabilidade stays readable across approved viewport sizes and themes', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await page.locator('.tabs-desktop button.tab[aria-label="Rentabilidade"]').click();
    const viewports = [[390,844],[430,932],[768,1024],[1366,768],[1440,900],[1536,864],[1920,1080]];
    for (const [width,height] of viewports) {
      await page.setViewportSize({ width, height });
      for (const theme of ['dark','light']) {
        await page.evaluate(themeName => {
          document.documentElement.dataset.theme=themeName;
          document.documentElement.style.colorScheme=themeName;
          render();
        },theme);
        const layout=await page.evaluate(()=>{
          const metrics=element=>{const rect=element.getBoundingClientRect();return{width:rect.width,height:rect.height,font:Number.parseFloat(getComputedStyle(element).fontSize)}};
          const main=document.querySelector('.rent-main');
          const context=document.querySelector('.rent-primary-context');
          return{
            overflow:document.documentElement.scrollWidth>innerWidth,
            controls:[...context.querySelectorAll('select')].map(metrics),
            labels:[...context.querySelectorAll('span,strong')].map(metrics),
            result:metrics(document.querySelector('.rent-primary-result .rent-kpi-value')),
            chart:main.getBoundingClientRect().width>0,
            theme:document.documentElement.dataset.theme,
          };
        });
        assert.equal(layout.theme,theme,`${width}px should render ${theme}`);
        assert.equal(layout.overflow,false,`${width}px ${theme} must not overflow`);
        assert.equal(layout.chart,true,`${width}px ${theme} chart region must be present`);
        assert.ok(layout.result.font>=25,`${width}px ${theme} primary result must stay readable`);
        assert.ok(layout.controls.length===3&&layout.controls.every(control=>control.height>=44&&control.font>=12),`${width}px ${theme} period/source controls must remain usable`);
        assert.ok(layout.labels.every(label=>label.font>=12),`${width}px ${theme} base and coverage labels must remain readable`);
      }
    }
    assert.deepEqual(page.__v289Errors.console,[]);
    assert.deepEqual(page.__v289Errors.page,[]);
  });
});
