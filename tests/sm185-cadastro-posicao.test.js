'use strict';
// SM185 — cadastro de posição sem depender do Yahoo: ações/FIIs do catálogo B3 local, cotação separada, sem lançamento fantasma.
// Dados sintéticos em memória (mesma sessão QA isolada das suítes premium): nenhuma escrita externa.
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
    const wallet = { ...active, id: 'SM185_QA_WALLET', name: 'Carteira sintética SM185', assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents };
    S.wallets = [{ id: 'SM185_QA_PRIMARY', name: 'Principal sintética', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} }, wallet];
    S.activeWalletId = wallet.id;
    S.assets = []; S.aportes = []; S.proventos = []; S.rfEvents = [];
    wallet.assets = S.assets; wallet.aportes = S.aportes; wallet.proventos = S.proventos; wallet.rfEvents = S.rfEvents;
    // Yahoo indisponível: nenhuma consulta de cotação acontece no teste.
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
}
const posicao = (page, ticker) => page.evaluate(symbol => {
  const p = S.assets.find(item => item.ticker === symbol);
  return p ? { qty: Number(p.qty), avg: Number(p.avg_price), current: Number(p.current_price), source: p.position_source, coverage: p.history_coverage, quoteStatus: p.quoteStatus || null } : null;
}, ticker);
const lancamentos = (page, ticker) => page.evaluate(symbol => S.aportes.filter(item => item.ticker === symbol).map(item => ({ op: item.operation, qty: Number(item.qty), price: Number(item.price), status: item.reconciliationStatus || null })), ticker);

