'use strict';
// SM193 — Desempenho premium: resultado realizado separado, cotação transparente e ordenação numérica.
// Fixtures sintéticas isoladas; nenhum acesso a Firebase ou dados reais.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFunctionSource(name, nextMarker) {
  const start = indexHtml.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Função não encontrada: ${name}`);
  const end = indexHtml.indexOf(nextMarker, start);
  assert.notEqual(end, -1, `Marcador final não encontrado para: ${name}`);
  return indexHtml.slice(start, end);
}

const source = [
  extractFunctionSource('quoteTrustMeta', 'function quoteStatusInfo'),
  extractFunctionSource('quoteStatusInfo', 'function shouldApplyQuoteUpdate'),
  extractFunctionSource('assetPerformanceOverviewSortRows', 'function assetPerformanceOverviewRowHtml'),
  extractFunctionSource('assetPerformanceOverviewRowHtml', 'function assetPerformanceOverviewPanel'),
  extractFunctionSource('realizedSalesResultSummary', 'function package2FiniteNumber'),
].join('\n');

function makeContext(S = { aportes: [] }) {
  const context = {
    S,
    console,
    fmt: (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`,
    fmtP: (v) => `${Number(v).toFixed(2).replace('.', ',')}%`,
    esc: (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  };
  vm.runInNewContext(`${source}\nthis.quoteStatusInfo=quoteStatusInfo; this.rowHtml=assetPerformanceOverviewRowHtml; this.sortRows=assetPerformanceOverviewSortRows; this.realized=realizedSalesResultSummary;`, context);
  return context;
}

function row(overrides = {}) {
  return {
    label: 'BBAS3', type: 'Ação', sector: 'Financeiro', applied: 108, current: 147.1, result: 39.1, resultPct: 36.2,
    share: 18.4, statusLabel: 'Positivo', statusTone: 'ok', hasPerformanceData: true,
    quoteMeta: { label: 'Atrasada', source: 'Yahoo Finance', marketAt: '12/11 15:05', checkedAt: '16/11 15:20' },
    ...overrides,
  };
}

// ---- Fase 2: estados de cotação ----

test('cotação FRESH aparece como Atualizada, não como atual sem data', () => {
  const ctx = makeContext();
  const info = ctx.quoteStatusInfo({ ticker: 'PETR4', current_price: 44.41, quoteStatus: 'FRESH', quoteSource: 'yahoo', quoteMarketTime: '2026-11-12T18:05:00.000Z', quoteUpdatedAt: '2026-11-16T18:20:00.000Z' });
  assert.equal(info.label, 'Atualizada');
  assert.equal(info.source, 'Yahoo Finance');
});

test('cotação DELAYED aparece como Atrasada', () => {
  const ctx = makeContext();
  assert.equal(ctx.quoteStatusInfo({ current_price: 14.71, quoteStatus: 'DELAYED', quoteSource: 'yahoo', quoteUpdatedAt: '2026-11-16T18:20:00.000Z' }).label, 'Atrasada');
});

test('cotação STALE aparece como Antiga e não como atual', () => {
  const ctx = makeContext();
  assert.equal(ctx.quoteStatusInfo({ current_price: 8.68, quoteStatus: 'STALE', quoteSource: 'brapi', quoteUpdatedAt: '2026-11-13T18:20:00.000Z' }).label, 'Antiga');
});

test('cotação indisponível (ERROR, UNKNOWN ou sem preço) aparece como Indisponível', () => {
  const ctx = makeContext();
  assert.equal(ctx.quoteStatusInfo({ current_price: 10, quoteStatus: 'ERROR' }).label, 'Indisponível');
  assert.equal(ctx.quoteStatusInfo({ current_price: 10, quoteStatus: 'UNKNOWN' }).label, 'Sem data', 'UNKNOWN com preço não é indisponível nem atual');
  assert.equal(ctx.quoteStatusInfo({ current_price: 0, quoteStatus: 'FRESH' }).label, 'Indisponível', 'preço zero não é cotação válida');
});

