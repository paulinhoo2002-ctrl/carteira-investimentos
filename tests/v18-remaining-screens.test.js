const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV17Fixture } = require('./helpers/v17-fin-fixture');

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const routes = ['patrimonio', 'metas', 'ajudar', 'analise', 'auditoria', 'settings'];

async function withPage(width, theme, fn) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height: width > 800 ? 900 : 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyV17Fixture(page);
    await page.evaluate(name => applyTheme(name), theme);
    await fn(page, errors);
  } finally {
    await browser.close();
    harness.server.close();
  }
}

// Qualidade visual das quatro telas financeiras: sem overflow, texto legível, sem cor inline legada e sem erro de página.
for (const [width, theme] of [[1366, 'dark'], [1366, 'light'], [390, 'dark'], [390, 'light']]) {
  test(`V18 - telas financeiras legíveis e sem overflow (${width}px, ${theme})`, async () => {
    await withPage(width, theme, async (page, errors) => {
      const problems = [];
      for (const route of routes) {
        await page.evaluate(name => go(name), route);
        await page.waitForTimeout(250);
        const report = await page.evaluate(() => {
          const root = document.querySelector('.wrap');
          let tiny = 0;
          let inlineHex = 0;
          root.querySelectorAll('*').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none') return;
            const own = [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim());
            if (own && parseFloat(cs.fontSize) < 11) tiny++;
            if (/color:\s*#[0-9a-f]{3,8}/i.test(el.getAttribute('style') || '')) inlineHex++;
          });
          return { tiny, inlineHex, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        });
        if (report.tiny) problems.push(`${route}: ${report.tiny} textos < 11px`);
        if (report.overflow > 1) problems.push(`${route}: overflow horizontal ${report.overflow}px`);
        if (report.inlineHex) problems.push(`${route}: ${report.inlineHex} cores inline hexadecimais`);
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(problems, []);
    });
  });
}


test('V18 - axe sem violações nas seis telas restantes (claro e escuro, desktop e mobile)', async () => {
  const found = [];
  for (const [width, theme] of [[1366, 'dark'], [1366, 'light'], [390, 'dark'], [390, 'light']]) {
    await withPage(width, theme, async page => {
      await page.evaluate(source => { const script = document.createElement('script'); script.textContent = source; document.head.appendChild(script); }, axeSource);
      for (const route of routes) {
        await page.evaluate(name => go(name), route);
        await page.waitForTimeout(300);
        const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations.map(item => `${item.id} ${item.nodes[0].target.join(' ').slice(0, 70)}`));
        if (violations.length) found.push(`${route}@${width}${theme[0]}: ${violations.join('; ')}`);
      }
    });
  }
  assert.deepEqual(found, []);
});


test('V18 - Ocultar valores não deixa valor monetário visível nas telas restantes', async () => {
  await withPage(1366, 'dark', async page => {
    await page.evaluate(() => { S.hideValues = true; render(); });
    for (const route of routes) {
      await page.evaluate(name => go(name), route);
      await page.waitForTimeout(250);
      const total = Math.min(await page.locator('#root details:not([open]) > summary:visible').count(), 8);
      for (let i = 0; i < total; i++) await page.locator('#root details:not([open]) > summary:visible').first().click().catch(() => {});
      const leaks = await page.evaluate(() => (document.getElementById('root').innerText.match(/R\$\s?\d[\d.]*,\d{2}/g) || []).slice(0, 3));
      assert.deepEqual(leaks, [], `valores visíveis em ${route}`);
    }
  });
});
