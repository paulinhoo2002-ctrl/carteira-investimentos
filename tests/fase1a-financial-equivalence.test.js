'use strict';
// Fase 1a — Auditoria de equivalência financeira (somente leitura).
// Compara a referência `origin/main` com a árvore atual usando fixtures 100% sintéticas
// (tests/helpers/fp-rich-fixture e v17-fin-fixture). Não altera index.html nem dados.
// Achados abertos ficam como `todo` (visíveis no relatório, sem quebrar a suíte):
// veja docs/ai/FASE1_AUDITORIA_EQUIVALENCIA.md.
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { applyV17Fixture } = require('./helpers/v17-fin-fixture');

const repo = path.join(__dirname, '..');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const git = args => execFileSync('git', ['--no-optional-locks', ...args], { cwd: repo, maxBuffer: 256 * 1024 * 1024 });

const STABLE_ROUTES = ['ativos', 'aportes', 'analise', 'patrimonio', 'rentabilidade', 'renda-fixa', 'ajudar', 'relatorios', 'irpf', 'ia', 'confiabilidade'];
const STATES = {
  rich: page => applyRichFixture(page),
  partial: page => applyV17Fixture(page),
  noquotes: async page => { await applyRichFixture(page); await page.evaluate(() => { S.quotes = {}; render(); }); },
  empty: async page => {
    await applyRichFixture(page);
    await page.evaluate(() => {
      S.assets = []; S.aportes = []; S.proventos = []; S.rfEvents = []; S.quotes = {};
      const w = S.wallets && S.wallets[0];
      if (w) { w.assets = []; w.aportes = []; w.proventos = []; w.rfEvents = []; }
      render();
    });
  },
};

const tokens = text => {
  const out = [];
  (text.match(/R\$\s?-?[\d.]+,\d{2}/g) || []).forEach(x => out.push('$' + x.replace(/R\$\s?/, '')));
  (text.match(/[+-]?\d+(?:[.,]\d+)?%/g) || []).forEach(x => out.push('%' + x.replace(',', '.')));
  return out.sort();
};
const valueAfter = (text, label) => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const index = lines.findIndex(line => line.toLowerCase() === label.toLowerCase());
  if (index < 0) return null;
  return lines.slice(index + 1).find(line => line !== 'ⓘ') ?? null;
};

