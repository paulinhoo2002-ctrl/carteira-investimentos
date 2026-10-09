const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function openApp() {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const outboundRequests = [];
  const localOrigin = new URL(harness.url).origin;
  page.on('pageerror', error => outboundRequests.push({ type: 'pageerror', message: error.message }));
  await page.route('**/*', async route => {
    const request = route.request();
    if (new URL(request.url()).origin === localOrigin) return route.continue();
    outboundRequests.push({ type: 'blocked-request', method: request.method(), url: request.url() });
    return route.abort();
  });
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && Array.isArray(S.aportes) && typeof go === 'function');
  await page.evaluate(() => {
    restoreLocalTestData();
    const active = activeWallet();
    const testWallet = { ...active, id: 'V317_QA_WALLET', name: 'Carteira sintética V317', assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals };
    const primaryWallet = { id: 'V317_QA_PRIMARY', name: 'Carteira principal sintética', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} };
    S.wallets = [primaryWallet, testWallet];
    S.activeWalletId = testWallet.id;
  });
  return { browser, context, page, harness, outboundRequests };
}

async function closeApp(app) {
  await app.context.close();
  await app.browser.close();
  await new Promise(resolve => app.harness.server.close(resolve));
}

async function fillPurchase(page, ticker) {
  const state = await page.evaluate(() => {
    openQuickMovement('compra');
    return { open: S.quickMovementOpen, tab: S.tab, modalCount: document.querySelectorAll('.quick-movement-modal').length };
  });
  assert.equal(state.open, true, `quick movement action did not open: ${JSON.stringify(state)}`);
  try {
    await page.locator('.quick-movement-modal').waitFor({ state: 'visible', timeout: 5000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      tab: S.tab,
      owner: isEditOwner(),
      testMode: isLocalTestMode(),
      protectedQa: isProtectedReadOnlyQaBoot(),
      quarantine: S._financialWriteQuarantined === true,
      body: document.body.innerText.slice(0, 1000),
      errors: window.__errors || [],
    }));
    throw new Error(`QUICK_MOVEMENT_MODAL_MISSING:${JSON.stringify(diagnostics)}; ${error.message}`);
  }
  await page.locator('#qm-ti').fill(ticker);
  await page.locator('#qm-qty').fill('2');
  await page.locator('#qm-price').fill('10,25');
}

function assertNoOutboundWrites(outboundRequests) {
  const writes = outboundRequests.filter(request =>
    request.type === 'blocked-request' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  );
  assert.deepEqual(writes, [], 'nenhuma escrita deve sair do navegador isolado');
}

