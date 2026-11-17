const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { resolveChromePath } = require('./helpers/chrome-path');
const { startLocalHttpServer } = require('./local-http-server');

// Entradas exclusivamente sintéticas, usadas para provar que o nome é tratado como texto.
const HOSTILE_NAMES = [
  'Ana "Aspas" \'Simples\' & Teste',
  '" onmouseover="window.__sm189_22=1" data-x="',
  '<img src=x onerror="window.__sm189_22=1">Bruno',
  '<b>Carla</b> <script>window.__sm189_22=1</script>',
  'Zoë 李 😀 Ísis',
  'Nome sintetico longo '.repeat(12).trim(),
];

async function withPage(run) {
  const server = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(server.url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof render === 'function' && typeof FB === 'object');
    await run(page);
  } finally {
    await browser.close();
    server.server.close();
  }
}

test('hostile display names render as inert text in the sidebar', async () => {
  await withPage(async page => {
    for (const displayName of HOSTILE_NAMES) {
      await page.evaluate(name => { window.__sm189_22 = 0; FB.user = { uid: 'sec', displayName: name }; render(); }, displayName);
      const report = await page.evaluate(() => {
        const nav = document.querySelector('.tabs-desktop');
        return {
          flag: window.__sm189_22,
          injectedEventAttrs: nav.querySelectorAll('[onmouseover],[onerror]').length,
          injectedElements: nav.querySelectorAll('img,script,b').length,
          label: nav.querySelector('.side-brand-user').textContent,
          title: nav.querySelector('.side-brand-user').getAttribute('title'),
        };
      });
      assert.equal(report.flag, 0, `script executed for ${displayName.slice(0, 20)}`);
      assert.equal(report.injectedEventAttrs, 0, 'event attribute injected');
      assert.equal(report.injectedElements, 0, 'unexpected element created');
      assert.equal(report.label, displayName.replace(/\s+/g, ' ').trim(), 'label is not the literal text');
      assert.equal(report.title, displayName.replace(/\s+/g, ' ').trim(), 'title attribute does not preserve the literal text');
    }
  });
});

test('avatar initials from hostile names contain no markup', async () => {
  await withPage(async page => {
    await page.evaluate(() => { FB.user = { uid: 'sec2', displayName: '<b>Carla</b> <i>Teste</i>' }; render(); });
    const avatar = await page.locator('.tabs-desktop .side-avatar').innerText();
    // Iniciais de pontuação ficam como texto literal (achado cosmético: sem filtro de letras); o teste exige apenas ausência de markup.
    assert.equal(avatar, '<<');
    assert.equal(await page.locator('.tabs-desktop .side-brand-sub b, .tabs-desktop .side-brand-sub i').count(), 0);
  });
});

test('display name with HTML-like text is never rendered as elements after logout and re-login', async () => {
  await withPage(async page => {
    await page.evaluate(() => { FB.user = { uid: 'sec3', displayName: '<img src=x onerror="window.__sm189_22=1">' }; render(); });
    await page.evaluate(() => { FB.user = null; render(); });
    await page.evaluate(() => { FB.user = { uid: 'sec4', displayName: 'Ana Lima' }; render(); });
    assert.equal(await page.evaluate(() => window.__sm189_22 || 0), 0);
    assert.equal(await page.locator('.tabs-desktop img').count(), 0);
    assert.equal(await page.locator('.tabs-desktop .side-brand-user').innerText(), 'Ana Lima');
  });
});
