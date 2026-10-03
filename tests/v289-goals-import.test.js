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
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(harness.url, { waitUntil: 'networkidle' });
  await applyV289VisualFixture(page, 'baseline');
  return { browser, context, page, harness, errors };
}

async function seedGoal(page, target = 25000) {
  await page.evaluate(value => {
    S.goals.patrimonio = { target: value, aporte: 500, annualVar: 5 };
    go('metas');
  }, target);
}

async function closeApp(app) {
  await app.browser.close();
  app.harness.server.closeAllConnections();
  app.harness.server.close();
}

test('E1 Metas: objetivo, patrimônio atual e distância lideram antes da edição e dos resumos', async () => {
  const app = await createApp();
  try {
    await seedGoal(app.page);
    const contract = await app.page.evaluate(() => {
      const visibleText = document.querySelector('#root')?.innerText || '';
      const goalHeading = [...document.querySelectorAll('h1,h2,h3,summary')]
        .find(node => /Meta de Patrimônio/.test(node.textContent || ''));
      const summaryGrid = document.querySelector('.metas-kpi-grid');
      const editDetails = [...document.querySelectorAll('.metas-shell details')]
        .find(node => node.querySelector('#mp-head-target'));
      const configureAction = [...document.querySelectorAll('.metas-shell button')]
        .find(node => /Configurar distribuição/.test(node.textContent || ''));
      return {
        hasGoal: /Meta de Patrimônio/.test(visibleText),
        hasTarget: /25\.000|25,000/.test(visibleText),
        hasCurrentLabel: /Carteira atual|Patrimônio atual/.test(visibleText),
        hasDistance: /Falta|em aberto/.test(visibleText),
        goalBeforeSummary: Boolean(goalHeading && summaryGrid && goalHeading.compareDocumentPosition(summaryGrid) & Node.DOCUMENT_POSITION_FOLLOWING),
        editIsSecondary: Boolean(editDetails && !editDetails.open),
        allocationActionReachable: Boolean(configureAction),
      };
    });
    assert.equal(contract.hasGoal, true, 'identidade da meta deve estar visível');
    assert.equal(contract.hasTarget, true, 'alvo sintético deve estar visível');
    assert.equal(contract.hasCurrentLabel, true, 'estado atual deve ser explicitamente rotulado');
    assert.equal(contract.hasDistance, true, 'distância até o alvo deve estar visível');
    assert.equal(contract.goalBeforeSummary, true, 'a meta deve preceder resumos secundários');
    assert.equal(contract.editIsSecondary, true, 'edição deve começar recolhida em área secundária');
    assert.equal(contract.allocationActionReachable, true, 'configuração da alocação deve continuar disponível');
    assert.deepEqual(app.errors, []);
  } finally {
    await closeApp(app);
  }
});

test('E1 Metas: carteira sem dados mantém patrimônio e progresso indisponíveis', async () => {
  const app = await createApp();
  try {
    await applyV289VisualFixture(app.page, 'no-data');
    await seedGoal(app.page);
    const state = await app.page.locator('.metas-primary-goal').evaluate(node => ({
      text: node.innerText,
      progressBars: node.querySelectorAll('.metas-primary-goal-progress').length,
    }));
    const secondaryValues = await app.page.locator('.metas-kpi-grid .metas-kpi-card .metas-kpi-value').allInnerTexts();
    assert.match(state.text, /Meta definida/);
    assert.match(state.text, /Patrimônio atual\s+Sem leitura atual/);
    assert.match(state.text, /Distância até a meta\s+Indisponível/);
    assert.doesNotMatch(state.text, /0[,.]0%/);
    assert.equal(state.progressBars, 0, 'sem dados não deve virar progresso zero calculado');
    assert.deepEqual(secondaryValues, ['Indisponível', 'Indisponível', 'Indisponível', 'Indisponível']);
    assert.deepEqual(app.errors, []);
  } finally {
    await closeApp(app);
  }
});

