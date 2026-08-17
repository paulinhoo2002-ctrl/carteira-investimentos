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
  ].filter(Boolean).find(file => { try { fs.accessSync(file); return true; } catch { return false; } });
}

async function startServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const filePath = path.normalize(path.join(rootDir, pathname === '/' ? 'index.html' : pathname));
      if (!filePath.startsWith(rootDir)) { res.writeHead(403); res.end(); return; }
      const content = await fsp.readFile(filePath);
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
      res.writeHead(200, { 'Content-Type': `${types[path.extname(filePath)] || 'text/plain'}; charset=utf-8` });
      res.end(content);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end();
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

const metricLabels = ['Patrimônio atual', 'Total investido', 'Resultado geral', 'Rentabilidade', 'Recebido no mês', 'Média 12 meses', 'Meta mensal'];
const aporteLabels = ['Total aportado', 'Média mensal', 'Maior aporte', 'Meses com aportes'];

for (const viewport of viewports) {
  test(`Dashboard/Aportes readability - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge não encontrado para smoke browser');
    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const errors = [];
    const requestFailures = [];
    try {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.width <= 430, isMobile: viewport.width <= 430 });
      const page = await context.newPage();
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
      page.on('requestfailed', request => requestFailures.push(`${request.url()} (${request.failure()?.errorText || 'unknown'})`));
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => restoreLocalTestData());
      await page.waitForSelector('.dashboard-home-summary', { state: 'visible', timeout: 5000 });

      const dashboard = await page.evaluate(labels => {
        const firstStyle = selector => getComputedStyle(document.querySelector(selector));
        const values = labels.map(label => {
          const node = [...document.querySelectorAll('.premium-metric-label')].find(item => item.textContent.trim() === label);
          return { label, value: node?.closest('.premium-metric')?.querySelector('.premium-metric-value')?.textContent.trim() || '' };
        });
        return { labelSize: parseFloat(firstStyle('.premium-metric-label').fontSize), noteSize: parseFloat(firstStyle('.premium-metric-note').fontSize), values, overflow: document.documentElement.scrollWidth > innerWidth };
      }, metricLabels);
      assert.ok(dashboard.labelSize >= 11, `label Dashboard <11px em ${viewport.label}`);
      assert.ok(dashboard.noteSize >= 11, `nota Dashboard <11px em ${viewport.label}`);
      dashboard.values.forEach(item => assert.ok(item.value, `KPI ausente: ${item.label}`));
      assert.equal(dashboard.overflow, false, `overflow Dashboard em ${viewport.label}`);

      await page.evaluate(() => { restoreLocalTestData(); go('aportes'); });
      await page.waitForSelector('.aporte-contribution-grid .cl', { state: 'visible', timeout: 5000 });
      const summary = await page.evaluate(labels => {
        const cards = [...document.querySelectorAll('.aporte-contribution-grid .card')];
        return { cardCount: cards.length, labelSize: parseFloat(getComputedStyle(cards[0].querySelector('.cl')).fontSize), subtextSize: parseFloat(getComputedStyle(cards[0].querySelector('.cs')).fontSize), values: cards.slice(0, labels.length).map(card => card.querySelector('.cv')?.textContent.trim() || '') };
      }, aporteLabels);
      await page.evaluate(() => setAportesViewMode('extrato'));
      await page.waitForTimeout(100);
      const aportes = await page.evaluate(labels => {
        const parseColor = value => { const match = value.match(/rgba?\\(([^)]+)\\)/); if (!match) return null; const parts = match[1].split(',').map(Number); return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 }; };
        const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
        const luminance = color => { const channels = [color.r, color.g, color.b].map(value => { const channel = value / 255; return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }); return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]; };
        const contrast = (foreground, background) => (Math.max(luminance(foreground), luminance(background)) + .05) / (Math.min(luminance(foreground), luminance(background)) + .05);
        const badge = document.querySelector('.aporte-kind');
        const badgeExists = !!badge;
        if (!badge) return { badgeExists, labelSize: 0, subtextSize: 0, values: [], badgeContrast: 0, overflow: false };
        const badgeStyle = getComputedStyle(badge);
        let background = parseColor(badgeStyle.backgroundColor) || { r: 15, g: 26, b: 44, a: 1 };
        let parent = badge.parentElement;
        while (background?.a < 1 && parent) { const parentColor = parseColor(getComputedStyle(parent).backgroundColor); if (parentColor) background = blend(background, parentColor); parent = parent.parentElement; }
        return { badgeExists, badgeContrast: contrast(parseColor(badgeStyle.color) || { r: 110, g: 231, b: 183, a: 1 }, background), overflow: document.documentElement.scrollWidth > innerWidth };
      }, aporteLabels);
      assert.ok(summary.labelSize >= 11, `label Aportes ${summary.labelSize}px <11px em ${viewport.label}`);
      assert.ok(summary.subtextSize >= 11, `subtexto Aportes ${summary.subtextSize}px <11px em ${viewport.label}`);
      summary.values.forEach((value, index) => assert.ok(value, `KPI Aportes ausente: ${aporteLabels[index]}`));
      assert.equal(summary.cardCount, aporteLabels.length, `KPIs Aportes incompletos em ${viewport.label}`);
      assert.equal(aportes.badgeExists, true, `badge de operação ausente em ${viewport.label}`);
      assert.ok(aportes.badgeContrast >= 4.5, `contraste Compra ${aportes.badgeContrast.toFixed(2)} em ${viewport.label}`);
      assert.equal(aportes.overflow, false, `overflow Aportes em ${viewport.label}`);
      const lightContrast = await page.evaluate(() => {
        document.documentElement.dataset.theme = 'light';
        const parse = value => { const match = value.match(/rgba?\\(([^)]+)\\)/); if (match) { const p = match[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; } const hexMatch = value.match(/#([0-9a-f]{6})/i); if (!hexMatch) return null; const hex = hexMatch[1]; return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4), 16), a: 1 }; };
        const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
        const lum = c => [c.r, c.g, c.b].map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        const badge = document.querySelector('.aporte-kind'); const style = getComputedStyle(badge);
        let bg = parse(style.backgroundColor) || { r: 246, g: 249, b: 252, a: 1 }; let parent = badge.parentElement;
        while (bg.a < 1 && parent) { const candidate = parse(getComputedStyle(parent).backgroundColor); if (candidate) bg = blend(bg, candidate); parent = parent.parentElement; }
        const fg = parse(style.color) || { r: 21, g: 128, b: 61, a: 1 }; return (Math.max(lum(fg), lum(bg)) + .05) / (Math.min(lum(fg), lum(bg)) + .05);
      });
      assert.ok(lightContrast >= 4.5, `contraste Compra light ${lightContrast.toFixed(2)} em ${viewport.label}`);
      assert.equal(errors.length, 0, `console/pageerror em ${viewport.label}: ${errors.join(' | ')}`);
      assert.equal(requestFailures.length, 0, `requestfailed em ${viewport.label}: ${requestFailures.join(' | ')}`);
      await context.close();
    } finally {
      await browser.close();
      harness.server.close();
    }
  });
}
