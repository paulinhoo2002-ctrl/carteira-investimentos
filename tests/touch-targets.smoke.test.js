const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => {
    try { fs.accessSync(candidate); return true; } catch { return false; }
  });
}

async function startServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const relative = pathname === '/' ? '/index.html' : pathname;
      const filePath = path.normalize(path.join(rootDir, relative));
      if (!filePath.startsWith(rootDir)) { res.writeHead(403); res.end(''); return; }
      const content = await fsp.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      res.end(content);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end('');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

const viewports = [
  { width: 360, height: 800, label: '360x800' },
  { width: 390, height: 844, label: '390x844' },
  { width: 430, height: 932, label: '430x932' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1024, height: 768, label: '1024x768' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

const confirmedTargets = {
  auditoria: ['.data-quality-chip', '.data-quality-actions .btn'],
  ia: ['.ai-modebar .btn', '.ai-cta'],
  rentabilidade: ['.rent-filters select'],
  irpf: ['#irpf-year-report', '.irpf-yearbox .btn'],
  ajudar: ['.rebalance-form .btn'],
};

for (const viewport of viewports) {
  test(`Touch targets 44px - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke de touch targets');
    const { chromium } = await import('playwright-core');
    const harness = await startServer(path.join(__dirname, '..'));
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.width <= 430,
      isMobile: viewport.width <= 430,
    });
    const page = await context.newPage();
    const errors = [];
    const failures = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', request => failures.push(request.url()));

    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => typeof go === 'function' && typeof openQuickMovement === 'function');

      for (const [screen, selectors] of Object.entries(confirmedTargets)) {
        await page.evaluate(s => { go(s); }, screen);
        await page.waitForTimeout(120);
        if (screen === 'ia') {
          await page.evaluate(() => { const details = document.querySelector('.ai-compact-details'); if (details) details.open = true; });
          await page.waitForTimeout(60);
        }

        const result = await page.evaluate((selectors) => {
          const visible = el => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'
              && !el.closest('details:not([open])');
          };
          const issues = [];
          const boxes = [];
          for (const sel of selectors) {
            const els = [...document.querySelectorAll(sel)].filter(visible);
            if (!els.length) { issues.push({ sel, reason: 'ausente' }); continue; }
            for (const el of els) {
              const r = el.getBoundingClientRect();
              const cs = getComputedStyle(el);
              const isPill = cs.borderRadius.includes('999') || cs.borderRadius === '50%';
              const h = r.height;
              const w = r.width;
              const widthOk = w >= 44 || (isPill && h >= 44 && w >= 24);
              if (h < 44 || !widthOk) {
                issues.push({ sel, text: (el.textContent || el.value || '').trim().slice(0, 24), h: Math.round(h), w: Math.round(w), pill: isPill });
              }
              if (el.disabled || cs.pointerEvents === 'none') {
                issues.push({ sel, text: (el.textContent || '').trim().slice(0, 24), reason: 'nao clicavel' });
              }
              boxes.push({ sel, left: r.left, right: r.right, top: r.top, bottom: r.bottom });
            }
          }
          for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i];
              const b = boxes[j];
              const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (ox > 2 && oy > 2) {
                issues.push({ reason: 'sobreposicao', a: a.sel, b: b.sel, ox: Math.round(ox), oy: Math.round(oy) });
              }
            }
          }
          return issues;
        }, selectors);

        assert.deepEqual(result, [], `touch targets invalidos na tela '${screen}' em ${viewport.label}`);

        const focusResult = await page.evaluate((selectors) => {
          const visible = el => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'
              && !el.closest('details:not([open])');
          };
          const issues = [];
          for (const sel of selectors) {
            for (const el of [...document.querySelectorAll(sel)].filter(visible)) {
              if (typeof el.focus !== 'function' || el.disabled) {
                issues.push({ sel, text: (el.textContent || '').trim().slice(0, 24), reason: 'nao focavel' });
                continue;
              }
              el.focus();
              if (document.activeElement !== el) {
                issues.push({ sel, text: (el.textContent || '').trim().slice(0, 24), reason: 'foco nao recebido' });
                continue;
              }
              const cs = getComputedStyle(el);
              if (cs.outlineStyle !== 'none' || cs.boxShadow !== 'none') continue;
              if (el.tagName === 'SELECT' || el.tagName === 'INPUT') {
                issues.push({ sel, text: (el.textContent || '').trim().slice(0, 24), reason: 'foco sem indicador' });
              }
            }
          }
          return issues;
        }, selectors);
        assert.deepEqual(focusResult, [], `foco invalido na tela '${screen}' em ${viewport.label}`);
      }

      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
