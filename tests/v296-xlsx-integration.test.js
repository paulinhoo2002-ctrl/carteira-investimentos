const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');

const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const XLSX_FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'import-center', 'v296-synthetic-b3-movements.xlsx');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sheetJsTag = indexHtml.match(/<script src="(https:\/\/cdn\.jsdelivr\.net\/npm\/xlsx@0\.18\.5\/dist\/xlsx\.full\.min\.js)" integrity="(sha384-[^"]+)" crossorigin="anonymous"><\\\/script>/);
if (!sheetJsTag) throw new Error('Production SheetJS URL/SRI tag not found');
const [, sheetJsUrl, sheetJsIntegrity] = sheetJsTag;
async function createApp() {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => requests.push(request.url()));
  try {
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    await applyV289VisualFixture(page, 'baseline');
    const version = await page.evaluate(async ({ src, integrity }) => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.integrity = integrity;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(window.XLSX?.version || '');
      script.onerror = () => reject(new Error('Production SheetJS script failed SRI/runtime load'));
      document.head.appendChild(script);
    }), { src: sheetJsUrl, integrity: sheetJsIntegrity });
    assert.equal(version, '0.18.5', 'the exact production SheetJS runtime must execute in the browser');
    await page.getByRole('button', { name: 'Importar dados', exact: true }).click();
    await page.evaluate(() => {
      const active = activeWallet();
      const testWallet = { ...active, id: 'QA_WALLET_XLSX', name: 'Carteira sintética XLSX', assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals };
      const primaryWallet = { id: 'QA_WALLET_PRIMARY', name: 'Carteira principal sintética', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} };
      S.wallets = [primaryWallet, testWallet];
      S.activeWalletId = testWallet.id;
      window.__v296SaveCalls = 0;
      window.__v296OriginalSave = window.save;
      window.save = function (...args) {
        window.__v296SaveCalls += 1;
        return window.__v296OriginalSave.apply(this, args);
      };
      S.aportes.push({ id: 'QA_XLSX_EXISTING_DUPLICATE', date: '2026-09-15', ticker: 'QAAA3', qty: 2, price: 10, operation: 'compra' });
      window.__v296StorageBefore = JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
      window.__v296FinancialStateBefore = JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals });
      const originalRead = XLSX.read;
      XLSX.read = function (...args) { window.__v296XlsxReadCalls = (window.__v296XlsxReadCalls || 0) + 1; return originalRead.apply(this, args); };
      const originalSheetToJson = XLSX.utils.sheet_to_json;
      XLSX.utils.sheet_to_json = function (...args) { window.__v296SheetExtractionCalls = (window.__v296SheetExtractionCalls || 0) + 1; return originalSheetToJson.apply(this, args); };
    });
    return { browser, context, page, harness, errors, requests };
  } catch (error) {
    await browser.close();
    harness.server.closeAllConnections();
    harness.server.close();
    throw error;
  }
}

async function closeApp(app) {
  await app.browser.close();
  app.harness.server.closeAllConnections();
  app.harness.server.close();
}

function readSyntheticWorkbook() {
  const buffer = fs.readFileSync(XLSX_FIXTURE);
  assert.equal(buffer.subarray(0, 2).toString(), 'PK', 'fixture must be a ZIP-based XLSX workbook');
  assert.ok(buffer.length > 1000 && buffer.length < 50000, 'synthetic workbook should remain small');
  return buffer;
}

async function selectAndParse(app, file) {
  await app.page.locator('#import-center-file-input').setInputFiles(file);
  const selected = await app.page.evaluate(() => ({
    step: S.importCenterSession?.step,
    status: S.importCenterSession?.result?.status || null,
    fileName: S.importCenterSession?.files?.[0]?.name,
    saveCalls: window.__v296SaveCalls,
  }));
  assert.equal(selected.step, 2);
  assert.equal(selected.status, null, 'selection must not parse or imply commitment');
  assert.equal(selected.fileName, file.name);
  assert.equal(selected.saveCalls, 0);
  await app.page.getByRole('button', { name: 'Ler e abrir revisão' }).click();
  await app.page.waitForFunction(() => S.importCenterSession?.result?.status !== 'PARSING', null, { timeout: 15000 });
}

