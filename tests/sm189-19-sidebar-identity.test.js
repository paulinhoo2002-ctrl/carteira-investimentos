const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { resolveChromePath } = require('./helpers/chrome-path');
const { startLocalHttpServer } = require('./local-http-server');

// Identidades exclusivamente sintéticas.
async function withPage(run) {
  const server = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(server.url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof render === 'function' && typeof FB === 'object');
    await run(page);
  } finally {
    await browser.close();
    server.server.close();
  }
}

async function setUser(page, user) {
  await page.evaluate(u => { FB.user = u; render(); }, user);
}

const sideBrand = page => page.locator('.side-brand-sub');

test('sidebar has no fixed owner name or legacy PS avatar in rendered markup', async () => {
  await withPage(async page => {
    const html = await page.locator('.tabs-desktop').innerHTML();
    assert.doesNotMatch(html, /Paulo|Sérgio|Sergio/);
    assert.doesNotMatch(html, />PS</);
  });
});

test('visitor without session sees neutral label and neutral avatar', async () => {
  await withPage(async page => {
    await setUser(page, null);
    assert.match(await sideBrand(page).innerText(), /Minha conta/);
    assert.equal(await page.locator('.side-brand-sub .side-avatar').innerText(), '•');
  });
});

test('authenticated user with display name shows name and computed initials', async () => {
  await withPage(async page => {
    await setUser(page, { uid: 'u-a', email: 'a@example.invalid', emailVerified: true, displayName: 'Ana Lima' });
    assert.match(await sideBrand(page).innerText(), /Ana Lima/);
    assert.equal(await page.locator('.side-brand-sub .side-avatar').innerText(), 'AL');
  });
});

test('single-word name uses one initial; accented and multi-word names use first and last', async () => {
  await withPage(async page => {
    await setUser(page, { uid: 'u-b', displayName: 'Ísis' });
    assert.equal(await page.locator('.side-brand-sub .side-avatar').innerText(), 'Í');
    await setUser(page, { uid: 'u-c', displayName: 'Maria da Silva Souza' });
    assert.equal(await page.locator('.side-brand-sub .side-avatar').innerText(), 'MS');
  });
});

test('missing or blank display name falls back to neutral label', async () => {
  await withPage(async page => {
    for (const displayName of ['', '   ', undefined, null]) {
      await setUser(page, { uid: 'u-d', email: 'd@example.invalid', displayName });
      assert.match(await sideBrand(page).innerText(), /Minha conta/);
      assert.equal(await page.locator('.side-brand-sub .side-avatar').innerText(), '•');
    }
  });
});

test('email is never used as a replacement for the display name', async () => {
  await withPage(async page => {
    await setUser(page, { uid: 'u-e', email: 'synthetic.user@example.invalid', emailVerified: true, displayName: '' });
    assert.doesNotMatch(await sideBrand(page).innerText(), /example\.invalid|synthetic/);
  });
});

test('special characters are rendered as text and never executed', async () => {
  await withPage(async page => {
    await page.evaluate(() => { window.__sm189_19_xss = 0; });
    await setUser(page, { uid: 'u-x', displayName: '<img src=x onerror="window.__sm189_19_xss=1">Eva <b>Tester</b>' });
    assert.equal(await page.evaluate(() => window.__sm189_19_xss), 0);
    assert.equal(await page.locator('.side-brand-sub img, .side-brand-sub b').count(), 0);
    assert.match(await sideBrand(page).innerText(), /<img src=x/);
  });
});

test('logout clears the previous identity', async () => {
  await withPage(async page => {
    await setUser(page, { uid: 'u-f', displayName: 'Fabio Teste' });
    assert.match(await sideBrand(page).innerText(), /Fabio Teste/);
    await setUser(page, null);
    const text = await sideBrand(page).innerText();
    assert.doesNotMatch(text, /Fabio|FT/);
    assert.match(text, /Minha conta/);
  });
});

test('switching user A to B shows only B', async () => {
  await withPage(async page => {
    await setUser(page, { uid: 'u-a', displayName: 'Ana Lima' });
    await setUser(page, { uid: 'u-b', displayName: 'Bruno Souza' });
    const text = await sideBrand(page).innerText();
    assert.match(text, /Bruno Souza/);
    assert.doesNotMatch(text, /Ana Lima/);
    assert.equal(await page.locator('.side-brand-sub .side-avatar').innerText(), 'BS');
  });
});

test('long name is truncated with ellipsis, not allowed to break layout', async () => {
  await withPage(async page => {
    await setUser(page, { uid: 'u-l', displayName: 'Nome sintetico muito longo '.repeat(6).trim() });
    const style = await page.locator('.side-brand-user').evaluate(el => {
      const cs = getComputedStyle(el);
      return { overflow: cs.overflow, ellipsis: cs.textOverflow, nowrap: cs.whiteSpace, minWidth: cs.minWidth };
    });
    assert.equal(style.overflow, 'hidden');
    assert.equal(style.ellipsis, 'ellipsis');
    assert.equal(style.nowrap, 'nowrap');
    const overflowsPage = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflowsPage, false);
  });
});
