const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer } = require('./local-http-server');

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => {
    try { fs.accessSync(candidate); return true; } catch { return false; }
  });
}

const viewports = [
  { width: 360, height: 800, label: '360x800' },
  { width: 390, height: 844, label: '390x844' },
  { width: 430, height: 932, label: '430x932' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1024, height: 768, label: '1024x768' },
  { width: 1366, height: 768, label: '1366x768' },
];

function pageOverflowExpr() {
  return `(()=>{const s=document.scrollingElement;return Math.max(s.scrollWidth,document.body?document.body.scrollWidth:0)-window.innerWidth})()`;
}

for (const viewport of viewports) {
  test(`Mobile overflow controls - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke Playwright');
    const harness = await startLocalHttpServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const errors = [];
    const requestFailures = [];
    try {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.width <= 430,
        isMobile: viewport.width <= 430,
      });
      const page = await context.newPage();
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
      page.on('requestfailed', request => { if (!request.url().includes('favicon')) requestFailures.push(`${request.url()} (${request.failure()?.errorText || 'unknown'})`); });
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => typeof go === 'function' && typeof openQuickMovement === 'function');

      const pageOverflow = async () => page.evaluate(pageOverflowExpr());

      // IA: o modo-bar fica dentro de <details class="ai-compact-details"> (recolhido por padrao).
      // O teste deve: (1) localizar o painel "Leituras complementares", (2) expandi-lo,
      // (3) entao verificar os controles de modo quanto a overflow, viewport e altura minima.
      await page.evaluate(() => go('ia'));
      const detailsLocator = page.locator('.ai-compact-details').first();
      await detailsLocator.waitFor({ state: 'attached', timeout: 5000 });
      assert.equal(await detailsLocator.evaluate(el => el.open), false, `details de Insights deveria iniciar recolhido em ${viewport.label}`);
      assert.ok(await detailsLocator.locator('summary').isVisible(), `summary "Leituras complementares" nao visivel em ${viewport.label}`);
      await detailsLocator.locator('summary').click();
      await page.waitForSelector('.ai-modebar', { state: 'visible', timeout: 5000 });
      assert.equal(await detailsLocator.evaluate(el => el.open), true, `details de Insights nao expandiu em ${viewport.label}`);
      const ia = await page.evaluate(() => {
        const vw = window.innerWidth;
        const bar = document.querySelector('.ai-modebar');
        const cs = getComputedStyle(bar);
        const buttons = [...bar.querySelectorAll('button')].map(btn => {
          const r = btn.getBoundingClientRect();
          return { text: btn.textContent.trim(), left: r.left, right: r.right, height: r.height, fullyInViewport: r.left >= -1 && r.right <= vw + 1 };
        });
        const conc = buttons.find(b => b.text === 'Concentração');
        return { barScrollWidth: bar.scrollWidth, barClientWidth: bar.clientWidth, flexWrap: cs.flexWrap, buttons, concentracao: conc || null, allVisible: buttons.every(b => b.fullyInViewport) };
      });
      assert.equal(ia.buttons.length, 4, `modos da IA incompletos em ${viewport.label}`);
      assert.ok(ia.concentracao, `Concentracao ausente em ${viewport.label}`);
      assert.ok(ia.concentracao.fullyInViewport, `Concentracao cortada em ${viewport.label} (right=${Math.round(ia.concentracao.right)} vw=${viewport.width})`);
      assert.ok(ia.concentracao.height >= 44, `Concentracao menor que 44px em ${viewport.label}`);
      assert.ok(ia.allVisible, `algum modo da IA cortado em ${viewport.label}`);
      assert.equal(await pageOverflow(), 0, `pageOverflow na IA em ${viewport.label}`);

      // Dividendos: the current route exposes primary modes in its own
      // horizontally scrollable navigation, with secondary modes under Mais.
      await page.evaluate(() => go('dividendos'));
      const dividendModes = page.locator('nav[aria-label="Modos de Dividendos"]');
      assert.equal(await dividendModes.isVisible(), true, `navegação de modos indisponível em ${viewport.label}`);
      const dividendNavGeometry = await dividendModes.evaluate(nav => {
        const rect = nav.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
      assert.ok(dividendNavGeometry.left >= -1 && dividendNavGeometry.right <= viewport.width + 1,
        `navegação de Dividendos fora da viewport em ${viewport.label}: ${JSON.stringify(dividendNavGeometry)}`);
      await dividendModes.getByRole('button', { name: 'Evolução', exact: true }).click();
      assert.equal(await dividendModes.locator('.div-premium-tab.on').innerText(), 'Evolução',
        `modo Evolução não selecionado em ${viewport.label}`);
      assert.equal(await page.locator('.dividend-mode-content[aria-label="Evolução da renda"]').isVisible(), true,
        `conteúdo de Evolução não renderizado em ${viewport.label}`);
      await page.locator('.div-dividend-moreviews > summary').click();
      await page.locator('.div-dividend-moreviews-body').getByRole('button', { name: 'Revisão', exact: true }).click();
      assert.equal(await dividendModes.locator('.div-dividend-moreviews-body .div-premium-tab.on').innerText(), 'Revisão',
        `modo Revisão não selecionado em ${viewport.label}`);
      assert.equal(await page.locator('.prov-review-shell .prov-review-title strong').innerText(), 'Revisão',
        `conteúdo de Revisão não renderizado em ${viewport.label}`);
      assert.equal(await pageOverflow(), 0, `pageOverflow em dividendos ${viewport.label}`);

      // Ativos: o resumo inicia fechado e as ações vivem no menu contextual.
      await page.evaluate(() => go('ativos'));
      const category = page.locator('.assets-premium-shell details.ag').first();
      const categorySummary = category.locator(':scope > summary');
      await categorySummary.waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await category.getAttribute('open'), null, `categoria deveria iniciar recolhida em ${viewport.label}`);
      await categorySummary.click();
      await page.waitForFunction(() => document.querySelector('.assets-premium-shell details.ag')?.open === true);
      if (viewport.width <= 767) {
        const assetDetail = category.locator('.asset-premium-card').first();
        await assetDetail.locator('summary').click();
        await page.waitForFunction(() => document.querySelector('.assets-premium-shell details.ag[open] .asset-premium-card[open]')?.open === true);
      }

      const actionTrigger = page.locator('.assets-premium-shell .asset-action-menu-trigger:visible').first();
      await actionTrigger.waitFor({ state: 'visible', timeout: 5000 });
      const triggerBox = await actionTrigger.boundingBox();
      assert.ok(triggerBox && triggerBox.width >= 44 && triggerBox.height >= 44, `menu contextual menor que 44px em ${viewport.label}`);
      assert.match(await actionTrigger.getAttribute('aria-label'), /Mais ações para/i, `menu sem nome acessível em ${viewport.label}`);

      // Ponteiro abre o menu e mantém as operações existentes sob demanda.
      await actionTrigger.click();
      const menuId = await actionTrigger.getAttribute('aria-controls');
      const menu = page.locator(`#${menuId}`);
      assert.equal(await actionTrigger.getAttribute('aria-expanded'), 'true', `ponteiro não abriu o menu em ${viewport.label}`);
      assert.equal(await menu.getAttribute('role'), 'menu', `menu sem semântica em ${viewport.label}`);
      assert.deepEqual(await menu.getByRole('menuitem').allInnerTexts(), ['Detalhes', 'Comprar', 'Vender', 'Editar'], `ações incompletas em ${viewport.label}`);
      await page.keyboard.press('Escape');

      // Teclado abre o mesmo caminho e preserva um foco visível no controle.
      await actionTrigger.focus();
      const focus = await actionTrigger.evaluate(element => {
        const style = getComputedStyle(element);
        return { outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth) || 0 };
      });
      assert.ok(focus.outlineStyle !== 'none' && focus.outlineWidth > 0, `foco do menu não está visível em ${viewport.label}`);
      await page.keyboard.press('Enter');
      assert.equal(await actionTrigger.getAttribute('aria-expanded'), 'true', `teclado não abriu o menu em ${viewport.label}`);

      const assetPath = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('#root [id]')].map(element => element.id);
        const detail = document.querySelector('.asset-premium-card, .assets-table tbody tr');
        return {
          duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
          detailReachable: Boolean(detail),
        };
      });
      assert.equal(assetPath.detailReachable, true, `linha ou detalhe de ativo ausente em ${viewport.label}`);
      assert.deepEqual(assetPath.duplicateIds, [], `IDs duplicados no menu em ${viewport.label}`);
      await page.keyboard.press('Escape');
      assert.equal(await pageOverflow(), 0, `pageOverflow em ativos ${viewport.label}`);

      await context.close();
    } finally {
      await browser.close();
      harness.server.close();
    }
    assert.deepEqual(errors, [], `telemetria console/pageerror em ${viewport.label}: ${errors.join(' | ')}`);
    assert.deepEqual(requestFailures, [], `requestfailed em ${viewport.label}: ${requestFailures.join(' | ')}`);
  });
}
