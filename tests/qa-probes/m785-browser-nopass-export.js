// M785 — validação em NAVEGADOR da exportação sem senha + importação sintética (isolada).
// Nunca restaura de verdade; confirma o gate obrigatório; zero dados reais (fixture sintética).
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const localOrigin = new URL(harness.url).origin;
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 100)));
  await page.route('**/*', async route => {
    const u = new URL(route.request().url()).origin;
    if (u === localOrigin) return route.continue();
    return route.abort();
  });
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function');
  await page.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });
  await page.evaluate(() => go('settings'));
  await page.waitForTimeout(1200);

  // 1) UI expõe as duas opções + aviso de que sem senha = sem criptografia
  const ui = await page.evaluate(() => {
    const text = document.body.innerText || '';
    return {
      protectedBtn: /Exportar protegido/.test(text),
      noPasswordBtn: /Exportar sem senha/.test(text),
      plainWarning: /sem senha/i.test(text) && /sem criptografia|não criptograf/i.test(text),
      protectionLabel: /Proteção do arquivo:/.test(text),
    };
  });

  // 2) GUARD de testMode: exportação DESATIVADA por design (anti-vazamento).
  // Certo a certificar: toast de guard + ZERO download + estado intacto.
  const before = await page.evaluate(() => JSON.stringify({ assets: S.assets.length, provs: S.proventos.length }));
  const toasts0 = await page.evaluate(() => (window.__m785Toasts = window.__m785Toasts || [], window.__m785Toasts.push(document.body.innerText.length), window.__m785Toasts.length));
  const dlPromise = page.waitForEvent('download', { timeout: 12000 }).catch(() => null);
  const exported = await page.evaluate(() => {
    window.__m785ToastSeen = false;
    const origToast = window.toast;
    if (typeof origToast === 'function') { window.toast = (...a) => { window.__m785ToastSeen = String(a[0] || ''); return origToast.apply(null, a); }; }
    return exportBackup({ encrypted: false }).then(() => ({ seen: String(window.__m785ToastSeen || ''), guard: /desativada/i.test(String(window.__m785ToastSeen || '')) })).catch(e => ({ err: String(e).slice(0, 80) }));
  });
  const dl = await dlPromise;
  const guardCheck = { guardToast: !!(exported.guard), zeroDownload: !dl };

  // 3) botões da UI (podem estar em disclosure da aba de backup)
  const uiButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return {
      protectedBtn: btns.some(b => /Exportar protegido/.test(b.textContent || '')),
      noPasswordBtn: btns.some(b => /Exportar sem senha/.test(b.textContent || '')),
      plainWarning: /sem criptografia|não criptograf/i.test(document.body.innerText || ''),
      protectionLabel: /Proteção do arquivo:/.test(document.body.innerText || ''),
      anyBackupCenter: /centro de backup|Backup/i.test(document.body.innerText || ''),
    };
  });

  // 3) prévia de importação SEM escrita + gate de confirmação obrigatório
  const preview = await page.evaluate(() => {
    const text = document.body.innerText || '';
    return {
      previewNoWrite: /Prévia sem escrita|previewRestore|prévia/i.test(text),
      restoreRequiresConfirm: /Restaurar \(somente ambiente de teste\)|confirm/i.test(text),
      integrityLabel: /Integridade:/.test(text),
      noRealRestore: /Restauração real não é executada/.test(text),
    };
  });

  const after = await page.evaluate(() => JSON.stringify({ assets: S.assets.length, provs: S.proventos.length }));

  console.log(JSON.stringify({ uiButtons, guardCheck, guardToastText: (exported.seen || exported.err || "").slice(0, 60), preview, stateUnchanged: before === after, pageErrors: pageErrors.slice(0, 4) }, null, 1));
  await browser.close();
  await new Promise(r => harness.server.close(r));
})().catch(e => { console.error('FAIL', String(e).slice(0, 250)); process.exit(1); });