test('FRESH sem nenhum horário vira Sem data, nunca Atualizada', () => {
  const ctx = makeContext();
  assert.equal(ctx.quoteStatusInfo({ current_price: 44.41, quoteStatus: 'FRESH', quoteSource: 'yahoo' }).label, 'Sem data');
});

test('fonte e horários ausentes ficam explícitos, sem inventar valores', () => {
  const ctx = makeContext();
  const info = ctx.quoteStatusInfo({ current_price: 10, quoteStatus: 'FRESH' });
  assert.equal(info.source, 'fonte não informada');
  assert.equal(info.marketAt, '', 'horário de negociação ausente permanece vazio');
  assert.equal(info.checkedAt, '', 'horário de consulta ausente permanece vazio');
});

test('horário de negociação e de consulta são campos separados (consulta não vira negociação)', () => {
  const ctx = makeContext();
  const info = ctx.quoteStatusInfo({ current_price: 10, quoteStatus: 'FRESH', quoteMarketTime: '2026-11-12T18:05:00.000Z', quoteUpdatedAt: '2026-11-16T18:20:00.000Z' });
  assert.notEqual(info.marketAt, info.checkedAt);
  assert.ok(info.marketAt && info.checkedAt);
});

test('linha de desempenho mostra estado, fonte e horários da cotação', () => {
  const ctx = makeContext();
  const html = ctx.rowHtml(row(), false);
  assert.match(html, /Cotação Atrasada · Yahoo Finance · negociação 12\/11 15:05 · consulta 16\/11 15:20/);
});

test('linha sem metadado de cotação (renda fixa) não mostra linha de cotação', () => {
  const ctx = makeContext();
  const html = ctx.rowHtml(row({ quoteMeta: null, type: 'Renda Fixa' }), false);
  assert.doesNotMatch(html, /Cotação/);
});

test('linha com fonte e horários ausentes mostra "não informada", sem zero nem data inventada', () => {
  const ctx = makeContext();
  const html = ctx.rowHtml(row({ quoteMeta: { label: 'Indisponível', source: 'fonte não informada', marketAt: '', checkedAt: '' } }), false);
  assert.match(html, /negociação não informada · consulta não informada/);
});

// ---- Fase 1: realizado separado do não realizado ----

test('resultado realizado soma apenas vendas LEDGER_RECONCILED (SM192: 46,20)', () => {
  const ctx = makeContext({
    aportes: [
      { operation: 'Venda', reconciliationStatus: 'LEDGER_RECONCILED', realizedResult: 16.8 },
      { operation: 'Venda', reconciliationStatus: 'LEDGER_RECONCILED', realizedResult: 25.2 },
      { operation: 'Venda', reconciliationStatus: 'PENDING_RECONCILIATION', realizedResult: 999 },
      { operation: 'Compra', reconciliationStatus: 'LEDGER_RECONCILED', realizedResult: 500 },
    ],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.realized())), { total: 42, count: 2 });
});

test('sem vendas reconciliadas o realizado é zero contado, não presumido', () => {
  const ctx = makeContext({ aportes: [{ operation: 'Venda', reconciliationStatus: 'PENDING_RECONCILIATION', realizedResult: 10 }] });
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.realized())), { total: 0, count: 0 });
});

test('resultado negativo e exatamente zero são preservados no realizado', () => {
  const neg = makeContext({ aportes: [{ operation: 'Venda', reconciliationStatus: 'LEDGER_RECONCILED', realizedResult: -3.5 }] });
  assert.equal(neg.realized().total, -3.5);
  const zero = makeContext({ aportes: [{ operation: 'Venda', reconciliationStatus: 'LEDGER_RECONCILED', realizedResult: 0 }] });
  assert.equal(zero.realized().total, 0);
  assert.equal(zero.realized().count, 1);
});

