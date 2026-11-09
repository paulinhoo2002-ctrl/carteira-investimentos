'use strict';
// Coleta determinística (relógio congelado, fixtures 100% sintéticas) dos indicadores financeiros
// visíveis, usada tanto para GERAR o golden a partir da referência (origin/main) quanto para
// CONFERIR a árvore atual. Nenhum dado real, nenhuma rede, nenhuma persistência.
const { chromium } = require('playwright-core');
const crypto = require('node:crypto');
const { startLocalHttpServer } = require('../local-http-server');
const { applyRichFixture } = require('./fp-rich-fixture');
const { syntheticRfTitles } = require('./v17-fin-fixture');
const { resolveChromePath } = require('./chrome-path');

const FROZEN_NOW = '2026-11-08T15:00:00.000Z';
const STABLE_ROUTES = ['ativos', 'aportes', 'analise', 'patrimonio', 'rentabilidade', 'renda-fixa', 'ajudar', 'relatorios', 'irpf', 'ia', 'confiabilidade'];
const DASHBOARD_LABELS = ['Patrimônio atual', 'Recebido no mês', 'Resultado da posição'];
const DIVIDEND_LABELS = ['Recebido este mês', 'Recebido nos últimos 12 meses', 'Média mensal', 'Último mês'];

const STATES = {
  rich: page => applyRichFixture(page, new Date(FROZEN_NOW)),
  // Mesma composição da fixture V17 (RF com lucro, prejuízo, zero, sem valor atual, vencido e a vencer),
  // mas com o relógio congelado para que o golden não dependa do dia em que o teste roda.
  partial: async page => {
    await applyRichFixture(page, new Date(FROZEN_NOW));
    await page.evaluate(titles => {
      const copy = value => JSON.parse(JSON.stringify(value));
      const keep = S.assets.filter(asset => asset.type !== 'Renda Fixa');
      S.assets = [...keep, ...copy(titles)];
      const wallet = S.wallets && S.wallets[0];
      if (wallet) wallet.assets = copy(S.assets);
      render();
    }, syntheticRfTitles());
  },
  noquotes: async page => { await applyRichFixture(page, new Date(FROZEN_NOW)); await page.evaluate(() => { S.quotes = {}; render(); }); },
  empty: async page => {
    await applyRichFixture(page, new Date(FROZEN_NOW));
    await page.evaluate(() => {
      S.assets = []; S.aportes = []; S.proventos = []; S.rfEvents = []; S.quotes = {};
      const wallet = S.wallets && S.wallets[0];
      if (wallet) { wallet.assets = []; wallet.aportes = []; wallet.proventos = []; wallet.rfEvents = []; }
      render();
    });
  },
};

// Valores monetários (R$) e percentuais (%) do texto, normalizando o separador decimal do percentual
// (o formato pt-BR é decisão da tarefa C8; o valor numérico é o que importa na equivalência).
const tokens = text => {
  const out = [];
  (text.match(/R\$\s?-?[\d.]+,\d{2}/g) || []).forEach(item => out.push('$' + item.replace(/R\$\s?/, '')));
  (text.match(/[+-]?\d+(?:[.,]\d+)?%/g) || []).forEach(item => out.push('%' + item.replace(',', '.')));
  return out.sort();
};
// O separador decimal dos percentuais (ponto na referência, vírgula após F-09/pt-BR) é decisão de
// apresentação coberta por tests/fase1c-br-format.test.js; aqui o valor numérico é o que se compara.
const normalizePercent = text => (typeof text === 'string' ? text.replace(/(\d),(\d+)%/g, '$1.$2%') : text);
const valueAfter = (text, label) => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const index = lines.findIndex(line => line.toLowerCase() === label.toLowerCase());
  if (index < 0) return null;
  return lines.slice(index + 1).find(line => line !== 'ⓘ') ?? null;
};

