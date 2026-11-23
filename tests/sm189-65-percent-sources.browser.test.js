'use strict';
// SM189.65: outras fontes de percentual de rentabilidade sem denominador válido não podem virar +0,00%.
// Fontes vivas: export/PDF do card Renda Fixa (reportCardPdfFixedPreview) e análise da aba IA (generateOverviewAnalysis).
// Entrada controlada sobrescrevendo apenas rfIntelligenceSnapshot() e cx(); a saída é lida do HTML gerado.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { resolveChromePath } = require('./helpers/chrome-path');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { FROZEN_NOW } = require('./helpers/fase1-snapshot');
const { startLocalHttpServer } = require('./local-http-server');

const ZERO_PERCENT = /(^|[^\d,])[+-]?0,00%/;

async function openApp(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await applyRichFixture(page, new Date(FROZEN_NOW));
  return { page, errors };
}

test.describe('SM189.65 — fontes de percentual sem denominador', () => {
  let server;
  let browser;
  test.before(async () => {
    const { chromium } = await import('playwright-core');
    const executablePath = resolveChromePath();
    assert.ok(executablePath, 'Chrome/Edge não encontrado (defina CHROME_PATH)');
    server = await startLocalHttpServer(path.join(__dirname, '..'));
    browser = await chromium.launch({ executablePath, headless: true });
  });
  test.after(async () => {
    if (browser) await browser.close();
    if (server) server.server.close();
  });

  test('Renda Fixa (PDF/export): rentabilidade desconhecida mostra "—", nunca +0,00%', async () => {
    const { page, errors } = await openApp(browser, server.url);
    try {
      await page.evaluate(() => {
        const realRf = window.rfIntelligenceSnapshot;
        window.rfIntelligenceSnapshot = () => ({ ...realRf(), totalPct: null });
      });
      const html = await page.evaluate(() => reportCardPdfPreview('fixed'));
      const windows = [...html.matchAll(/Rentabilidade/g)].map(match => html.slice(Math.max(0, match.index - 200), match.index + 200));
      assert.ok(windows.length > 0, 'rótulo Rentabilidade presente no PDF da Renda Fixa');
      assert.equal(windows.find(text => ZERO_PERCENT.test(text)), undefined, 'rentabilidade desconhecida não pode aparecer como +0,00%');
      assert.ok(windows.some(text => text.includes('—')), 'rentabilidade desconhecida deve mostrar "—"');
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  });

  test('IA (análise geral) com capital zero: "Rentabilidade" mostra "—", não +0,00%', async () => {
    const { page, errors } = await openApp(browser, server.url);
    try {
      await page.evaluate(() => {
        const realCx = window.cx;
        window.cx = () => ({ ...realCx(), tI: 0, tGP: 0 });
      });
      const text = await page.evaluate(() => {
        const out = generateOverviewAnalysis();
        return typeof out === 'string' ? out : (out?.html ?? out?.text ?? JSON.stringify(out));
      });
      assert.ok(/Rentabilidade/.test(text), 'análise geral menciona Rentabilidade');
      assert.doesNotMatch(text, ZERO_PERCENT, 'capital zero não pode gerar Rentabilidade +0,00%');
      assert.match(text, /Rentabilidade —/, 'rentabilidade sem denominador deve ser "—"');
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  });

  test('IA com capital positivo mantém rentabilidade real (+50,00%)', async () => {
    const { page, errors } = await openApp(browser, server.url);
    try {
      await page.evaluate(() => {
        const realCx = window.cx;
        window.cx = () => ({ ...realCx(), tI: 1000, tC: 1500, tG: 500, tGP: 50, appliedComplete: true });
      });
      const text = await page.evaluate(() => {
        const out = generateOverviewAnalysis();
        return typeof out === 'string' ? out : (out?.html ?? out?.text ?? JSON.stringify(out));
      });
      assert.ok(text.includes('+50,00%'), 'rentabilidade legítima deve aparecer');
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  });
});