test('painel separa cartões de não realizado, realizado e rentabilidade das posições', () => {
  assert.match(indexHtml, /label:'Resultado não realizado'/);
  assert.match(indexHtml, /label:'Resultado realizado'/);
  assert.match(indexHtml, /label:'Rentabilidade das posições'/);
  assert.match(indexHtml, /fora do patrimônio/);
});

test('o valor de mercado da carteira não recebe o realizado (cartão Carteira atual usa só tC)', () => {
  assert.match(indexHtml, /label:'Carteira atual', value:fmt\(portfolio\.tC\)/);
});

// ---- Fase 3: rankings numéricos ----

test('ordenação por resultado é numérica (9 antes de 100 não ocorre por texto)', () => {
  const ctx = makeContext();
  const rows = [
    { label: 'A', result: 9, resultPct: 1, current: 1, share: 1, hasPerformanceData: true },
    { label: 'B', result: 100, resultPct: 5, current: 1, share: 1, hasPerformanceData: true },
    { label: 'C', result: -5, resultPct: -2, current: 1, share: 1, hasPerformanceData: true },
  ];
  const desc = Array.from(ctx.sortRows(rows, 'result-desc')).map((r) => r.label);
  assert.deepEqual(desc, ['B', 'A', 'C']);
  const asc = Array.from(ctx.sortRows(rows, 'result-asc')).map((r) => r.label);
  assert.deepEqual(asc, ['C', 'A', 'B']);
});

test('ordenação por rentabilidade é diferente do maior lucro em reais', () => {
  const ctx = makeContext();
  const rows = [
    { label: 'GRANDE', result: 500, resultPct: 2, current: 1, share: 1, hasPerformanceData: true },
    { label: 'PCT', result: 10, resultPct: 40, current: 1, share: 1, hasPerformanceData: true },
  ];
  assert.equal(ctx.sortRows(rows, 'result-desc')[0].label, 'GRANDE');
  assert.equal(ctx.sortRows(rows, 'pct-desc')[0].label, 'PCT');
});

test('linha positiva, negativa e zero mantêm sinal textual (não só cor)', () => {
  const ctx = makeContext();
  const pos = ctx.rowHtml(row({ result: 39.1, resultPct: 36.2, statusLabel: 'Positivo' }), true);
  const neg = ctx.rowHtml(row({ result: -20, resultPct: -10, statusLabel: 'Negativo', statusTone: 'danger' }), true);
  const zero = ctx.rowHtml(row({ result: 0, resultPct: 0, statusLabel: 'Estavel', statusTone: 'info' }), true);
  assert.match(pos, /Positivo/);
  assert.match(neg, /Negativo/);
  assert.match(zero, /Estavel/);
});

test('resultado zero é exibido como zero real, não como ausência', () => {
  const ctx = makeContext();
  const html = ctx.rowHtml(row({ result: 0, resultPct: 0, current: 10 }), true);
  assert.match(html, /R\$ 0,00/);
  assert.doesNotMatch(html, />—</);
});

test('ativo sem base mostra traço e não zero', () => {
  const ctx = makeContext();
  const html = ctx.rowHtml(row({ result: null, resultPct: null, current: null, applied: null, hasPerformanceData: false, statusLabel: 'Dados insuficientes', statusTone: 'muted' }), false);
  assert.match(html, /—/);
  assert.doesNotMatch(html, /R\$ 0,00/);
});

test('nota de metodologia explica não realizado, realizado e rentabilidade', () => {
  assert.match(indexHtml, /Não realizado = atual − aplicado nas posições abertas/);
  assert.match(indexHtml, /Realizado = resultado reconciliado das vendas, fora do patrimônio/);
});

