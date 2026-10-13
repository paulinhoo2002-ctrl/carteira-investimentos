'use strict';

// Full-app synthetic fixture generator for the Carteira de Investimentos legacy app.
// Generates read-only synthetic state at SMALL / NORMAL / LARGE / STRESS scales
// and covers data-state semantics (CONFIRMED, DERIVED, PARTIAL, UNKNOWN, etc).
// No real data, no writes, no cloud, no external endpoints.

const FIXTURE_SCALES = Object.freeze(['small', 'normal', 'large', 'stress']);

const DATA_STATES = Object.freeze([
  'CONFIRMED', 'DERIVED', 'PARTIAL', 'UNKNOWN',
  'ZERO_CONFIRMED', 'EMPTY', 'ERROR', 'LOADING',
]);

const ASSET_TYPES = Object.freeze(['Ação', 'FII', 'ETF', 'Renda Fixa', 'Tesouro Direto', 'BDR', 'Stock', 'Reit', 'Fundos de Investimento']);

const SECTORS = Object.freeze(['Tecnologia', 'Finanças', 'Saúde', 'Energia', 'Consumo', 'Indústria', 'Imobiliário']);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scaleConfig(scale) {
  switch (scale) {
    case 'small': return { assets: 8, dividends: 12, rf: 4, months: 6 };
    case 'normal': return { assets: 40, dividends: 120, rf: 12, months: 24 };
    case 'large': return { assets: 200, dividends: 600, rf: 30, months: 48 };
    case 'stress': return { assets: 500, dividends: 1500, rf: 60, months: 60 };
    default: throw new RangeError('Unknown scale: ' + scale);
  }
}

function generateTicker(rand, i) {
  const prefixes = ['QA', 'SY', 'FX', 'TZ'];
  const prefix = prefixes[Math.floor(rand() * prefixes.length)];
  if (rand() < 0.3) return `${prefix}${String(i).padStart(4, '0')}`;
  return `${prefix}${String.fromCharCode(65 + Math.floor(rand() * 26))}${String.fromCharCode(65 + Math.floor(rand() * 26))}${(i % 90) + 10}`;
}

function generateAssets(count, rand) {
  const assets = [];
  for (let i = 0; i < count; i++) {
    const type = ASSET_TYPES[Math.floor(rand() * ASSET_TYPES.length)];
    const sector = SECTORS[Math.floor(rand() * SECTORS.length)];
    const qty = Math.max(1, Math.floor(rand() * 500) + 1);
    const avgPrice = Math.round((rand() * 200 + 5) * 100) / 100;
    const currentPrice = Math.round((avgPrice * (0.8 + rand() * 0.5)) * 100) / 100;
    const hasCurrentPrice = rand() > 0.08;
    const asset = {
      id: `QA_ASSET_${String(i).padStart(5, '0')}`,
      ticker: generateTicker(rand, i),
      name: `Ativo sintético ${String(i).padStart(3, '0')}`,
      product: `Ativo sintético ${String(i).padStart(3, '0')}`,
      title: `Ativo sintético ${String(i).padStart(3, '0')}`,
      type,
      sector,
      qty,
      avg_price: avgPrice,
      current_price: hasCurrentPrice ? currentPrice : null,
      dy: Math.round(rand() * 12 * 10) / 10,
    };
    if (type === 'Renda Fixa' || type === 'Tesouro Direto') {
      asset.subtype = rand() < 0.5 ? 'CDB' : rand() < 0.5 ? 'LCI' : 'LCA';
      asset.appliedValue = avgPrice * qty;
      asset.currentValue = hasCurrentPrice ? currentPrice * qty : null;
    }
    assets.push(asset);
  }
  return assets;
}

