'use strict';
const path = require('node:path');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const { applyRichFixture } = require('./fp-rich-fixture');
const { syntheticRfTitles } = require('./v17-fin-fixture');
const { resolveChromePath } = require('./chrome-path');

const repo = path.join(__dirname, '..', '..');
const ROUTES = ['dashboard', 'ativos', 'aportes', 'dividendos', 'analise', 'patrimonio', 'rentabilidade', 'renda-fixa', 'metas', 'ajudar', 'relatorios', 'irpf', 'ia', 'confiabilidade', 'importacao', 'settings', 'auditoria', 'corporate-eventos'];
const PATTERNS = [
  ['versão/código interno', /\bV\d{3,4}\b|\(M\d{4}\)|\bM\d{4}\b/g],
  ['enum', /\b[A-Z]{3,}(?:_[A-Z0-9]{2,})+\b/g],
  ['inglês', /Alert Center|Corporate Events|SHADOW|\bwrites?\b|\bfixture\b|valuation|\bfallback\b|\bshadow\b/gi],
  ['tag técnica', /\b(?:fixed-income|data-quality|concentration)\b ·|· (?:fixed-income|data-quality|concentration)\b/g],
  ['sem acento', /\b(?:Preco|preco|aquisicao|invalido|confiavel|Reconciliacao|Identificacao|Movimentacoes|Possiveis|Atencao|Referencia|nao )\b/g],
];

(async () => {
  const h = await startLocalHttpServer(repo);
  const b = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  const found = {};
  try {
    for (const mode of ['completo', 'parcial']) {
      const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
      await p.goto(h.url);
      await applyRichFixture(p);
      if (mode === 'parcial') await p.evaluate(t => { const keep = S.assets.filter(a => a.type !== 'Renda Fixa'); S.assets = [...keep, ...JSON.parse(JSON.stringify(t))]; S.wallets[0].assets = JSON.parse(JSON.stringify(S.assets)); render(); }, syntheticRfTitles());
      for (const r of ROUTES) {
        await p.evaluate(x => go(x), r);
        await p.waitForTimeout(300);
        await p.evaluate(() => document.querySelectorAll('#root details').forEach(d => { d.open = true; }));
        const text = await p.evaluate(() => document.querySelector('.wrap').innerText);
        for (const [name, re] of PATTERNS) {
          for (const m of text.matchAll(re)) {
            const key = `${name} | ${m[0]}`;
            found[key] = found[key] || new Set();
            found[key].add(r);
          }
        }
      }
      await p.close();
    }
  } finally {
    await b.close();
    h.server.close();
  }
  const rows = Object.entries(found).sort();
  console.log('ocorrências distintas:', rows.length);
  rows.forEach(([k, v]) => console.log(k, '=>', [...v].join(',')));
})();
