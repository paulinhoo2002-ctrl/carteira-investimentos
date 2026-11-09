const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');

const chrome = require('./helpers/chrome-path').resolveChromePath();
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

// Estados que só existem após interação: tabela de Ativos aberta, modal de cadastro, formulário de edição e matriz anual.
test('V16 - axe sem violações nos estados interativos (claro e escuro, desktop e mobile)', async () => {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const found = [];
  try {
    for (const [width, theme] of [[1366, 'dark'], [1366, 'light'], [390, 'dark'], [390, 'light']]) {
      const page = await browser.newPage({ viewport: { width, height: width > 800 ? 900 : 844 } });
      await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
      await applyRichFixture(page);
      await page.evaluate(name => applyTheme(name), theme);
      await page.evaluate(source => { const script = document.createElement('script'); script.textContent = source; document.head.appendChild(script); }, axeSource);
      const audit = async label => {
        await page.waitForTimeout(300);
        const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations.map(item => item.id + ' ' + item.nodes[0].target.join(' ').slice(0, 70)));
        if (violations.length) found.push(`${label}@${width}${theme[0]}: ${violations.join('; ')}`);
      };
      await page.evaluate(() => go('ativos'));
      await page.locator('#ativosAccordion details.accordion-category').first().locator('summary').first().click();
      await audit('ativos-aberto');
      await page.evaluate(() => { go('aportes'); openQuickMovement(); });
      await audit('lancamentos-modal');
      await page.evaluate(() => { S.quickMovementOpen = false; S.quickMovementDraft = null; render(); edP(S.aportes.find(item => item.operation === 'compra').id); });
      await audit('lancamentos-edicao');
      await page.evaluate(() => { S.dividendViewMode = 'monthly'; S.dividendMonthlyHistoryView = 'matrix'; go('dividendos'); });
      await audit('dividendos-matriz');
      await page.close();
    }
  } finally {
    await browser.close();
    harness.server.close();
  }
  assert.deepEqual(found, []);
});
