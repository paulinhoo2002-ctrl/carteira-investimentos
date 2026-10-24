const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const localOrigin = new URL(harness.url).origin;
  await page.route('**/*', r => new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort());
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function' && S.assets.length > 0);
  await page.evaluate(() => { fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; go('ativos'); });
  await page.waitForTimeout(1200);
  const out = await page.evaluate(async () => {
    window.__escRan = 0; window.__escDirty = null;
    const orig = quickMovementEscape;
    quickMovementEscape = function (e) { window.__escRan++; try { const o = document.querySelector('.note-overlay'); const fields = o ? Array.from(o.querySelectorAll('input, select, textarea')) : []; const base = window.__qmBaseline || []; const dirty = fields.some((el, i) => { const cur = el.type === 'checkbox' || el.type === 'radio' ? el.checked : String(el.value || ''); return base[i] !== undefined ? cur !== base[i] : String(cur).trim() !== ''; }); window.__escDirty = dirty; } catch (err) { window.__escDirty = 'ERR:' + String(err).slice(0, 60); } return orig.apply(this, arguments); };
    // abrir pelo menu da linha
    document.querySelector('[onclick*="toggleAssetActionMenu"]').click();
    await new Promise(r => setTimeout(r, 400));
    const item = Array.from(document.querySelectorAll('[onclick*="openAssetQuickMovement"], [onclick*="quick"]')).find(i => /comprar/i.test((i.textContent || '') + (i.getAttribute('onclick') || '')));
    if (item) item.click();
    await new Promise(r => setTimeout(r, 1200));
    const open = !!(document.querySelector('.note-overlay'));
    const baseLen = Array.isArray(window.__qmBaseline) ? window.__qmBaseline.length : null;
    return { open, baseLen, diff: (() => { const o = document.querySelector(".note-overlay"); const f = Array.from(o.querySelectorAll("input, select, textarea")); const b = window.__qmBaseline || []; return f.map((el, i) => ({ i, t: el.type, cur: String(el.value || "").slice(0, 12), base: b[i] === undefined ? "UNDEF" : String(b[i]).slice(0, 12), dirty: b[i] === undefined ? String(el.value || "").trim() !== "" : (el.type === "checkbox" || el.type === "radio" ? el.checked : String(el.value || "")) !== b[i] })).filter(x => x.dirty); })() };
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({ ran: window.__escRan, dirty: window.__escDirty, qmOpen: !!S.quickMovementOpen, overlay: !!document.querySelector('.note-overlay'), menusOpen: Array.from(document.querySelectorAll('details[open]')).length }));
  console.log(JSON.stringify({ before: out, after }, null, 1));
  await browser.close();
  await new Promise(r => harness.server.close(r));
})().catch(e => { console.error('FAIL', String(e).slice(0, 250)); process.exit(1); });
