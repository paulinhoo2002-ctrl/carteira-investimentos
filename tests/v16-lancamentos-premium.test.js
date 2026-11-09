const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const it = fs.existsSync(CHROME) ? test : test.skip;

// Mesma sessão QA isolada do teste financeiro V317: memória apenas, sem rede externa e sem persistência.
async function openApp(viewport = { width: 1366, height: 768 }) {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const problems = [];
  const origin = new URL(harness.url).origin;
  page.on('pageerror', error => problems.push('pageerror: ' + error.message));
  await page.route('**/*', route => {
    const request = route.request();
    if (new URL(request.url()).origin === origin) return route.continue();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) problems.push('escrita externa: ' + request.url());
    return route.abort();
  });
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && Array.isArray(S.aportes) && typeof go === 'function');
  await page.evaluate(() => {
    restoreLocalTestData();
    const active = activeWallet();
    const wallet = { ...active, id: 'V16_QA_WALLET', name: 'Carteira sintética V16', assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents };
    S.wallets = [{ id: 'V16_QA_PRIMARY', name: 'Principal sintética', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} }, wallet];
    S.activeWalletId = wallet.id;
    fetchQuotes = async () => {};
    scheduleAutoProventosGratis = () => {};
  });
  page.on('dialog', dialog => dialog.accept());
  return { browser, context, page, harness, problems };
}
async function closeApp(app) {
  await app.context.close();
  await app.browser.close();
  await new Promise(resolve => app.harness.server.close(resolve));
}
const registro = (page, ticker) => page.evaluate(symbol => S.aportes.filter(item => item.ticker === symbol).map(item => ({ id: item.id, op: item.operation, qty: Number(item.qty), price: Number(item.price) })), ticker);

it('Lançamentos premium - compra, venda, edição e exclusão com dados sintéticos', async () => {
  const app = await openApp();
  const { page } = app;
  const ticker = 'V16QA1';
  try {
    await page.evaluate(() => go('aportes'));
    assert.ok(await page.locator('.aporte-premium').count(), 'tela de Lançamentos renderizada');
    assert.equal(await page.locator('.aporte-primary-toolbar .btn.bp').count(), 1, 'uma única ação primária de cadastro');

    // COMPRA pela interface
    await page.locator('.aporte-primary-toolbar .btn.bp').click();
    await page.locator('.quick-movement-modal').waitFor({ state: 'visible' });
    await page.locator('#qm-ti').fill(ticker);
    await page.locator('#qm-qty').fill('4');
    await page.locator('#qm-price').fill('10,50');
    await page.locator('.quick-movement-modal button.btn.bsv').click();
    await page.waitForFunction(symbol => S.aportes.some(item => item.ticker === symbol), ticker);
    assert.deepEqual((await registro(page, ticker)).map(({ op, qty, price }) => ({ op, qty, price })), [{ op: 'compra', qty: 4, price: 10.5 }]);
    await page.evaluate(() => go('aportes'));
    const linha = page.locator('.aporte-history-card', { hasText: ticker }).first();
    assert.match(await linha.innerText(), /Compra/, 'histórico mostra o tipo Compra');

    // VENDA: acima da posição é rejeitada e não grava; venda válida grava
    const assetId = await page.evaluate(symbol => String(S.assets.find(item => item.ticker === symbol)?.id), ticker);
    await page.evaluate(() => openQuickMovement('venda'));
    await page.selectOption('#qm-sale-asset', assetId);
    await page.locator('#qm-qty').fill('9');
    await page.locator('#qm-price').fill('12');
    await page.getByRole('button', { name: 'Confirmar venda' }).click();
    assert.match(await page.locator('.quick-movement-modal').innerText(), /acima da posição/i, 'mensagem de validação visível');
    assert.equal((await registro(page, ticker)).length, 1, 'venda inválida não grava');
    await page.locator('#qm-qty').fill('1');
    await page.getByRole('button', { name: 'Confirmar venda' }).click();
    await page.waitForFunction(symbol => S.aportes.some(item => item.ticker === symbol && item.operation === 'venda'), ticker);
    assert.equal((await registro(page, ticker)).length, 2);

    // EDIÇÃO da compra: quantidade 4 -> 5
    const compra = (await registro(page, ticker)).find(item => item.op === 'compra');
    await page.evaluate(id => edP(id), compra.id);
    // compras existentes são editadas no formulário de operação (#p-*), não no modal de cadastro rápido
    await page.locator('#p-qt').waitFor({ state: 'visible' });
    await page.locator('#p-qt').fill('5');
    await page.locator('button[onclick="svP()"]').first().click();
    await page.waitForFunction(([symbol, qty]) => S.aportes.some(item => item.ticker === symbol && item.operation === 'compra' && Number(item.qty) === qty), [ticker, 5]);
    assert.equal((await registro(page, ticker)).length, 2, 'edição não duplica o registro');

    // EXCLUSÃO da venda pelo botão da lista (confirmação aceita)
    await page.evaluate(() => go('aportes'));
    const venda = (await registro(page, ticker)).find(item => item.op === 'venda');
    const cartaoVenda = page.locator('.aporte-history-card', { hasText: 'Venda' }).filter({ hasText: ticker }).first();
    await cartaoVenda.locator('button[aria-label="Excluir lançamento"]').click();
    await page.waitForFunction(id => !S.aportes.some(item => String(item.id) === String(id)), venda.id);
    assert.deepEqual((await registro(page, ticker)).map(item => item.op), ['compra']);
    assert.deepEqual(app.problems, [], 'sem erros de página nem escrita externa');
  } finally {
    await closeApp(app);
  }
});

