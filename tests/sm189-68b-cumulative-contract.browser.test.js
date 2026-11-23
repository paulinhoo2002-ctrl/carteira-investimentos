'use strict';
// SM189.68B: contrato da série cumulativa (patrimonySnapshot).
// Modelo atual: só há movimentos (S.aportes). Não existe metadado de cobertura de movimentação nem de início
// de histórico. Logo: C (movimento registrado) é distinguível; A (sem movimento confirmado) e B (sem informação)
// NÃO são distinguíveis — ambos viram null. Itens que dependeriam de metadado ausente são marcados LIMITAÇÃO.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { resolveChromePath } = require('./helpers/chrome-path');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { FROZEN_NOW } = require('./helpers/fase1-snapshot');
const { startLocalHttpServer } = require('./local-http-server');

// Datas relativas ao "agora" da página: k meses atrás, dia 15.
const SERIES_SCRIPT = (aportes) => {
  const now = new Date();
  const d = k => new Date(now.getFullYear(), now.getMonth() - k, 15).toISOString().slice(0, 10);
  S.aportes = aportes.map((a, index) => ({ id: `QA_T${index}`, ticker: 'QAAA3', name: 'Ativo sintético', type: 'Ação', asset_type: 'Ação', qty: 1, price: a.value, totalValue: a.value, operation: a.operation, movementKind: a.operation, date: d(a.k) }));
  return patrimonySnapshot(12).months.map(row => ({ key: row.key, aporte: row.aporte, movementCount: row.movementCount, cumulative: row.cumulative }));
};

async function series(browser, url, aportes) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await applyRichFixture(page, new Date(FROZEN_NOW));
  const months = await page.evaluate(`(${SERIES_SCRIPT.toString()})(${JSON.stringify(aportes)})`);
  await page.close();
  assert.deepEqual(errors, []);
  return months;
}

// índice i da janela (0 = mais antigo, 11 = mês atual) corresponde a k = 11 - i meses atrás.
const at = (months, k) => months[11 - k];

test.describe('SM189.68B — contrato da série cumulativa', () => {
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

  test('C: aporte confirmado no mês → movimento registrado, acumulado conhecido', async () => {
    const months = await series(browser, server.url, [{ k: 5, value: 1000, operation: 'compra' }]);
    const row = at(months, 5);
    assert.equal(row.movementCount, 1);
    assert.equal(row.aporte, 1000);
    assert.equal(row.cumulative, 1000);
  });

  test('C: resgate confirmado → sinal negativo, acumulado reduz', async () => {
    const months = await series(browser, server.url, [
      { k: 8, value: 1000, operation: 'compra' },
      { k: 4, value: 300, operation: 'venda' },
    ]);
    assert.equal(at(months, 4).aporte, -300);
    assert.equal(at(months, 4).cumulative, 700);
  });

  test('A/B: mês sem movimento → null (sem prova de ausência; cobertura completa não é representável no modelo atual)', async () => {
    const months = await series(browser, server.url, [{ k: 10, value: 500, operation: 'compra' }]);
    assert.equal(at(months, 6).movementCount, 0);
    assert.equal(at(months, 6).cumulative, null, 'mês sem registro não pode carregar acumulado sem prova de cobertura');
  });

  test('B: mês sem movimento e cobertura desconhecida → null', async () => {
    const months = await series(browser, server.url, [{ k: 10, value: 500, operation: 'compra' }]);
    assert.equal(at(months, 2).cumulative, null);
  });

  test('LIMITAÇÃO: primeiro mês sem saldo inicial confiável → baseline 0 é tratado como histórico completo', async () => {
    // Sem metadado de início de histórico, o sistema não distingue "primeiro registro" de "histórico parcial".
    const months = await series(browser, server.url, [{ k: 11, value: 800, operation: 'compra' }]);
    assert.equal(at(months, 11).cumulative, 800);
  });

  test('acumulado anterior conhecido: saldo pré-janela + movimento do mês', async () => {
    const months = await series(browser, server.url, [
      { k: 13, value: 1000, operation: 'compra' },
      { k: 4, value: 200, operation: 'compra' },
    ]);
    assert.equal(at(months, 4).cumulative, 1200);
  });

  test('LIMITAÇÃO: acumulado anterior desconhecido (saldo pré-janela sem cobertura) é somado como conhecido', async () => {
    const months = await series(browser, server.url, [
      { k: 13, value: 1000, operation: 'compra' },
      { k: 4, value: 200, operation: 'compra' },
    ]);
    assert.equal(at(months, 4).cumulative, 1200, 'mesma soma: falta metadado para declarar o saldo pré-janela como desconhecido');
  });

  test('histórico parcial com 1 de 12 meses cobertos → 1 valor conhecido e 11 null', async () => {
    const months = await series(browser, server.url, [{ k: 3, value: 400, operation: 'compra' }]);
    const known = months.filter(row => row.cumulative !== null);
    assert.equal(known.length, 1);
    assert.equal(known[0].key, at(months, 3).key);
  });

  test('a série não altera S.aportes nem o resultado financeiro (apresentação não altera cálculo)', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    try {
      await page.goto(server.url, { waitUntil: 'networkidle' });
      await applyRichFixture(page, new Date(FROZEN_NOW));
      const before = await page.evaluate(() => ({ aportes: JSON.stringify(S.aportes), tG: cx().tG, tC: cx().tC, tI: cx().tI }));
      await page.evaluate(() => patrimonySnapshot(12));
      const after = await page.evaluate(() => ({ aportes: JSON.stringify(S.aportes), tG: cx().tG, tC: cx().tC, tI: cx().tI }));
      assert.deepEqual(after, before);
    } finally {
      await page.close();
    }
  });
});
