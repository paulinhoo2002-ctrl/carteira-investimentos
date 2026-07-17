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
    window: {},
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
  assert.equal(harness.documentElement.dataset.theme, 'dark');
  assert.equal(harness.documentElement.style.colorScheme, 'dark');
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

  assert.equal(harness.context.S.tab, 'ativos');
  assert.equal(harness.context.S.assetsInnerTab, 'renda-fixa');
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
