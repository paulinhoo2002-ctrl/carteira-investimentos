'use strict';
// SM186 — venda de posição LEDGER com histórico de operações verificável: quantidade, custo, resultado realizado,
// idempotência e pendência explícita para posições legadas. Valores independentes (calculados à mão nos comentários).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const it = fs.existsSync(CHROME) ? test : test.skip;

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
    const wallet = { ...active, id: 'SM186_QA_WALLET', name: 'Carteira sintética SM186', assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents };
    S.wallets = [{ id: 'SM186_QA_PRIMARY', name: 'Principal sintética', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} }, wallet];
    S.activeWalletId = wallet.id;
    S.assets = []; S.aportes = []; S.proventos = []; S.rfEvents = [];
    wallet.assets = S.assets; wallet.aportes = S.aportes; wallet.proventos = S.proventos; wallet.rfEvents = S.rfEvents;
    fetchQuotes = async () => {};
    scheduleAutoProventosGratis = () => {};
    render();
  });
  page.on('dialog', dialog => dialog.accept());
  return { browser, context, page, harness, problems };
}
async function closeApp(app) {
  await app.context.close();
  await app.browser.close();
  await new Promise(resolve => app.harness.server.close(resolve));
}
async function comprar(page, ticker, qty, price) {
  await page.evaluate(() => go('aportes'));
  await page.locator('.aporte-primary-toolbar .btn.bp').click();
  await page.locator('.quick-movement-modal').waitFor({ state: 'visible' });
  await page.locator('#qm-ti').fill(ticker);
  await page.locator('#qm-qty').fill(String(qty));
  await page.locator('#qm-price').fill(String(price).replace('.', ','));
  await page.locator('.quick-movement-modal button.btn.bsv').click();
  await page.waitForFunction(symbol => S.assets.some(item => item.ticker === symbol), ticker);
}
async function vender(page, ticker, qty, price, fees = '') {
  const assetId = await page.evaluate(symbol => String(S.assets.find(item => item.ticker === symbol).id), ticker);
  await page.evaluate(() => openQuickMovement('venda'));
  await page.selectOption('#qm-sale-asset', assetId);
  await page.locator('#qm-qty').fill(String(qty));
  await page.locator('#qm-price').fill(String(price).replace('.', ','));
  if (fees) await page.locator('#qm-sell-fees').fill(String(fees).replace('.', ','));
  await page.getByRole('button', { name: 'Confirmar venda' }).click();
}
const estado = (page, ticker) => page.evaluate(symbol => {
  const p = S.assets.find(item => item.ticker === symbol);
  return {
    qty: p ? Number(p.qty) : 0,
    avg: p ? Number(p.avg_price) : null,
    custo: p ? Number(p.qty) * Number(p.avg_price) : 0,
    vendas: S.aportes.filter(item => item.ticker === symbol && item.operation === 'venda').map(item => ({ qty: Number(item.qty), price: Number(item.price), status: item.reconciliationStatus, realizado: item.realizedResult, custoBaixado: item.costReleased, bruto: item.saleGross })),
    lancamentos: S.aportes.filter(item => item.ticker === symbol).length,
  };
}, ticker);
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: obtido ${a}, esperado ${b}`);

it('SM186 exemplo 1 (venda parcial): 10 @ 10,80 vendendo 4 @ 15,00', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 10, 10.8);
    const antes = await estado(app.page, 'BBAS3');
    close(antes.custo, 108, 'custo inicial');
    await vender(app.page, 'BBAS3', 4, 15);
    await app.page.waitForFunction(() => S.aportes.some(item => item.operation === 'venda' && item.ticker === 'BBAS3'));
    const depois = await estado(app.page, 'BBAS3');
    assert.equal(depois.qty, 6, 'quantidade remanescente');
    close(depois.avg, 10.8, 'preço médio remanescente');
    close(depois.custo, 64.8, 'custo remanescente');
    const v = depois.vendas[0];
    assert.equal(v.status, 'LEDGER_RECONCILED', 'venda aplicada');
    close(v.bruto, 60, 'valor bruto vendido');
    close(v.custoBaixado, 43.2, 'custo baixado');
    close(v.realizado, 16.8, 'resultado realizado');
    assert.equal(depois.lancamentos, 2, 'compra + venda, sem duplicação');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM186 exemplo 2 (venda total): vende as 6 restantes; zera sem posição fantasma', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 10, 10.8);
    await vender(app.page, 'BBAS3', 4, 15);
    await app.page.waitForFunction(() => S.aportes.filter(item => item.operation === 'venda' && item.ticker === 'BBAS3').length === 1);
    await vender(app.page, 'BBAS3', 6, 15);
    await app.page.waitForFunction(() => S.aportes.filter(item => item.operation === 'venda' && item.ticker === 'BBAS3').length === 2);
    const fim = await estado(app.page, 'BBAS3');
    assert.equal(fim.qty, 0, 'quantidade final zero');
    assert.equal(fim.custo, 0, 'custo remanescente zero');
    assert.equal(app.problems.length, 0);
    assert.equal(await app.page.evaluate(() => S.assets.some(item => item.ticker === 'BBAS3')), false, 'nenhuma posição fantasma');
    // vendas vêm na ordem do ledger (mais recente primeiro): a venda total é a de quantidade 6.
    const total = fim.vendas.find(v => v.qty === 6);
    close(total.realizado, 25.2, 'resultado realizado da venda total (6 × 15 − 6 × 10,80)');
    close(total.custoBaixado, 64.8, 'custo baixado da venda total');
    assert.equal(fim.lancamentos, 3, 'compra + duas vendas, sem duplicação');
  } finally { await closeApp(app); }
});

it('SM186 exemplo 3 (venda inválida): 10 ações, tentativa de vender 11 é bloqueada sem gravar', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 10, 10.8);
    const antes = await estado(app.page, 'BBAS3');
    const patrimonioAntes = await app.page.evaluate(() => cx().tC);
    await vender(app.page, 'BBAS3', 11, 15);
    assert.match(await app.page.locator('.quick-movement-modal').innerText(), /acima da posição/i, 'mensagem clara');
    const depois = await estado(app.page, 'BBAS3');
    assert.deepEqual(depois, antes, 'posição e lançamentos inalterados');
    assert.equal(await app.page.evaluate(() => cx().tC), patrimonioAntes, 'patrimônio inalterado');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM186 duas compras com preços diferentes: preço médio ponderado e venda parcial', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 4, 10);
    await comprar(app.page, 'BBAS3', 6, 12);
    const compra = await estado(app.page, 'BBAS3');
    assert.equal(compra.qty, 10);
    close(compra.avg, 11.2, 'preço médio = (4×10 + 6×12) / 10');
    await vender(app.page, 'BBAS3', 5, 13);
    await app.page.waitForFunction(() => S.aportes.some(item => item.operation === 'venda' && item.ticker === 'BBAS3'));
    const depois = await estado(app.page, 'BBAS3');
    assert.equal(depois.qty, 5);
    close(depois.avg, 11.2, 'preço médio preservado na venda parcial');
    close(depois.custo, 56, 'custo remanescente');
    close(depois.vendas[0].realizado, 9, 'resultado realizado = 65 − 56');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM186 venda repetida: mesma abertura do formulário não grava a venda duas vezes', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 10, 10.8);
    await vender(app.page, 'BBAS3', 4, 15);
    await app.page.waitForFunction(() => S.aportes.some(item => item.operation === 'venda' && item.ticker === 'BBAS3'));
    const chave = await app.page.evaluate(() => S.aportes.find(item => item.operation === 'venda' && item.ticker === 'BBAS3').opKey);
    assert.ok(chave, 'venda carrega chave de operação');
    // Simula o formulário ainda com a chave da venda já gravada (ex.: retry após recarga).
    const assetId = await app.page.evaluate(() => String(S.assets.find(item => item.ticker === 'BBAS3').id));
    await app.page.evaluate(() => openQuickMovement('venda'));
    await app.page.evaluate(k => { S.quickMovementDraft.nonce = k; }, chave);
    await app.page.selectOption('#qm-sale-asset', assetId);
    await app.page.locator('#qm-qty').fill('4');
    await app.page.locator('#qm-price').fill('15');
    await app.page.getByRole('button', { name: 'Confirmar venda' }).click();
    await app.page.waitForFunction(() => /Esta venda já foi registrada/.test(document.querySelector('.quick-movement-modal')?.innerText || ''));
    assert.equal((await estado(app.page, 'BBAS3')).vendas.length, 1, 'uma única venda gravada');
    assert.equal((await estado(app.page, 'BBAS3')).qty, 6, 'posição não reduzida duas vezes');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM186 recompra depois de zerar: posição nova usa só o histórico atual', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 10, 10.8);
    await vender(app.page, 'BBAS3', 10, 15);
    await app.page.waitForFunction(() => S.aportes.some(item => item.operation === 'venda' && item.ticker === 'BBAS3'));
    assert.equal(await app.page.evaluate(() => S.assets.some(item => item.ticker === 'BBAS3')), false, 'zerada');
    await comprar(app.page, 'BBAS3', 3, 11);
    const nova = await estado(app.page, 'BBAS3');
    assert.equal(nova.qty, 3);
    close(nova.avg, 11, 'preço médio da nova posição, sem custo antigo');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM186 venda com taxas e FII: custo e resultado líquidos de taxas', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'MXRF11', 10, 10);
    await vender(app.page, 'MXRF11', 4, 11, '2');
    await app.page.waitForFunction(() => S.aportes.some(item => item.operation === 'venda' && item.ticker === 'MXRF11'));
    const e = await estado(app.page, 'MXRF11');
    assert.equal(e.qty, 6);
    close(e.vendas[0].custoBaixado, 40, 'custo baixado');
    close(e.vendas[0].realizado, 44 - 2 - 40, 'resultado realizado líquido de taxas');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM186 posição legada não reconciliável: venda fica pendente com motivo, sem alterar quantidade', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => {
      S.aportes = [{ id: 'LEG1', ticker: 'ZZLEG3', qty: 5, price: 10, date: '2026-11-01', operation: 'compra', type: 'Ação' }];
      S.assets = [{ id: 'LEG_POS', ticker: 'ZZLEG3', type: 'Ação', qty: 5, avg_price: 10, current_price: 10 }];
      render();
    });
    await vender(app.page, 'ZZLEG3', 2, 12);
    await app.page.waitForFunction(() => S.aportes.some(item => item.operation === 'venda' && item.ticker === 'ZZLEG3'));
    const e = await estado(app.page, 'ZZLEG3');
    assert.equal(e.vendas[0].status, 'PENDING_RECONCILIATION', 'venda legada não é aplicada silenciosamente');
    assert.equal(e.qty, 5, 'quantidade preservada');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM186 falha de persistência na venda: nada gravado, posição íntegra', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 10, 10.8);
    const antes = await estado(app.page, 'BBAS3');
    await app.page.evaluate(() => { save = () => false; });
    await vender(app.page, 'BBAS3', 4, 15);
    await app.page.waitForFunction(() => /Erro ao salvar/.test(document.querySelector('.quick-movement-modal')?.innerText || ''));
    assert.deepEqual(await estado(app.page, 'BBAS3'), antes, 'sem venda parcial nem posição alterada');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM186 reexecução da sincronização após venda: resultado idêntico, sem duplicação', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 10, 10.8);
    await vender(app.page, 'BBAS3', 4, 15);
    await app.page.waitForFunction(() => S.aportes.some(item => item.operation === 'venda' && item.ticker === 'BBAS3'));
    const primeira = await estado(app.page, 'BBAS3');
    await app.page.evaluate(() => { syncAssetsFromAportes(false, false); syncAssetsFromAportes(false, false); });
    const segunda = await estado(app.page, 'BBAS3');
    assert.deepEqual(segunda, primeira, 'sincronização idempotente');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM186 arredondamento: 3 @ 10,10 e venda de 1 mantém precisão do custo', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 3, 10.1);
    await vender(app.page, 'BBAS3', 1, 10.3);
    await app.page.waitForFunction(() => S.aportes.some(item => item.operation === 'venda' && item.ticker === 'BBAS3'));
    const e = await estado(app.page, 'BBAS3');
    close(e.custo, 20.2, 'custo remanescente exato (2 × 10,10)');
    close(e.vendas[0].realizado, 10.3 - 10.1, 'resultado realizado exato');
  } finally { await closeApp(app); }
});
