// M568 — E2E sintético do fluxo "Editar provento" (editDividendReceipt → svD / clD).
// Cobertura que faltava à M567: registrar ✓ (v317), excluir ✓ (m567/rmD), editar ✗.
// Isolamento: carteira sintética, zero escritas externas, localStorage preservado.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.join(__dirname, '..');
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
  await page.waitForFunction(() => typeof S !== 'undefined' && Array.isArray(S.proventos) && typeof go === 'function');
  await page.evaluate(() => {
    restoreLocalTestData();
    fetchQuotes = async () => {};
    scheduleAutoProventosGratis = () => {};
    const active = activeWallet();
    const testWallet = { ...active, id: 'M568_QA_WALLET', name: 'Carteira sintética M568', assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals };
    const primaryWallet = { id: 'M568_QA_PRIMARY', name: 'Carteira principal sintética', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} };
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

it('M568 editar provento salva valor e tipo com uma única persistência', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => {
      S.proventos.push({ id: 'M568_PR1', date: '10/09/2026', ticker: 'M568QA', value: 5.2, type: 'Dividendo' });
      go('dividendos');
    });
    const storageBefore = await app.page.evaluate(() => localStorage.getItem('civ5'));
    await app.page.evaluate(() => { window.__m568SaveCalls = 0; const original = window.save; window.save = function (...args) { window.__m568SaveCalls += 1; return original.apply(this, args); }; });
    await app.page.evaluate(() => editDividendReceipt('M568_PR1'));
    await app.page.locator('.fc #d-ti, #d-ti').first().waitFor({ state: 'visible', timeout: 5000 });
    const before = await app.page.evaluate(() => {
      const p = S.proventos.find(x => x.id === 'M568_PR1');
      return { value: Number(p.value), type: p.type, ticker: p.ticker, editId: S.editDId };
    });
    assert.equal(before.editId, 'M568_PR1', 'modal de edição deve referenciar o provento');
    await app.page.locator('#d-va').fill('9,90');
    await app.page.locator('#d-ty').selectOption({ label: 'JCP' });
    await app.page.evaluate(() => svD());
    await app.page.waitForFunction(() => S.showD === false);
    const after = await app.page.evaluate(() => {
      const p = S.proventos.find(x => x.id === 'M568_PR1');
      return { value: Number(p.value), type: p.type, ticker: p.ticker, saves: window.__m568SaveCalls };
    });
    assert.equal(after.value, 9.9, 'valor editado deve persistir em memória');
    assert.equal(after.type, 'JCP', 'tipo editado deve persistir em memória');
    assert.equal(after.ticker, before.ticker, 'ticker não alterado não deve mudar');
    assert.equal(after.saves, 1, 'edição confirmada persiste uma única vez');
    assert.equal(await app.page.evaluate(() => localStorage.getItem('civ5')), storageBefore, 'sessão QA não toca armazenamento persistido');
    const writes = app.outboundRequests.filter(r => r.type === 'blocked-request' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method));
    assert.deepEqual(writes, [], 'nenhuma escrita externa');
  } finally { await closeApp(app); }
});

it('M568 cancelar edição de provento preserva o original', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => {
      S.proventos.push({ id: 'M568_PR2', date: '11/09/2026', ticker: 'M568QA', value: 3.3, type: 'Dividendo' });
      go('dividendos');
    });
    await app.page.evaluate(() => editDividendReceipt('M568_PR2'));
    await app.page.locator('#d-va').waitFor({ state: 'visible', timeout: 5000 });
    await app.page.locator('#d-va').fill('777');
    await app.page.evaluate(() => clD());
    await app.page.waitForFunction(() => S.showD === false);
    const unchanged = await app.page.evaluate(() => {
      const p = S.proventos.find(x => x.id === 'M568_PR2');
      return { value: Number(p.value), type: p.type };
    });
    assert.deepEqual(unchanged, { value: 3.3, type: 'Dividendo' }, 'cancelar não aplica alterações');
    const writes = app.outboundRequests.filter(r => r.type === 'blocked-request' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method));
    assert.deepEqual(writes, [], 'nenhuma escrita externa');
  } finally { await closeApp(app); }
});
