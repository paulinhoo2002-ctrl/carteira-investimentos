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
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(c => { try { fs.accessSync(c); return true; } catch { return false; } });
}

async function startServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      let f = p === '/' ? '/index.html' : p;
      const fp = path.normalize(path.join(rootDir, f));
      if (!fp.startsWith(rootDir)) { res.writeHead(403); res.end(''); return; }
      const c = await fsp.readFile(fp);
      const m = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': m[path.extname(fp).toLowerCase()] || 'text/plain' });
      res.end(c);
    } catch (e) {
      res.writeHead(e.code === 'ENOENT' ? 404 : 500);
      res.end('');
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

const viewports = [
  { w: 390, h: 844, label: '390x844' },
  { w: 768, h: 1024, label: '768x1024' },
  { w: 1366, h: 768, label: '1366x768' },
  { w: 1920, h: 1080, label: '1920x1080' },
];

function assertTouchSize(el, label, ctx) {
  const h = el.getBoundingClientRect().height;
  const w = el.getBoundingClientRect().width;
  assert.ok(h >= 44, `${label} altura ${h}px < 44px (${ctx})`);
  assert.ok(w >= 44, `${label} largura ${w}px < 44px (${ctx})`);
}

viewports.forEach(vp => {
  test(`utility touch targets - ${vp.label}`, async () => {
    const exe = resolveBrowser();
    if (!exe) return;

    const h = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath: exe, headless: true });
    try {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        hasTouch: vp.w <= 430,
        isMobile: vp.w <= 430,
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(h.url, { waitUntil: 'networkidle' });

      const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(await noOverflow(), false, `Overflow horizontal inicial em ${vp.label}`);

      const measureAll = async sel => page.evaluate(s => Array.from(document.querySelectorAll(s)).map(el => {
        const r = el.getBoundingClientRect();
        return { h: r.height, w: r.width, t: (el.textContent || '').trim().slice(0, 40) };
      }).filter(c => c.w > 0 && c.h > 0), sel);

      const assertMin = (arr, sel, label, ctx) => {
        arr.forEach((c, i) => {
          assert.ok(Math.round(c.h) >= 44, `${label}[${i}] "${c.t}" altura ${c.h}px < 44px (${ctx})`);
        });
      };

      const assertSquare = (arr, sel, label, ctx) => {
        arr.forEach((c, i) => {
          assert.ok(Math.round(c.h) >= 44, `${label}[${i}] "${c.t}" altura ${c.h}px < 44px (${ctx})`);
          assert.ok(Math.round(c.w) >= 44, `${label}[${i}] "${c.t}" largura ${c.w}px < 44px (${ctx})`);
        });
      };

      if (vp.w <= 430) {
        const navBtns = await measureAll('#investBottomNav button');
        assert.ok(navBtns.length === 5, `Navegacao inferior ausente em ${vp.label}`);
        assertMin(navBtns, '#investBottomNav button', 'Navegacao inferior', vp.label);
      } else {
        const tabs = await measureAll('.tab');
        assert.ok(tabs.length >= 5, `Abas de navegacao ausentes em ${vp.label}`);
        assertMin(tabs, '.tab', 'Navegacao', vp.label);
      }

      if (vp.w <= 430) {
        const fab = await measureAll('.hdr-top-fab');
        assert.equal(fab.length, 1, `FAB ausente em ${vp.label}`);
        assertSquare(fab, '.hdr-top-fab', 'FAB', vp.label);
        await page.evaluate(() => toggleMobileTopMenu());
        await page.waitForTimeout(200);
        const drawerBtns = await measureAll('#investTopDrawer button');
        assert.ok(drawerBtns.length >= 6, `Botoes do drawer ausentes em ${vp.label}`);
        assertMin(drawerBtns, '#investTopDrawer button', 'Drawer', vp.label);
        const walletBtns = await measureAll('#investTopDrawer .wallet-menu .btn');
        assertMin(walletBtns, '#investTopDrawer .wallet-menu .btn', 'Wallet menu', vp.label);
        const cfgBtns = await measureAll('#investTopDrawer .cfg-menu-panel .btn');
        assertMin(cfgBtns, '#investTopDrawer .cfg-menu-panel .btn', 'Config menu', vp.label);
        await page.evaluate(() => document.querySelector('#investTopDrawer .wallet-menu').open = true);
        await page.waitForTimeout(150);
        const walletSelect = await page.evaluate(() => {
          const s = document.querySelector('#investTopDrawer .wallet-menu select.inp');
          if (!s) return null;
          const r = s.getBoundingClientRect();
          return { h: r.height, w: r.width };
        });
        assert.ok(walletSelect && Math.round(walletSelect.h) >= 44 && Math.round(walletSelect.w) >= 44, `Select carteira < 44px em ${vp.label}`);
        await page.evaluate(() => closeMobileTopMenu());
        await page.waitForTimeout(200);
      } else {
        const hdrBtns = await measureAll('.hdr-right .hdr-mobile-btn');
        assert.ok(hdrBtns.length >= 3, `Botoes do header ausentes em ${vp.label}`);
        assertMin(hdrBtns, '.hdr-right .hdr-mobile-btn', 'Header', vp.label);
        await page.evaluate(() => document.querySelector('.wallet-menu').open = true);
        await page.waitForTimeout(150);
        const walletBtns = await measureAll('.wallet-menu .btn');
        assertMin(walletBtns, '.wallet-menu .btn', 'Wallet menu', vp.label);
        const walletSelect = await page.evaluate(() => {
          const s = document.querySelector('.wallet-menu select.inp');
          if (!s) return null;
          const r = s.getBoundingClientRect();
          return { h: r.height, w: r.width };
        });
        assert.ok(walletSelect && Math.round(walletSelect.h) >= 44 && Math.round(walletSelect.w) >= 44, `Select carteira < 44px em ${vp.label}`);
        await page.evaluate(() => document.querySelector('.wallet-menu').open = false);
        await page.evaluate(() => document.querySelector('.cfg-menu').open = true);
        await page.waitForTimeout(150);
        const cfgBtns = await measureAll('.cfg-menu-panel .btn');
        assertMin(cfgBtns, '.cfg-menu-panel .btn', 'Config menu', vp.label);
        await page.evaluate(() => document.querySelector('.cfg-menu').open = false);
      }

      await page.evaluate(() => document.querySelector('.tab-menu').open = true);
      await page.waitForTimeout(150);
      const tabPanelBtns = await measureAll('.tab-menu-panel button');
      assertMin(tabPanelBtns, '.tab-menu-panel button', 'Submenu', vp.label);
      await page.evaluate(() => document.querySelector('.tab-menu').open = false);

      const screens = [
        { name: 'dashboard', checks: [{ sel: '.dash-chip' }], functional: async () => {
          const clicked = await page.evaluate(() => {
            const chip = document.querySelector('.dash-chip');
            if (!chip) return false;
            chip.click();
            return true;
          });
          assert.equal(clicked, true, `Sem dash-chip em ${vp.label}`);
          await page.waitForTimeout(150);
        } },
        { name: 'ativos', checks: [{ sel: '.asset-inner-tab' }], functional: async () => {
          const clicked = await page.evaluate(() => {
            const tab = document.querySelector('.asset-inner-tab');
            if (!tab) return false;
            tab.click();
            return true;
          });
          assert.equal(clicked, true, `Sem asset-inner-tab em ${vp.label}`);
          await page.waitForTimeout(150);
        } },
        { name: 'aportes', checks: [{ sel: '.aporte-search' }], functional: async () => {
          await page.evaluate(() => {
            const input = document.querySelector('.aporte-search input');
            if (!input) return;
            input.value = 'abc';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          });
          await page.waitForTimeout(150);
        } },
        { name: 'dividendos', checks: [{ sel: '.div-premium .btn' }, { sel: '.div-premium input', optional: true }] },
        { name: 'metas', checks: [{ sel: '.metas-shell input' }] },
        { name: 'relatorios', checks: [{ sel: '.reports-filter button' }, { sel: '.report-format-btn', square: true }, { sel: '.report-export-actions .btn' }, { sel: '.reports-experiment-entry__button' }], functional: async () => {
          const clicked = await page.evaluate(() => {
            const btn = document.querySelector('.reports-filter button');
            if (!btn) return false;
            btn.click();
            return true;
          });
          assert.equal(clicked, true, `Sem reports-filter em ${vp.label}`);
          await page.waitForTimeout(150);
        } },
      ];

      for (const screen of screens) {
        await page.evaluate(n => go(n), screen.name);
        await page.waitForTimeout(250);
        assert.equal(await noOverflow(), false, `Overflow horizontal em ${screen.name} ${vp.label}`);
        for (const chk of screen.checks) {
          const els = await measureAll(chk.sel);
          if (chk.optional && els.length === 0) continue;
          assert.ok(els.length > 0, `${chk.sel} ausente em ${screen.name} ${vp.label}`);
          if (chk.square) assertSquare(els, chk.sel, screen.name, vp.label);
          else assertMin(els, chk.sel, screen.name, vp.label);
        }
        if (screen.functional) await screen.functional();
        assert.equal(errors.length, 0, `Erros no console em ${screen.name} ${vp.label}: ${errors.join(' | ')}`);
      }

      await page.evaluate(() => go('metas'));
      await page.waitForTimeout(250);
      const metasInputs = await page.evaluate(() => {
        const ids = ['mp-head-target', 'mpr-head-monthly'];
        return ids.map(id => {
          const el = document.getElementById(id);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { id, h: r.height, w: r.width };
        });
      });
      metasInputs.forEach(m => {
        assert.ok(m, `Input de meta ausente em ${vp.label}`);
        assert.ok(m.h >= 44, `Input ${m.id} altura ${m.h}px < 44px em ${vp.label}`);
        assert.ok(m.w >= 44, `Input ${m.id} largura ${m.w}px < 44px em ${vp.label}`);
      });

      await ctx.close();
    } finally {
      await browser.close();
      h.server.close();
    }
  });
});
