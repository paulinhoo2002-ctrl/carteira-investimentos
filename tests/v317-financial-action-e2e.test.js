const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.join(__dirname, '..');
// M568: browsers em npm test no CI rodam ANTES da etapa "Resolve Chromium" do workflow —
// resolver por env, depois paths conhecidos (Windows local, Linux CI); sem browser, skip
// graceful em vez de travar o runner com servidores HTTP vazados.
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
];
const CHROME = process.env.CHROME_PATH || CHROME_CANDIDATES.find(p => fs.existsSync(p)) || CHROME_CANDIDATES[0];
const BROWSER_AVAILABLE = Boolean(process.env.CHROME_PATH) || fs.existsSync(CHROME);
const it = BROWSER_AVAILABLE ? test : test.skip;

async function openApp() {
  const harness = await startLocalHttpServer(ROOT);
  let browser;
  try {
    browser = await chromium.launch({ executablePath: CHROME, headless: true });
  } catch (error) {
    await new Promise(resolve => harness.server.close(resolve));
    throw error;
  }
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

it('compra sintética altera apenas sessão QA e não persiste dados financeiros', async () => {
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

it('cancelar compra sintética deixa histórico financeiro igual antes e depois da recarga', async () => {
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

it('falha de persistência reverte compra e mantém revisão visível', async () => {
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

it('Import Center lê CSV sintético e cancelar revisão não grava', async () => {
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

it('venda sintética confirmada atualiza o ledger sem writes externos', async () => {
  const app = await openApp();
  try {
    app.page.on('dialog', dialog => dialog.accept());
    const storageBefore = await app.page.evaluate(() => localStorage.getItem('civ5'));
    await app.page.evaluate(() => { fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });
    await app.page.evaluate(() => openQuickMovement('venda'));
    const options = await app.page.locator('#qm-sale-asset option').count();
    assert.ok(options > 1, 'fixture deve conter posição vendável');
    await app.page.selectOption('#qm-sale-asset', { index: 1 });
    const ticker = await app.page.evaluate(() => S.quickMovementDraft.ticker);
    await app.page.locator('#qm-qty').fill('1');
    await app.page.locator('#qm-price').fill('20');
    await app.page.getByRole('button', { name: 'Confirmar venda' }).click();
    await app.page.waitForFunction(symbol => S.aportes.some(item => item.operation === 'venda' && item.ticker === symbol), ticker);
    const sale = await app.page.evaluate(symbol => S.aportes.find(item => item.operation === 'venda' && item.ticker === symbol), ticker);
    assert.equal(Number(sale.qty), 1);
    assert.equal(Number(sale.price), 20);
    assert.equal(await app.page.evaluate(() => localStorage.getItem('civ5')), storageBefore);
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('aplicação e resgate parciais RF sintéticos preservam eventos e isolamento local', async () => {
  const app = await openApp();
  try {
    app.page.on('dialog', dialog => dialog.accept());
    const storageBefore = await app.page.evaluate(() => localStorage.getItem('civ5'));
    await app.page.evaluate(() => { fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });
    await app.page.evaluate(() => openQuickMovement('renda-fixa'));
    await app.page.getByRole('tab', { name: 'Novo título' }).click();
    await app.page.locator('#qm-rf-name').fill('CDB QA sintético 2028');
    await app.page.locator('#qm-rf-subtype').selectOption('CDB');
    await app.page.locator('#qm-rf-app-date').fill('2026-06-01');
    await app.page.locator('#qm-rf-due').fill('2028-06-01');
    await app.page.locator('#qm-rf-applied').fill('1000');
    await app.page.locator('.quick-movement-modal button.btn.bsv').click();
    await app.page.waitForFunction(() => S.assets.some(asset => asset.name === 'CDB QA sintético 2028'));
    const asset = await app.page.evaluate(() => {
      const found = S.assets.find(item => item.name === 'CDB QA sintético 2028');
      return found ? { id: rfAssetEventId(found), type: found.type, applied: Number(found.rf_applied_value || found.appliedValue || 0) } : null;
    });
    assert.ok(asset?.id, 'a aplicação deve criar um título RF sintético identificável');
    assert.match(asset.type, /Renda Fixa/i);
    const eventsBefore = await app.page.evaluate(() => S.rfEvents.length);

    await app.page.evaluate(id => { go('renda-fixa'); openRfMovementEditor(id, 'aporte'); }, asset.id);
    await app.page.locator('.rf-event-editor').waitFor({ state: 'visible', timeout: 5000 }).catch(async error => {
      const state = await app.page.evaluate(id => ({ id, found: Boolean(getRfAssetByEventId(id)), editor: S.rfMovementEditor, quickOpen: S.quickMovementOpen, tab: S.tab }), asset.id);
      assert.fail(`RF movement editor not rendered: ${JSON.stringify(state)}; ${error.message}`);
    });
    await app.page.locator('.rf-event-editor input[aria-label="Data da movimentação"]').fill('2026-07-01');
    const principalInput = app.page.locator('.rf-event-editor input[aria-label="Valor do principal movimentado"]');
    await principalInput.fill('100');
    await principalInput.press('Tab');
    const firstRfSave = app.page.getByRole('button', { name: 'Salvar movimentação' });
    assert.equal(await firstRfSave.isEnabled(), true, `RF aporte incompleto: ${JSON.stringify(await app.page.evaluate(() => S.rfMovementEditor?.draft))}`);
    await firstRfSave.click();
    await app.page.waitForFunction(count => S.rfEvents.length > count, eventsBefore);
    const afterApplication = await app.page.evaluate(id => ({
      balance: rfPrincipalBalance(getRfAssetByEventId(id)).value,
      event: S.rfEvents.find(item => item.assetId === id && item.date === '2026-07-01'),
    }), asset.id);
    assert.equal(afterApplication.balance, 1100);
    assert.equal(afterApplication.event?.type, 'aporte');
    assert.equal(afterApplication.event?.principalDelta, 100);

    const redeemEventsBefore = await app.page.evaluate(() => S.rfEvents.length);
    await app.page.evaluate(id => openRfMovementEditor(id, 'resgate_parcial'), asset.id);
    await app.page.locator('.rf-event-editor').waitFor({ state: 'visible', timeout: 5000 }).catch(async error => {
      const state = await app.page.evaluate(id => ({ id, found: Boolean(getRfAssetByEventId(id)), editor: S.rfMovementEditor, tab: S.tab }), asset.id);
      assert.fail(`RF redemption editor not rendered: ${JSON.stringify(state)}; ${error.message}`);
    });
    await app.page.locator('.rf-event-editor input[aria-label="Data da movimentação"]').fill('2026-08-01');
    const redemptionPrincipal = app.page.locator('.rf-event-editor input[aria-label="Valor do principal movimentado"]');
    await redemptionPrincipal.fill('200');
    await redemptionPrincipal.press('Tab');
    await app.page.locator('.rf-event-editor input[aria-label="Valor bruto da movimentação"]').fill('200');
    await app.page.locator('.rf-event-editor input[aria-label="Valor líquido da movimentação"]').fill('200');
    const redemptionSave = app.page.getByRole('button', { name: 'Confirmar resgate' });
    assert.equal(await redemptionSave.isEnabled(), true, `RF resgate incompleto: ${JSON.stringify(await app.page.evaluate(() => S.rfMovementEditor?.draft))}`);
    await redemptionSave.click();
    await app.page.waitForFunction(count => S.rfEvents.length > count, redeemEventsBefore);
    const afterRedemption = await app.page.evaluate(id => ({
      balance: rfPrincipalBalance(getRfAssetByEventId(id)).value,
      event: S.rfEvents.find(item => item.assetId === id && item.date === '2026-08-01'),
    }), asset.id);
    assert.equal(afterRedemption.balance, 900);
    assert.equal(afterRedemption.event.type, 'resgate_parcial');
    assert.equal(afterRedemption.event.principalDelta, -200);
    assert.equal(afterRedemption.event.grossValue, 200);
    assert.equal(afterRedemption.event.netValue, 200);
    assert.equal(await app.page.evaluate(() => localStorage.getItem('civ5')), storageBefore);
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('registro e cancelamento de provento sintético alteram somente a sessão QA', async () => {
  const app = await openApp();
  try {
    const storageBefore = await app.page.evaluate(() => localStorage.getItem('civ5'));
    const before = await app.page.evaluate(() => S.proventos.length);
    await app.page.evaluate(() => openQuickMovement('provento'));
    await app.page.locator('#qm-dt').fill('2026-09-30');
    await app.page.locator('#qm-ti').fill('QASYN3');
    await app.page.locator('#qm-value').fill('5,20');
    await app.page.locator('#qm-event').selectOption({ label: 'Dividendo' });
    await app.page.getByRole('button', { name: 'Registrar provento' }).click();
    await app.page.waitForFunction(() => S.proventos.some(item => item.ticker === 'QASYN3'));
    const received = await app.page.evaluate(() => S.proventos.find(item => item.ticker === 'QASYN3'));
    assert.equal(Number(received.value), 5.2);
    assert.equal(received.type, 'Dividendo');
    assert.equal(await app.page.evaluate(() => localStorage.getItem('civ5')), storageBefore);

    await app.page.evaluate(() => openQuickMovement('provento'));
    await app.page.locator('#qm-ti').fill('QACANCEL3');
    await app.page.locator('#qm-value').fill('9,90');
    await app.page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(await app.page.evaluate(() => S.proventos.length), before + 1);
    assert.equal(await app.page.evaluate(() => S.proventos.some(item => item.ticker === 'QACANCEL3')), false);
    assert.equal(await app.page.evaluate(() => localStorage.getItem('civ5')), storageBefore);
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});
