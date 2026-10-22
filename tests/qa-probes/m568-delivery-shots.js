// M568 — capturas de entrega: Dashboard mobile claro, Relatórios mobile escuro, Metas mobile claro, RF desktop claro.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'tests', '.qa-state', 'm568');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const SHOTS = [
  { route: 'dashboard', theme: 'light', w: 390, h: 844, name: 'm568-dashboard-390-light' },
  { route: 'relatorios', theme: 'dark', w: 390, h: 844, name: 'm568-relatorios-390-dark' },
  { route: 'metas', theme: 'light', w: 390, h: 844, name: 'm568-metas-390-light' },
  { route: 'renda-fixa', theme: 'light', w: 1366, h: 768, name: 'm568-renda-fixa-1366-light' },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const localOrigin = new URL(harness.url).origin;
  await page.route('**/*', r => (new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort()));
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && Array.isArray(S.aportes) && typeof go === 'function');
  await page.evaluate(() => {
    restoreLocalTestData();
    fetchQuotes = async () => {};
    scheduleAutoProventosGratis = () => {};
    const active = activeWallet();
    const testWallet = { ...active, id: 'M568_QA_WALLET', name: 'Carteira sintética M568', assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals };
    const primaryWallet = { id: 'M568_QA_PRIMARY', name: 'Carteira principal sintética', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} };
    S.wallets = [primaryWallet, testWallet];
    S.activeWalletId = testWallet.id;
    S.hideValues = false;
  });
  for (const s of SHOTS) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.evaluate(({ route, theme }) => { applyTheme(theme); go(route); }, s);
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(OUT, `${s.name}.png`) });
    console.log('captured', s.name);
  }
  await browser.close();
  await new Promise(res => harness.server.close(res));
})().catch(e => { console.error('CAPTURE_FAIL', e); process.exit(1); });
