const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function withPage(viewport, run) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(5000);
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyV289VisualFixture(page, 'baseline');
    await run(page);
  } finally {
    if (browser) await browser.close();
    harness.server.close();
  }
}

test('all direct content routes remain discoverable in the shell', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    const inventory = await page.evaluate(() => {
      const direct = [...content.toString().matchAll(/if\(S\.tab===['"]([^'"]+)['"]\)/g)].map(match => match[1]);
      const internal = new Set(['ranking', 'desempenho', 'patrimonio']);
      const destinations = new Set([...document.querySelectorAll('.tabs-desktop [onclick], #investBottomNav [onclick], #investMenuDrawer [onclick]')]
        .flatMap(node => [...(node.getAttribute('onclick') || '').matchAll(/go\(['"]([^'"]+)['"]\)/g)].map(match => match[1])));
      return { direct: [...new Set(direct)].filter(route => !internal.has(route)), destinations: [...destinations] };
    });
    assert.ok(inventory.direct.length >= 15, 'route dispatch inventory unexpectedly small');
    assert.deepEqual(inventory.direct.filter(route => !inventory.destinations.includes(route)), [], 'direct route missing from shell navigation');
  });
});

test('desktop navigation activates real routes and reports current destination', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    for (const route of ['ativos', 'aportes', 'renda-fixa', 'dividendos', 'metas', 'confiabilidade', 'importacao']) {
      const button = page.locator(`.tabs-desktop button[onclick="go('${route}')"]`).first();
      await button.click();
      assert.equal(await page.evaluate(() => S.tab), route);
      assert.equal(await page.locator(`.tabs-desktop button[onclick="go('${route}')"]`).first().getAttribute('aria-current'), 'page');
    }
  });
});

test('mobile primary destinations and Aportes through Mais use actual controls', async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    const primary = await page.locator('#investBottomNav > button').allInnerTexts();
    assert.deepEqual(primary.map(label => label.trim().replace(/^[^\p{L}]+/u, '').trim()), ['Resumo', 'Ativos', 'Dividendos', 'Renda Fixa', 'Mais']);
    await page.locator('#investBottomNav > button').last().click();
    const aportes = page.locator('#investMenuDrawer button[onclick*="go(\'aportes\')"]');
    assert.equal(await aportes.count(), 1, 'Aportes is missing from Mais');
    await aportes.click();
    assert.equal(await page.evaluate(() => S.tab), 'aportes');
    assert.equal(await page.locator('#investBottomNav > button').last().getAttribute('aria-current'), 'page');
  });
});

test('V3 shell groups routes and exposes readable theme tokens in both themes', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    const groups = await page.locator('.tabs-desktop .nav-section-title').allInnerTexts();
    assert.deepEqual(groups.map(text => text.trim()), ['CARTEIRA', 'RENDA & PERFORMANCE', 'ANÁLISE', 'DADOS', 'MAIS']);
    for (const theme of ['dark', 'light']) {
      const tokens = await page.evaluate(theme => {
        applyTheme(theme); render();
        const style = getComputedStyle(document.documentElement);
        return { theme: document.documentElement.dataset.theme, canvas: style.getPropertyValue('--v3-canvas').trim(), surface: style.getPropertyValue('--v3-surface').trim(), text: style.getPropertyValue('--v3-text').trim(), accent: style.getPropertyValue('--v3-accent').trim() };
      }, theme);
      assert.equal(tokens.theme, theme);
      for (const role of ['canvas', 'surface', 'text', 'accent']) assert.match(tokens[role], /^#[0-9a-f]{6}$/i, `${role} missing in ${theme}`);
    }
  });
});

