const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function browserPath() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(file => {
    try { fs.accessSync(file); return true; } catch { return false; }
  });
}

async function startServer(root) {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
    const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
    if (!file.startsWith(root) || !fs.existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

test('busca global encontra Análise, respeita teclado, no-match e links contextuais', async () => {
  const executable = browserPath();
  assert.ok(executable, 'Chrome/Edge nao encontrado');
  const { chromium } = await import('playwright-core');
  const harness = await startServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: executable, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    await page.keyboard.press('Control+KeyK');
    assert.equal(await page.locator('#portfolio-search-input').count(), 1);
    await page.locator('#portfolio-search-input').fill('analise');
    assert.match(await page.locator('#portfolio-search-results').innerText(), /Análise da carteira/);
    assert.match(await page.locator('#portfolio-search-results').innerText(), /NAVEGAÇÃO/i);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => S.tab), 'analise');
    assert.equal(await page.locator('.analysis-context-links').count(), 1);
    await page.getByRole('button', { name: 'Ver rentabilidade' }).click();
    assert.equal(await page.evaluate(() => S.tab), 'rentabilidade');
    await page.keyboard.press('Control+KeyK');
    await page.locator('#portfolio-search-input').fill('nao-existe-xyz');
    assert.match(await page.locator('#portfolio-search-results').innerText(), /Nenhum resultado encontrado\./);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#portfolio-search-input').count(), 0);
  } finally {
    await browser.close();
    harness.server.close();
  }
});
