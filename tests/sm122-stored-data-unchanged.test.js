'use strict';
// SM122 — regressão: renderizar Ativos e o IRPF com posição não conciliada NÃO pode alterar dados armazenados
// (S.assets, S.aportes, S.wallets). A conciliação é somente leitura e apenas apresentação.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');
const NOW = new Date('2026-11-08T15:00:00Z');

test('renderizar Ativos e IRPF com posição não conciliada não altera dados armazenados', async () => {
  const harness = await startLocalHttpServer(repo);
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await page.clock.setFixedTime(NOW);
    await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await applyRichFixture(page, NOW);
    // Divergência controlada (caso SUZB3): quantidade registrada diferente da derivada dos lançamentos.
    await page.evaluate(() => {
      const a = S.assets.find(x => x.ticker === 'QAAA3');
      a.qty = Number(a.qty) - 21;
      S.wallets[0].assets = JSON.parse(JSON.stringify(S.assets));
      render();
    });
    const snapshot = () => page.evaluate(() => JSON.stringify({ assets: S.assets, aportes: S.aportes, wallets: S.wallets }));
    const before = await snapshot();

    await page.evaluate(() => { S.tab = 'ativos'; render(); });
    const noteCount = await page.evaluate(() => document.querySelectorAll('.recon-note').length);
    const afterAtivos = await snapshot();
    assert.equal(afterAtivos, before, 'renderizar Ativos alterou dados armazenados');

    const irpfHtml = await page.evaluate(() => {
      try { return String(irpfTabPremium() || ''); } catch (error) { return 'ERRO ' + error.message; }
    });
    const afterIrpf = await snapshot();
    assert.equal(afterIrpf, before, 'renderizar IRPF alterou dados armazenados');

    assert.ok(noteCount >= 1, 'nota NÃO CONCILIADA deveria aparecer na tela Ativos');
    assert.ok(!/^ERRO /.test(irpfHtml), 'tela IRPF lançou erro: ' + irpfHtml.slice(0, 120));
  } finally {
    await browser.close();
    harness.server.close();
  }
});