test('V296: browser loads production SheetJS CDN and decodes synthetic XLSX before protected confirmation', async () => {
  const app = await createApp();
  try {
    const workbook = readSyntheticWorkbook();
    await selectAndParse(app, {
      name: 'QA_XLSX_SYNTHETIC_movements_2026-09-17.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: workbook,
    });
    const preview = await app.page.evaluate(() => ({
      status: S.importCenterSession?.result?.status,
      sourceType: S.importCenterSession?.result?.sourceType,
      recordCount: S.importCenterSession?.result?.recordCount,
      confirmationRequired: S.importCenterSession?.result?.confirmationRequired,
      writeCount: S.importCenterSession?.result?.writeCount,
      readCalls: window.__v296XlsxReadCalls,
      sheetExtractions: window.__v296SheetExtractionCalls,
      items: S.b3MovementReview?.items || [],
      summary: b3MovementSummary(),
      saveCalls: window.__v296SaveCalls,
      storage: JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
      financialState: JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals }),
    }));
    assert.equal(preview.status, 'REVIEW_OPEN');
    assert.equal(preview.sourceType, 'B3_MOVEMENTS_XLSX');
    assert.equal(preview.recordCount, 2);
    assert.equal(preview.confirmationRequired, true);
    assert.equal(preview.writeCount, 0);
    assert.ok(preview.readCalls > 0, 'real XLSX.read must decode workbook bytes');
    assert.ok(preview.sheetExtractions > 0, 'real SheetJS worksheet extraction must run');
    assert.equal(preview.items.length, 2, 'the incomplete row must not become an accepted zero-valued record');
    assert.equal(preview.summary.duplicates, 1, 'existing synthetic duplicate must remain identified');
    assert.equal(preview.summary.count, 1, 'only the new eligible synthetic row may be selected');
    assert.equal(preview.saveCalls, 0, 'select, parse and preview must not call save');
    assert.equal(preview.storage, await app.page.evaluate(() => window.__v296StorageBefore));
    assert.equal(preview.financialState, await app.page.evaluate(() => window.__v296FinancialStateBefore));
    assert.ok(preview.items.every(item => !Object.hasOwn(item, 'tax') && !Object.hasOwn(item, 'currency') && !Object.hasOwn(item, 'authority')),
      'missing optional tax, currency and authority must remain absent');
    assert.match(await app.page.getByRole('dialog').innerText(), /QAFI11/);
    assert.match(await app.page.locator('.import-safety-result').innerText(), /Registros gravados\s+0/i);

    await app.page.evaluate(() => {
      window.__v296ConfirmCalls = 0;
      window.__v296ConfirmAnswer = false;
      window.confirm = message => { window.__v296ConfirmCalls += 1; window.__v296ConfirmMessage = String(message); return window.__v296ConfirmAnswer; };
    });
    await app.page.getByRole('dialog').getByRole('button', { name: 'Aplicar na carteira atual' }).last().click();
    const cancelled = await app.page.evaluate(() => ({
      confirmCalls: window.__v296ConfirmCalls,
      confirmMessage: window.__v296ConfirmMessage,
      saveCalls: window.__v296SaveCalls,
      storage: JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
      financialState: JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals }),
    }));
    assert.equal(cancelled.confirmCalls, 1, 'writer requires the existing explicit confirmation dialog');
    assert.match(cancelled.confirmMessage, /Confirmar aplicação/);
    assert.equal(cancelled.saveCalls, 0, 'declining confirmation must not save');
    assert.equal(cancelled.storage, await app.page.evaluate(() => window.__v296StorageBefore));
    assert.equal(cancelled.financialState, await app.page.evaluate(() => window.__v296FinancialStateBefore));

    await app.page.evaluate(() => { window.__v296ConfirmAnswer = true; });
    await app.page.getByRole('dialog').getByRole('button', { name: 'Aplicar na carteira atual' }).last().click();
    await app.page.waitForFunction(() => S.importCenterSession?.result?.status === 'IMPORTED', null, { timeout: 10000 });
    const applied = await app.page.evaluate(() => ({
      status: S.importCenterSession?.result?.status,
      writeCount: S.importCenterSession?.result?.writeCount,
      confirmCalls: window.__v296ConfirmCalls,
      saveCalls: window.__v296SaveCalls,
      activeWalletId: S.activeWalletId,
      aportes: S.aportes,
      newRecord: S.aportes.find(item => item.ticker === 'QAFI11'),
      otherState: JSON.stringify({ proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals }),
      storage: JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
    }));
    assert.equal(applied.status, 'IMPORTED');
    assert.equal(applied.writeCount, 1, 'only the new synthetic movement should be applied');
    assert.equal(applied.confirmCalls, 2);
    assert.ok(applied.saveCalls > 0, 'confirmed production writer must reach the existing save boundary');
    assert.equal(applied.activeWalletId, 'QA_WALLET_XLSX');
    assert.equal(applied.aportes.filter(item => item.ticker === 'QAAA3' && item.date === '2026-09-15').length, 1, 'duplicate must not be applied twice');
    assert.equal(applied.aportes.filter(item => item.ticker === 'QAFI11' && item.date === '16/09/2026').length, 1);
    assert.equal(applied.newRecord.qty, 1);
    assert.equal(applied.newRecord.price, 15);
    assert.equal(applied.newRecord.totalValue, 15);
    assert.ok(!Object.hasOwn(applied.newRecord, 'tax') && !Object.hasOwn(applied.newRecord, 'currency') && !Object.hasOwn(applied.newRecord, 'authority'),
      'unknown tax, currency and authority fields must remain absent after confirmation');
    assert.equal(applied.aportes.some(item => item.ticker === 'QAZZ3'), false, 'incomplete unknown row must not be written as zero');
    assert.equal(applied.otherState, await app.page.evaluate(() => JSON.stringify({ proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals })));
    assert.equal(applied.storage, await app.page.evaluate(() => window.__v296StorageBefore), 'testMode save must remain in-memory only');
    assert.deepEqual(app.requests.filter(url => /(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|firebaseio\.com|firebasestorage\.googleapis\.com)/i.test(url)), []);
    assert.deepEqual(app.errors, []);
  } finally {
    await closeApp(app);
  }
});

