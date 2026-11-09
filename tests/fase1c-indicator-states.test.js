'use strict';
// Lote C (F-01, F-02, F-05, F-06): estados completo / parcial / indisponível dos indicadores,
// precisão visual de quantidade e zero x desconhecido. Fixtures 100% sintéticas; só apresentação.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { applyV17Fixture } = require('./helpers/v17-fin-fixture');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');

async function withPage(apply, fn, { width = 1440 } = {}) {
  const harness = await startLocalHttpServer(repo);
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
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

const assetKpis = page => page.evaluate(() => {
  go('ativos');
  return [...document.querySelectorAll('.assets-kpi-card')].map(card => ({
    label: card.querySelector('.assets-kpi-label').textContent.trim(),
    value: card.querySelector('.assets-kpi-value').textContent.replace(/\s/g, ' ').trim(),
    sub: card.querySelector('.assets-kpi-sub').textContent.trim(),
  }));
});
const dashboardCard = (page, label) => page.evaluate(name => {
  go('dashboard');
  const card = [...document.querySelectorAll('.premium-metric')].find(item => item.querySelector('.premium-metric-label')?.textContent === name);
  return card ? {
    value: card.querySelector('.premium-metric-value').textContent.replace(/\s/g, ' ').trim(),
    note: card.querySelector('.premium-metric-note').textContent.trim(),
    title: card.getAttribute('title') || '',
    badge: card.querySelector('.data-state-badge .state-label')?.textContent.trim() || null,
  } : null;
}, label);

test('F-01 parcial: capital aplicado conhecido aparece; valor atual, resultado e rentabilidade seguem indisponíveis com o motivo', async () => {
  await withPage(applyV17Fixture, async page => {
    const kpis = await assetKpis(page);
    const byLabel = Object.fromEntries(kpis.map(item => [item.label.toLowerCase(), item]));
    const tI = await page.evaluate(() => cx().tI);
    assert.equal(tI, 95982);
    assert.equal(byLabel['total investido'].value, 'R$ 95.982,00');
    assert.equal(byLabel['total investido'].sub, 'Capital aplicado na carteira');
    const total = await page.evaluate(() => S.assets.length);
    for (const label of ['valor atual']) {
      assert.equal(byLabel[label].value, '—');
      assert.equal(byLabel[label].sub, `Valor atual indisponível em 1 de ${total} ativo(s)`);
    }
    for (const label of ['lucro/prejuízo', 'rentabilidade']) {
      assert.equal(byLabel[label].value, '—');
      assert.equal(byLabel[label].sub, 'Indisponível: valor atual incompleto');
    }
    // consistência entre telas: Dashboard "Valor investido" = Ativos "Total investido"
    const dash = await dashboardCard(page, 'Valor investido');
    assert.equal(dash.value, byLabel['total investido'].value);
  });
});

test('F-01 completo: todos os KPIs de Ativos numéricos, com os textos originais', async () => {
  await withPage(applyRichFixture, async page => {
    const kpis = await assetKpis(page);
    kpis.forEach(item => assert.notEqual(item.value, '—', item.label));
    assert.deepEqual(kpis.map(item => item.sub), ['Capital aplicado na carteira', 'Valor estimado das posições', 'Diferença entre atual e investido', 'Resultado sobre o valor investido']);
    assert.equal(kpis[0].value, 'R$ 77.982,00');
  });
});

test('F-01 capital incompleto: não inventa total; informa cobertura e motivo', async () => {
  await withPage(applyRichFixture, async page => {
    await page.evaluate(() => { S.assets.find(a => a.ticker === 'QAAA3').avg_price = null; S.assets.find(a => a.ticker === 'QABB4').avg_price = 0; });
    const kpis = await assetKpis(page);
    const total = await page.evaluate(() => S.assets.length);
    assert.equal(kpis[0].value, '—');
    assert.match(kpis[0].sub, new RegExp(`^Capital aplicado indisponível em \\d+ de ${total} ativo\\(s\\)$`));
    kpis.slice(1).forEach(item => assert.equal(item.value === '—' || /R\$/.test(item.value), true));
    assert.notEqual(kpis[0].value, 'R$ 0,00', 'desconhecido nunca vira zero');
  });
});

test('D5: cotações ausentes preservam o capital conhecido e deixam valor atual/retorno indisponíveis', async () => {
  await withPage(applyRichFixture, async page => {
    await page.evaluate(() => {
      S.assets.forEach(asset => { asset.current_price = null; });
      S.quotes = {};
      S._dashboardHighlightsCache = null;
      go('ativos');
    });
    const kpis = await assetKpis(page);
    const byLabel = Object.fromEntries(kpis.map(item => [item.label.toLowerCase(), item]));
    assert.match(byLabel['total investido'].value, /^R\$/);
    assert.notEqual(byLabel['total investido'].value, 'R$ 0,00');
    assert.equal(byLabel['valor atual'].value, '—');
    assert.equal(byLabel['lucro/prejuízo'].value, '—');
    assert.equal(byLabel['rentabilidade'].value, '—');
    const dash = await dashboardCard(page, 'Patrimônio atual');
    assert.equal(dash.value, '—');
    assert.match(dash.note, /indisponível|desconhecida/i);
  });
});

test('F-01: a regra de base aplicada do Ativos coincide com cx().appliedComplete (sem divergência entre telas)', async () => {
  await withPage(applyV17Fixture, async page => {
    const results = await page.evaluate(() => {
      const snapshot = JSON.parse(JSON.stringify(S.assets));
      const outcomes = [];
      const check = label => outcomes.push({ label, same: S.assets.every(a => assetAppliedBaseInformed(a)) === cx().appliedComplete, complete: cx().appliedComplete });
      check('v17 completo');
      S.assets.find(a => a.ticker === 'QAAA3').avg_price = null; check('avg_price null');
      S.assets.find(a => a.ticker === 'QAAA3').avg_price = ''; check('avg_price vazio');
      S.assets.find(a => a.ticker === 'QAAA3').avg_price = 'abc'; check('avg_price texto');
      S.assets.find(a => a.ticker === 'QAAA3').avg_price = 0; check('avg_price zero informado');
      S.assets.find(a => a.ticker === 'QAAA3').qty = null; check('qty null');
      S.assets.find(a => a.ticker === 'QAAA3').qty = 0; check('qty zero');
      S.assets = JSON.parse(JSON.stringify(snapshot)); check('restaurado');
      S.assets.find(a => a.type === 'Renda Fixa').rf_unavailable_value = undefined; check('rf alterado');
      return outcomes;
    });
    results.forEach(item => assert.equal(item.same, true, item.label));
    assert.ok(results.some(item => item.complete === false) && results.some(item => item.complete === true));
  });
});

test('F-02: "Valor investido" parcial carrega o selo Parcial e a explicação; completo não tem selo', async () => {
  await withPage(applyRichFixture, async page => {
    let card = await dashboardCard(page, 'Valor investido');
    assert.equal(card.badge, null);
    assert.equal(card.note, 'Capital aplicado cadastrado');
    await page.evaluate(() => { S.assets.find(a => a.ticker === 'QAAA3').avg_price = null; S.assets.find(a => a.ticker === 'QABB4').avg_price = 0; });
    card = await dashboardCard(page, 'Valor investido');
    assert.equal(await page.evaluate(() => cx().appliedComplete), false);
    assert.equal(card.badge, 'Parcial');
    assert.equal(card.note, 'Capital informado parcialmente');
    assert.match(card.title, /soma apenas o capital aplicado informado/);
    assert.notEqual(card.value, '—');
  });
});

test('F-02/F-01 vazio: sem posições os KPIs mostram "—" com os textos neutros, sem motivo inventado', async () => {
  await withPage(page => applyRichFixture(page).then(() => page.evaluate(() => {
    S.assets = []; S.aportes = []; S.proventos = []; S.rfEvents = []; S.quotes = {};
    const w = S.wallets[0]; w.assets = []; w.aportes = []; w.proventos = []; w.rfEvents = [];
    render();
  })), async page => {
    const kpis = await assetKpis(page);
    kpis.forEach(item => assert.equal(item.value === '—' || /^R\$ 0,00$/.test(item.value) || item.value === '', true, `${item.label}: ${item.value}`));
    assert.equal(kpis.some(item => /indisponível em/.test(item.sub)), false);
  });
});

test('F-06: estado vazio de Dividendos não mostra R$ 0,00 com cobertura desconhecida; com dados mostra os totais', async () => {
  await withPage(applyRichFixture, async page => {
    await page.evaluate(() => go('dividendos'));
    await page.waitForTimeout(250);
    const withData = await page.evaluate(() => {
      document.querySelectorAll('#root details').forEach(d => { d.open = true; });
      const block = document.querySelector('.v253-income-kpis');
      return block ? block.innerText.replace(/\s+/g, ' ') : null;
    });
    assert.ok(withData, 'bloco de inteligência de renda presente');
    assert.match(withData, /YTD pago R\$ 11\.014,95/);
    assert.match(withData, /Últimos 12 meses R\$ [\d.]+,\d{2}/);
  });
  await withPage(applyRichFixture, async page => {
    await page.evaluate(() => {
      S.assets = []; S.aportes = []; S.proventos = []; S.rfEvents = []; S.quotes = {};
      const w = S.wallets[0]; w.assets = []; w.aportes = []; w.proventos = []; w.rfEvents = [];
      go('dividendos');
    });
    await page.waitForTimeout(250);
    const empty = await page.evaluate(() => {
      document.querySelectorAll('#root details').forEach(d => { d.open = true; });
      return { all: document.querySelector('.wrap').innerText, kpis: document.querySelector('.v253-income-kpis')?.innerText.replace(/\s+/g, ' ') || '' };
    });
    assert.doesNotMatch(empty.all, /R\$\s?0,00/);
    assert.match(empty.kpis, /YTD pago — sem registros · cobertura desconhecida/);
    assert.match(empty.kpis, /Últimos 12 meses — sem registros · cobertura desconhecida/);
  });
});

test('F-05: formatQuantity — pt-BR, até 4 casas (cripto 8), sem zeros à direita, desconhecido ≠ zero, privacidade', async () => {
  await withPage(applyRichFixture, async page => {
    const rows = await page.evaluate(() => {
      const samples = [[5, 'Ação'], [30, 'FII'], [1.5, 'ETF'], [0.123456, 'Ação'], [1234.5678, 'BDR'], [1000000, 'Ação'], [100.1234567, 'Ação'], [0.12345678, 'Cripto'], [0.00001234, 'Ação'], [-2.5, 'Ação'], [0, 'Ação'], [null, 'Ação'], ['', 'Ação'], ['abc', 'Ação'], [NaN, 'Ação']];
      const normal = samples.map(([value, type]) => formatQuantity(value, type));
      S.hideValues = true;
      const hidden = formatQuantity(5, 'Ação');
      S.hideValues = false;
      return { normal, hidden };
    });
    assert.deepEqual(rows.normal, ['5', '30', '1,5', '0,1235', '1.234,5678', '1.000.000', '100,1235', '0,12345678', '<0,0001', '-2,5', '0', '—', '—', '—', '—']);
    assert.equal(rows.hidden, '••••');
  });
});

test('F-05: a precisão é só visual — quantidades armazenadas não mudam e as telas usam o mesmo formato', async () => {
  await withPage(applyRichFixture, async page => {
    const stored = await page.evaluate(() => {
      const asset = S.assets.find(a => a.ticker === 'QAET11');
      asset.qty = 1234.5678;
      S.wallets[0].assets.find(a => a.ticker === 'QAET11').qty = 1234.5678;
      const before = JSON.stringify(S.assets.map(a => [a.ticker, a.qty]));
      go('ativos');
      document.querySelectorAll('#root details').forEach(d => { d.open = true; });
      const text = document.querySelector('.wrap').innerText;
      const after = JSON.stringify(S.assets.map(a => [a.ticker, a.qty]));
      return { before, after, text };
    });
    assert.equal(stored.after, stored.before, 'o render não altera a quantidade armazenada');
    assert.match(stored.text, /1\.234,5678/);
    assert.doesNotMatch(stored.text, /1234\.5678/);
    assert.doesNotMatch(stored.text, /\d\.\d{4}(?!\d)(?![^\s]*%)/, 'sem decimal com ponto nas quantidades');
  });
});
