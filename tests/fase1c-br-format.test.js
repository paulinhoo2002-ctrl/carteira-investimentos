'use strict';
// C8 (F-09): percentuais exibidos em pt-BR (vírgula). Só apresentação: cálculos, CSS, exportações
// e dados continuam com ponto decimal.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { syntheticRfTitles } = require('./helpers/v17-fin-fixture');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');
const ROUTES = ['dashboard', 'ativos', 'aportes', 'dividendos', 'analise', 'patrimonio', 'rentabilidade', 'renda-fixa', 'metas', 'ajudar', 'relatorios', 'irpf', 'ia', 'confiabilidade', 'importacao', 'settings', 'auditoria', 'corporate-eventos'];

async function withPage(apply, fn) {
  const harness = await startLocalHttpServer(repo);
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await apply(page);
    await fn(page);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    harness.server.close();
  }
}
const partial = async page => {
  await applyRichFixture(page);
  await page.evaluate(titles => {
    const keep = S.assets.filter(asset => asset.type !== 'Renda Fixa');
    S.assets = [...keep, ...JSON.parse(JSON.stringify(titles))];
    S.wallets[0].assets = JSON.parse(JSON.stringify(S.assets));
    render();
  }, syntheticRfTitles());
};

test('fmtP usa vírgula; dados e cálculos seguem numéricos', async () => {
  await withPage(applyRichFixture, async page => {
    const r = await page.evaluate(() => ({
      positivo: fmtP(1.5), negativo: fmtP(-2.345), zero: fmtP(0), grande: fmtP(1234.567),
      numerico: Number((12.345).toFixed(1)),
      oculto: (() => { S.hideValues = true; const v = fmtP(5); S.hideValues = false; return v; })(),
    }));
    assert.equal(r.positivo, '+1,50%');
    assert.equal(r.negativo, '-2,35%');
    assert.equal(r.zero, '+0,00%');
    assert.equal(r.grande, '+1234,57%');
    assert.equal(r.numerico, 12.3);
    assert.equal(r.oculto, '••••');
  });
});

for (const [name, apply] of [['completo', applyRichFixture], ['parcial (RF sem valor atual)', partial]]) {
  test(`nenhuma tela mostra percentual com ponto decimal nem sinal duplicado — ${name}`, async () => {
    await withPage(apply, async page => {
      const offenders = [];
      for (const route of ROUTES) {
        await page.evaluate(target => go(target), route);
        await page.waitForTimeout(250);
        await page.evaluate(() => document.querySelectorAll('#root details').forEach(item => { item.open = true; }));
        const found = await page.evaluate(() => {
          const hits = [];
          const walker = document.createTreeWalker(document.querySelector('.wrap') || document.body, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) {
            const text = node.textContent;
            const dotted = text.match(/[+-]?\d+\.\d+\s?%/g);
            const doubled = text.match(/[+-]{2,}\d/g);
            if (dotted) hits.push(`ponto: ${dotted.join(', ')} em "${text.trim().replace(/\s+/g, ' ').slice(0, 50)}"`);
            if (doubled) hits.push(`sinal duplicado: ${doubled.join(', ')} em "${text.trim().replace(/\s+/g, ' ').slice(0, 50)}"`);
          }
          return hits;
        });
        found.forEach(item => offenders.push(`${route}: ${item}`));
      }
      assert.deepEqual(offenders, []);
    });
  });
}

test('CSS e atributos de dados continuam com ponto (nada de vírgula em style="...%" nem em data-*)', async () => {
  await withPage(applyRichFixture, async page => {
    const bad = [];
    for (const route of ROUTES) {
      await page.evaluate(target => go(target), route);
      await page.waitForTimeout(200);
      await page.evaluate(() => document.querySelectorAll('#root details').forEach(item => { item.open = true; }));
      const found = await page.evaluate(() => {
        const textual = new Set(['title', 'aria-label', 'aria-valuetext', 'aria-description', 'data-tip', 'alt', 'placeholder', 'content']);
        const hits = [];
        document.querySelectorAll('*').forEach(el => {
          [...el.attributes].forEach(attr => {
            if (!textual.has(attr.name) && /\d,\d+\s?%/.test(attr.value)) hits.push(`${el.tagName.toLowerCase()}[${attr.name}] ${attr.value.slice(0, 90)}`);
          });
        });
        return hits.slice(0, 4);
      });
      found.forEach(item => bad.push(`${route}: ${item}`));
    }
    assert.deepEqual(bad, [], 'vírgula em CSS quebraria a largura/altura');
  });
});

test('a vírgula de percentual não é aplicada em funções de exportação, backup, CSV, JSON, XLSX ou importação', () => {
  const source = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  const marker = String.fromCharCode(10) + 'function ';
  const chunks = source.split(marker).slice(1);
  const commaPercent = new RegExp("toFixed\\(\\d\\)\\.replace\\('\\.',','\\)\\}?%");
  const offenders = chunks.filter(chunk => {
    const name = chunk.slice(0, chunk.indexOf('('));
    return /csv|export|backup|json|xlsx|import/i.test(name) && commaPercent.test(chunk.slice(0, 6000));
  }).map(chunk => chunk.slice(0, chunk.indexOf('(')));
  assert.deepEqual(offenders, []);
});
