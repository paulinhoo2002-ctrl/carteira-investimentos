const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV17Fixture } = require('./helpers/v17-fin-fixture');

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const routes = ['dashboard', 'dividendos', 'confiabilidade', 'importacao', 'ia', 'auditoria'];

async function withPage(width, theme, fn) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height: width > 800 ? 900 : 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyV17Fixture(page);
    await page.evaluate(name => applyTheme(name), theme);
    await fn(page, errors);
  } finally {
    await browser.close();
    harness.server.close();
  }
}

// Legibilidade, overflow e cores inline nas telas da V19 (conteúdo recolhido aberto para auditar também o que está escondido).
for (const [width, theme] of [[1366, 'dark'], [1366, 'light'], [390, 'dark'], [390, 'light']]) {
  test(`V19 - telas legíveis e sem overflow (${width}px, ${theme})`, async () => {
    await withPage(width, theme, async (page, errors) => {
      const problems = [];
      for (const route of routes) {
        await page.evaluate(name => go(name), route);
        await page.waitForTimeout(250);
        await page.evaluate(() => document.querySelectorAll('#root details').forEach(item => { item.open = true; }));
        const report = await page.evaluate(() => {
          const root = document.querySelector('.wrap');
          let tiny = 0;
          let inlineHex = 0;
          root.querySelectorAll('*').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || el.closest('svg')) return;
            const own = [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim());
            if (own && parseFloat(cs.fontSize) < 11) tiny++;
            if (/color:\s*#[0-9a-f]{3,8}/i.test(el.getAttribute('style') || '')) inlineHex++;
          });
          return { tiny, inlineHex, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        });
        if (report.tiny) problems.push(`${route}: ${report.tiny} textos < 11px`);
        if (report.overflow > 1) problems.push(`${route}: overflow horizontal ${report.overflow}px`);
        if (report.inlineHex) problems.push(`${route}: ${report.inlineHex} cores inline hexadecimais`);
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(problems, []);
    });
  });
}

test('V19 - Dashboard: três KPIs protagonistas na ordem pedida, numa só superfície, antes da análise', async () => {
  await withPage(1366, 'dark', async page => {
    await page.evaluate(() => go('dashboard'));
    await page.waitForTimeout(250);
    const info = await page.evaluate(() => {
      const kpis = document.querySelector('.dashboard-executive-kpis');
      const labels = [...kpis.querySelectorAll('.premium-metric-label')].slice(0, 3).map(el => el.textContent.trim());
      const cards = [...kpis.querySelectorAll('.premium-metric')].slice(0, 3);
      const analytic = document.querySelector('.dashboard-analytical-primary');
      return {
        labels,
        containerBorder: getComputedStyle(kpis).borderTopWidth,
        cardBorders: cards.map(card => getComputedStyle(card).borderTopWidth),
        heroLarger: parseFloat(getComputedStyle(cards[0].querySelector('.premium-metric-value')).fontSize) > parseFloat(getComputedStyle(cards[1].querySelector('.premium-metric-value')).fontSize),
        kpisBeforeAnalysis: !!(kpis.compareDocumentPosition(analytic) & Node.DOCUMENT_POSITION_FOLLOWING),
        greeting: /^(Bom dia|Boa tarde|Boa noite|Boa madrugada)/.test(document.querySelector('.dashboard-page-sub').textContent.trim()),
      };
    });
    assert.match(info.labels[0], /Patrim[ôo]nio atual/);
    assert.match(info.labels[1], /(Total|Valor) investido/);
    assert.match(info.labels[2], /Recebido no m[êe]s/);
    assert.equal(info.containerBorder, '1px', 'KPIs numa única superfície');
    assert.deepEqual(info.cardBorders.map(width => width), ['0px', '0px', '0px'], 'cartões internos sem caixa própria');
    assert.ok(info.heroLarger, 'Patrimônio atual é o valor protagonista');
    assert.ok(info.kpisBeforeAnalysis);
    assert.ok(info.greeting, 'saudação discreta no subtítulo');
  });
});

test('V19 - Dashboard mobile empilha os KPIs em uma coluna sem overflow', async () => {
  await withPage(390, 'dark', async page => {
    await page.evaluate(() => go('dashboard'));
    await page.waitForTimeout(250);
    const columns = await page.evaluate(() => getComputedStyle(document.querySelector('.dashboard-executive-kpis')).gridTemplateColumns.trim().split(/\s+/).length);
    assert.equal(columns, 1);
  });
});

test('V19 - Dividendos: gráfico e ranking antes da tabela, tabela mensal recolhida por padrão e botões legíveis', async () => {
  for (const theme of ['dark', 'light']) {
    await withPage(1366, theme, async page => {
      await page.evaluate(() => go('dividendos'));
      await page.waitForTimeout(250);
      const info = await page.evaluate(() => {
        const grid = document.querySelector('.dividend-primary-grid');
        const history = document.querySelector('.dividend-history-block');
        const table = history.querySelector('details.div-monthly-table-block');
        const parse = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
        const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const button = document.querySelector('.div-premium-canon-actions .btn.bgh');
        let backdrop = button; let bg = 'rgba(0, 0, 0, 0)';
        while (backdrop && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { bg = getComputedStyle(backdrop).backgroundColor; backdrop = backdrop.parentElement; }
        const l1 = lum(parse(getComputedStyle(button).color)); const l2 = lum(parse(bg));
        return {
          chartFirst: !!(grid.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING),
          tableClosed: !table.open,
          contrast: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05),
        };
      });
      assert.ok(info.chartFirst, `gráfico e ranking antes do histórico (${theme})`);
      assert.ok(info.tableClosed, `histórico mensal recolhido por padrão (${theme})`);
      assert.ok(info.contrast >= 4.5, `botão Exportar com contraste ${info.contrast.toFixed(2)} (${theme})`);
    });
  }
});

