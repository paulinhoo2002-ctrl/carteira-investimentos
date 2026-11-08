const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV17Fixture } = require('./helpers/v17-fin-fixture');

const chrome = require('./helpers/chrome-path').resolveChromePath();
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const routes = ['renda-fixa', 'rentabilidade', 'relatorios', 'irpf'];

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

// Qualidade visual das quatro telas financeiras: sem overflow, texto legível, sem cor inline legada e sem erro de página.
for (const [width, theme] of [[1366, 'dark'], [1366, 'light'], [390, 'dark'], [390, 'light']]) {
  test(`V17 - telas financeiras legíveis e sem overflow (${width}px, ${theme})`, async () => {
    await withPage(width, theme, async (page, errors) => {
      const problems = [];
      for (const route of routes) {
        await page.evaluate(name => go(name), route);
        await page.waitForTimeout(250);
        const report = await page.evaluate(() => {
          const root = document.querySelector('.wrap');
          let tiny = 0;
          let inlineHex = 0;
          root.querySelectorAll('*').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none') return;
            const own = [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim());
            if (own && parseFloat(cs.fontSize) < 11) tiny++;
            if (/color:\s*#[0-9a-f]{3,8}/i.test(el.getAttribute('style') || '')) inlineHex++;
          });
          return { tiny, inlineHex, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        });
        if (report.tiny) problems.push(`${route}: ${report.tiny} textos < 11px`);
        if (report.overflow > 1) problems.push(`${route}: overflow horizontal ${report.overflow}px`);
        if (route !== 'irpf' && report.inlineHex) problems.push(`${route}: ${report.inlineHex} cores inline hexadecimais`);
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(problems, []);
    });
  });
}

test('V17 - Renda Fixa mantém semântica financeira (zero legítimo, valor ausente, vencimentos) e privacidade', async () => {
  await withPage(1366, 'dark', async page => {
    await page.evaluate(() => go('renda-fixa'));
    await page.waitForTimeout(250);
    const text = await page.locator('.premium-rf-position-list').innerText();
    assert.match(text, /QARFZ01[\s\S]*Resultado da posição\s+R\$\s*0,00/, 'resultado zero legítimo continua visível como R$ 0,00');
    assert.match(text, /QARFD01[\s\S]*Atualização necessária/, 'título sem valor atual não vira zero');
    assert.match(text, /QARFD01[\s\S]*Resultado da posição —/, 'resultado indisponível mostra travessão');
    assert.match(text, /QARFP01[\s\S]*Resultado da posição\s+-\s+R\$\s*120,00/, 'prejuízo mantém sinal');
    assert.ok(await page.locator('.premium-rf-maturity-badge.warn').count() >= 1, 'selo de vencimento próximo presente');
    await page.evaluate(() => { S.hideValues = true; render(); });
    await page.waitForTimeout(200);
    const hidden = await page.locator('.premium-rf-page').innerText();
    assert.doesNotMatch(hidden, /13\.250,00|12\.000,00|4\.880,00/, 'valores sintéticos ocultos com a privacidade ativa');
  });
});

test('V17 - axe sem violações nas quatro telas (claro e escuro, desktop e mobile)', async () => {
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

// Privacidade: com "Ocultar valores", a quantidade de cada posição não pode aparecer em Ativos (tabela, cartões, atributos acessíveis).
test('V17 - Ocultar valores esconde a quantidade das posições em Ativos (desktop e mobile)', async () => {
  for (const width of [1366, 390]) {
    const harness = await startLocalHttpServer(path.join(__dirname, '..'));
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    try {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => { S.hideValues = true; go('ativos'); });
      await page.waitForTimeout(250);
      const total = Math.min(await page.locator('#root details:not([open]) > summary:visible').count(), 8);
      for (let i = 0; i < total; i++) await page.locator('#root details:not([open]) > summary:visible').first().click().catch(() => {});
      const leaks = await page.evaluate(() => {
        const quantities = [...new Set(S.assets.filter(a => a.type !== 'Renda Fixa').map(a => String(a.qty ?? a.quantity)).filter(q => /^\d{2,}$/.test(q)))];
        const root = document.getElementById('root');
        const attrs = [...root.querySelectorAll('*')].flatMap(el => [...el.attributes].filter(a => /^(aria-|title|alt|data-)/.test(a.name)).map(a => a.value));
        const haystack = [root.innerText, ...attrs].join('\n');
        return quantities.filter(q => new RegExp(`(^|[^\d.,])${q}([^\d.,]|$)`).test(haystack));
      });
      assert.deepEqual(leaks, [], `quantidades visíveis em Ativos a ${width}px`);
    } finally {
      await browser.close();
      harness.server.close();
    }
  }
});

test('V17 - Ocultar valores esconde quantidade (Relatórios fiscal) e valor na identificação da Auditoria', async () => {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    for (const route of ['relatorios', 'auditoria']) {
      await page.evaluate(name => { S.hideValues = true; go(name); }, route);
      await page.waitForTimeout(250);
      const total = Math.min(await page.locator('#root details:not([open]) > summary:visible').count(), 10);
      for (let i = 0; i < total; i++) await page.locator('#root details:not([open]) > summary:visible').first().click().catch(() => {});
      const found = await page.evaluate(() => {
        const text = document.getElementById('root').innerText;
        const quantities = [...new Set(S.assets.filter(a => a.type !== 'Renda Fixa').map(a => String(a.qty)).filter(q => /^\d{2,}$/.test(q)))];
        return {
          qty: quantities.filter(q => new RegExp(`\t${q}\t`).test(text)),
          value: /Valor\s+\d/.test(text),
        };
      });
      assert.deepEqual(found, { qty: [], value: false }, `exposição em ${route}`);
    }
  } finally {
    await browser.close();
    harness.server.close();
  }
});