test('piores ativos listam a maior perda primeiro (ordenação numérica crescente)', () => {
  const block = indexHtml.slice(indexHtml.indexOf('const negativeRows=validRows'), indexHtml.indexOf('const negativeRows=validRows') + 260);
  assert.match(block, /sort\(\(a,b\)=>a\.result-b\.result/);
});

// ---- SM193.2: estados de cotação e regressões visuais ----

test('mercado fechado com última cotação válida não vira Antiga nem erro (só consulta recente)', () => {
  const ctx = makeContext();
  const info = ctx.quoteStatusInfo({ current_price: 40, quoteStatus: 'FRESH', quoteSource: 'yahoo', quoteMarketTime: '2026-11-13T20:00:00.000Z', quoteUpdatedAt: '2026-11-16T12:00:00.000Z' });
  assert.equal(info.label, 'Atualizada');
  assert.ok(info.marketAt && info.checkedAt && info.marketAt !== info.checkedAt, 'horário de mercado antigo preservado, sem trocar pelo da consulta');
});

test('horário de consulta ausente não é inventado (fica vazio), estado segue o status', () => {
  const ctx = makeContext();
  const info = ctx.quoteStatusInfo({ current_price: 14.71, quoteStatus: 'DELAYED', quoteSource: 'yahoo', quoteMarketTime: '2026-11-16T16:05:00.000Z' });
  assert.equal(info.label, 'Atrasada');
  assert.equal(info.checkedAt, '');
  assert.ok(info.marketAt);
});

test('horário de mercado ausente com consulta presente: negociação vazia, não copia a consulta', () => {
  const ctx = makeContext();
  const info = ctx.quoteStatusInfo({ current_price: 14.71, quoteStatus: 'FRESH', quoteSource: 'yahoo', quoteUpdatedAt: '2026-11-16T16:20:00.000Z' });
  assert.equal(info.marketAt, '');
  assert.ok(info.checkedAt);
});

test('STALE com horário mostra Antiga; UNKNOWN ou sem horário mostra Sem data', () => {
  const ctx = makeContext();
  assert.equal(ctx.quoteStatusInfo({ current_price: 8.68, quoteStatus: 'STALE', quoteSource: 'brapi', quoteUpdatedAt: '2026-11-13T18:20:00.000Z' }).label, 'Antiga');
  assert.equal(ctx.quoteStatusInfo({ current_price: 8.68, quoteStatus: 'UNKNOWN', quoteUpdatedAt: '2026-11-13T18:20:00.000Z' }).label, 'Sem data');
  assert.equal(ctx.quoteStatusInfo({ current_price: 8.68, quoteStatus: 'STALE' }).label, 'Sem data', 'STALE sem horário não prova idade');
});

test('regressão SM193.2: cartões de categoria em 320-390 px usam 2 colunas iguais e botão fora da grade (sem trilha implícita)', () => {
  assert.match(indexHtml, /@media\(max-width:767px\)\{[\s\S]*?details\.ag>summary\.accordion-header\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\);/);
  assert.match(indexHtml, /html body #ativosAccordion details\.ag>summary\.accordion-header\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\);position:relative\}/);
  assert.match(indexHtml, /html body #ativosAccordion details\.ag>summary\.accordion-header>\.acc-toggle\{position:absolute;/, 'botão de expandir fora da grade de métricas');
  assert.match(indexHtml, /overflow-wrap:normal;word-break:normal\}/, 'valores monetários quebram só nos espaços');
});

test('regressão SM193.2: nome de ativo nunca fica estreito demais (mínimo 7em) e quebra em até 2 linhas', () => {
  assert.match(indexHtml, /\.asset-inner-panel \.perf-ticker\{flex:1 1 7em;min-width:7em;/);
  assert.match(indexHtml, /-webkit-line-clamp:2/);
});

test('regressão SM193.2: cartões de ranking empilham a linha (nome não disputa largura com valores)', () => {
  assert.match(indexHtml, /\.asset-inner-panel \.perf-card\.hi \.perf-row,\.asset-inner-panel \.perf-card\.lo \.perf-row\{grid-template-columns:minmax\(0,1fr\)\}/);
});

test('nome completo do ativo fica acessível em title quando truncado', () => {
  assert.match(indexHtml, /<div class="perf-ticker" title="\$\{esc\(row\.label\)\}">/);
});
