const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

function browserPath() {
  return [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe']
    .filter(Boolean).find(candidate => { try { fs.accessSync(candidate); return true; } catch { return false; } });
}

async function startServer(root) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const filePath = path.normalize(path.join(root, pathname === '/' ? '/index.html' : pathname));
      if (!filePath.startsWith(root)) { res.writeHead(403); return res.end(); }
      res.writeHead(200, { 'Content-Type': path.extname(filePath) === '.html' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' });
      res.end(await fsp.readFile(filePath));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

for (const [width, height] of [[390, 844], [430, 932], [768, 1024], [1366, 768], [1920, 1080]]) {
  test(`settings premium layout ${width}x${height}`, async () => {
    const executablePath = browserPath();
    assert.ok(executablePath, 'Chrome não encontrado');
    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const errors = [];
    try {
      const page = await browser.newPage({ viewport: { width, height } });
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('settings'));
      await page.waitForSelector('.premium-settings-page');
      const result = await page.evaluate(() => {
        const nav = document.querySelector('#investBottomNav');
        const sections = document.querySelectorAll('.premium-settings-section');
        const toggles = document.querySelectorAll('.premium-settings-toggle');
        const last = [...document.querySelectorAll('.premium-settings-page > *')].filter(node => node.getBoundingClientRect().height > 0).at(-1);
        return {
          hasPage: Boolean(document.querySelector('.premium-settings-page')),
          hasHeader: Boolean(document.querySelector('.premium-settings-header')),
          sectionCount: sections.length,
          hasWalletSection: document.body.textContent.includes('Conta e Carteira'),
          hasAppearanceSection: document.body.textContent.includes('Aparência'),
          hasDataSection: document.body.textContent.includes('Dados e Backup'),
          hasRiskSection: document.body.textContent.includes('Zona de risco'),
          hasAboutSection: document.body.textContent.includes('Sobre'),
          hasThemeToggle: document.body.textContent.includes('Alternar'),
          hasHideValues: toggles.length > 0,
          hasWalletActions: document.body.textContent.includes('Nova') && document.body.textContent.includes('Renomear') && document.body.textContent.includes('Excluir'),
          hasBackupActions: document.body.textContent.includes('Exportar backup') && document.body.textContent.includes('Importar backup'),
          hasPwaInfo: document.body.textContent.includes('PWA'),
          hasUpdateCheck: document.body.textContent.includes('Atualizações'),
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth,
          financialPlaceholders: /NaN|Infinity|undefined|null/.test(document.querySelector('.premium-settings-page')?.textContent || ''),
          lastBottom: last?.getBoundingClientRect().bottom || 0,
          navTop: nav?.getBoundingClientRect().top || innerHeight,
        };
      });
      assert.equal(result.hasPage, true, 'premium-settings-page não encontrada');
      assert.equal(result.hasHeader, true, 'premium-settings-header não encontrada');
      assert.ok(result.sectionCount >= 3, `pelo menos 3 seções esperadas, encontrado ${result.sectionCount}`);
      assert.equal(result.hasWalletSection, true, 'seção Conta e Carteira ausente');
      assert.equal(result.hasAppearanceSection, true, 'seção Aparência ausente');
      assert.equal(result.hasDataSection, true, 'seção Dados e Backup ausente');
      assert.equal(result.hasRiskSection, true, 'seção Zona de risco ausente');
      assert.equal(result.hasAboutSection, true, 'seção Sobre ausente');
      assert.equal(result.hasThemeToggle, true, 'toggle de tema ausente');
      assert.equal(result.hasHideValues, true, 'toggle de ocultar valores ausente');
      assert.equal(result.hasWalletActions, true, 'ações de carteira ausentes');
      assert.equal(result.hasBackupActions, true, 'ações de backup ausentes');
      assert.equal(result.hasPwaInfo, true, 'info PWA ausente');
      assert.equal(result.hasUpdateCheck, true, 'verificação de atualizações ausente');
      assert.equal(result.overflow, false, 'overflow horizontal detectado');
      assert.equal(result.financialPlaceholders, false, 'placeholders financeiros encontrados');
      if (width <= 768) {
        assert.ok(result.lastBottom >= result.navTop, 'conteúdo final não alcançável antes da navegação');
      }
      assert.deepEqual(errors, [], 'erros no console');
    } finally {
      await browser.close();
      harness.server.close();
    }
  });
}

test('settings tab is navigable from sidebar', async () => {
  const executablePath = browserPath();
  assert.ok(executablePath, 'Chrome não encontrado');
  const harness = await startServer(path.join(__dirname, '..'));
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    const tabBtn = page.locator('button.tab', { hasText: 'Configurações' }).first();
    await tabBtn.click();
    await page.waitForSelector('.premium-settings-page');
    const active = await page.evaluate(() => S.tab);
    assert.equal(active, 'settings', 'S.tab deve ser settings apos clicar na aba');
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('theme toggle works from settings page', async () => {
  const executablePath = browserPath();
  assert.ok(executablePath, 'Chrome não encontrado');
  const harness = await startServer(path.join(__dirname, '..'));
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    await page.evaluate(() => go('settings'));
    await page.waitForSelector('.premium-settings-page');
    const beforeTheme = await page.evaluate(() => THEME);
    await page.evaluate(() => toggleTheme());
    const afterTheme = await page.evaluate(() => THEME);
    assert.notEqual(beforeTheme, afterTheme, 'tema deve alternar');
    assert.ok(['dark', 'light'].includes(afterTheme), 'tema deve ser dark ou light');
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('hide values toggle works from settings page', async () => {
  const executablePath = browserPath();
  assert.ok(executablePath, 'Chrome não encontrado');
  const harness = await startServer(path.join(__dirname, '..'));
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    await page.evaluate(() => go('settings'));
    await page.waitForSelector('.premium-settings-page');
    const before = await page.evaluate(() => S.hideValues);
    await page.evaluate(() => toggleHideValues());
    const after = await page.evaluate(() => S.hideValues);
    assert.notEqual(before, after, 'hideValues deve alternar');
    await page.waitForSelector('.premium-settings-page');
    const toggle = await page.evaluate(() => {
      const el = document.querySelector('.premium-settings-toggle');
      return el ? el.classList.contains('on') : null;
    });
    assert.equal(toggle, after, 'toggle visual deve refletir estado');
  } finally {
    await browser.close();
    harness.server.close();
  }
});
