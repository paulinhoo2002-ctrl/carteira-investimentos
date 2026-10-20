const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function readIndexHtml() {
  return fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
}

function extractSnippet(startMarker, endMarker) {
  const html = readIndexHtml();
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Start marker not found: ${startMarker}`);
  assert.notEqual(end, -1, `End marker not found: ${endMarker}`);
  return html.slice(start, end);
}

function extractThemeBootstrap(html = readIndexHtml()) {
  const startMarker = '(()=>{try{';
  const start = html.indexOf(startMarker);
  assert.notEqual(start, -1, `Start marker not found: ${startMarker}`);

  const endMarker = '</script>';
  const end = html.indexOf(endMarker, start);
  assert.notEqual(end, -1, `End marker not found: ${endMarker}`);

  const afterScript = html.slice(end + endMarker.length);
  assert.match(afterScript, /^[\t \r\n]*<style\b/i, 'Style tag not found after theme bootstrap');

  return html.slice(start, end);
}

function extractUiBundle() {
  return [
    extractSnippet('let reportModalFocusOrigin=null;', 'function pdfReportKpi('),
    extractSnippet("function pdfReportKpi(label,value,sub=''){", 'function reportCardPdfProventosPreview('),
    extractSnippet('function content(){', 'function prudentContributionAnalysis(){'),
    extractSnippet('function go(t){', 'function clA(){')
  ].join('\n');
}

function makeThemeBootstrapHarness({ host = 'localhost', search = '?testMode=1', storedTheme = 'light' } = {}) {
  const meta = {
    setAttributeCalls: [],
    setAttribute(name, value) {
      this.setAttributeCalls.push([name, value]);
    }
  };
  const documentElement = { dataset: {}, style: {} };
  let storageReads = 0;
  const context = {
    location: { hostname: host, search },
    URLSearchParams,
    window: { __LOCAL_QA_RUNTIME__: 'local-synthetic-v1' },
    document: {
      documentElement,
      querySelector(selector) {
        return selector === 'meta[name="theme-color"]' ? meta : null;
      }
    },
    localStorage: {
      getItem(key) {
        storageReads += 1;
        if (key === 'carteira_theme') return storedTheme;
        return null;
      }
    }
  };
  vm.runInNewContext(extractThemeBootstrap(), context);
  return { context, meta, documentElement, storageReads };
}

function makeUiHarness(overrides = {}) {
  const counters = {
    save: 0,
    render: 0,
    autoProv: 0,
    withScrollPreserved: 0,
    toasts: [],
    openCalls: []
  };
  const focusLog = [];
  const trigger = {
    id: 'report-trigger',
    disabled: false,
    isConnected: true,
    focus(options) {
      focusLog.push({ target: 'trigger', options: options || null });
      document.activeElement = trigger;
    }
  };
  const body = {
    focus(options) {
      focusLog.push({ target: 'body', options: options || null });
      document.activeElement = body;
    }
  };
  const document = {
    activeElement: trigger,
    body,
    getElementById() { return null; }
  };

  const context = {
    APP_NAME: 'Carteira de Investimentos',
    S: {
      tab: 'dashboard',
      tabSeq: 0,
      assetsInnerTab: 'resumo',
      reportCardPdfType: null,
      mobileMenuOpen: true,
      mobileTopMenuOpen: true,
      irpfStep: 4,
      irpfFinalOpen: true,
      activeDividendSection: null,
      aportesViewMode: 'lista'
    },
    esc(value) {
      return String(value ?? '');
    },
    fmt(value) {
      return `R$${Number(value || 0).toFixed(2)}`;
    },
    fmtP(value) {
      return `${Number(value || 0).toFixed(2)}%`;
    },
    withVisibleValues(fn) {
      return fn();
    },
    reportsSnapshot() {
      return {
        generatedAt: '2026-07-13T12:00:00Z',
        periodLabel: 'Todos',
        portfolio: { tC: 4815, tI: 3750 }
      };
    },
    reportAssetRows() {
      return [
        {
          ticker: 'ITUB4',
          name: 'ItaÃº PN',
          type: 'AÃ§Ã£o',
          sector: 'Bancos',
          qty: 150,
          avgPrice: 25,
          currentPrice: 32.1,
          applied: 3750,
          current: 4815,
          result: 1065,
          resultPct: 28.4
        }
      ];
    },
    reportCardPdfProventosPreview() { return ''; },
    reportCardPdfFixedPreview() { return ''; },
    reportCardPdfPatrimonyPreview() { return ''; },
    reportCardPdfAuditPreview() { return ''; },
    save() {
      counters.save += 1;
    },
    render() {
      counters.render += 1;
    },
    runAutoProventosGratis() {
      counters.autoProv += 1;
    },
    withScrollPreserved(fn) {
      counters.withScrollPreserved += 1;
      fn();
    },
    toast(message, color) {
      counters.toasts.push({ message, color });
    },
    debugError() {},
    requestAnimationFrame(fn) {
      fn();
      return 1;
    },
    setTimeout(fn) {
      fn();
      return 1;
    },
    alert() {},
    document,
    window: {
      open(url, target, features) {
        counters.openCalls.push({ url, target, features });
        return {
          closed: false,
          opener: {},
          document: {
            readyState: 'complete',
            open() {},
            write() {},
            close() {}
          },
          focus() {},
          print() {}
        };
      }
    },
    dashboardMarkup() {
      return '<section id="dashboard-view">dashboard</section>';
    },
    ativosMarkup() {
      return '<section id="ativos-view">ativos</section>';
    },
    reportsMarkup() {
      return '<section id="relatorios-view">relatorios</section>';
    },
    metasTab() { return '<section id="metas-view">metas</section>'; },
    apTab() { return '<section id="aportes-view">aportes</section>'; },
    patrimonioTab() { return '<section id="patrimonio-view">patrimonio</section>'; },
    divs2() { return '<section id="dividendos-view">dividendos</section>'; },
    irpfTabPremium() { return '<section id="irpf-view">irpf</section>'; },
    rentabilidadeTab() { return '<section id="rentabilidade-view">rentabilidade</section>'; },
    ajudarTab() { return '<section id="ajudar-view">ajudar</section>'; },
    dataAuditTab() { return '<section id="auditoria-view">auditoria</section>'; },
    reportsTab() { return '<section id="relatorios-view">relatorios</section>'; },
    iaTab() { return '<section id="ia-view">ia</section>'; },
    dash() { return this.dashboardMarkup(); },
    ativos() { return this.ativosMarkup(); },
    ...overrides
  };

  const bundle = extractUiBundle()
    .replace("if(S.tab==='dashboard') return dash();", "if(S.tab==='dashboard') return dashboardMarkup();")
    .replace("if(S.tab==='ativos')    return ativos();", "if(S.tab==='ativos')    return ativosMarkup();")
    .replace("if(S.tab==='ranking')    return ativos();", "if(S.tab==='ranking')    return ativosMarkup();")
    .replace("if(S.tab==='renda-fixa')return ativos();", "if(S.tab==='renda-fixa')return ativosMarkup();");

  const exported = vm.runInNewContext(`${bundle}\n({ openReportCardPdf, closeReportCardPdf, printReportCardPdf, reportCardPdfAssetsPreview, buildReportCardPrintHtml, content, go });`, context);
  return { ...exported, context, counters, focusLog, trigger, body };
}

test('bootstrap local com testMode ativa modo de teste e nÃ£o lÃª tema salvo', () => {
  const harness = makeThemeBootstrapHarness();

  assert.equal(harness.context.window.__LOCAL_TEST_MODE__, true);
  assert.equal(harness.documentElement.dataset.theme, 'light');
  assert.equal(harness.documentElement.style.colorScheme, 'light');
  assert.equal(harness.storageReads, 0);
  assert.deepEqual(harness.meta.setAttributeCalls, []);
});

test('extractThemeBootstrap tolera LF, CRLF e style com atributos', () => {
  const samples = [
    {
      html: '<script>\n(()=>{try{window.__LOCAL_TEST_MODE__=true;})();</script>\n<style id="theme"></style>',
      expected: '(()=>{try{window.__LOCAL_TEST_MODE__=true;})();'
    },
    {
      html: '<script>\r\n(()=>{try{window.__LOCAL_TEST_MODE__=true;})();</script>\r\n   <style data-theme="dark"></style>',
      expected: '(()=>{try{window.__LOCAL_TEST_MODE__=true;})();'
    }
  ];

  for (const sample of samples) {
    assert.equal(extractThemeBootstrap(sample.html), sample.expected);
  }
});

test('extractThemeBootstrap falha com mensagens claras quando marcadores somem', () => {
  assert.throws(
    () => extractThemeBootstrap('<script>console.log(1);</script><style></style>'),
    /Start marker not found: \(\(\)=>\{try\{/
  );
  assert.throws(
    () => extractThemeBootstrap('<script>(()=>{try{window.__LOCAL_TEST_MODE__=true;})();</style>'),
    /End marker not found: <\/script>/
  );
});

test('documento mantÃ©m tÃ­tulo principal da aplicaÃ§Ã£o', () => {
  const html = readIndexHtml();
  assert.match(html, /Carteira de Investimentos/);
});

test('content roteia dashboard, ativos e relatÃ³rios para as Ã¡reas corretas', () => {
  const harness = makeUiHarness();

  harness.context.S.tab = 'dashboard';
  assert.equal(harness.content(), '<section id="dashboard-view">dashboard</section>');

  harness.context.S.tab = 'ativos';
  assert.equal(harness.content(), '<section id="ativos-view">ativos</section>');

  harness.context.S.tab = 'relatorios';
  assert.equal(harness.content(), '<section id="relatorios-view">relatorios</section>');
});

test('go navega entre Ã¡reas estÃ¡veis e aciona save/render sem erro crÃ­tico', () => {
  const harness = makeUiHarness();

  harness.go('ativos');
  assert.equal(harness.context.S.tab, 'ativos');
  assert.equal(harness.counters.save, 1);
  assert.equal(harness.counters.render, 1);

  harness.go('relatorios');
  assert.equal(harness.context.S.tab, 'relatorios');
  assert.equal(harness.counters.save, 2);
  assert.equal(harness.counters.render, 2);

  harness.go('dashboard');
  assert.equal(harness.context.S.tab, 'dashboard');
  assert.equal(harness.counters.save, 3);
  assert.equal(harness.counters.render, 3);
});

test('go trata renda fixa como aba interna de ativos e fecha menus mÃ³veis', () => {
  const harness = makeUiHarness();

  harness.go('renda-fixa');

  assert.equal(harness.context.S.tab, 'renda-fixa');
  assert.equal(harness.context.S.mobileMenuOpen, false);
  assert.equal(harness.context.S.mobileTopMenuOpen, false);
});

test('prÃ©via de ativos abre e fecha como modal acessÃ­vel sem placeholders quebrados', () => {
  const harness = makeUiHarness();

  harness.openReportCardPdf('assets');
  assert.equal(harness.context.S.reportCardPdfType, 'assets');
  assert.equal(harness.counters.render, 1);

  const preview = harness.reportCardPdfAssetsPreview(false);
  assert.match(preview, /role="dialog"/);
  assert.match(preview, /aria-modal="true"/);
  assert.match(preview, /Prévia do PDF - Ativos/);
  assert.match(preview, /Voltar/);
  assert.ok(!preview.includes('NaN'));
  assert.ok(!preview.includes('undefined'));
  assert.ok(!preview.includes('[object Object]'));

  const printHtml = harness.buildReportCardPrintHtml('assets');
  assert.match(printHtml, /<!doctype html>/i);
  assert.match(printHtml, /<title>Ativos - Carteira de Investimentos<\/title>/);

  harness.closeReportCardPdf();
  assert.equal(harness.context.S.reportCardPdfType, null);
  assert.equal(harness.counters.withScrollPreserved, 1);
  assert.equal(harness.counters.render, 2);
});

test('prÃ©via de ativos devolve foco ao disparador ao fechar o modal', () => {
  const harness = makeUiHarness();

  harness.openReportCardPdf('assets');
  harness.context.document.activeElement = harness.body;
  harness.closeReportCardPdf();

  assert.equal(harness.focusLog.some(entry => entry.target === 'trigger'), true);
  assert.equal(harness.context.document.activeElement, harness.trigger);
});

test('fechamento da prÃ©via nÃ£o lanÃ§a erro quando o disparador original nÃ£o existe mais', () => {
  const harness = makeUiHarness();

  harness.openReportCardPdf('assets');
  harness.trigger.isConnected = false;

  assert.doesNotThrow(() => harness.closeReportCardPdf());
  assert.equal(harness.focusLog.some(entry => entry.target === 'trigger'), false);
});

test('fluxo de impressÃ£o dos relatÃ³rios usa janela protegida com noopener e noreferrer', () => {
  const harness = makeUiHarness();

  harness.context.S.reportCardPdfType = 'assets';
  harness.printReportCardPdf();

  assert.equal(harness.counters.openCalls.length, 1);
  assert.equal(harness.counters.openCalls[0].features, 'noopener,noreferrer,width=900,height=700');
  const html = readIndexHtml();
  assert.match(html, /window\.open\('about:blank', '_blank', 'noopener,noreferrer,width=1280,height=900'\)/);
});

test('tema claro e padrão quando não há preferência salva', () => {
  const harness = makeThemeBootstrapHarness({ host: 'carteira.example', search: '', storedTheme: null });
  assert.equal(harness.documentElement.dataset.theme, 'light');
  assert.equal(harness.documentElement.style.colorScheme, 'light');
});

test('preferência explícita de tema escuro continua respeitada', () => {
  const harness = makeThemeBootstrapHarness({ host: 'carteira.example', search: '', storedTheme: 'dark' });
  assert.equal(harness.documentElement.dataset.theme, 'dark');
  assert.equal(harness.documentElement.style.colorScheme, 'dark');
});

function makeHideValuesPreferenceHarness({ storedValue = null, initialValue = false, localTest = false } = {}) {
  const storage = new Map(storedValue === null ? [] : [['carteira_hide_values', storedValue]]);
  const calls = { reads: 0, writes: [], renders: 0, saves: 0, toasts: [] };
  const context = {
    S: { hideValues: initialValue },
    HIDE_VALUES_STOR: 'carteira_hide_values',
    isLocalTestMode: () => localTest,
    localStorage: {
      getItem(key) { calls.reads += 1; return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { calls.writes.push([key, value]); storage.set(key, value); }
    },
    render() { calls.renders += 1; },
    save() { calls.saves += 1; },
    toast(message) { calls.toasts.push(message); }
  };
  const source = [
    extractSnippet('function syncHideValuesPreference(){', 'function toggleHideValues(){'),
    extractSnippet('function toggleHideValues(){', 'function installBox(){')
  ].join('\n');
  const functions = vm.runInNewContext(`${source}\n({syncHideValuesPreference,toggleHideValues})`, context);
  return { ...functions, context, calls, storage };
}

test('Hide Values local vence valor antigo salvo e sobrevive ao reload', () => {
  const firstLoad = makeHideValuesPreferenceHarness({ initialValue: false });
  firstLoad.syncHideValuesPreference();
  firstLoad.toggleHideValues();
  assert.equal(firstLoad.context.S.hideValues, true);
  assert.equal(firstLoad.storage.get('carteira_hide_values'), 'true');
  assert.equal(firstLoad.calls.saves, 0);

  const nextLoad = makeHideValuesPreferenceHarness({
    storedValue: firstLoad.storage.get('carteira_hide_values'),
    initialValue: false
  });
  nextLoad.syncHideValuesPreference();
  assert.equal(nextLoad.context.S.hideValues, true);
});

test('Hide Values migra preferência legada sem salvar carteira', () => {
  const harness = makeHideValuesPreferenceHarness({ initialValue: true });
  harness.syncHideValuesPreference();
  assert.equal(harness.storage.get('carteira_hide_values'), 'true');
  harness.toggleHideValues();
  assert.equal(harness.storage.get('carteira_hide_values'), 'false');
  assert.equal(harness.calls.saves, 0);
});

test('Hide Values no teste local não acessa nem escreve storage', () => {
  const harness = makeHideValuesPreferenceHarness({ localTest: true });
  harness.syncHideValuesPreference();
  harness.toggleHideValues();
  assert.equal(harness.context.S.hideValues, true);
  assert.equal(harness.calls.reads, 0);
  assert.deepEqual(harness.calls.writes, []);
});
test('Dashboard explains partial history on demand without filling missing chart periods', () => {
  const source = extractSnippet('function dashboardEvolutionPanel(data){', 'function dashboardIncomePanel(data){');
  let chartInput;
  const renderPanel = vm.runInNewContext(`${source}\ndashboardEvolutionPanel`, {
    S: { dashPeriod: 12 },
    patrimonySnapshot: () => ({ months: [
      { movementCount: 2, cumulative: 100, label: 'Jan/26' },
      { movementCount: 0, cumulative: null, label: 'Fev/26' },
      { movementCount: 1, cumulative: 130, label: 'Mar/26' }
    ] }),
    lineChart(series, labels) { chartInput = { series, labels }; return '<svg></svg>'; },
    fmt: value => String(value)
  });

  const html = renderPanel({});
  assert.match(html, /<details class="dashboard-history-disclosure">/);
  assert.match(html, /<summary>Cobertura do histórico<\/summary>/);
  assert.match(html, /cobertura do histórico.*desconhecida/i);
  assert.deepEqual(Array.from(chartInput.series[0].values), [100, null, 130]);
  assert.deepEqual(Array.from(chartInput.labels), ['Jan/26', 'Fev/26', 'Mar/26']);
});
test('Dashboard position result label stays distinct from portfolio total', () => {
  const source = extractSnippet('function executiveKPIs(data){', 'function package2ExecutivePanel(');
  const cards = [];
  const renderKpis = vm.runInNewContext(`${source}\nexecutiveKPIs`, {
    S: { proventos: [], rfEvents: [], hideValues: false },
    dashboardCurrentValueAvailability: () => ({ state: 'AVAILABLE', note: 'Valores atuais informados' }),

      package2HasRenderableSummary: () => false,
      dashboardHasEconomicCertification: () => false,
      dashboardEconomicResultStatus: () => '',
      FB: {},
    passiveIncomeMonthKey: () => '2026-10',
    passiveIncomeMonthSummary: () => ({ month: '2026-10', total: null, coverage: 'UNKNOWN' }),
    assetSignedMoneyText: value => `R$ ${value}`,
    fmtP: value => `${value}%`,
    dashboardMetricIcon: () => '',
    dashboardMetricCard: (icon, label, value, note) => { cards.push({ label, value, note }); return ''; },
    passiveIncomeValue: () => '—',
    fmt: value => `R$ ${value}`
  });

  renderKpis({
    portfolio: { tC: 100, tI: 80, tG: 20, tGP: 25, appliedComplete: true },
    recent: { month: '2026-10', total: null, coverage: 'UNKNOWN' }
  });
  assert.ok(cards.some(card => card.label === 'Resultado da posição'));
});
test('M523 light foundation is emitted inside a stylesheet', () => {
  const html = readIndexHtml();
  const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]);
  assert.ok(styleBlocks.some(css => css.includes('/* M523: light-first visual foundation')));
  assert.doesNotMatch(html, /<style>\s*<style>/i);
});