test('E1 Metas: composição responsiva não comprime o objetivo nem cria overflow horizontal', async () => {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    const app = await createApp(viewport);
    try {
      await seedGoal(app.page);
      const layout = await app.page.evaluate(() => {
        const primary = document.querySelector('.metas-primary-goal');
        const heading = primary?.querySelector('h2');
        const value = primary?.querySelector('.metas-primary-goal-value strong');
        const style = heading ? getComputedStyle(heading) : null;
        return {
          width: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          primaryWidth: primary?.getBoundingClientRect().width || 0,
          headingFontSize: style ? parseFloat(style.fontSize) : 0,
          targetVisible: Boolean(value && value.getBoundingClientRect().width > 0),
        };
      });
      assert.equal(layout.width, viewport.width);
      assert.equal(layout.documentWidth, layout.width, `overflow em ${layout.width}px`);
      assert.ok(layout.primaryWidth > 0);
      assert.ok(layout.headingFontSize >= 18, 'título da meta deve permanecer legível');
      assert.equal(layout.targetVisible, true);
      assert.deepEqual(app.errors, []);
    } finally {
      await closeApp(app);
    }
  }
});

test('E1 Metas: edição permanece aberta depois de salvar uma meta sintética', async () => {
  const app = await createApp();
  try {
    await seedGoal(app.page);
    await app.page.locator('.metas-patrimony-section > summary').click();
    await app.page.fill('#mp-head-target', '32000');
    await app.page.keyboard.press('Enter');
    const state = await app.page.locator('.metas-patrimony-section').evaluate(node => ({
      open: node.open,
      inputVisible: Boolean(node.querySelector('#mp-head-target')?.getBoundingClientRect().height),
    }));
    assert.equal(state.open, true, 'editor não deve fechar após salvar');
    assert.equal(state.inputVisible, true, 'campo salvo deve continuar acessível');
    assert.deepEqual(app.errors, []);
  } finally {
    await closeApp(app);
  }
});

test('E2 Rebalancear: comparação atual versus meta lidera e simulações ficam secundárias', async () => {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    const app = await createApp(viewport);
    try {
      await app.page.evaluate(() => {
        S.goals.allocation = { items: [{ type: 'Ação', pct: 60 }, { type: 'FII', pct: 40 }] };
        go('ajudar');
      });
      const contract = await app.page.evaluate(() => {
        const root = document.querySelector('.rebalance-shell');
        const title = root?.querySelector('h1');
        const comparison = root?.querySelector('.rebalance-alloc-details');
        const simInput = root?.querySelector('#reb-val');
        const summaries = root?.querySelector('.rebalance-insight-strip');
        const columns = root?.querySelector('.rebalance-alloc-labels')?.innerText || '';
        const rows = [...(comparison?.querySelectorAll('.rebalance-alloc-item') || [])]
          .map(row => row.innerText.replace(/\s+/g, ' ').trim());
        const comparisonBox = comparison?.getBoundingClientRect();
        const inputBox = simInput?.getBoundingClientRect();
        return {
          title: title?.innerText || '',
          comparisonLabel: comparison?.querySelector('.sec-title')?.innerText || '',
          comparisonBeforeTools: Boolean(comparison && simInput && comparison.compareDocumentPosition(simInput) & Node.DOCUMENT_POSITION_FOLLOWING),
          comparisonVisible: Boolean(comparisonBox && comparisonBox.width > 0 && comparisonBox.height > 0),
          comparisonDataVisible: Boolean(comparison?.querySelector('.rebalance-alloc')?.getBoundingClientRect().height),
          comparisonTop: comparisonBox?.top ?? Number.POSITIVE_INFINITY,
          firstRowTop: comparison?.querySelector('.rebalance-alloc-item')?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
          rows,
          summariesSecondary: Boolean(summaries && comparison && comparison.compareDocumentPosition(summaries) & Node.DOCUMENT_POSITION_FOLLOWING),
          summaryText: summaries?.innerText || '',
          columns,
          simInputY: inputBox?.top ?? -1,
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
        };
      });
      assert.match(contract.title, /Rebalanceamento/);
      assert.match(contract.comparisonLabel, /Alocação atual vs ideal/);
      assert.equal(contract.comparisonBeforeTools, true, 'comparação deve preceder as ferramentas de simulação');
      assert.equal(contract.comparisonVisible, true, 'comparação deve ser apresentada como conteúdo principal');
      assert.equal(contract.comparisonDataVisible, true, 'comparação deve permanecer visível em desktop e mobile');
      assert.ok(contract.comparisonTop < viewport.height, 'comparação deve começar na primeira dobra');
      assert.ok(contract.firstRowTop < viewport.height, 'primeira classe deve aparecer na primeira dobra');
      assert.match(contract.columns, /Atual[\s\S]*Meta[\s\S]*Diferença/i);
      assert.ok(contract.rows.some(row => /Ação/.test(row)), 'classe sintética deve aparecer na comparação');
      assert.equal(contract.summariesSecondary, true, 'resumos devem vir depois da comparação atual/meta');
      assert.doesNotMatch(contract.summaryText, /pedem aporte|recomendação de compra|compre|venda/i, 'resumo não deve transformar desvio em ordem de ação');
      assert.equal(contract.pageWidth, contract.viewportWidth, `overflow em ${viewport.width}px`);
      const before = await app.page.evaluate(() => JSON.stringify({ assets: S.assets, aportes: S.aportes, goals: S.goals }));
      await app.page.locator('.rebalance-tools > summary').click();
      await app.page.fill('#reb-val', '500');
      await app.page.locator('.rebalance-form button').first().click();
      const after = await app.page.evaluate(() => JSON.stringify({ assets: S.assets, aportes: S.aportes, goals: S.goals }));
      assert.equal(after, before, 'a simulação não deve alterar ativos, aportes ou metas');
      assert.match(await app.page.locator('#reb-out').innerText(), /simula|distribui/i);
      assert.deepEqual(app.errors, []);
    } finally {
      await closeApp(app);
    }
  }
});