test('compra sintética altera apenas sessão QA e não persiste dados financeiros', async () => {
  const app = await openApp();
  try {
    const storageBefore = await app.page.evaluate(() => localStorage.getItem('civ5'));
    await fillPurchase(app.page, 'V317QA');
    await app.page.evaluate(() => {
      window.__v317SaveCalls = 0;
      const originalSave = window.save;
      window.save = function (...args) { window.__v317SaveCalls += 1; return originalSave.apply(this, args); };
    });
    await app.page.locator('.quick-movement-modal button.btn.bsv').click();
    await app.page.waitForFunction(() => S.aportes.some(item => item.ticker === 'V317QA'));
    const afterSave = await app.page.evaluate(() => S.aportes.filter(item => item.ticker === 'V317QA').map(item => ({
      operation: item.operation,
      qty: Number(item.qty),
      price: Number(item.price),
    })));
    assert.deepEqual(afterSave, [{ operation: 'compra', qty: 2, price: 10.25 }]);
    assert.equal(await app.page.evaluate(() => localStorage.getItem('civ5')), storageBefore);
    assert.equal(await app.page.evaluate(() => window.__v317SaveCalls), 1, 'uma compra confirmada deve persistir uma única vez');
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

test('cancelar compra sintética deixa histórico financeiro igual antes e depois da recarga', async () => {
  const app = await openApp();
  try {
    const before = await app.page.evaluate(() => S.aportes.length);
    await fillPurchase(app.page, 'V317CANCEL');
    await app.page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await app.page.locator('.quick-movement-modal').waitFor({ state: 'detached' });
    assert.equal(await app.page.evaluate(() => S.aportes.length), before);
    assert.equal(await app.page.evaluate(() => S.aportes.some(item => item.ticker === 'V317CANCEL')), false);

    await app.page.reload({ waitUntil: 'domcontentloaded' });
    await app.page.waitForFunction(() => Array.isArray(S.aportes));
    assert.equal(await app.page.evaluate(() => S.aportes.length), before);
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

test('falha de persistência reverte compra e mantém revisão visível', async () => {
  const app = await openApp();
  try {
    const before = await app.page.evaluate(() => S.aportes.length);
    await fillPurchase(app.page, 'V317FAIL');
    await app.page.evaluate(() => { save = () => false; });
    await app.page.locator('.quick-movement-modal button.btn.bsv').click();
    await app.page.locator('.quick-movement-modal').waitFor({ state: 'visible' });
    assert.match(await app.page.locator('.quick-movement-modal').innerText(), /Erro ao salvar/i);
    assert.equal(await app.page.evaluate(() => S.aportes.length), before);
    assert.equal(await app.page.evaluate(() => S.aportes.some(item => item.ticker === 'V317FAIL')), false);
    assert.equal(await app.page.evaluate(() => S._financialWriteQuarantined), true);
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

test('Import Center lê CSV sintético e cancelar revisão não grava', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => S.aportes.push({ id: 'V317_SEEDED_DUPLICATE', date: '15/09/2026', ticker: 'SYNTH3', qty: 2, price: 10, operation: 'compra' }));
    const before = await app.page.evaluate(() => ({
      aportes: S.aportes.length,
      proventos: S.proventos.length,
      targetCount: S.aportes.filter(item => item.ticker === 'ZQXV3' && item.date === '16/09/2026').length,
    }));
    await app.page.evaluate(() => go('importacao'));
    await app.page.locator('.import-center-shell').waitFor({ state: 'visible' });
    const fixture = Buffer.from('Entrada/Saída,Data,Movimentação,Produto,Quantidade,Preço unitário,Valor da Operação,Instituição\nEntrada,15/09/2026,Compra,SYNTH3,2,"10,00","20,00",B3\nEntrada,16/09/2026,Compra,ZQXV3,1,"15,00","15,00",B3\n', 'utf8');
    await app.page.locator('#import-center-file-input').setInputFiles({
      name: 'v317-synthetic-movement.csv',
      mimeType: 'text/csv',
      buffer: fixture,
    });
    await app.page.evaluate(() => {
      const parseCsv = text => String(text).trim().split(/\r?\n/).map(line => {
        const cells = [];
        let value = '';
        let quoted = false;
        for (let index = 0; index < line.length; index += 1) {
          const char = line[index];
          if (char === '"') {
            if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
            else quoted = !quoted;
          } else if (char === ',' && !quoted) { cells.push(value); value = ''; }
          else value += char;
        }
        cells.push(value);
        return cells.map(cell => cell === '' ? null : cell);
      });
      window.XLSX = {
        read: text => ({ SheetNames: ['Movimentacao'], Sheets: { Movimentacao: { rows: parseCsv(text) } } }),
        utils: { sheet_to_json: sheet => sheet.rows },
      };
    });
    await app.page.getByRole('button', { name: 'Ler e abrir revisão' }).click();
    const review = app.page.locator('.note-overlay[role="dialog"]');
    await app.page.waitForFunction(() => S.importCenterSession?.result?.status !== 'PARSING', null, { timeout: 10000 });
    assert.equal(await app.page.evaluate(() => S.importCenterSession.result.status), 'REVIEW_OPEN');
    await review.waitFor({ state: 'visible', timeout: 3000 });
    assert.match(await review.innerText(), /SYNTH3/);
    assert.deepEqual(await app.page.evaluate(() => ({ aportes: S.aportes.length, proventos: S.proventos.length })), { aportes: before.aportes, proventos: before.proventos });

    await review.getByRole('button', { name: 'Cancelar', exact: true }).first().click();
    await review.waitFor({ state: 'detached' });
    assert.deepEqual(await app.page.evaluate(() => ({ aportes: S.aportes.length, proventos: S.proventos.length })), { aportes: before.aportes, proventos: before.proventos });
    assert.equal(await app.page.evaluate(() => S.importCenterSession.result.status), 'CANCELLED');

    await app.page.evaluate(() => { importCenterReset(); window.__v317ConfirmCalls = 0; window.confirm = () => { window.__v317ConfirmCalls += 1; return true; }; });
    await app.page.locator('#import-center-file-input').setInputFiles({
      name: 'v317-synthetic-movement.csv', mimeType: 'text/csv', buffer: fixture,
    });
    await app.page.getByRole('button', { name: 'Ler e abrir revisão' }).click();
    await app.page.waitForFunction(() => S.importCenterSession?.result?.status !== 'PARSING', null, { timeout: 10000 });
    const secondReview = app.page.locator('.note-overlay[role="dialog"]');
    await secondReview.waitFor({ state: 'visible', timeout: 3000 });
    await secondReview.getByRole('button', { name: 'Aplicar na carteira atual' }).last().click();
    await app.page.waitForFunction(() => S.importCenterSession?.result?.status === 'IMPORTED', null, { timeout: 10000 });
    const applied = await app.page.evaluate(() => ({
      newTickerCount: S.aportes.filter(item => item.ticker === 'ZQXV3' && item.date === '16/09/2026').length,
      confirmCalls: window.__v317ConfirmCalls,
      result: S.importCenterSession.result,
    }));
    assert.equal(applied.newTickerCount, before.targetCount + 1);
    assert.ok(applied.confirmCalls >= 1);
    assert.equal(applied.result.writeCount, 1);

    await app.page.evaluate(() => importCenterReset());
    await app.page.locator('#import-center-file-input').setInputFiles({
      name: 'v317-synthetic-movement-repeat.csv', mimeType: 'text/csv', buffer: fixture,
    });
    await app.page.getByRole('button', { name: 'Ler e abrir revisão' }).click();
    await app.page.waitForFunction(() => S.importCenterSession?.result?.status !== 'PARSING', null, { timeout: 10000 });
    const replay = await app.page.evaluate(() => ({
      status: S.importCenterSession.result.status,
      summary: b3MovementSummary(),
      newTickerCount: S.aportes.filter(item => item.ticker === 'ZQXV3' && item.date === '16/09/2026').length,
    }));
    assert.equal(replay.status, 'REVIEW_OPEN');
    assert.ok(replay.summary.duplicates >= 2, 'ambas as linhas já gravadas devem ser identificadas como duplicadas');
    assert.equal(replay.summary.count, 0);
    assert.equal(replay.newTickerCount, before.targetCount + 1);
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});
