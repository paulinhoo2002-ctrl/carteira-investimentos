const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV17Fixture } = require('./helpers/v17-fin-fixture');

const chrome = require('./helpers/chrome-path').resolveChromePath();
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function withPage(width, theme, fn) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height: width > 800 ? 900 : 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await applyV17Fixture(page);
    await page.evaluate(name => applyTheme(name), theme);
    await fn(page, errors);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    harness.server.close();
  }
}

for (const width of [1366, 390]) {
  test(`V20 - Dashboard: chip aponta para o aviso sem mover o painel (${width}px)`, async () => {
    await withPage(width, 'dark', async page => {
      await page.evaluate(() => go('dashboard'));
      await page.waitForTimeout(300);
      const info = await page.evaluate(() => {
        const chip = document.querySelector('.dashboard-alert-chip');
        const panel = document.querySelector('#dashboard-priority');
        const kpis = document.querySelector('.dashboard-executive-kpis');
        return {
          chip: chip ? chip.textContent.trim() : '',
          label: chip ? chip.getAttribute('aria-label') : '',
          hasPanel: !!panel,
          panelAfterKpis: !!(kpis && panel && (kpis.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING)),
          chipInFold: chip ? chip.getBoundingClientRect().bottom <= innerHeight : false,
        };
      });
      assert.match(info.chip, /^\d+ pontos? de atenção$/);
      assert.match(info.label, /Ir para o aviso/);
      assert.ok(info.hasPanel && info.panelAfterKpis);
      assert.ok(info.chipInFold, 'chip visível na primeira dobra');
      await page.click('.dashboard-alert-chip');
      await page.waitForTimeout(800);
      const visible = await page.evaluate(() => {
        const r = document.querySelector('#dashboard-priority').getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight;
      });
      assert.ok(visible, 'clique leva o aviso à tela');
    });
  });
}

test('V20 - Dashboard mobile: Patrimônio em linha própria e demais KPIs lado a lado', async () => {
  await withPage(390, 'dark', async page => {
    await page.evaluate(() => go('dashboard'));
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.dashboard-executive-kpis .premium-metric')].map(c => c.getBoundingClientRect());
      return {
        n: cards.length,
        c: cards.map(c => ({ l: Math.round(c.left), t: Math.round(c.top), w: Math.round(c.width) })),
        ov: document.documentElement.scrollWidth - innerWidth,
      };
    });
    assert.equal(r.n, 3);
    assert.ok(r.c[0].w > r.c[1].w * 1.8, 'primeiro ocupa a linha');
    assert.equal(r.c[1].t, r.c[2].t, 'investido e recebido na mesma linha');
    assert.ok(r.c[2].l > r.c[1].l);
    assert.ok(r.ov <= 1);
    const meta = await page.evaluate(() => {
      const box = document.querySelector('.dashboard-page-heading-meta');
      return { clipped: box.scrollWidth - box.clientWidth, scrolled: box.scrollLeft, overflowX: getComputedStyle(box).overflowX };
    });
    assert.ok(meta.clipped <= 1 && meta.scrolled === 0, 'texto "Atualizado" não pode ficar cortado');
  });
});

for (const width of [1366, 1280, 1440]) {
  test(`V20 - Dividendos: matriz anual cabe sem rolagem horizontal (${width}px)`, async () => {
    await withPage(width, 'dark', async page => {
      await page.evaluate(() => go('dividendos'));
      await page.waitForTimeout(350);
      await page.evaluate(() => { document.querySelector('.div-monthly-table-block').open = true; });
      await page.waitForTimeout(200);
      const r = await page.evaluate(() => {
        const scroll = document.querySelector('.div-mat-scroll');
        const note = document.querySelector('.div-mat-note');
        return {
          sw: scroll.scrollWidth,
          cw: scroll.clientWidth,
          cells: [...document.querySelectorAll('.div-mat-table td.mat-val, .div-mat-table td.mat-absent')].map(c => c.textContent.trim()).filter(t => /[0-9]/.test(t)),
          total: document.querySelector('.div-mat-table td.mat-total').textContent,
          note: note ? note.textContent : '',
        };
      });
      assert.ok(r.sw <= r.cw + 1, `rolagem ${r.sw}>${r.cw}`);
      assert.ok(r.cells.length > 0);
      assert.ok(r.cells.every(c => !/R\$/.test(c) && /\d/.test(c)), 'células mensais sem prefixo e com valor');
      assert.match(r.total, /R\$/);
      assert.match(r.note, /Valores mensais em R\$/);
    });
  });
}

test('V20 - Dividendos mobile: rótulos do gráfico sem sobreposição', async () => {
  await withPage(390, 'dark', async page => {
    await page.evaluate(() => go('dividendos'));
    await page.waitForTimeout(350);
    const overlaps = await page.evaluate(() => {
      const rects = [...document.querySelectorAll('.fp-bars-x span')]
        .filter(s => getComputedStyle(s).visibility !== 'hidden' && s.textContent.trim())
        .map(s => {
          const range = document.createRange();
          range.selectNodeContents(s);
          const b = range.getBoundingClientRect();
          return { l: b.left, r: b.right };
        });
      let n = 0;
      for (let i = 1; i < rects.length; i++) if (rects[i].l < rects[i - 1].r) n++;
      return { n, count: rects.length };
    });
    assert.ok(overlaps.count >= 4);
    assert.equal(overlaps.n, 0);
  });
});

test('V20 - privacidade: matriz, KPIs e gráfico não vazam valores', async () => {
  for (const width of [1366, 390]) {
    await withPage(width, 'dark', async page => {
      await page.evaluate(() => { S.hideValues = true; });
      for (const route of ['dashboard', 'dividendos']) {
        await page.evaluate(name => go(name), route);
        await page.waitForTimeout(300);
        await page.evaluate(() => document.querySelectorAll('#root details').forEach(d => { d.open = true; }));
        const leaks = await page.evaluate(() => {
          const attrs = [...document.querySelectorAll('.wrap [title],.wrap [aria-label],.wrap [data-tip]')]
            .map(e => `${e.title} ${e.getAttribute('aria-label')} ${e.dataset.tip || ''}`).join(' ');
          const text = document.querySelector('.wrap').innerText + ' ' + attrs;
          return text.match(/\d{1,3}(\.\d{3})*,\d{2}/g) || [];
        });
        assert.deepEqual(leaks, [], `${route} ${width}`);
      }
    });
  }
});

test('V20 - axe sem violações em Dashboard e Dividendos (2 temas × 2 larguras)', async () => {
  for (const [width, theme] of [[1366, 'dark'], [1366, 'light'], [390, 'dark'], [390, 'light']]) {
    await withPage(width, theme, async page => {
      for (const route of ['dashboard', 'dividendos']) {
        await page.evaluate(name => go(name), route);
        await page.waitForTimeout(300);
        await page.evaluate(() => { const d = document.querySelector('.div-monthly-table-block'); if (d) d.open = true; });
        await page.evaluate(axeSource);
        const result = await page.evaluate(() => axe.run(document.querySelector('.wrap'), { runOnly: ['wcag2a', 'wcag2aa'] }));
        assert.deepEqual(result.violations.map(v => `${v.id}:${v.nodes.length}`), [], `${route} ${width} ${theme}`);
      }
    });
  }
});
