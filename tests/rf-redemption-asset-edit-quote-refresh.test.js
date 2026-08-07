const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repoRoot = path.join(__dirname, '..');
const indexHtmlPath = path.join(repoRoot, 'index.html');

function readIndexHtml() {
  return fs.readFileSync(indexHtmlPath, 'utf8');
}

function extractFn(html, name) {
  let start = html.indexOf(`async function ${name}(`);
  if (start === -1) start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `funcao nao encontrada: ${name}`);
  let depth = 0;
  let i = start;
  while (i < html.length) {
    const c = html[i];
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(start, i + 1);
    }
    i += 1;
  }
  assert.fail(`funcao desbalanceada: ${name}`);
  return '';
}

function buildBundle(html, names) {
  return names.map((name) => extractFn(html, name)).join('\n');
}

const FMT_STUB = "const fmt  = v => 'R$' + Number(v || 0).toFixed(2).replace('.', ',');\n";
const ESC_STUB = "const esc  = s => String(s ?? '').replace(/[&<>\"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[ch]));\n";

function makeRfContext() {
  const counters = { save: 0, render: 0, fetchQuotes: 0, alerts: [], confirms: [], toasts: [] };
  const context = {
    S: {
      assets: [],
      rfEvents: [],
      aportes: [],
      rfMovementEditor: null,
      rfEventEditor: null,
      showA: false,
      editId: null,
      _fa: null,
      tab: 'ativos'
    },
    fmt: null,
    esc: null,
    isRendaFixaAsset: (a) => !!a && a.type === 'Renda Fixa',
    fixedIncomeOfficialValues: (a) => ({
      applied: Number(a?.rf_applied_value ?? a?.rf_applied ?? 0) || 0,
      appliedState: { state: 'explicit', source: 'rf_applied_value', label: 'Aplicado' },
      hasExplicitApplied: true
    }),
    rfEventTextCandidates: (v) => [String(v?.type || v || '')],
    rfPosNorm: (s) => String(s || '').toUpperCase(),
    cleanAssetCode: (s) => String(s || '').trim(),
    assetRfIndexerLabel: (a) => a?.indexer || a?.rate_type || 'CDI',
    assetRfApplicationDate: (a) => a?.application_date || '',
    assetRfName: (a) => a?.name || a?.ticker || '',
    assetRfSubtype: (a) => a?.rf_subtype || '',
    assetRfMaturityDate: (a) => a?.rf_maturity_date || '',
    assetRfContractRate: (a) => a?.rf_contract_rate || '',
    assetRfNote: (a) => a?.rf_note || '',
    canEditFromThisTab: () => true,
    rememberScroll: () => {},
    withScrollPreserved: (fn) => fn(),
    save: () => { counters.save += 1; },
    toast: (message, color) => { counters.toasts.push({ message, color }); },
    render: () => { counters.render += 1; },
    alert: (msg) => { counters.alerts.push(msg); },
    confirm: (msg) => { counters.confirms.push(msg); return true; },
    learnTickerMeta: () => {},
    scheduleAutoProventosGratis: () => {},
    fetchQuotes: async () => { counters.fetchQuotes += 1; },
    normalizeType: (v, fallback = 'Ação') => String(v || fallback),
    document: {
      getElementById: () => null,
      querySelector: () => null
    }
  };
  return { context, counters };
}

function buildRfHarness() {
  const html = readIndexHtml();
  const { context, counters } = makeRfContext();
  const bundle =
    FMT_STUB + ESC_STUB +
    buildBundle(html, [
      'rfAssetEventId',
      'rfAssetEventTicker',
      'rfEventNumber',
      'rfPrincipalBalance',
      'rfMoneyStrict',
      'inputDateValue',
      'brDate',
      'moneyInput',
      'parseNum',
      'rfMovementValidation',
      'normalizeRfEventType',
      'rfEventDuplicateKey',
      'normalizeRfEventEntry',
      'normalizeRfEvents',
      'getRfAssetByEventId',
      'rfEventsForAsset',
      'rfMovementNeedsBaseline',
      'rfMovementBaselineEvent',
      'saveRfMovimentacao',
      'rfMovementModeOptionsHtml',
      'rfMovementEditorDomId',
      'rfMovementDraftForAsset',
      'openRfMovementEditor',
      'closeRfMovementEditor',
      'rfMovementEditorHtml',
      'edA',
      'svA',
      'clA',
      'refreshCotacao'
    ]);
  const exported = vm.runInNewContext(`${bundle}\n({ openRfMovementEditor, closeRfMovementEditor, rfMovementDraftForAsset, rfMovementEditorHtml, rfMovementModeOptionsHtml, rfMovementValidation, saveRfMovimentacao, edA, svA, clA, refreshCotacao, getRfAssetByEventId });`, context);
  return { ...exported, context, counters };
}

