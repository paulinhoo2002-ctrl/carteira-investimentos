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
  { width: 390, height: 844, label: '390x844', mobile: true,  insets: { top: 47, right: 0, bottom: 34, left: 0 }, name: 'iPhone portrait' },
  { width: 430, height: 932, label: '430x932', mobile: true,  insets: { top: 47, right: 0, bottom: 34, left: 0 }, name: 'iPhone portrait' },
  { width: 844, height: 390, label: '844x390', mobile: false, insets: { top: 0, right: 44, bottom: 21, left: 44 }, name: 'iPhone landscape' },
  { width: 932, height: 430, label: '932x430', mobile: false, insets: { top: 0, right: 44, bottom: 21, left: 44 }, name: 'iPhone landscape' },
  { width: 768, height: 1024, label: '768x1024', mobile: false, insets: { top: 24, right: 0, bottom: 20, left: 0 }, name: 'iPad portrait' },
  { width: 1024, height: 768, label: '1024x768', mobile: false, insets: { top: 0, right: 0, bottom: 20, left: 0 }, name: 'iPad landscape' },
  { width: 1366, height: 768, label: '1366x768', mobile: false, insets: { top: 0, right: 0, bottom: 0, left: 0 }, name: 'Desktop' },
  { width: 1920, height: 1080, label: '1920x1080', mobile: false, insets: { top: 0, right: 0, bottom: 0, left: 0 }, name: 'Desktop' },
];

function expectations(v) {
  const w = v.width;
  const hdrTopBase = w <= 640 ? 8 : 10;
  const tabsTopBase = w <= 900 ? 58 : w <= 1180 ? 52 : 58;
  const hdrLeftBase = w <= 640 ? 10 : w <= 900 ? 12 : 18;
  return {
    hdrTop: hdrTopBase,
    hdrTopSafe: hdrTopBase + v.insets.top,
    tabsTop: tabsTopBase,
    tabsTopSafe: tabsTopBase + v.insets.top,
    hdrLeft: hdrLeftBase,
    hdrLeftSafe: hdrLeftBase + v.insets.left,
    landscape: w > v.height,
    bottomNav: w <= 640,
  };
}

async function openQuickMovement(page) {
  await page.evaluate(() => window.openQuickMovement('compra'));
  await page.waitForFunction(() => {
    const m = document.querySelector('.quick-movement-modal');
    if (!m) return false;
    const cs = getComputedStyle(m);
    return cs.display !== 'none' && m.getBoundingClientRect().height > 0;
  });
}

function measureLayout() {
  return () => {
    const hdr = document.querySelector('.hdr');
    const tabs = [...document.querySelectorAll('.tabs')].find(t => t.getBoundingClientRect().height > 0)
      || document.querySelector('.tabs-mobile') || document.querySelector('.tabs');
    const nav = document.querySelector('#investBottomNav');
    const csHdr = getComputedStyle(hdr);
    const csTabs = getComputedStyle(tabs);
    const hdrChild = hdr.firstElementChild;
    const navButtons = nav ? [...nav.querySelectorAll('button')].map(b => b.getBoundingClientRect().bottom) : [];
    return {
      hdrPaddingTop: csHdr.paddingTop,
      hdrPaddingLeft: csHdr.paddingLeft,
      hdrPaddingRight: csHdr.paddingRight,
      hdrContentTop: hdrChild ? Math.round(hdrChild.getBoundingClientRect().top) : -999,
      tabsTop: csTabs.top,
      tabsRectTop: Math.round(tabs.getBoundingClientRect().top),
      tabsVisible: tabs.getBoundingClientRect().height > 0,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      navVisible: nav ? getComputedStyle(nav).display !== 'none' : false,
      navRectBottom: nav ? Math.round(nav.getBoundingClientRect().bottom) : -1,
      navButtonsBottom: navButtons.length ? Math.round(Math.max(...navButtons)) : -1,
    };
  };
}

function measureModal() {
  return () => {
    const m = document.querySelector('.quick-movement-modal');
    const r = m.getBoundingClientRect();
    const footer = m.querySelector(':scope > div:last-child');
    const buttons = footer ? [...footer.querySelectorAll('button')].map(b => b.getBoundingClientRect().bottom) : [];
    return {
      modalTop: Math.round(r.top),
      modalBottom: Math.round(r.bottom),
      innerHeight: window.innerHeight,
      footerButtonsBottom: buttons.length ? Math.round(Math.max(...buttons)) : -999,
    };
  };
}

