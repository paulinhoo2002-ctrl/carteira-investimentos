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

test('IRPF preserva rota, leitura auxiliar, exportacoes e layout responsivo', async () => {
  const executable = browserPath();
  assert.ok(executable, 'Chrome/Edge nao encontrado');
  const { chromium } = await import('playwright-core');
  const harness = await startServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: executable, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    await page.evaluate(() => go('irpf'));
    const snapshot = await page.evaluate(() => ({
      route: S.tab,
      title: document.querySelector('.irpf-title')?.textContent.trim(),
      csv: [...document.querySelectorAll('.irpf-shell button')].some(button => button.textContent.includes('CSV')),
      pdf: [...document.querySelectorAll('.irpf-shell button')].some(button => button.textContent.includes('PDF')),
      sections: document.querySelectorAll('.irpf-section').length,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      backupManager: typeof backupManagerModal === 'function',
      backupPayload: typeof backupPayload === 'function',
      mobileRows: document.querySelectorAll('.irpf-mobile-row').length,
    }));
    assert.equal(snapshot.route, 'irpf');
    assert.equal(snapshot.title, 'Relatório IRPF 2026');
    assert.equal(snapshot.csv, true);
    assert.equal(snapshot.pdf, true);
    assert.equal(snapshot.sections, 6);
    assert.equal(snapshot.overflow, false);
    assert.equal(snapshot.backupManager, true);
    assert.equal(snapshot.backupPayload, true);
    assert.ok(snapshot.mobileRows >= 1);
  } finally {
    await browser.close();
    harness.server.close();
  }
});