function rfAsset(overrides = {}) {
  return {
    id: 990001,
    ticker: 'CDB-BANCO',
    name: 'CDB Banco',
    type: 'Renda Fixa',
    rf_applied_value: 1000,
    indexer: 'CDI',
    current_price: 1050,
    ...overrides
  };
}

test('RF: modos de resgate parcial e total disponiveis nas opcoes do editor', () => {
  const harness = buildRfHarness();
  const options = harness.rfMovementModeOptionsHtml('aporte');
  assert.match(options, /value="aporte"/);
  assert.match(options, /value="resgate_parcial"/);
  assert.match(options, /value="resgate_total"/);
  assert.match(options, />Resgate parcial<\/option>/);
  assert.match(options, />Resgate total<\/option>/);
});

test('RF: rascunho da movimentacao preenche a data de hoje (regressao do botao Salvar)', () => {
  const harness = buildRfHarness();
  harness.context.S.assets = [rfAsset()];
  const draft = harness.rfMovementDraftForAsset(rfAsset(), 'resgate_total');
  assert.match(draft.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(draft.date, new Date().toISOString().slice(0, 10));
  assert.equal(draft.mode, 'resgate_total');
  assert.equal(draft.principalDelta, '1000,00');
});

test('RF: botao Salvar habilita com data preenchida e bloqueia sem data', () => {
  const harness = buildRfHarness();
  const asset = rfAsset();
  harness.context.S.assets = [asset];

  harness.context.S.rfMovementEditor = { assetId: '990001', draft: harness.rfMovementDraftForAsset(asset, 'resgate_total') };
  let html = harness.rfMovementEditorHtml(asset);
  assert.ok(html.includes('Salvar movimentação'));
  assert.equal(html.includes('disabled'), false, 'resgate total com data deve habilitar o botao Salvar');

  harness.context.S.rfMovementEditor = { assetId: '990001', draft: { ...harness.rfMovementDraftForAsset(asset, 'resgate_total'), date: '' } };
  html = harness.rfMovementEditorHtml(asset);
  assert.ok(html.includes('disabled'), 'sem data o botao Salvar permanece desabilitado');
});

test('RF: saldo parcial no editor reflete saldo menos o valor digitado', () => {
  const harness = buildRfHarness();
  const asset = rfAsset();
  harness.context.S.assets = [asset];
  harness.context.S.rfMovementEditor = {
    assetId: '990001',
    draft: { ...harness.rfMovementDraftForAsset(asset, 'resgate_parcial'), principalDelta: '500,00' }
  };
  const html = harness.rfMovementEditorHtml(asset);
  assert.match(html, /Saldo atual: <strong>R\$1000,00<\/strong>/);
  assert.match(html, /Saldo após: <strong>R\$500,00<\/strong>/);
  assert.equal(html.includes('disabled'), false);
});

test('RF: resgate total zera o saldo no editor', () => {
  const harness = buildRfHarness();
  const asset = rfAsset();
  harness.context.S.assets = [asset];
  harness.context.S.rfMovementEditor = { assetId: '990001', draft: harness.rfMovementDraftForAsset(asset, 'resgate_total') };
  const html = harness.rfMovementEditorHtml(asset);
  assert.match(html, /Saldo atual: <strong>R\$1000,00<\/strong>/);
  assert.match(html, /Saldo após: <strong>R\$0,00<\/strong>/);
  assert.match(html, /readonly/);
});

test('RF: valor acima do saldo e bloqueado pela validacao', () => {
  const harness = buildRfHarness();
  const asset = rfAsset();
  harness.context.S.assets = [asset];
  const parcial = harness.rfMovementValidation(asset, {
    mode: 'resgate_parcial',
    date: '2026-08-01',
    principalDelta: '1500,00'
  });
  assert.equal(parcial.ok, false);
  assert.match(parcial.error, /Saldo insuficiente/);

  const totalDivergente = harness.rfMovementValidation(asset, {
    mode: 'resgate_total',
    date: '2026-08-01',
    principalDelta: '900,00'
  });
  assert.equal(totalDivergente.ok, false);
  assert.match(totalDivergente.error, /resgate total deve ser igual ao saldo/);
});

test('RF: resgate parcial grava exatamente um evento e atualiza S.rfEvents', () => {
  const harness = buildRfHarness();
  const asset = rfAsset();
  harness.context.S.assets = [asset];
  harness.context.S.aportes = [{ id: 1, ticker: 'CDB-BANCO', value: 500 }];
  const aportesSnapshot = JSON.parse(JSON.stringify(harness.context.S.aportes));
  harness.context.S.rfMovementEditor = {
    assetId: '990001',
    draft: { ...harness.rfMovementDraftForAsset(asset, 'resgate_parcial'), principalDelta: '500,00' }
  };

  harness.saveRfMovimentacao();

  assert.equal(harness.context.S.rfEvents.length, 1);
  assert.equal(harness.context.S.rfEvents[0].type, 'resgate_parcial');
  assert.equal(harness.context.S.rfEvents[0].principalDelta, -500);
  assert.equal(harness.context.S.rfEvents[0].date, new Date().toISOString().slice(0, 10));
  assert.equal(harness.context.S.assets[0].rf_applied_value, 500);
  assert.equal(harness.context.S.rfMovementEditor, null);
  assert.equal(harness.counters.save, 1);
  assert.deepEqual(harness.context.S.aportes, aportesSnapshot, 'S.aportes nao pode ser alterado');
});

test('RF: resgate total grava saldo zero e pede confirmacao', () => {
  const harness = buildRfHarness();
  const asset = rfAsset();
  harness.context.S.assets = [asset];
  harness.context.S.rfMovementEditor = {
    assetId: '990001',
    draft: harness.rfMovementDraftForAsset(asset, 'resgate_total')
  };

  harness.saveRfMovimentacao();

  assert.equal(harness.counters.confirms.length, 1);
  assert.equal(harness.context.S.rfEvents.length, 1);
  assert.equal(harness.context.S.rfEvents[0].type, 'resgate_total');
  assert.equal(harness.context.S.rfEvents[0].principalDelta, -1000);
  assert.equal(harness.context.S.assets[0].rf_applied_value, 0);
});

test('RF: grava unica - segunda tentativa com mesmo rascunho e bloqueada como duplicada', () => {
  const harness = buildRfHarness();
  const asset = rfAsset();
  harness.context.S.assets = [asset];
  const draft = { ...harness.rfMovementDraftForAsset(asset, 'resgate_parcial'), principalDelta: '500,00' };
  harness.context.S.rfMovementEditor = { assetId: '990001', draft };

  harness.saveRfMovimentacao();
  assert.equal(harness.context.S.rfEvents.length, 1);
  assert.equal(harness.counters.save, 1);

  harness.context.S.rfMovementEditor = { assetId: '990001', draft };
  harness.saveRfMovimentacao();

  assert.equal(harness.context.S.rfEvents.length, 1, 'nao pode gravar evento duplicado');
  assert.equal(harness.counters.save, 1, 'duplicata nao pode chamar save');
  assert.equal(harness.counters.alerts.length, 1);
  assert.match(harness.counters.alerts[0], /Já existe uma movimentação/);
});

test('EDITAR: edA com id numerico passado como string abre o modal (regressao #259)', () => {
  const harness = buildRfHarness();
  harness.context.S.assets = [{ id: 123456, ticker: 'ITUB4', name: 'Itaú', type: 'Ação', current_price: 35 }];
  harness.context.S.render = () => { harness.counters.render += 1; };

  harness.edA('123456');

  assert.equal(harness.context.S.showA, true);
  assert.equal(harness.context.S.editId, 123456);
  assert.equal(typeof harness.context.S.editId, 'number');
  assert.equal(harness.context.S._fa.ticker, 'ITUB4');
  assert.equal(harness.counters.render, 1);
});

test('EDITAR: edA com id string abre o modal', () => {
  const harness = buildRfHarness();
  harness.context.S.assets = [{ id: 'PETR4', ticker: 'PETR4', name: 'Petrobras', type: 'Ação', current_price: 34 }];
  harness.edA('PETR4');
  assert.equal(harness.context.S.showA, true);
  assert.equal(harness.context.S.editId, 'PETR4');
  assert.equal(harness.context.S._fa.ticker, 'PETR4');
});

test('EDITAR: edA com id inexistente nao abre o modal', () => {
  const harness = buildRfHarness();
  harness.context.S.assets = [{ id: 123456, ticker: 'ITUB4', type: 'Ação' }];
  harness.edA('999999');
  assert.equal(harness.context.S.showA, false);
  assert.equal(harness.context.S.editId, null);
});

test('EDITAR: svA salva alteracoes e fecha o modal', () => {
  const harness = buildRfHarness();
  const fields = {
    'f-dy': { value: '5' },
    'f-pt': { value: '40' },
    'f-ip': { value: '10' },
    'f-se': { value: 'Bancos' },
    'f-ty': { value: 'Ação' },
    'f-ap': { value: '30' },
    'f-cp': { value: '35' }
  };
  harness.context.document = { getElementById: (id) => fields[id], querySelector: () => null };
  harness.context.S.assets = [{ id: 123456, ticker: 'ITUB4', name: 'Itaú', type: 'Ação', avg_price: 30, current_price: 35, sector: 'Bancos', dy: 5 }];
  harness.edA('123456');
  assert.equal(harness.context.S.showA, true);

  harness.svA();

  assert.equal(harness.context.S.showA, false);
  assert.equal(harness.context.S.editId, null);
  assert.equal(harness.context.S._fa, null);
  assert.equal(harness.counters.save, 1);
  assert.equal(harness.context.S.assets[0].price_target, 40);
  assert.equal(harness.context.S.assets[0].ideal_pct, 10);
  assert.equal(harness.context.S.assets[0].sector, 'Bancos');
});

test('EDITAR: clA fecha o modal (cancelar)', () => {
  const harness = buildRfHarness();
  harness.context.S.assets = [{ id: 123456, ticker: 'ITUB4', type: 'Ação' }];
  harness.edA('123456');
  assert.equal(harness.context.S.showA, true);
  harness.clA();
  assert.equal(harness.context.S.showA, false);
  assert.equal(harness.context.S.editId, null);
});

test('EDITAR: tecla ESC fecha o modal (handler presente)', () => {
  const html = readIndexHtml();
  assert.match(html, /addEventListener\('keydown',e=>\{ if\(e\.key==='Escape' && S\.showA && S\.editId\) clA\(\); \}\);/);
});

test('COTACAO: refresh de cotacao nao fecha o modal de edicao', async () => {
  const harness = buildRfHarness();
  const el = { value: 0 };
  harness.context.document = { getElementById: (id) => (id === 'f-cp' ? el : null), querySelector: () => null };
  harness.context.S.assets = [{ id: 123456, ticker: 'ITUB4', type: 'Ação', current_price: 35 }];
  harness.context.S.editId = 123456;
  harness.context.S.showA = true;
  harness.context.S.tab = 'ativos';

  await harness.refreshCotacao();

  assert.equal(harness.counters.fetchQuotes, 1);
  assert.equal(el.value, 35);
  assert.equal(harness.context.S.showA, true, 'modal deve permanecer aberto');
  assert.equal(harness.context.S.tab, 'ativos', 'aba ativa preservada');
  assert.equal(harness.counters.toasts.length, 1);
  assert.match(harness.counters.toasts[0].message, /ITUB4/);
});

test('COTACAO: intervalo definido como constante de 5 minutos', () => {
  const html = readIndexHtml();
  assert.match(html, /const QUOTE_REFRESH_INTERVAL = 5 \* 60 \* 1000;/);
  assert.match(html, /const QI = QUOTE_REFRESH_INTERVAL \/ 1000;/);
  const intervalExpr = html.match(/const QUOTE_REFRESH_INTERVAL = ([^;]+);/);
  assert.equal(vm.runInNewContext(`(${intervalExpr[1]})`), 300000);
  assert.equal(vm.runInNewContext('(300000 / 1000)'), 300);
});

test('COTACAO: fetchQuotes arma e desarma a preservacao de UI', () => {
  const html = readIndexHtml();
  assert.match(html, /if\(!bodyModalLockActive\(\)\) snapshotQuoteUi\(\);/);
  assert.match(html, /snapshotQuoteUi\(\);\s*render\(\);/);
  assert.match(html, /render\(\);\s*disarmQuoteUi\(\);/);
  assert.match(html, /if\(S\.qInFlight\) return;/, 'guarda de reentrada preservada');
});

test('COTACAO: o tick de 1s nao chama render (apenas decrementa cd)', () => {
  const html = readIndexHtml();
  assert.match(html, /S\.cd=Math\.max\(0,S\.cd-1\);/);
  assert.match(html, /if\(S\.cd<=0\)\{ S\.cd=QI; fetchQuotes\(false\); return; \}/);
});

function buildQuoteUiHarness() {
  const html = readIndexHtml();
  const scrollCalls = [];
  const detailsNodes = [
    { open: true, _attr: {}, setAttribute(k, v) { this._attr[k] = v; this.open = true; } },
    { open: false, _attr: {}, setAttribute(k, v) { this._attr[k] = v; this.open = true; } },
    { open: true, _attr: {}, setAttribute(k, v) { this._attr[k] = v; this.open = true; } }
  ];
  const rootEl = {
    _html: '',
    set innerHTML(v) { this._html = v; for (const d of detailsNodes) d.open = false; },
    get innerHTML() { return this._html; }
  };
  const context = {
    S: { _rmpTrace: false, tab: 'ativos', assetsInnerTab: 'patrimonio' },
    document: {
      getElementById: (id) => (id === 'root' ? rootEl : null),
      querySelectorAll: (sel) => (sel === 'details' ? detailsNodes : [])
    },
    window: { scrollX: 30, scrollY: 120, scrollTo: (opts) => scrollCalls.push(opts) },
    requestAnimationFrame: (fn) => { fn(); return 1; },
    scrollPreserveActive: () => false,
    syncBodyModalLock: () => {},
    withRenderCycleReportCache: (fn) => fn(),
    bind: () => {},
    debugError: () => {},
    debugWarn: () => {},
    app: () => '<div>rendered</div>'
  };
  const bundle = 'let bodyScrollLockY=null;\nlet scrollRestorePoint=null;\n' + buildBundle(html, ['snapshotQuoteUi', 'restoreQuoteUi', 'disarmQuoteUi', 'render']);
  const exported = vm.runInNewContext(
    `${bundle}\n({ snapshotQuoteUi, restoreQuoteUi, disarmQuoteUi, render, getQuoteUiArmed:()=>quoteUiArmed, getQuoteUiSnapshot:()=>quoteUiSnapshot });`,
    context
  );
  return { ...exported, context, detailsNodes, scrollCalls };
}

test('COTACAO: render apos refresh preserva details abertos, scroll e aba', () => {
  const harness = buildQuoteUiHarness();
  harness.snapshotQuoteUi();

  harness.render();

  assert.equal(harness.detailsNodes[0]._attr.open, '');
  assert.equal(harness.detailsNodes[2]._attr.open, '');
  assert.equal(harness.detailsNodes[1]._attr.open, undefined, 'details fechado permanece fechado');
  const lastScroll = harness.scrollCalls[harness.scrollCalls.length - 1];
  assert.equal(lastScroll.left, 30);
  assert.equal(lastScroll.top, 120);
  assert.equal(lastScroll.behavior, 'auto');
  assert.equal(harness.context.S.tab, 'ativos');
  assert.equal(harness.context.S.assetsInnerTab, 'patrimonio');
});

test('COTACAO: disarmQuoteUi limpa a preservacao apos o ciclo', () => {
  const harness = buildQuoteUiHarness();
  harness.snapshotQuoteUi();
  assert.equal(harness.getQuoteUiArmed(), true);
  assert.ok(harness.getQuoteUiSnapshot());
  harness.disarmQuoteUi();
  assert.equal(harness.getQuoteUiArmed(), false);
  assert.equal(harness.getQuoteUiSnapshot(), null);
});