test('V19 - Dividendos mobile: quatro KPIs uniformes em 2 colunas, rótulos >= 12px', async () => {
  await withPage(390, 'dark', async page => {
    await page.evaluate(() => go('dividendos'));
    await page.waitForTimeout(250);
    const info = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.dividend-executive-kpi')];
      return {
        columns: getComputedStyle(document.querySelector('.dividend-kpis-canon-grid')).gridTemplateColumns.trim().split(/\s+/).length,
        spans: cards.map(card => getComputedStyle(card).gridColumnStart + '/' + getComputedStyle(card).gridColumnEnd),
        labels: cards.map(card => parseFloat(getComputedStyle(card.querySelector('.dividend-executive-kpi-label')).fontSize)),
        values: cards.map(card => parseFloat(getComputedStyle(card.querySelector('.dividend-executive-kpi-value')).fontSize)),
      };
    });
    assert.equal(info.columns, 2);
    assert.ok(info.spans.every(span => span === 'auto/auto'), 'nenhum cartão ocupa linha inteira');
    assert.ok(info.labels.every(size => size >= 12));
    assert.equal(new Set(info.values).size, 1, 'valores com o mesmo tamanho');
  });
});

test('V19 - Dividendos preserva ausência: projeção anual sem 12 meses continua indisponível, nunca zero', async () => {
  await withPage(1366, 'dark', async page => {
    await page.evaluate(() => go('dividendos'));
    await page.waitForTimeout(250);
    const text = await page.locator('.dividend-kpis-canon-grid').innerText();
    assert.match(text, /Proje[çc][ãa]o anual[\s\S]*Indispon[íi]vel/);
    assert.doesNotMatch(text, /Proje[çc][ãa]o anual\s*R\$\s*0,00/);
    assert.match(text, /M[ée]dia mensal\s*[—-]/);
  });
});

test('V19 - Auditoria recolhe listas longas sem perder nenhum alerta do DOM e abre sozinha quando há filtro', async () => {
  await withPage(1366, 'dark', async page => {
    await page.evaluate(() => go('auditoria'));
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => ({
      folds: [...document.querySelectorAll('.audit-fold')].map(item => ({ open: item.open, count: item.querySelectorAll('article').length })),
      height: document.documentElement.scrollHeight,
    }));
    assert.ok(info.folds.length >= 1);
    assert.ok(info.folds.some(item => !item.open && item.count > 12), 'lista longa recolhida');
    assert.ok(info.folds.every(item => item.count >= 1), 'itens continuam no DOM');
    assert.ok(info.height < 8000, `página da Auditoria não passa de 8000px (${info.height})`);
  });
});

test('V19 - Sidebar mostra o rótulo completo "Confiabilidade" sem corte', async () => {
  await withPage(1366, 'dark', async page => {
    await page.evaluate(() => { document.querySelector('.nav-advanced').open = true; });
    const info = await page.evaluate(() => {
      const button = [...document.querySelectorAll('nav .tab')].find(item => item.getAttribute('aria-label') === 'Confiabilidade');
      const label = button?.querySelector('span:not(.side-nav-icon)');
      return { found: !!button, clipped: label ? label.scrollWidth > label.clientWidth + 1 : true };
    });
    assert.ok(info.found && !info.clipped);
  });
});

test('V19 - axe sem violações em Dashboard, Dividendos e telas de acabamento (claro/escuro, desktop/mobile)', async () => {
  const found = [];
  for (const [width, theme] of [[1366, 'dark'], [1366, 'light'], [390, 'dark'], [390, 'light']]) {
    await withPage(width, theme, async page => {
      await page.evaluate(source => { const script = document.createElement('script'); script.textContent = source; document.head.appendChild(script); }, axeSource);
      for (const route of routes) {
        await page.evaluate(name => go(name), route);
        await page.waitForTimeout(300);
        const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations.map(item => `${item.id} ${item.nodes[0].target.join(' ').slice(0, 70)}`));
        if (violations.length) found.push(`${route}@${width}${theme[0]}: ${violations.join('; ')}`);
      }
    });
  }
  assert.deepEqual(found, []);
});

// Privacidade global: com "Ocultar valores" nenhum valor monetário aparece em texto, gráficos SVG, legendas, atributos acessíveis ou conteúdo recolhido.
test('V19 - Ocultar valores não vaza R$ em texto, SVG, atributos e conteúdo recolhido (desktop e mobile)', async () => {
  for (const width of [1366, 390]) {
    await withPage(width, 'dark', async page => {
      await page.evaluate(() => { S.hideValues = true; });
      for (const route of routes) {
        await page.evaluate(name => go(name), route);
        await page.waitForTimeout(250);
        await page.evaluate(() => document.querySelectorAll('#root details').forEach(item => { item.open = true; }));
        const leaks = await page.evaluate(() => {
          const root = document.getElementById('root');
          const attrs = [...root.querySelectorAll('*')].flatMap(el => [...el.attributes].filter(a => /^(aria-|title|alt|data-)/.test(a.name)).map(a => a.value));
          const svg = [...root.querySelectorAll('svg text, svg title, svg desc')].map(el => el.textContent);
          return ([root.innerText, ...attrs, ...svg].join('\n').match(/R\$\s?-?\d[\d.]*,\d{2}/g) || []).slice(0, 3);
        });
        assert.deepEqual(leaks, [], `valores visíveis em ${route} a ${width}px`);
      }
    });
  }
});