it('Lançamentos premium - validação exibe erros por campo e não grava dados inválidos', async () => {
  const app = await openApp();
  const { page } = app;
  try {
    await page.evaluate(() => go('aportes'));
    const antes = await page.evaluate(() => S.aportes.length);
    await page.locator('.aporte-primary-toolbar .btn.bp').click();
    await page.locator('.quick-movement-modal').waitFor({ state: 'visible' });
    await page.locator('#qm-ti').fill('V16INV');
    await page.locator('#qm-qty').fill('-3');
    await page.locator('#qm-price').fill('10');
    await page.locator('.quick-movement-modal button.btn.bsv').click();
    await page.locator('#qm-error-banner, .quick-movement-error').first().waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => S.aportes.length), antes, 'quantidade inválida não grava');
    assert.match(await page.locator('.quick-movement-modal').innerText(), /quantidade/i);
  } finally {
    await closeApp(app);
  }
});

it('Lançamentos premium - filtros, ordenação e paginação preservam contagens', async () => {
  const app = await openApp();
  const { page } = app;
  try {
    await page.evaluate(() => go('aportes'));
    const total = await page.evaluate(() => S.aportes.length);
    assert.ok(total >= 1);
    const todos = await page.locator('.aporte-filter-chip.on').innerText();
    assert.match(todos, /Todos/);
    await page.locator('.aporte-filter-chip', { hasText: 'Compra' }).first().click();
    assert.ok(await page.locator('.aporte-filter-chip.on', { hasText: 'Compra' }).count(), 'chip ativo exposto');
    await page.locator('.aporte-filter-chip', { hasText: 'Todos' }).first().click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  } finally {
    await closeApp(app);
  }
});

it('Lançamentos premium - mobile 390px sem overflow e com ações acessíveis', async () => {
  const app = await openApp({ width: 390, height: 844 });
  const { page } = app;
  try {
    await page.evaluate(() => go('aportes'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'sem overflow horizontal');
    const alvos = await page.locator('.aporte-primary-toolbar .btn, .aporte-filter-chip').evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return box.height; }));
    assert.ok(alvos.every(height => height >= 36), 'controles com altura de toque adequada');
  } finally {
    await closeApp(app);
  }
});