test('E2 Rebalancear: comparação legível sem overflow nas larguras canônicas em tema escuro e claro', async () => {
  const app = await createApp();
  try {
    await app.page.evaluate(() => {
      S.goals.allocation = { items: [{ type: 'Ação', pct: 60 }, { type: 'FII', pct: 40 }] };
      go('ajudar');
    });
    for (const theme of ['dark', 'light']) {
      await app.page.evaluate(value => {
        if (value === 'light') document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
      }, theme);
      for (const width of [390, 430, 768, 1366, 1440, 1536, 1920]) {
        await app.page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
        const layout = await app.page.evaluate(() => {
          const comparison = document.querySelector('.rebalance-alloc-details');
          const data = comparison?.querySelector('.rebalance-alloc-item');
          const toolsSummary = document.querySelector('.rebalance-tools > summary');
          const scenarioSummary = document.querySelector('.rebalance-secondary-summary > summary');
          return {
            width: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            comparisonWidth: comparison?.getBoundingClientRect().width || 0,
            dataVisible: Boolean(data && data.getBoundingClientRect().width > 0),
            firstRowTop: data?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
            toolsTarget: toolsSummary ? toolsSummary.getBoundingClientRect().height : 0,
            summaryTarget: scenarioSummary ? scenarioSummary.getBoundingClientRect().height : 0,
            bottomNavPresent: Boolean(document.querySelector('#investBottomNav')),
          };
        });
        assert.equal(layout.width, width);
        assert.equal(layout.documentWidth, width, `${theme}: overflow em ${width}px`);
        assert.ok(layout.comparisonWidth > 0, `${theme}: comparação ausente em ${width}px`);
        assert.equal(layout.dataVisible, true, `${theme}: linha de alocação ausente em ${width}px`);
        if (width <= 430 || width === 1366) assert.ok(layout.firstRowTop < (width <= 430 ? 844 : 768), `${theme}: primeira classe abaixo da primeira dobra em ${width}px`);
        assert.ok(layout.toolsTarget >= 44, `${theme}: área de ferramentas menor que 44px em ${width}px`);
        assert.ok(layout.summaryTarget >= 44, `${theme}: área de resumo menor que 44px em ${width}px`);
        if (width <= 430) assert.equal(layout.bottomNavPresent, true, 'navegação móvel deve continuar presente');
      }
    }
    assert.deepEqual(app.errors, []);
  } finally {
    await closeApp(app);
  }
});