for (const viewport of viewports) {
  test(`Safe-area ${viewport.name} - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke de safe-area');
    const { chromium } = await import('playwright-core');
    const harness = await startServer(path.join(__dirname, '..'));
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.mobile,
      isMobile: viewport.mobile,
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
      const cdp = await context.newCDPSession(page);
      const exp = expectations(viewport);
      const flush = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

      let obs = await page.evaluate(measureLayout());

      assert.equal(obs.hdrPaddingTop, `${exp.hdrTop}px`, `header padding-top base (navegador normal) ${viewport.label}`);
      if (obs.tabsVisible) {
        assert.equal(obs.tabsTop, `${exp.tabsTop}px`, `tabs sticky top base (navegador normal) ${viewport.label}`);
      }
      if (exp.landscape) {
        assert.equal(obs.hdrPaddingLeft, `${exp.hdrLeft}px`, `header padding-left base landscape ${viewport.label}`);
        assert.equal(obs.hdrPaddingRight, `${exp.hdrLeft}px`, `header padding-right base landscape ${viewport.label}`);
      }
      assert.ok(obs.scrollWidth <= obs.innerWidth + 1, `sem overflow horizontal base ${viewport.label} (${obs.scrollWidth}/${obs.innerWidth})`);
      assert.ok(obs.hdrContentTop >= -2, `conteudo do header nao cortado base ${viewport.label} (topo ${obs.hdrContentTop})`);

      await openQuickMovement(page);
      let modal = await page.evaluate(measureModal());
      assert.ok(modal.modalTop >= -2, `modal nao invade o topo base ${viewport.label} (topo ${modal.modalTop})`);
      await page.evaluate(() => window.closeQuickMovement());

      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: viewport.insets });
      await flush();

      obs = await page.evaluate(measureLayout());
      assert.equal(obs.hdrPaddingTop, `${exp.hdrTopSafe}px`, `header padding-top com safe-area ${viewport.label} (esperado ${exp.hdrTopSafe}px, obtido ${obs.hdrPaddingTop})`);
      if (obs.tabsVisible) {
        assert.equal(obs.tabsTop, `${exp.tabsTopSafe}px`, `tabs sticky top com safe-area ${viewport.label} (esperado ${exp.tabsTopSafe}px, obtido ${obs.tabsTop})`);
      }
      assert.ok(obs.hdrContentTop >= viewport.insets.top - 2, `conteudo do header fora da regiao do notch ${viewport.label} (topo ${obs.hdrContentTop}, inset ${viewport.insets.top})`);
      if (exp.landscape) {
        assert.equal(obs.hdrPaddingLeft, `${exp.hdrLeftSafe}px`, `header padding-left landscape com safe-area ${viewport.label}`);
        assert.equal(obs.hdrPaddingRight, `${exp.hdrLeftSafe}px`, `header padding-right landscape com safe-area ${viewport.label}`);
      }
      if (obs.tabsVisible) {
        await page.evaluate(() => window.scrollTo(0, 300));
        await flush();
        obs = await page.evaluate(measureLayout());
        assert.ok(obs.tabsRectTop >= viewport.insets.top - 2, `tabs sticky fora da regiao do notch ${viewport.label} (topo ${obs.tabsRectTop}, inset ${viewport.insets.top})`);
      }

      if (exp.bottomNav) {
        assert.ok(obs.navVisible, `bottom nav visivel em ${viewport.label}`);
        assert.ok(Math.abs(obs.navRectBottom - obs.innerHeight) <= 1, `bottom nav fixado na base ${viewport.label} (bottom ${obs.navRectBottom}/${obs.innerHeight})`);
        assert.ok(obs.navButtonsBottom <= obs.innerHeight - viewport.insets.bottom + 2,
          `botoes da bottom nav acima do home indicator ${viewport.label} (bottom ${obs.navButtonsBottom}, limite ${obs.innerHeight - viewport.insets.bottom + 2})`);
      } else {
        assert.ok(!obs.navVisible, `bottom nav permanece oculta fora do mobile ${viewport.label}`);
      }

      await openQuickMovement(page);
      modal = await page.evaluate(measureModal());
      assert.ok(modal.modalTop >= viewport.insets.top - 2, `modal nao invade o topo com safe-area ${viewport.label} (topo ${modal.modalTop}, inset ${viewport.insets.top})`);
      if (viewport.width <= 640) {
        assert.ok(Math.abs(modal.modalBottom - modal.innerHeight) <= 1, `modal bottom-sheet ancorado na base ${viewport.label} (bottom ${modal.modalBottom}/${modal.innerHeight})`);
      } else {
        assert.ok(modal.modalBottom <= modal.innerHeight - viewport.insets.bottom + 2,
          `modal nao invade a base com safe-area ${viewport.label} (bottom ${modal.modalBottom}, limite ${modal.innerHeight - viewport.insets.bottom + 2})`);
      }
      assert.ok(modal.footerButtonsBottom <= modal.innerHeight - viewport.insets.bottom + 2,
        `botoes do modal acima do home indicator ${viewport.label} (bottom ${modal.footerButtonsBottom}, limite ${modal.innerHeight - viewport.insets.bottom + 2})`);
      await page.evaluate(() => window.closeQuickMovement());

      obs = await page.evaluate(measureLayout());
      assert.ok(obs.scrollWidth <= obs.innerWidth + 1, `sem overflow horizontal com safe-area ${viewport.label} (${obs.scrollWidth}/${obs.innerWidth})`);

      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, right: 0, bottom: 0, left: 0 } });
      await flush();
      obs = await page.evaluate(measureLayout());
      assert.equal(obs.hdrPaddingTop, `${exp.hdrTop}px`, `header padding-top restaurado apos reset ${viewport.label}`);

      assert.deepEqual(errors, [], `console/page errors em ${viewport.label}`);
      assert.deepEqual(failures, [], `request failures em ${viewport.label}`);
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}

test('Safe-area - contrato estatico (variaveis env, regras e viewport-fit)', async () => {
  const executablePath = resolveBrowser();
  assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke de safe-area');
  const { chromium } = await import('playwright-core');
  const harness = await startServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    const contract = await page.evaluate(() => {
      const styles = [...document.querySelectorAll('style')].map(s => s.textContent || '');
      const block = styles.find(t => t.includes('FASE B1.3')) || '';
      const meta = document.querySelector('meta[name="viewport"]')?.content || '';
      const pwaJs = [...document.querySelectorAll('script')].map(s => s.textContent || '').find(t => t.includes('showPwaUpdateNotice')) || '';
      return { block, meta, pwaJs };
    });

    assert.ok(contract.meta.includes('viewport-fit=cover'), 'meta viewport com viewport-fit=cover');

    const css = contract.block;
    for (const expected of [
      '--safe-top:env(safe-area-inset-top,0px)',
      '--safe-right:env(safe-area-inset-right,0px)',
      '--safe-bottom:env(safe-area-inset-bottom,0px)',
      '--safe-left:env(safe-area-inset-left,0px)',
      '.hdr{padding-top:calc(10px + var(--safe-top))}',
      '.tabs{top:calc(58px + var(--safe-top))}',
      '@media(min-width:901px) and (max-width:1180px)',
      'calc(52px + var(--safe-top))',
      'calc(8px + var(--safe-top))!important',
      'calc(100dvh - var(--safe-top) - 6px)!important',
      'calc(min(96vh,100dvh - var(--safe-top) - 8px))',
      'calc(12px + var(--safe-bottom))',
      'calc(20px + var(--safe-bottom))',
      'calc(22px + var(--safe-top))',
      'calc(32px + var(--safe-bottom))',
      'calc(18px + var(--safe-bottom))!important',
      'orientation:landscape',
    ]) {
      assert.ok(css.includes(expected), `regra safe-area ausente: ${expected}`);
    }

    assert.ok(contract.pwaJs.includes('calc(18px + env(safe-area-inset-bottom))'), 'aviso PWA desktop com safe-area');
    assert.ok(!css.includes('@media (display-mode'), 'sem gate de display-mode (env() cobre standalone com fallback 0px)');
  } finally {
    await browser.close();
    harness.server.close();
  }
});