test('V296: malformed synthetic XLSX fails visibly without partial write', async () => {
  const app = await createApp();
  try {
    await app.page.evaluate(() => {
      window.__v296SaveCalls = 0;
      window.__v296OriginalSave = window.save;
      window.save = function (...args) { window.__v296SaveCalls += 1; return window.__v296OriginalSave.apply(this, args); };
      window.__v296StorageBefore = JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
      window.__v296FinancialStateBefore = JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals });
    });
    await app.page.getByRole('button', { name: 'Importar dados', exact: true }).click();
    await selectAndParse(app, { name: 'QA_XLSX_SYNTHETIC_malformed.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('PK\x03\x04synthetic invalid workbook') });
    const failed = await app.page.evaluate(() => ({
      status: S.importCenterSession?.result?.status,
      reason: S.importCenterSession?.result?.reason,
      error: S.importCenterSession?.result?.error?.message || '',
      readCalls: window.__v296XlsxReadCalls,
      saveCalls: window.__v296SaveCalls,
      pendingReview: Boolean(S.importCenterSession?.pendingReview),
      storage: JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
      financialState: JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals }),
      resultText: document.querySelector('.import-review-list')?.innerText || '',
    }));
    assert.equal(failed.status, 'FAILED');
    assert.equal(failed.reason, 'FILE_READ_OR_PARSE_FAILED');
    assert.ok(failed.readCalls > 0, 'malformed workbook must reach the real SheetJS decoder');
    assert.ok(failed.error, 'malformed XLSX error must remain observable');
    assert.equal(failed.pendingReview, false);
    assert.equal(failed.saveCalls, 0);
    assert.match(failed.resultText, /FAILED|FILE_READ_OR_PARSE_FAILED/);
    assert.equal(failed.storage, await app.page.evaluate(() => window.__v296StorageBefore));
    assert.equal(failed.financialState, await app.page.evaluate(() => window.__v296FinancialStateBefore));
    assert.deepEqual(app.requests.filter(url => /(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|firebaseio\.com|firebasestorage\.googleapis\.com)/i.test(url)), []);
    assert.deepEqual(app.errors, []);
  } finally {
    await closeApp(app);
  }
});
