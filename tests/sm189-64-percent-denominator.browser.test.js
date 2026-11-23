'use strict';
// SM189.64 (A3): percentual sem denominador válido nunca aparece como +0,00% em Relatórios, PDF e exportação.
// Entrada controlada sobrescrevendo apenas cx() (origem de tI/tC/tG/tGP/appliedComplete); a saída é lida do
// DOM de Relatórios e do HTML gerado por reportPdfPreview() e reportCardPdfPreview('complete').
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { resolveChromePath } = require('./helpers/chrome-path');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { FROZEN_NOW } = require('./helpers/fase1-snapshot');
const { startLocalHttpServer } = require('./local-http-server');

// Valores não-JSON (NaN, null) são codificados como texto e decodificados dentro da página.
const CASES = [
  { id: 1, name: 'capital zero e resultado zero', portfolio: { tI: 0, tC: 0, tG: 0, tGP: 0, appliedComplete: true }, pct: null, money: 'R$ 0,00' },
  { id: 2, name: 'capital zero e resultado positivo', portfolio: { tI: 0, tC: 800, tG: 800, tGP: 0, appliedComplete: true }, pct: null, money: 'R$ 800,00' },
  { id: 3, name: 'capital zero e resultado negativo', portfolio: { tI: 0, tC: 0, tG: -200, tGP: 0, appliedComplete: true }, pct: null, money: '-R$ 200,00' },
  { id: 4, name: 'capital positivo e resultado positivo', portfolio: { tI: 1000, tC: 1500, tG: 500, tGP: 50, appliedComplete: true }, pct: '+50,00%', money: 'R$ 500,00' },
  { id: 5, name: 'capital positivo e resultado negativo', portfolio: { tI: 1000, tC: 600, tG: -400, tGP: -40, appliedComplete: true }, pct: '-40,00%', money: '-R$ 400,00' },
  { id: 6, name: 'dados ausentes', portfolio: { tI: 'null', tC: 'null', tG: 'null', tGP: 'null', appliedComplete: true }, pct: null },
  { id: 7, name: 'dados inválidos', portfolio: { tI: 'abc', tC: 'abc', tG: 'NaN', tGP: 'NaN', appliedComplete: true }, pct: null },
  { id: 8, name: 'cobertura parcial', portfolio: { tI: 1000, tC: 1500, tG: 500, tGP: 50, appliedComplete: false }, pct: null },
];

// Qualquer percentual zerado (+0,00% / -0,00% / 0,00%) é inválido quando não há denominador.
const ZERO_PERCENT = /(^|[^\d,])[+-]?0,00%/;

function decode(value) {
  if (value === 'null') return null;
  if (value === 'NaN') return NaN;
  return value;
}

async function openWithPortfolio(browser, url, portfolio) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await applyRichFixture(page, new Date(FROZEN_NOW));
  await page.evaluate(raw => {
    const decode = value => (value === 'null' ? null : value === 'NaN' ? NaN : value);
    const realCx = window.cx;
    const overrides = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, decode(value)]));
    window.cx = () => ({ ...realCx(), ...overrides });
  }, Object.fromEntries(Object.entries(portfolio).map(([key, value]) => [key, typeof value === 'number' && !Number.isFinite(value) ? 'NaN' : value === null ? 'null' : value])));
  await page.evaluate(() => go('relatorios'));
  await page.waitForSelector('.reports-kpis');
  return { page, errors };
}

test.describe('SM189.64 — percentual com denominador inválido vira "—"', () => {
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

  for (const scenario of CASES) {
    test(`caso ${scenario.id} — ${scenario.name}`, async () => {
      const { page, errors } = await openWithPortfolio(browser, server.url, scenario.portfolio);
      try {
        const view = await page.evaluate(() => {
          const kpi = [...document.querySelectorAll('.reports-kpi')].find(el => el.querySelector('.label')?.textContent.trim() === 'Resultado');
          const evolution = [...document.querySelectorAll('span')].find(el => el.textContent.trim() === 'Evolução')?.parentElement;
          return {
            resultValue: kpi?.querySelector('.value')?.textContent.trim() ?? null,
            resultSub: kpi?.querySelector('.sub')?.textContent.trim() ?? null,
            evolutionSmall: evolution?.querySelector('small')?.textContent.trim() ?? null,
          };
        });
        assert.ok(view.resultSub !== null, 'subtítulo do Resultado renderizado');
        assert.ok(view.evolutionSmall !== null, 'linha Evolução renderizada');
        if (scenario.pct === null) {
          assert.match(view.resultSub, /Rentabilidade — sobre o aplicado/, `subtítulo: ${view.resultSub}`);
          assert.match(view.evolutionSmall, /^— sobre o aplicado$/, `evolução: ${view.evolutionSmall}`);
          assert.doesNotMatch(view.resultSub, ZERO_PERCENT);
          assert.doesNotMatch(view.evolutionSmall, ZERO_PERCENT);
        } else {
          assert.ok(view.resultSub.includes(scenario.pct), `subtítulo deve mostrar ${scenario.pct}: ${view.resultSub}`);
          assert.ok(view.evolutionSmall.includes(scenario.pct), `evolução deve mostrar ${scenario.pct}: ${view.evolutionSmall}`);
        }
        if (scenario.money) {
          // Intl usa espaço não separável (U+00A0) entre "R$" e o número.
          assert.equal(view.resultValue.replace(/ /g, ' '), scenario.money, 'valor monetário legítimo preservado');
        }
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });

    test(`caso ${scenario.id} — PDF e exportação completa sem +0,00% — ${scenario.name}`, async () => {
      const { page, errors } = await openWithPortfolio(browser, server.url, scenario.portfolio);
      try {
        const html = await page.evaluate(() => `${reportPdfPreview()}\n${reportCardPdfPreview('complete')}`);
        // Escopo: só rentabilidade de capital. "Meta atingida" tem denominador próprio (a meta) e não entra aqui.
        const capitalWindows = [...html.matchAll(/Rentabilidade|Resultado percentual|sobre o aplicado|sobre capital aplicado/g)]
          .map(match => html.slice(Math.max(0, match.index - 200), match.index + 200));
        assert.ok(capitalWindows.length > 0, 'rótulos de rentabilidade presentes no PDF/exportação');
        if (scenario.pct === null) {
          const offending = capitalWindows.find(windowText => ZERO_PERCENT.test(windowText));
          const snippet = offending ? offending.replace(/<[^>]+>/g, ' | ').replace(/\s+/g, ' ') : '';
          assert.equal(offending, undefined, `rentabilidade de capital zerada sem denominador. Trecho: ${snippet}`);
          assert.ok(capitalWindows.some(windowText => windowText.includes('—')), 'PDF/exportação devem mostrar "—" na rentabilidade');
        } else {
          assert.ok(capitalWindows.some(windowText => windowText.includes(scenario.pct)), `PDF/exportação devem mostrar ${scenario.pct} na rentabilidade`);
        }
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });
  }
});