function generateDividends(count, assets, months, rand) {
  if (!assets.length) return [];
  const dividends = [];
  const now = new Date();
  const types = ['Dividendo', 'JCP', 'Rendimento'];
  for (let i = 0; i < count; i++) {
    const asset = assets[Math.floor(rand() * assets.length)];
    const monthsAgo = Math.floor(rand() * months);
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1 + Math.floor(rand() * 28));
    const isFuture = monthsAgo === 0 && rand() < 0.3;
    const value = Math.round((rand() * 50 + 0.5) * 100) / 100;
    dividends.push({
      id: `QA_INCOME_${String(i).padStart(5, '0')}`,
      date: date.toISOString().slice(0, 10),
      ticker: asset.ticker,
      assetName: asset.name,
      type: types[Math.floor(rand() * types.length)],
      value,
      source: 'QA_SYNTHETIC',
      note: 'Evento sintético',
      ...(isFuture ? { future: true } : {}),
    });
  }
  return dividends;
}

function generateRfEvents(count, rand) {
  const products = ['CDB', 'LCI', 'LCA', 'Tesouro IPCA+', 'Tesouro Selic', 'CDB Liquidez Diária'];
  const institutions = ['Banco QA A', 'Banco QA B', 'Corretora QA C', 'Tesouro QA'];
  const events = [];
  for (let i = 0; i < count; i++) {
    const product = products[Math.floor(rand() * products.length)];
    const institution = institutions[Math.floor(rand() * institutions.length)];
    const invested = Math.round((rand() * 100000 + 1000) * 100) / 100;
    const year = 2026 + Math.floor(rand() * 3);
    events.push({
      id: `QA_RF_${String(i).padStart(4, '0')}`,
      product,
      institution,
      index: rand() < 0.5 ? 'CDI' : rand() < 0.5 ? 'IPCA' : 'Prefixado',
      rate: Math.round((rand() * 15 + 5) * 100) / 100,
      investedValue: invested,
      currentValue: Math.round((invested * (1 + rand() * 0.2)) * 100) / 100,
      applicationDate: `2026-0${1 + Math.floor(rand() * 9)}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
      maturityDate: `${year}-12-31`,
      status: rand() < 0.1 ? 'liquidado' : 'ativo',
    });
  }
  return events;
}

function generateAportes(assets, count, rand) {
  if (!assets.length) return [];
  const aportes = [];
  const now = new Date();
  for (let i = 0; i < Math.min(count, assets.length * 2); i++) {
    const asset = assets[Math.floor(rand() * assets.length)];
    const monthsAgo = Math.floor(rand() * 12);
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1 + Math.floor(rand() * 28));
    aportes.push({
      id: `QA_MOVE_${String(i).padStart(5, '0')}`,
      date: date.toISOString().slice(0, 10),
      ticker: asset.ticker,
      name: asset.name,
      product: asset.name,
      type: asset.type,
      asset_type: asset.type,
      sector: asset.sector,
      qty: Math.max(1, Math.floor(rand() * 100) + 1),
      price: Math.round((rand() * 200 + 5) * 100) / 100,
      operation: rand() < 0.7 ? 'compra' : 'venda',
      decision: 'QA_MANUAL',
    });
  }
  return aportes;
}

function makeFullAppFixture(scale = 'normal', dataState = 'CONFIRMED') {
  if (!FIXTURE_SCALES.includes(scale)) throw new RangeError('Unknown scale: ' + scale);
  if (!DATA_STATES.includes(dataState)) throw new RangeError('Unknown data state: ' + dataState);
  const rand = mulberry32(42 + scale.length + dataState.length);
  const config = scaleConfig(scale);

  let assets = generateAssets(config.assets, rand);
  let dividends = generateDividends(config.dividends, assets, config.months, rand);
  const rfEvents = generateRfEvents(config.rf, rand);
  const aportes = generateAportes(assets, Math.floor(config.assets / 2), rand);

  // Apply data state semantics
  if (dataState === 'EMPTY') { assets = []; dividends = []; }
  if (dataState === 'UNKNOWN') assets.forEach(a => { a.current_price = null; a.currentValue = null; });
  if (dataState === 'PARTIAL') assets.forEach((a, i) => { if (i % 3 === 0) a.current_price = null; });
  if (dataState === 'ZERO_CONFIRMED') assets.forEach(a => { a.current_price = 0; a.currentValue = 0; });
  if (dataState === 'DERIVED') assets.forEach(a => { a.derived = true; });
  if (dataState === 'ERROR') assets.forEach(a => { a.quoteError = true; });

  const goals = {
    patrimonio: { target: 500000, aporte: 5000, annualVar: 10 },
    ativos: { type: 'Ação', ticker: '', aporte: 0, annualVar: 0, finalValue: 0 },
    proventos: { types: ['Ação', 'FII', 'ETF', 'Renda Fixa'], monthly: 1500 },
  };

  return {
    scale,
    dataState,
    wallet: { id: 'QA_WALLET_FULL_01', name: 'Conta sintética full-app' },
    assets,
    aportes,
    proventos: dividends,
    rfEvents,
    goals,
    divGoal: 1000,
    lastUpdate: '2026-10-13T12:00:00.000Z',
    metadata: {
      totalAssets: assets.length,
      totalDividends: dividends.length,
      totalRfEvents: rfEvents.length,
      totalAportes: aportes.length,
      scale,
      dataState,
    },
  };
}

// Auth adapter: synthetic auth states without Firebase/OAuth
const AUTH_STATES = Object.freeze(['AUTH_CHECKING', 'AUTHENTICATED_OWNER', 'AUTHENTICATED_UNAUTHORIZED', 'SIGNED_OUT', 'AUTH_ERROR']);

function makeSyntheticAuthState(state = 'AUTHENTICATED_OWNER') {
  if (!AUTH_STATES.includes(state)) throw new RangeError('Unknown auth state: ' + state);
  return {
    state,
    user: state === 'AUTHENTICATED_OWNER'
      ? { uid: 'qa-synthetic-owner', email: 'owner@qa-synthetic.local', displayName: 'QA Owner' }
      : state === 'AUTHENTICATED_UNAUTHORIZED'
        ? { uid: 'qa-synthetic-other', email: 'other@qa-synthetic.local', displayName: 'QA Other' }
        : null,
    timestamp: Date.now(),
    synthetic: true,
  };
}

async function applyFullAppFixture(page, scale = 'normal', dataState = 'CONFIRMED', authState = 'AUTHENTICATED_OWNER') {
  const url = new URL(page.url());
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.searchParams.get('testMode') !== '1') {
    throw new Error('FullApp fixture requires local test mode');
  }
  const fixture = makeFullAppFixture(scale, dataState);
  const auth = makeSyntheticAuthState(authState);
  await page.evaluate((data) => {
    if (window.__LOCAL_TEST_MODE__ !== true || typeof S === 'undefined' || typeof render !== 'function') {
      throw new Error('FullApp local test mode runtime unavailable');
    }
    const copy = value => JSON.parse(JSON.stringify(value));
    S.assets = copy(data.fixture.assets);
    S.aportes = copy(data.fixture.aportes);
    S.proventos = copy(data.fixture.proventos);
    S.rfEvents = copy(data.fixture.rfEvents);
    S.quotes = {};
    S.wallets = [{
      ...copy(data.fixture.wallet),
      assets: copy(data.fixture.assets),
      aportes: copy(data.fixture.aportes),
      proventos: copy(data.fixture.proventos),
      rfEvents: copy(data.fixture.rfEvents),
      goals: copy(data.fixture.goals),
      divGoal: data.fixture.divGoal,
    }];
    S.activeWalletId = data.fixture.wallet.id;
    S.goals = copy(data.fixture.goals);
    S.divGoal = data.fixture.divGoal;
    S.lastUpdate = new Date(data.fixture.lastUpdate);
    S.tab = 'dashboard';
    S.hideValues = false;
    // Synthetic auth state (no Firebase)
    window.__QA_AUTH_STATE__ = copy(data.auth);
    render();
  }, { fixture, auth });
  return { fixture, auth };
}

module.exports = {
  FIXTURE_SCALES,
  DATA_STATES,
  AUTH_STATES,
  makeFullAppFixture,
  makeSyntheticAuthState,
  applyFullAppFixture,
  scaleConfig,
};