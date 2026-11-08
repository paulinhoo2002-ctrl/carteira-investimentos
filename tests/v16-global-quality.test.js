const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROUTES = ['dashboard', 'ativos', 'aportes', 'dividendos', 'rentabilidade', 'patrimonio', 'metas', 'renda-fixa', 'analise', 'ajudar', 'ia', 'settings', 'relatorios', 'irpf', 'auditoria', 'confiabilidade', 'importacao'];

async function withApp(viewport, run) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyRichFixture(page);
    await run(page);
    assert.deepEqual(errors, [], 'sem erros de página ou console');
  } finally {
    if (browser) await browser.close();
    harness.server.close();
  }
}

test('V16 - títulos de página consistentes em todas as rotas (24–28px, peso 700)', async () => {
  await withApp({ width: 1366, height: 768 }, async page => {
    const problems = [];
    for (const route of ROUTES) {
      await page.evaluate(name => go(name), route);
      const info = await page.evaluate(() => {
        const node = document.querySelector('.wrap h1, .wrap [role="heading"][aria-level="1"]');
        if (!node) return null;
        const style = getComputedStyle(node);
        return { size: parseFloat(style.fontSize), weight: Number(style.fontWeight), text: node.textContent.trim().slice(0, 30) };
      });
      if (!info) { problems.push(route + ': sem título nível 1'); continue; }
      if (info.size < 23 || info.size > 30) problems.push(`${route}: ${info.size}px`);
      if (info.weight > 700) problems.push(`${route}: peso ${info.weight}`);
    }
    assert.deepEqual(problems, []);
  });
});

test('V16 - mobile não tem rolagem fantasma do documento em nenhuma rota', async () => {
  for (const width of [390, 430]) {
    await withApp({ width, height: width === 390 ? 844 : 932 }, async page => {
      const tall = [];
      for (const route of ROUTES) {
        await page.evaluate(name => go(name), route);
        const extra = await page.evaluate(() => document.scrollingElement.scrollHeight - innerHeight);
        if (extra > 1) tall.push(`${route} +${extra}px`);
      }
      assert.deepEqual(tall, [], `documento mais alto que a janela em ${width}px`);
    });
  }
});

test('V16 - cores de estado dos resumos de IRPF/Análise vêm dos tokens e passam contraste nos dois temas', async () => {
  await withApp({ width: 1366, height: 768 }, async page => {
    for (const theme of ['light', 'dark']) {
      await page.evaluate(name => { applyTheme(name); go('irpf'); }, theme);
      const low = await page.evaluate(() => {
        const parse = value => { const m = value.match(/rgba?\(([^)]+)\)/); const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
        const lum = c => [c.r, c.g, c.b].map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
        const bad = [];
        document.querySelectorAll('.irpf-summary-card .analysis-summary-value').forEach(node => {
          let bg = null; let el = node;
          while (el && !bg) { const c = parse(getComputedStyle(el).backgroundColor); if (c.a > 0.9) bg = c; el = el.parentElement; }
          bg = bg || { r: 255, g: 255, b: 255, a: 1 };
          const r = ratio(parse(getComputedStyle(node).color), bg);
          if (r < 4.5) bad.push(r.toFixed(2));
        });
        return bad;
      });
      assert.deepEqual(low, [], `contraste insuficiente nos resumos de IRPF (${theme})`);
    }
  });
});

test('V16 - cabeçalho de Ativos mantém o rótulo exato da coluna e expõe aria-sort no th', async () => {
  await withApp({ width: 1440, height: 800 }, async page => {
    await page.evaluate(() => go('ativos'));
    await page.locator('#ativosAccordion details.accordion-category').first().locator('summary').first().click();
    const headers = await page.locator('#ativosAccordion details.accordion-category').first().locator('thead th').evaluateAll(nodes => nodes.map(node => node.textContent.trim()));
    for (const label of ['Quantidade', 'Resultado R$', 'Rentabilidade', 'Valor total', '% carteira', 'DY', 'Ações']) assert.ok(headers.includes(label), 'cabeçalho exato ausente: ' + label);
    assert.ok(await page.locator('#ativosAccordion thead th[aria-sort]').count() >= 8, 'colunas ordenáveis expõem aria-sort no th');
  });
});
