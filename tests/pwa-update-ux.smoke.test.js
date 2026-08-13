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
  { width: 390, height: 844, label: '390x844' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

for (const viewport of viewports) {
  test(`PWA update UX - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke PWA');
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
      const initial = await page.evaluate(() => {
        if (window.innerWidth <= 430 && typeof toggleMobileTopMenu === 'function') toggleMobileTopMenu();
        const menu = [...document.querySelectorAll('.cfg-menu')].find(element => {
          const box = element.getBoundingClientRect();
          return getComputedStyle(element).display !== 'none' && box.width > 0 && box.height > 0;
        });
        menu?.setAttribute('open', '');
        const updateButton = [...(menu?.querySelectorAll('button') || [])].find(button => button.textContent.includes('Verificar atualiza'));
        return {
        civ5: localStorage.getItem('civ5'),
        menu: !!document.querySelector('.cfg-menu'),
        updateButton: updateButton ? { height: updateButton.getBoundingClientRect().height } : null,
        swSource: typeof checkForAppUpdate === 'function' && typeof requestPwaUpdate === 'function',
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      assert.equal(initial.menu, true);
      assert.ok(initial.updateButton);
      assert.ok(initial.updateButton.height >= 44);
      assert.equal(initial.swSource, true);
      assert.equal(initial.overflow, false);

      const registration = await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.register('sw.js');
        await navigator.serviceWorker.ready;
        return { active: reg.active?.state || '', waiting: !!reg.waiting };
      });
      await page.waitForFunction(() => navigator.serviceWorker.controller);
      assert.ok(['activating', 'activated'].includes(registration.active));
      assert.equal(registration.waiting, false);

      const cacheBefore = await page.evaluate(() => caches.keys());
      const noUpdate = await page.evaluate(() => checkForAppUpdate({ manual: true }));
      assert.equal(noUpdate.waiting, false);
      assert.deepEqual(await page.evaluate(() => caches.keys()), cacheBefore);

      const waitingChecks = await page.evaluate(() => {
        const messages = [];
        const fakeRegistration = { waiting: { postMessage: message => messages.push(message) } };
        showPwaUpdateNotice(fakeRegistration);
        const banner = document.querySelector('#pwa-update-notice');
        const bannerButton = [...banner.querySelectorAll('button')].find(button => button.textContent === 'Atualizar agora');
        const bannerHeight = bannerButton.getBoundingClientRect().height;
        S.quickMovementOpen = true;
        requestPwaUpdate(fakeRegistration, bannerButton);
        const confirm = document.querySelector('#pwa-edit-update-confirm');
        confirm.querySelector('[data-pwa-later]').click();
        const stayedEditing = messages.length === 0 && !document.querySelector('#pwa-edit-update-confirm');
        S.quickMovementOpen = false;
        requestPwaUpdate(fakeRegistration, bannerButton);
        return { banner: !!banner, bannerHeight, stayedEditing, messages };
      });
      assert.equal(waitingChecks.banner, true);
      assert.ok(waitingChecks.bannerHeight >= 44);
      assert.equal(waitingChecks.stayedEditing, true);
      assert.deepEqual(waitingChecks.messages, [{ type: 'SKIP_WAITING' }]);

      const offline = await page.evaluate(async () => {
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
        const result = await checkForAppUpdate({ manual: true });
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
        return result;
      });
      assert.equal(offline.reason, 'offline');
      assert.equal(await page.evaluate(() => localStorage.getItem('civ5')), initial.civ5);
      const themes = await page.evaluate(() => {
        applyTheme('light');
        const light = document.documentElement.dataset.theme;
        applyTheme('dark');
        return { light, dark: document.documentElement.dataset.theme };
      });
      assert.deepEqual(themes, { light: 'light', dark: 'dark' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
