'use strict';
// SM189.63 (A1 + A2): o indicador de sinal do Resultado (Relatórios) e do card de Renda Fixa
// deve refletir o sinal real renderizado. Ausência (null/undefined/NaN/texto) nunca vira ganho.
// Entrada controlada sobrescrevendo apenas o valor de origem (cx().tG e rfIntelligenceSnapshot().totalProfit);
// a classe CSS é lida do DOM renderizado por reportsTab(), não de uma expressão isolada.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { resolveChromePath } = require('./helpers/chrome-path');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { FROZEN_NOW } = require('./helpers/fase1-snapshot');
const { startLocalHttpServer } = require('./local-http-server');

const CASES = [
  ['positivo', { kind: 'number', value: 500 }, 'positive'],
  ['negativo', { kind: 'number', value: -500 }, 'negative'],
  ['negativo pequeno', { kind: 'number', value: -0.01 }, 'negative'],
  ['zero exato', { kind: 'number', value: 0 }, 'neutral'],
  ['null', { kind: 'null' }, 'neutral'],
  ['undefined', { kind: 'undefined' }, 'neutral'],
  ['NaN', { kind: 'nan' }, 'neutral'],
  ['texto inválido', { kind: 'text', value: 'abc' }, 'neutral'],
];

async function openReports(browser, url, stub) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await applyRichFixture(page, new Date(FROZEN_NOW));
  await page.evaluate(stub.script, stub.arg);
  await page.evaluate(() => go('relatorios'));
  await page.waitForSelector('.reports-kpis');
  return { page, errors };
}

function toneOf(classList, prefix) {
  const found = classList.filter(name => name === `${prefix}-positive` || name === `${prefix}-negative` || name === `${prefix}-neutral`);
  return found.map(name => name.slice(prefix.length + 1));
}

test.describe('SM189.63 — sinal do Resultado e da Renda Fixa renderizados', () => {
  let server;
  let browser;
  test.before(async () => {
    const { chromium } = await import('playwright-core');
    const executablePath = resolveChromePath();
    assert.ok(executablePath, 'Chrome/Edge não encontrado (defina CHROME_PATH)');
    server = await startLocalHttpServer(path.join(__dirname, '..'));
    browser = await chromium.launch({ executablePath, headless: true });
  });
  test.after(async () => {
    if (browser) await browser.close();
    if (server) server.server.close();
  });

  for (const [label, input, expected] of CASES) {
    test(`A1 Resultado (Relatórios) — ${label} → ${expected}`, async () => {
      const { page, errors } = await openReports(browser, server.url, {
        arg: { value: input.kind === 'number' || input.kind === 'text' ? input.value : null, kind: input.kind },
        script: ({ value, kind }) => {
          const materialized = kind === 'undefined' ? undefined : kind === 'nan' ? NaN : value;
          const realCx = window.cx;
          window.cx = () => ({ ...realCx(), tG: materialized });
        },
      });
      try {
        const classes = await page.evaluate(() => {
          const card = [...document.querySelectorAll('.reports-kpi')].find(el => el.querySelector('.label')?.textContent.trim() === 'Resultado');
          return card ? [...card.classList] : null;
        });
        assert.ok(classes, 'card Resultado não renderizado');
        assert.deepEqual(toneOf(classes, 'reports-kpi'), [expected], `classes do card: ${classes.join(' ')}`);
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });
  }

  for (const [label, input, expected] of CASES) {
    test(`A2 Renda Fixa (card) — ${label} → ${expected}`, async () => {
      const { page, errors } = await openReports(browser, server.url, {
        arg: { value: input.kind === 'number' || input.kind === 'text' ? input.value : null, kind: input.kind },
        script: ({ value, kind }) => {
          const materialized = kind === 'undefined' ? undefined : kind === 'nan' ? NaN : value;
          const realRf = window.rfIntelligenceSnapshot;
          window.rfIntelligenceSnapshot = () => ({ ...realRf(), totalProfit: materialized });
        },
      });
      try {
        const classes = await page.evaluate(() => {
          const panel = [...document.querySelectorAll('article.reports-panel')].find(el => el.querySelector('h2')?.textContent.trim() === 'Renda Fixa');
          const strong = panel?.querySelector('strong[class*="reports-"]');
          return strong ? [...strong.classList] : null;
        });
        assert.ok(classes, 'valor da Renda Fixa não renderizado');
        assert.deepEqual(toneOf(classes, 'reports'), [expected], `classes do valor: ${classes.join(' ')}`);
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });
  }
});