it('SM185 1 e 5: compra de ação do catálogo sem Yahoo cria posição com preço informado', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 4, 10.5);
    await app.page.waitForFunction(() => S.assets.some(item => item.ticker === 'BBAS3'));
    const p = await posicao(app.page, 'BBAS3');
    assert.deepEqual({ qty: p.qty, avg: p.avg, source: p.source, coverage: p.coverage }, { qty: 4, avg: 10.5, source: 'LEDGER', coverage: 'UNPROVEN' });
    assert.equal(p.quoteStatus, 'ERROR', 'sem cotação = Fonte indisponível');
    assert.deepEqual(await lancamentos(app.page, 'BBAS3'), [{ op: 'compra', qty: 4, price: 10.5, status: null }], 'um único lançamento');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM185 2: compra de FII do catálogo sem Yahoo cria posição', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'MXRF11', 10, 10);
    await app.page.waitForFunction(() => S.assets.some(item => item.ticker === 'MXRF11'));
    const p = await posicao(app.page, 'MXRF11');
    assert.deepEqual({ qty: p.qty, avg: p.avg, source: p.source }, { qty: 10, avg: 10, source: 'LEDGER' });
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM185 3, 5, 6, 7: compra adicional recalcula quantidade, preço médio e custo', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 4, 10.5);
    await app.page.waitForFunction(() => S.assets.some(item => item.ticker === 'BBAS3'));
    await comprar(app.page, 'BBAS3', 6, 11);
    await app.page.waitForFunction(() => S.aportes.filter(item => item.ticker === 'BBAS3').length === 2);
    const p = await posicao(app.page, 'BBAS3');
    assert.equal(p.qty, 10, 'quantidade final');
    assert.ok(Math.abs(p.avg - 10.8) < 1e-9, `preço médio ponderado (obtido ${p.avg})`);
    const custo = await app.page.evaluate(() => S.assets.find(item => item.ticker === 'BBAS3').qty * S.assets.find(item => item.ticker === 'BBAS3').avg_price);
    assert.ok(Math.abs(custo - 108) < 1e-9, 'custo de aquisição');
    assert.equal(await app.page.evaluate(() => cx().tC), 108, 'patrimônio a custo sem cotação, sem resultado inventado');
    assert.equal(await app.page.evaluate(() => cx().tG), 0, 'resultado zero apenas porque não há cotação; não é ganho real');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM185 4 (parcial): venda é validada contra a posição e fica pendente de conciliação, sem mover a quantidade', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 10, 10.8);
    await app.page.waitForFunction(() => S.assets.some(item => item.ticker === 'BBAS3'));
    const assetId = await app.page.evaluate(() => String(S.assets.find(item => item.ticker === 'BBAS3').id));
    await app.page.evaluate(() => openQuickMovement('venda'));
    await app.page.selectOption('#qm-sale-asset', assetId);
    await app.page.locator('#qm-qty').fill('11');
    await app.page.locator('#qm-price').fill('12');
    await app.page.getByRole('button', { name: 'Confirmar venda' }).click();
    assert.match(await app.page.locator('.quick-movement-modal').innerText(), /acima da posição/i, 'venda acima da posição é recusada');
    assert.equal((await lancamentos(app.page, 'BBAS3')).length, 1, 'recusa não grava (só a compra existente)');
    await app.page.locator('#qm-qty').fill('3');
    await app.page.getByRole('button', { name: 'Confirmar venda' }).click();
    await app.page.waitForFunction(() => S.aportes.some(item => item.ticker === 'BBAS3' && item.operation === 'venda'));
    const vendas = (await lancamentos(app.page, 'BBAS3')).filter(item => item.op === 'venda');
    assert.deepEqual(vendas, [{ op: 'venda', qty: 3, price: 12, status: 'LEDGER_RECONCILED' }]);
    // SM186: venda aplicada reduz quantidade; resultado realizado = 3 × 12 − 3 × 10,80 = 3,60.
    assert.equal((await posicao(app.page, 'BBAS3')).qty, 7, 'quantidade após venda de 3');
    assert.ok(Math.abs(await app.page.evaluate(() => S.aportes.find(a => a.operation === 'venda' && a.ticker === 'BBAS3').realizedResult) - 3.6) < 1e-9, 'resultado realizado');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM185 8, 9: cotação indisponível fica explícita e a recuperação preserva cotação e fonte', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 4, 10.5);
    await app.page.waitForFunction(() => S.assets.some(item => item.ticker === 'BBAS3'));
    assert.equal(await app.page.evaluate(() => quoteTrustMeta(S.assets.find(item => item.ticker === 'BBAS3')).label), 'Fonte indisponível');
    // Recuperação: cotação chega, nova sincronização não pode apagar a cotação nem voltar ao estado de indisponível.
    await app.page.evaluate(() => {
      const asset = S.assets.find(item => item.ticker === 'BBAS3');
      asset.current_price = 11; asset.quoteStatus = 'FRESH';
      syncAssetsFromAportes(false, false);
    });
    const p = await posicao(app.page, 'BBAS3');
    assert.equal(p.current, 11, 'cotação recuperada preservada');
    assert.equal(p.quoteStatus, 'FRESH', 'fonte recuperada preservada');
    assert.equal(await app.page.evaluate(() => cx().tC), 44, 'patrimônio usa a cotação recuperada');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM185 10, 11: ticker inexistente e ausente do catálogo são recusados com mensagens distintas, sem gravar', async () => {
  const app = await openApp();
  try {
    const antes = await app.page.evaluate(() => ({ aportes: S.aportes.length, assets: S.assets.length }));
    await comprar(app.page, 'ZZNX3', 4, 10.5);
    await app.page.waitForFunction(() => /Código não encontrado no catálogo B3 local/.test(document.querySelector('.quick-movement-modal')?.innerText || ''));
    await app.page.locator('.quick-movement-modal button', { hasText: 'Cancelar' }).click();
    // Formato inválido de verdade (sem dígito): mensagem de formato, não de catálogo.
    await comprar(app.page, 'BBAS', 4, 10.5);
    await app.page.waitForFunction(() => /Ativo não reconhecido/.test(document.querySelector('.quick-movement-modal')?.innerText || ''));
    await app.page.locator('.quick-movement-modal button', { hasText: 'Cancelar' }).click();
    assert.deepEqual(await app.page.evaluate(() => ({ aportes: S.aportes.length, assets: S.assets.length })), antes, 'nada gravado');
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM185 12: falha de gravação local reverte a compra sem estado parcial', async () => {
  const app = await openApp();
  try {
    const antes = await app.page.evaluate(() => ({ aportes: S.aportes.length, assets: S.assets.length }));
    await app.page.evaluate(() => { save = () => false; });
    await comprar(app.page, 'BBAS3', 4, 10.5);
    await app.page.waitForFunction(() => /Erro ao salvar/.test(document.querySelector('.quick-movement-modal')?.innerText || ''));
    assert.deepEqual(await app.page.evaluate(() => ({ aportes: S.aportes.length, assets: S.assets.length })), antes, 'sem lançamento nem posição parcial');
    assert.equal(await app.page.evaluate(() => S.aportes.some(item => item.ticker === 'BBAS3')), false);
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});

it('SM185 15: sem duplicação, sem lançamento órfão e posição consistente com o ledger', async () => {
  const app = await openApp();
  try {
    await comprar(app.page, 'BBAS3', 4, 10.5);
    await app.page.waitForFunction(() => S.assets.some(item => item.ticker === 'BBAS3'));
    await comprar(app.page, 'MXRF11', 10, 10);
    await app.page.waitForFunction(() => S.assets.some(item => item.ticker === 'MXRF11'));
    const consistencia = await app.page.evaluate(() => ['BBAS3', 'MXRF11'].map(symbol => {
      const compras = S.aportes.filter(item => item.ticker === symbol);
      const qtyLedger = compras.reduce((s, item) => s + Number(item.qty), 0);
      const asset = S.assets.find(item => item.ticker === symbol);
      return { symbol, lancamentos: compras.length, qtyLedger, qtyPosicao: asset ? Number(asset.qty) : null };
    }));
    assert.deepEqual(consistencia, [
      { symbol: 'BBAS3', lancamentos: 1, qtyLedger: 4, qtyPosicao: 4 },
      { symbol: 'MXRF11', lancamentos: 1, qtyLedger: 10, qtyPosicao: 10 },
    ]);
    assert.deepEqual(app.problems, []);
  } finally { await closeApp(app); }
});