async function collectSnapshot(root, { states = Object.keys(STATES) } = {}) {
  const harness = await startLocalHttpServer(root);
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  const snapshot = {};
  try {
    for (const name of states) {
      // Locale e fuso fixos: o resultado não pode depender da máquina (Windows local x Linux do CI).
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.setFixedTime(new Date(FROZEN_NOW));
      await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await STATES[name](page);
      const state = { errors, portfolio: null, dashboardCards: {}, routeTokens: {}, dividends: null };
      state.portfolio = await page.evaluate(() => { const c = cx(); return { tC: c.tC, tI: c.tI, tG: c.tG, tGP: c.tGP, appliedComplete: c.appliedComplete }; });
      const texts = {};
      for (const route of ['dashboard', 'dividendos', ...STABLE_ROUTES]) {
        await page.evaluate(target => go(target), route);
        await page.waitForTimeout(250);
        await page.evaluate(() => document.querySelectorAll('#root details').forEach(item => { item.open = true; }));
        texts[route] = await page.evaluate(() => (document.querySelector('.wrap') || document.body).innerText);
      }
      for (const route of STABLE_ROUTES) state.routeTokens[route] = tokens(texts[route]);
      await page.evaluate(() => go('dashboard'));
      await page.waitForTimeout(200);
      const cards = await page.evaluate(() => [...document.querySelectorAll('.premium-metric')].map(card => ({
        label: (card.querySelector('.premium-metric-label')?.textContent || '').trim(),
        value: (card.querySelector('.premium-metric-value')?.textContent || '').trim(),
      })));
      DASHBOARD_LABELS.forEach(label => { state.dashboardCards[label] = normalizePercent(cards.find(card => card.label.toLowerCase() === label.toLowerCase())?.value ?? null); });
      const kpis = {};
      DIVIDEND_LABELS.forEach(label => { kpis[label] = normalizePercent(valueAfter(texts.dividendos, label)); });
      state.dividends = { kpis };
      if (name === 'rich') {
        const detail = await page.evaluate(() => {
          const rows = S.proventos;
          return {
            matrix: JSON.stringify(dividendAnnualMatrixData(rows)),
            assetSummary: String(dividendAssetSummary(rows)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            byAsset: String(dividendsByAssetView(rows)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            // (o separador decimal dos percentuais é normalizado abaixo, fora do navegador)
          };
        });
        state.dividends.matrixSha256 = crypto.createHash('sha256').update(detail.matrix).digest('hex');
        detail.assetSummary = normalizePercent(detail.assetSummary);
        detail.byAsset = normalizePercent(detail.byAsset);
        state.dividends.assetSummary = detail.assetSummary;
        state.dividends.rankingFromBaselineView = [...detail.byAsset.matchAll(/#(\d+) (\S+) · ([\d.,]+)% do total Recebido (R\$ [\d.,]+)/g)]
          .slice(0, 5).map(match => ({ ticker: match[2], value: match[4].replace(/\s/g, ' '), share: Number(match[3].replace(',', '.')) }));
        state.dividends.byAssetSha256 = crypto.createHash('sha256').update(detail.byAsset).digest('hex');
        await page.evaluate(() => go('dividendos'));
        await page.waitForTimeout(250);
        state.dividends.fpPayers = await page.evaluate(() => [...document.querySelectorAll('.fp-payer')].map(li => ({
          ticker: li.querySelector('.fp-payer-name')?.textContent.trim(),
          value: (li.querySelector('.fp-payer-value')?.textContent || '').replace(/\s/g, ' ').trim(),
          share: Number((li.querySelector('.fp-payer-share')?.textContent.match(/[\d,.]+/) || [''])[0].replace(',', '.')),
        })));
      }
      await page.close();
      snapshot[name] = state;
    }
  } finally {
    await browser.close();
    harness.server.close();
  }
  return snapshot;
}

module.exports = { collectSnapshot, FROZEN_NOW, STATES, STABLE_ROUTES, DASHBOARD_LABELS, DIVIDEND_LABELS };