test('mobile Mais is keyboard operable, restores focus and keeps 44px targets', async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    const more = page.locator('#investBottomNav > button').last();
    await more.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#investMenuDrawer').getAttribute('aria-hidden'), 'false');
    assert.match(await page.evaluate(() => document.activeElement?.textContent || ''), /Mais|Fechar/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#investMenuDrawer').getAttribute('aria-hidden'), 'true');
    assert.equal(await more.evaluate(node => document.activeElement === node), true);
    const rectangles = await page.locator('#investBottomNav > button').evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
    for (const rect of rectangles) assert.ok(rect.width >= 44 && rect.height >= 44, `small mobile target ${JSON.stringify(rect)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  });
});

test('Renda Fixa and Aportes remain reachable during mobile navigation migration', async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    await page.locator('#investBottomNav button[onclick="go(\'renda-fixa\')"]').click();
    assert.equal(await page.evaluate(() => S.tab), 'renda-fixa');
    await page.locator('#investBottomNav button[onclick="mobileMenuOpen()"]', { timeout: 3000 }).click();
    await page.locator('#investMenuDrawer button[onclick*="go(\'aportes\')"]').click();
    assert.equal(await page.evaluate(() => S.tab), 'aportes');
  });
});

test('Mais keeps secondary destinations labeled and available', async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    await page.locator('#investBottomNav > button').last().click();
    const labels = await page.locator('#investMenuDrawer .sheet-grid button').allInnerTexts();
    for (const label of ['Aportes', 'Rentab.', 'Análise', 'Rebalancear', 'Metas', 'Confiabilidade', 'Importar dados', 'Relatórios', 'IRPF', 'Auditoria', 'Insights', 'Configurações']) {
      assert.ok(labels.some(text => text.includes(label)), `${label} missing from Mais`);
    }
    assert.equal(await page.evaluate(() => { go('patrimonio'); return S.tab; }), 'dashboard', 'Patrimônio remains an existing Resumo alias');
  });
});

test('shell keeps readable labels, visible keyboard focus and reduced motion', async () => {
  for (const theme of ['dark', 'light']) {
    await withPage({ width: 390, height: 844 }, async page => {
      await page.evaluate(theme => { applyTheme(theme); render(); }, theme);
      const more = page.locator('#investBottomNav > button').last();
      await more.focus();
      const metrics = await more.evaluate(node => {
        const label = node.querySelector('span:last-child');
        const style = getComputedStyle(label);
        return { fontSize: parseFloat(style.fontSize), label: label.textContent.trim(), focus: document.activeElement === node };
      });
      assert.equal(metrics.label, 'Mais');
      assert.ok(metrics.fontSize >= 11 && metrics.focus);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const transition = await more.locator('.ni').evaluate(node => getComputedStyle(node).transitionDuration);
      assert.ok((transition.endsWith('ms') ? parseFloat(transition) : parseFloat(transition) * 1000) <= 0.01, `motion persists: ${transition}`);
    });
  }
});

test('every direct route activates through a visible desktop navigation control', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    const routes = await page.evaluate(() => [...new Set([...content.toString().matchAll(/if\(S\.tab===['"]([^'"]+)['"]\)/g)].map(match => match[1]))]
      .filter(route => !['ranking', 'desempenho', 'patrimonio'].includes(route)));
    for (const route of routes) {
      const button = page.locator(`.tabs-desktop button[onclick="go('${route}')"]`).first();
      const group = button.locator('xpath=ancestor::details[1]');
      if (await group.count()) await group.locator('summary').click();
      await button.click();
      assert.equal(await page.evaluate(() => S.tab), route, `route ${route} did not activate`);
      assert.equal(await page.locator(`.tabs-desktop button[onclick="go('${route}')"]`).first().getAttribute('aria-current'), 'page', `route ${route} did not indicate current page`);
    }
  });
});

test('shell viewport matrix has no horizontal overflow or navigation clipping', async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    for (const [width, height] of [[390, 844], [430, 932], [768, 1024], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      for (const theme of ['dark', 'light']) {
        await page.evaluate(theme => { applyTheme(theme); render(); }, theme);
        const geometry = await page.evaluate(() => {
          const nav = document.querySelector(innerWidth >= 1181 ? '.tabs-desktop' : innerWidth <= 620 ? '#investBottomNav' : '.tabs-mobile');
          const box = nav?.getBoundingClientRect();
          return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, navVisible: !!box && box.width > 0 && box.height > 0, navLeft: box?.left, navRight: box?.right, navBottom: box?.bottom };
        });
        assert.ok(geometry.scrollWidth <= width, `${width} ${theme} overflow ${geometry.scrollWidth}`);
        assert.ok(geometry.navVisible && geometry.navLeft >= 0 && geometry.navRight <= width + 1 && geometry.navBottom <= height + 1, `${width} ${theme} nav clipped: ${JSON.stringify(geometry)}`);
      }
    }
    assert.deepEqual(pageErrors, []);
  });
});

test('changed navigation passes scoped axe checks in dark and light themes', async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    for (const theme of ['dark', 'light']) {
      await page.evaluate(theme => { applyTheme(theme); render(); }, theme);
      const result = await page.evaluate(async () => axe.run('#investBottomNav', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
      assert.deepEqual(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), [], `${theme} navigation accessibility`);
    }
  });
});
