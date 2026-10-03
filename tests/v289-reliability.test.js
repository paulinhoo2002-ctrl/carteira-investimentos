const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function createApp(viewport = { width: 1366, height: 768 }) {
  const harness = await startLocalHttpServer(require('node:path').join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport, isMobile: viewport.width <= 430, hasTouch: viewport.width <= 430 });
  const page = await context.newPage();
  const errors = [];
  const requestFailures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => requestFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'failed'}`));
  await page.goto(harness.url, { waitUntil: 'networkidle' });
  await applyV289VisualFixture(page, 'baseline');
  return { browser, context, page, harness, errors, requestFailures };
}

async function closeApp(app) {
  await app.browser.close();
  app.harness.server.closeAllConnections();
  app.harness.server.close();
}

async function seedReliability(page, count = 24) {
  await page.evaluate(assetCount => {
    S.assets = Array.from({ length: assetCount }, (_, index) => ({
      id: `QA_TRUST_${index + 1}`,
      ticker: '',
      name: '',
      type: '',
      qty: null,
      avg_price: null,
      current_price: null,
      source: '',
      sourceAsOf: null,
      financialAsOf: null,
    }));
    S.aportes = [];
    S.proventos = [];
    S.rfEvents = [];
    S.tab = 'confiabilidade';
    render();
  }, count);
}

test('Wave F: reliability summary and at most three priority gaps lead the evidence', async () => {
  const app = await createApp();
  try {
    await app.page.evaluate(() => { S.tab = 'confiabilidade'; render(); });
    const authority = await app.page.locator('[data-trust-primary-summary]').innerText();
    assert.match(authority, /Origem e autoridade[\s\S]*autoridade manual/i, 'autoridade manual deve ser nomeada sem se confundir com referência de mercado');

    await seedReliability(app.page);
    const contract = await app.page.evaluate(() => {
      const page = document.querySelector('.data-trust-page');
      const summary = page?.querySelector('[data-trust-primary-summary]');
      const gaps = page?.querySelectorAll('[data-trust-priority-gap]') || [];
      const technical = page?.querySelector('#data-trust-diagnostics');
      return {
        title: page?.querySelector('h1')?.innerText || '',
        summaryText: summary?.innerText || '',
        overallState: summary?.querySelector('.data-trust-primary-state')?.innerText || '',
        summaryBeforeGaps: Boolean(summary && gaps[0] && summary.compareDocumentPosition(gaps[0]) & Node.DOCUMENT_POSITION_FOLLOWING),
        visibleGapCount: gaps.length,
        gapEvidence: gaps[0]?.innerText || '',
        gapActions: [...(page?.querySelectorAll('[data-trust-priority-gap] button') || [])].map(button => ({ text:button.innerText, label:button.getAttribute('aria-label') })),
        technicalCollapsed: technical ? !technical.open : false,
        pageText: page?.innerText || '',
      };
    });
    assert.match(contract.title, /Confiabilidade/i);
    assert.ok(contract.summaryText.length > 0, 'a rota deve começar com síntese legível do estado de confiabilidade');
    assert.doesNotMatch(contract.overallState, /Confiável|Completo|Saudável/i, 'ausência de achados não deve ser apresentada como certificação de completude');
    assert.match(contract.summaryText, /Sincronização/i, 'estado da sincronização deve permanecer explícito e distinto da completude');
    assert.equal(contract.summaryBeforeGaps, true, 'síntese deve preceder evidências prioritárias');
    assert.ok(contract.visibleGapCount <= 3, 'no máximo três gaps prioritários devem aparecer abertos');
    assert.match(contract.gapEvidence, /Impacto:/i, 'o gap prioritário deve explicar seu impacto');
    assert.ok(contract.gapActions.length > 0, 'gap acionável deve ter destino por ação rotulada');
    assert.ok(contract.gapActions.every(action => action.text && action.label), 'destino de cada ação deve estar identificado visualmente e acessivelmente');
    assert.equal(contract.technicalCollapsed, true, 'diagnósticos técnicos devem começar recolhidos');
    assert.doesNotMatch(contract.pageText, /compra|venda|deve comprar|deve vender|recomendação de investimento/i);
  } finally {
    await closeApp(app);
  }
});

test('Wave F: no-data, partial and stale states remain distinct and as-of fields stay separate', async () => {
  const app = await createApp();
  try {
    await app.page.evaluate(() => {
      S.assets = []; S.aportes = []; S.proventos = []; S.rfEvents = [];
      S.goals = { patrimonio:{target:100000,aporte:0,annualVar:0}, ativos:{type:'Ação',ticker:'QA_SYNTH',aporte:0,annualVar:0,finalValue:0}, proventos:{types:['Ação','FII','ETF','Renda Fixa'],monthly:1000} };
      S.tab = 'confiabilidade'; render();
    });
    const empty = await app.page.locator('.data-trust-v294').innerText();
    assert.match(empty, /Indisponível|Sem posições avaliadas|Sem registros/i);
    assert.doesNotMatch(empty, /Cobertura[^\n]*0%/i, 'ausência de registros não deve virar cobertura zero');
    assert.equal(await app.page.locator('[data-trust-priority-gap]').count(), 0, `estado sem gaps não deve criar itens artificiais: ${await app.page.locator('[data-trust-priority-gap]').allInnerTexts()}`);
    assert.match(empty, /Nenhum gap de cadastro/i);

    await app.page.evaluate(() => {
      S.assets = [{ id:'QA_ASOF_1', ticker:'QAX1', name:'Ativo sintético', type:'Ação', qty:1, avg_price:10, current_price:11, currency:'BRL', source:'QA sintético', quoteUpdatedAt:'2026-10-02T10:00:00Z', quoteMarketTime:'2026-10-01T17:00:00Z', sourceAsOf:'2026-10-02', financialAsOf:'2026-10-01' }];
      render();
    });
    const state = await app.page.evaluate(() => {
      const root = document.querySelector('.data-trust-v294');
      return {
        text: root?.innerText || '',
        sourceDate: root?.querySelector('[data-trust-source-as-of]')?.textContent || '',
        financialDate: root?.querySelector('[data-trust-financial-as-of]')?.textContent || '',
        statuses: [...(root?.querySelectorAll('[data-trust-state]') || [])].map(node => node.innerText),
      };
    });
    assert.match(state.sourceDate, /02\/10\/2026/);
    assert.match(state.financialDate, /01\/10\/2026/);
    assert.notEqual(state.sourceDate, state.financialDate, 'data da fonte e data financeira precisam permanecer independentes');
    assert.match(state.text, /Parcial|Atual|Desatualizada|Desconhecida/);
    assert.ok(state.statuses.every(status => status.trim()), 'estados devem ter rótulos textuais além da cor');

    await app.page.evaluate(() => { S.assets[0].quoteUpdatedAt='2026-01-01T10:00:00Z'; render(); });
    const stale = await app.page.locator('[data-trust-primary-summary]').innerText();
    assert.match(stale, /Desatualizado/);
    assert.match(stale, /1 desatualizada/);
  } finally {
    await closeApp(app);
  }
});

test('Wave F: per-asset authority is visible and stays distinct from source and freshness', async () => {
  const app = await createApp();
  try {
    await app.page.evaluate(() => {
      S.assets = [
        { id:'QA_AUTH_MANUAL', ticker:'QAM1', name:'Ativo manual sintético', type:'Ação', qty:1, avg_price:10, current_price:11, source:'Fonte sintética A', quoteUpdatedAt:'2026-10-02T10:00:00Z', manual_authority:true, manualValueAuthority:'manual' },
        { id:'QA_AUTH_IMPORTED', ticker:'QAI1', name:'Ativo importado sintético', type:'Ação', qty:1, avg_price:10, current_price:11, source:'Fonte sintética C', quoteUpdatedAt:'2026-10-02T10:00:00Z', valuationMode:'LEGACY_REPORTED', currentMeta:{ authority:'IMPORTED_AUTHORITATIVE' } },
        { id:'QA_AUTH_UNKNOWN', ticker:'QAU1', name:'Ativo sem autoridade sintético', type:'Ação', qty:1, avg_price:10, current_price:11, source:'Fonte sintética B', quoteUpdatedAt:'2026-10-02T10:00:00Z' },
      ];
      S.aportes = []; S.proventos = []; S.rfEvents = []; S.tab = 'confiabilidade'; render();
    });

    const authorityDisclosure = app.page.getByText('Autoridade por ativo');
    assert.equal(await authorityDisclosure.count(), 1, 'autoridade por ativo deve ser encontrável sem abrir os diagnósticos técnicos');
    await authorityDisclosure.click();
    const manualRow = app.page.locator('[data-trust-asset-authority]').filter({ hasText:'QAM1' });
    const importedRow = app.page.locator('[data-trust-asset-authority]').filter({ hasText:'QAI1' });
    const unknownRow = app.page.locator('[data-trust-asset-authority]').filter({ hasText:'QAU1' });
    const manualText = await manualRow.innerText();
    const importedText = await importedRow.innerText();
    const unknownText = await unknownRow.innerText();
    assert.match(manualText, /Autoridade: Manual/i);
    assert.match(manualText, /Fonte: Fonte sintética A/i);
    assert.match(manualText, /Atualização da cotação:/i);
    assert.match(importedText, /Autoridade: Importado/i);
    assert.match(importedText, /Fonte: Fonte sintética C/i);
    assert.match(importedText, /Atualização da cotação:/i);
    assert.match(unknownText, /Autoridade: Não informada/i);
    assert.match(unknownText, /Fonte: Fonte sintética B/i);
    assert.match(unknownText, /Atualização da cotação:/i);
    assert.doesNotMatch(unknownText, /Autoridade: (Manual|Referência de mercado|Estimado|Importado|Oficial|Histórico certificado)/i);
  } finally {
    await closeApp(app);
  }
});

test('Wave F: detailed evidence stays reachable through a keyboard-operable disclosure', async () => {
  const app = await createApp();
  try {
    await seedReliability(app.page, 6);
    const disclosure = app.page.locator('#data-trust-diagnostics');
    assert.equal(await disclosure.count(), 1);
    const summary = disclosure.locator(':scope > summary');
    await summary.focus();
    await app.page.keyboard.press('Enter');
    assert.equal(await disclosure.evaluate(node => node.open), true);
    assert.ok(await app.page.locator('#data-trust-positions').count());
    assert.ok(await app.page.locator('#data-trust-reconciliation').count());
    assert.ok(await app.page.locator('#v258-alert-center').count());
    await app.page.keyboard.press('Enter');
    assert.equal(await disclosure.evaluate(node => node.open), false);
  } finally {
    await closeApp(app);
  }
});

test('Wave F: reliability hierarchy remains usable at desktop and mobile widths', async () => {
  const viewports = [
    { width:390, height:844 }, { width:430, height:932 }, { width:768, height:1024 },
    { width:1366, height:768 }, { width:1440, height:900 }, { width:1536, height:864 }, { width:1920, height:1080 },
  ];
  const app = await createApp(viewports[0]);
  try {
    await seedReliability(app.page, 24);
    for (const theme of ['dark', 'light']) {
      for (const viewport of viewports) {
        await app.page.setViewportSize(viewport);
        await app.page.evaluate(themeName => { document.documentElement.dataset.theme = themeName; }, theme);
        const result = await app.page.evaluate(() => {
          const root = document.querySelector('.data-trust-v294');
          const summary = root?.querySelector('[data-trust-primary-summary]');
          const summaryRect = summary?.getBoundingClientRect();
          const targets = [...(root?.querySelectorAll('button,a,summary,input,select') || [])]
            .filter(node => { const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; })
            .map(node => ({ name:node.innerText || node.getAttribute('aria-label') || node.tagName, height:node.getBoundingClientRect().height }));
          return {
            viewport:innerWidth,
            scrollWidth:document.documentElement.scrollWidth,
            clientWidth:document.documentElement.clientWidth,
            titleVisible:Boolean(root?.querySelector('h1')?.getBoundingClientRect().height),
            summaryVisible:Boolean(summaryRect && summaryRect.top < innerHeight),
            diagnosticsCollapsed:root?.querySelector('#data-trust-diagnostics')?.open === false,
            smallTargets:targets.filter(target => target.height < 44),
            clippedPrimary:[...(summary?.querySelectorAll('*') || [])].filter(node => {
              const style=getComputedStyle(node);
              const clips=style.overflowX!=='visible'||style.overflowY!=='visible';
              return clips&&(node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1);
            }).map(node => node.tagName.toLowerCase()),
            primaryTextColor:root?.querySelector('.data-trust-primary-note')?getComputedStyle(root.querySelector('.data-trust-primary-note')).color:'',
          };
        });
        assert.equal(result.scrollWidth, result.clientWidth, `sem overflow em ${viewport.width}px ${theme}`);
        assert.equal(result.titleVisible, true);
        assert.equal(result.summaryVisible, true);
        assert.equal(result.diagnosticsCollapsed, true);
        assert.deepEqual(result.smallTargets, [], `alvos interativos da rota devem ter ao menos 44px em ${viewport.width}px ${theme}`);
        assert.deepEqual(result.clippedPrimary, [], `texto primário não deve sofrer clipping em ${viewport.width}px ${theme}`);
        if (theme === 'light') assert.notEqual(result.primaryTextColor, 'rgb(174, 189, 208)', 'notas claras precisam usar texto legível no tema claro');
      }
    }
    assert.deepEqual(app.errors, [], 'a matriz responsiva não deve gerar erros de console ou página');
    assert.deepEqual(app.requestFailures, [], 'a matriz responsiva não deve gerar falhas de requisição locais');
  } finally {
    await closeApp(app);
  }
});