async function collect(root) {
  const harness = await startLocalHttpServer(root);
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const result = {};
  try {
    for (const [name, apply] of Object.entries(STATES)) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await apply(page);
      const state = { errors, routes: {} };
      state.portfolio = await page.evaluate(() => { const c = cx(); return { tC: c.tC, tI: c.tI, tG: c.tG, tGP: c.tGP, appliedComplete: c.appliedComplete }; });
      for (const route of ['dashboard', 'dividendos', ...STABLE_ROUTES]) {
        await page.evaluate(name => go(name), route);
        await page.waitForTimeout(250);
        await page.evaluate(() => document.querySelectorAll('#root details').forEach(d => { d.open = true; }));
        state.routes[route] = await page.evaluate(() => (document.querySelector('.wrap') || document.body).innerText);
      }
      await page.evaluate(() => go('dashboard'));
      await page.waitForTimeout(200);
      state.cards = await page.evaluate(() => [...document.querySelectorAll('.premium-metric')].map(card => ({
        label: (card.querySelector('.premium-metric-label')?.textContent || '').trim(),
        value: (card.querySelector('.premium-metric-value')?.textContent || '').trim(),
        text: card.textContent.replace(/\s+/g, ' ').trim(),
      })));
      if (name === 'rich') {
        state.dividends = await page.evaluate(() => {
          const rows = S.proventos;
          return {
            matrix: JSON.stringify(dividendAnnualMatrixData(rows)),
            assetSummary: String(dividendAssetSummary(rows)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            byAsset: String(dividendsByAssetView(rows)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '),
          };
        });
        await page.evaluate(() => go('dividendos'));
        await page.waitForTimeout(250);
        state.payers = await page.evaluate(() => [...document.querySelectorAll('.fp-payer')].map(li => ({
          ticker: li.querySelector('.fp-payer-name')?.textContent.trim(),
          value: li.querySelector('.fp-payer-value')?.textContent.trim(),
          share: li.querySelector('.fp-payer-share')?.textContent.trim(),
        })));
        state.fixtureAssets = await page.evaluate(() => JSON.parse(JSON.stringify(S.assets)));
        state.fixtureQuotes = await page.evaluate(() => JSON.parse(JSON.stringify(S.quotes)));
        state.qty = await page.evaluate(() => [5, 30, 1.5, 0.12345, 1234.5678, 100.1234567].map(q => ({ q, locale: q.toLocaleString('pt-BR'), fmtN: fmtN(q) })));
        await page.evaluate(() => go('dashboard'));
        await page.waitForTimeout(200);
        state.recent = await page.evaluate(() => [...document.querySelectorAll('.home-recent-row')].map(row => row.innerText.replace(/\s+/g, ' ').trim()));
        state.ledgerByDate = {};
        for (const row of state.recent) {
          const parsed = row.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
          if (!parsed) continue;
          const iso = `${parsed[3]}-${parsed[2]}-${parsed[1]}`;
          await page.evaluate(date => { S.apSearch = date; S.aportesFilter = 'todos'; go('aportes'); }, iso);
          await page.waitForTimeout(250);
          state.ledgerByDate[iso] = await page.evaluate(() => document.querySelector('.wrap').innerText);
        }
        await page.evaluate(() => { S.apSearch = ''; });
      }
      await page.close();
      result[name] = state;
    }
  } finally {
    await browser.close();
    harness.server.close();
  }
  return result;
}

let mainTree = null;
let main = null;
let v20 = null;

test.before(async () => {
  try { git(['rev-parse', '--verify', 'origin/main']); } catch { assert.fail('referência origin/main ausente: a auditoria de equivalência precisa dela'); }
  mainTree = fs.mkdtempSync(path.join(os.tmpdir(), 'fase1a-main-'));
  const archive = git(['archive', '--format=tar', 'origin/main']);
  const untar = spawnSync('tar', ['-x', '-f', '-'], { cwd: mainTree, input: archive, maxBuffer: 256 * 1024 * 1024 });
  assert.equal(untar.status, 0, `falha ao extrair origin/main: ${String(untar.stderr).slice(0, 300)}`);
  fs.writeFileSync(path.join(mainTree, 'index.html'), git(['show', 'origin/main:index.html']));
  main = await collect(mainTree);
  v20 = await collect(repo);
}, { timeout: 600000 });

test.after(() => { if (mainTree) fs.rmSync(mainTree, { recursive: true, force: true }); });

test('Fase 1a - arquivos alterados fora de testes/docs são só index.html, dashboard-premium.css e package.json', () => {
  const changed = git(['diff', '--name-only', 'origin/main...HEAD']).toString().split('\n').filter(Boolean)
    .filter(file => !file.startsWith('tests/') && !file.startsWith('docs/'));
  assert.deepEqual(changed.sort(), ['dashboard-premium.css', 'index.html', 'package.json']);
  ['finance-core.js', 'persistence-core.js', 'sw.js', 'manifest.json', 'firestore.rules', 'modern/src'].forEach(file => {
    assert.equal(git(['diff', '--name-only', 'origin/main...HEAD', '--', file]).toString().trim(), '', `${file} não pode mudar`);
  });
});

for (const state of Object.keys(STATES)) {
  test(`Fase 1a - portfólio (cx) idêntico à main sem erros de página (${state})`, () => {
    assert.deepEqual(v20[state].portfolio, main[state].portfolio);
    assert.deepEqual(v20[state].errors, []);
    assert.deepEqual(main[state].errors, []);
  });

  test(`Fase 1a - indicadores comparáveis do Dashboard idênticos (${state})`, () => {
    const byLabel = (set, label) => set.cards.find(card => card.label.toLowerCase() === label.toLowerCase());
    for (const label of ['Patrimônio atual', 'Recebido no mês', 'Resultado da posição']) {
      const a = byLabel(main[state], label);
      const b = byLabel(v20[state], label);
      assert.ok(a && b, `${label} ausente (${state})`);
      assert.equal(b.value, a.value, `${label} (${state})`);
    }
  });

  test(`Fase 1a - telas sem mudança numérica: valores monetários e percentuais idênticos (${state})`, () => {
    for (const route of STABLE_ROUTES) {
      assert.deepEqual(tokens(v20[state].routes[route]), tokens(main[state].routes[route]), `${route} (${state})`);
    }
  });
}

test('Fase 1a - "Valor investido" do V20 equivale ao capital da main e declara base parcial', () => {
  for (const state of Object.keys(STATES)) {
    const invested = v20[state].cards.find(card => card.label === 'Valor investido');
    assert.ok(invested, `Valor investido ausente (${state})`);
    const patrimonyMain = main[state].cards.find(card => card.label.toLowerCase() === 'patrimônio atual');
    const money = invested.value.replace(/\s/g, ' ');
    if (money !== '—') assert.ok(patrimonyMain.text.replace(/\s/g, ' ').includes(money), `${state}: ${money} não aparece no contexto da main`);
  }
});

test('Fase 1a - Dividendos: matriz anual, resumo e ranking por ativo equivalem à main', () => {
  assert.equal(v20.rich.dividends.matrix, main.rich.dividends.matrix);
  assert.equal(v20.rich.dividends.assetSummary, main.rich.dividends.assetSummary);
  assert.equal(v20.rich.dividends.byAsset, main.rich.dividends.byAsset);
  const fromMain = [...main.rich.dividends.byAsset.matchAll(/#(\d+) (\S+) · ([\d.,]+)% do total Recebido (R\$ [\d.,]+)/g)]
    .slice(0, 5).map(m => ({ ticker: m[2], value: m[4], share: Number(m[3].replace(',', '.')) }));
  assert.equal(fromMain.length, 5);
  assert.equal(v20.rich.payers.length, 5);
  v20.rich.payers.forEach((payer, index) => {
    assert.equal(payer.ticker, fromMain[index].ticker);
    assert.equal(payer.value.replace(/\s/g, ' '), fromMain[index].value.replace(/\s/g, ' '));
    assert.equal(Number(payer.share.match(/[\d,.]+/)[0].replace(',', '.')), fromMain[index].share);
  });
});

test('Fase 1a - Dividendos: KPIs comparáveis idênticos à main', () => {
  for (const state of ['rich', 'partial', 'noquotes']) {
    for (const label of ['Recebido este mês', 'Recebido nos últimos 12 meses', 'Média mensal', 'Último mês']) {
      const a = valueAfter(main[state].routes.dividendos, label);
      const b = valueAfter(v20[state].routes.dividendos, label);
      assert.ok(a !== null && b !== null, `${label} (${state})`);
      assert.equal(b, a, `${label} (${state})`);
    }
  }
});

test('Fase 1a - "Recebido em <ano>" (novo no V20) coincide com o total de proventos do IRPF do mesmo ano', () => {
  const year = String(new Date().getFullYear());
  for (const state of ['rich', 'partial', 'noquotes']) {
    const shown = valueAfter(v20[state].routes.dividendos, `Recebido em ${year}`);
    const irpf = valueAfter(v20[state].routes.irpf, 'Total de proventos');
    assert.ok(shown && irpf, `valores ausentes (${state})`);
    assert.equal(shown.replace(/\s/g, ' '), irpf.replace(/\s/g, ' '), state);
  }
});

test('Fase 1a - estado vazio: KPIs de Dividendos do topo mostram indisponível (—), não zero', () => {
  const year = String(new Date().getFullYear());
  for (const label of [`Recebido em ${year}`, 'Média mensal', 'Último mês', 'Projeção anual']) {
    assert.equal(valueAfter(v20.empty.routes.dividendos, label), '—', label);
  }
});

test('Fase 1a - estado vazio: nenhum "R$ 0,00" com cobertura desconhecida em Dividendos', { todo: 'F-06: o bloco "Resumo de renda e cobertura" mostra YTD pago e 12M = R$ 0,00 junto de "Cobertura desconhecida" (já existia na main)' }, () => {
  assert.doesNotMatch(v20.empty.routes.dividendos, /R\$\s?0,00/);
});

test('Fase 1a - Lançamentos recentes do Dashboard têm os mesmos valores da lista de Lançamentos', () => {
  assert.ok(v20.rich.recent.length > 0);
  for (const row of v20.rich.recent) {
    const parsed = row.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\S+) .*(R\$ [\d.,]+)$/);
    assert.ok(parsed, `linha não interpretável: ${row}`);
    const [, day, month, year, ticker, value] = parsed;
    const ledger = (v20.rich.ledgerByDate[`${year}-${month}-${day}`] || '').replace(/\s+/g, ' ');
    const money = value.replace(/[.$]/g, '\\$&');
    assert.match(ledger, new RegExp(`${year}-${month}-${day} \\S+ ${ticker}.*?${money}`), `${row} não confere com a lista de Lançamentos`);
  }
});

// ---- Achados abertos (todo): o teste descreve o comportamento correto esperado ----

const impliedDaily = () => {
  const assets = v20.rich.fixtureAssets;
  const quotes = v20.rich.fixtureQuotes;
  let implemented = 0; let implementedBase = 0; let prevDelta = 0; let prevBase = 0;
  for (const asset of assets) {
    const quote = quotes[String(asset.ticker).toUpperCase()];
    if (!(Number(asset.qty) > 0) || !quote || !Number.isFinite(Number(quote.change))) continue;
    const price = Number(quote.price ?? asset.current_price ?? 0);
    const change = Number(quote.change);
    implemented += asset.qty * price * (change / 100);
    implementedBase += asset.qty * price;
    const previous = price / (1 + change / 100);
    prevDelta += asset.qty * (price - previous);
    prevBase += asset.qty * previous;
  }
  return { implemented, implementedPct: implemented / implementedBase * 100, prevDelta, prevPct: prevDelta / prevBase * 100 };
};

// F-03 corrigido no Lote B: a variação diária agora usa o fechamento anterior (preço/(1+c/100)).
// Diferença intencional em relação à V20 auditada: R$ 224,15 / +0,36% -> R$ 219,76 / +0,35%.
test('Fase 1a (atualizado no Lote B) - Variação diária corresponde ao fechamento anterior (price/(1+c))', () => {
  const card = v20.rich.cards.find(item => item.label === 'Variação diária');
  assert.ok(card, 'cartão Variação diária ausente');
  const { prevDelta, implemented } = impliedDaily();
  const shown = Number(card.value.replace(/[^\d,]/g, '').replace(',', '.'));
  assert.ok(Math.abs(shown - Math.abs(prevDelta)) < 0.01, `exibido ${card.value}, esperado ${prevDelta.toFixed(2)}`);
  assert.ok(Math.abs(shown - Math.abs(implemented)) > 1, 'não pode voltar à fórmula antiga (price×c/100)');
});

test('Fase 1a - quantidade fracionária mantém a precisão da main (3 casas)', { todo: 'F-05: fmtN arredonda a 2 casas; a main usava toLocaleString (3 casas) na tabela "Qtd"' }, () => {
  v20.rich.qty.forEach(sample => assert.equal(sample.fmtN, sample.locale, `q=${sample.q}`));
});

test('Fase 1a - quantidades inteiras têm o mesmo texto nos dois formatadores', () => {
  v20.rich.qty.filter(sample => Number.isInteger(sample.q)).forEach(sample => assert.equal(sample.fmtN, sample.locale));
});
