// Fixture 100% sintética com vários anos, usada para validar gráficos e rosca anual.
// Nenhum valor representa carteira real; tickers usam o prefixo QA.
const { makeV289VisualFixture } = require('./v289-visual-fixtures');

const iso = date => date.toISOString().slice(0, 10);
const monthsBack = (now, n, day = 15) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, day, 12));

function makeRichFixture(now = new Date()) {
  const base = makeV289VisualFixture('baseline');
  const assets = [
    ['QAAA3', 'Ação', 'Energia sintética', 120, 28.4, 36.9, 8.1],
    ['QABB4', 'Ação', 'Bancos sintéticos', 300, 22.1, 25.7, 7.2],
    ['QACC3', 'Ação', 'Mineração sintética', 40, 77.4, 61.2, 9.0],
    ['QADD3', 'Ação', 'Papel sintético', 60, 48.5, 44.9, 1.1],
    ['QAFI11', 'FII', 'Logística sintética', 210, 98.1, 103.4, 9.4],
    ['QAFJ11', 'FII', 'Shoppings sintéticos', 150, 82.2, 74.6, 8.8],
    ['QAET11', 'ETF', 'Índice sintético', 90, 122.3, 141.7, 0],
  ].map(([ticker, type, sector, qty, avg, cur, dy]) => ({
    id: `QA_${ticker}`, ticker, name: `Ativo sintético ${ticker}`, product: `Ativo sintético ${ticker}`, title: `Ativo sintético ${ticker}`,
    type, asset_type: type, sector, qty, avg_price: avg, current_price: cur, dy, price_target: type === 'ETF' ? 0 : Math.round(cur * 11) / 10,
  }));
  assets.push({ id: 'QA_RF', ticker: 'QARF01', name: 'Título sintético', product: 'Título sintético', title: 'Título sintético', type: 'Renda Fixa', asset_type: 'Renda Fixa', subtype: 'CDB', qty: 1, avg_price: 18000, current_price: 19620, appliedValue: 18000, currentValue: 19620 });

  const aportes = [];
  assets.forEach((asset, index) => {
    for (let k = 0; k < 4; k += 1) {
      const qty = asset.type === 'Renda Fixa' ? (k === 0 ? 1 : 0) : Math.round(asset.qty / 4);
      if (!qty) continue;
      aportes.push({
        id: `QA_MOVE_${asset.ticker}_${k}`, date: iso(monthsBack(now, 3 + (index * 3) + (k * 6), 6 + index)),
        ticker: asset.ticker, name: asset.name, product: asset.name, type: asset.type, asset_type: asset.type, sector: asset.sector,
        qty, price: asset.avg_price, operation: 'compra', movementKind: 'compra',
      });
    }
  });
  aportes.push({ id: 'QA_MOVE_SELL', date: iso(monthsBack(now, 1, 12)), ticker: 'QADD3', name: 'Ativo sintético QADD3', type: 'Ação', asset_type: 'Ação', qty: 5, price: 47.1, operation: 'venda', movementKind: 'venda' });
  aportes.sort((a, b) => b.date.localeCompare(a.date));

  const payers = ['QAFI11', 'QAFJ11', 'QAAA3', 'QABB4', 'QACC3'];
  const kinds = { QAFI11: 'Rendimento', QAFJ11: 'Rendimento', QAAA3: 'Dividendo', QABB4: 'JCP', QACC3: 'Dividendo' };
  const proventos = [];
  for (let n = 1; n <= 34; n += 1) {
    payers.forEach((ticker, index) => {
      if (index >= 2 && (n + index) % 3 !== 0) return;
      const value = Math.round((110 + (index * 37) + ((34 - n) * 6.3) + ((n * 13 + index * 7) % 41)) * 100) / 100;
      proventos.push({ id: `QA_INC_${ticker}_${n}`, date: iso(monthsBack(now, n, 10 + index)), ticker, assetName: `Ativo sintético ${ticker}`, type: kinds[ticker], value, source: 'QA_SYNTHETIC', note: 'Evento sintético' });
    });
  }
  proventos.push({ id: 'QA_INC_NOW', date: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.max(1, Math.min(now.getUTCDate(), 2)), 12))), ticker: 'QAFI11', assetName: 'Ativo sintético QAFI11', type: 'Rendimento', value: 312.45, source: 'QA_SYNTHETIC', note: 'Evento sintético' });

  const quotes = {};
  [['QAAA3', 1.82], ['QABB4', 0.64], ['QACC3', -2.31], ['QADD3', -0.47], ['QAFI11', 0.28], ['QAFJ11', -0.12], ['QAET11', 0.91]].forEach(([ticker, change]) => {
    const asset = assets.find(item => item.ticker === ticker);
    quotes[ticker] = { price: asset.current_price, change, source: 'QA_SYNTHETIC', updatedAt: now.toISOString() };
  });

  return { ...base, scenario: 'rich', assets, aportes, proventos, quotes, goals: { ...base.goals, proventos: { ...base.goals.proventos, monthly: 1500 } } };
}

async function applyRichFixture(page, now) {
  const url = new URL(page.url());
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.searchParams.get('testMode') !== '1') throw new Error('Rich fixture requires local test mode');
  const data = makeRichFixture(now);
  await page.evaluate(fixture => {
    if (window.__LOCAL_TEST_MODE__ !== true || typeof S === 'undefined') throw new Error('local test mode runtime unavailable');
    const copy = value => JSON.parse(JSON.stringify(value));
    S.assets = copy(fixture.assets); S.aportes = copy(fixture.aportes); S.proventos = copy(fixture.proventos); S.rfEvents = []; S.quotes = copy(fixture.quotes);
    S.wallets = [{ ...copy(fixture.wallet), assets: copy(fixture.assets), aportes: copy(fixture.aportes), proventos: copy(fixture.proventos), rfEvents: [], goals: copy(fixture.goals), divGoal: 0 }];
    S.activeWalletId = fixture.wallet.id;
    S.goals = copy(fixture.goals); S.divGoal = 0; S.lastUpdate = new Date(); S.tab = 'dashboard'; S.hideValues = false;
    render();
  }, data);
}

module.exports = { makeRichFixture, applyRichFixture };
