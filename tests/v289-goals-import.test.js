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

test('E3 Importar: seleção, prévia protegida, duplicidade e cancelamento não gravam', async () => {
  const app = await createApp();
  try {
    await app.page.evaluate(() => {
      S.aportes.push({ id: 'QA_DUPLICATE_SYNTHETIC', date: '2026-09-15', ticker: 'SYNTH3', qty: 2, price: 10, operation: 'compra' });
      window.__v293SaveCalls = 0;
      window.__v293OriginalSave = window.save;
      window.save = function (...args) {
        window.__v293SaveCalls += 1;
        return window.__v293OriginalSave.apply(this, args);
      };
      window.__v293StorageBefore = JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
      window.__v293FinancialStateBefore = JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals });
    });
    await app.page.getByRole('button', { name: 'Importar dados', exact: true }).click();
    const empty = await app.page.evaluate(() => ({
      step: S.importCenterSession?.step || 1,
      hasEmptyMessage: /Nenhum arquivo selecionado/.test(document.querySelector('.import-center-shell')?.innerText || ''),
      readActionExists: Boolean(document.querySelector('[data-import-action="dryRun"]')),
      selectActionHeight: document.querySelector('.import-center-actions label[for="import-center-file-input"]')?.getBoundingClientRect().height || 0,
      sourceCatalogExists: Boolean(document.querySelector('.import-center-source-catalog')),
      sourceCatalogOpen: Boolean(document.querySelector('.import-center-source-catalog')?.open),
      sourceCatalogHasEvidence: Boolean(document.querySelector('.import-center-source-catalog .import-source-card small')),
    }));
    assert.equal(empty.step, 1);
    assert.equal(empty.hasEmptyMessage, true);
    assert.equal(empty.readActionExists, false);
    assert.ok(empty.selectActionHeight >= 44, 'seleção local deve ser ação principal acessível');
    assert.equal(empty.sourceCatalogExists, true, 'evidências de suporte devem estar em uma área expansível');
    assert.equal(empty.sourceCatalogOpen, false, 'detalhes das fontes devem iniciar recolhidos');
    assert.equal(empty.sourceCatalogHasEvidence, true, 'detalhes expansíveis devem preservar os dados de suporte');
    const catalogSummary = app.page.locator('.import-center-source-catalog > summary');
    await catalogSummary.focus();
    await app.page.keyboard.press('Enter');
    const keyboardDisclosure = await app.page.locator('.import-center-source-catalog').evaluate(node => ({
      open: node.open,
      focusVisible: node.querySelector('summary')?.matches(':focus-visible') || false,
      sourceCount: node.querySelectorAll('.import-source-card').length,
    }));
    assert.equal(keyboardDisclosure.open, true);
    assert.equal(keyboardDisclosure.focusVisible, true, 'catálogo deve mostrar foco de teclado');
    assert.equal(keyboardDisclosure.sourceCount, 6);
    await app.page.keyboard.press('Enter');
    const csv = 'Entrada/Saída,Data,Movimentação,Produto,Quantidade,Preço unitário,Valor da Operação,Instituição\nEntrada,15/09/2026,Compra,SYNTH3,2,"10,00","20,00",B3\nEntrada,16/09/2026,Compra,NEWQ3,1,"15,00","15,00",B3\n';
    await app.page.locator('#import-center-file-input').setInputFiles({
      name: 'v293-synthetic-b3-movement.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8'),
    });
    const selected = await app.page.evaluate(() => ({
      step: S.importCenterSession?.step,
      fileName: S.importCenterSession?.files?.[0]?.name,
      status: S.importCenterSession?.result?.status || null,
      detected: S.importCenterSession?.files?.[0]?.detected?.label,
      saved: window.__v293SaveCalls,
    }));
    assert.equal(selected.step, 2);
    assert.equal(selected.fileName, 'v293-synthetic-b3-movement.csv');
    assert.equal(selected.status, null, 'selecionar o arquivo ainda não é prévia nem resultado');
    assert.match(selected.detected, /Aguardando leitura local/);
    assert.equal(selected.saved, 0);
    await app.page.evaluate(() => {
      if (window.__LOCAL_TEST_MODE__ !== true || typeof window.XLSX !== 'undefined') throw new Error('CSV test adapter requires isolated local test mode without external SheetJS');
      const parseCsv = text => String(text).trim().split(/\r?\n/).map(line => {
        const cells = [];
        let value = '';
        let quoted = false;
        for (let index = 0; index < line.length; index += 1) {
          const char = line[index];
          if (char === '"') {
            if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
            else quoted = !quoted;
          } else if (char === ',' && !quoted) { cells.push(value); value = ''; }
          else value += char;
        }
        cells.push(value);
        return cells.map(cell => cell === '' ? null : cell);
      });
      window.XLSX = {
        read: text => ({ SheetNames: ['Movimentacao'], Sheets: { Movimentacao: { rows: parseCsv(text) } } }),
        utils: { sheet_to_json: sheet => sheet.rows },
      };
    });
    await app.page.getByRole('button', { name: 'Ler e abrir revisão' }).click();
    await app.page.waitForFunction(() => S.importCenterSession?.result?.status !== 'PARSING', null, { timeout: 10000 });
    const resultCheck = await app.page.evaluate(() => ({
      status: S.importCenterSession?.result?.status,
      step: S.importCenterSession?.step,
      reason: S.importCenterSession?.result?.reason || '',
      message: S.importCenterSession?.result?.message || '',
      error: S.importCenterSession?.result?.error?.message || '',
      detected: S.importCenterSession?.files?.[0]?.detected?.label || '',
    }));
    assert.equal(resultCheck.status, 'REVIEW_OPEN', `resultado da leitura sintética: ${JSON.stringify(resultCheck)}`);
    await app.page.getByRole('dialog').waitFor({ timeout: 3000 });
    await app.page.setViewportSize({ width: 390, height: 844 });
    const reviewLayout = await app.page.evaluate(() => {
      const modal = document.querySelector('.note-modal');
      const body = modal?.querySelector('.note-body');
      const apply = [...(modal?.querySelectorAll('button') || [])].find(button => /Aplicar na carteira atual/.test(button.innerText));
      const modalBox = modal?.getBoundingClientRect();
      const applyBox = apply?.getBoundingClientRect();
      return {
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        modalLeft: modalBox?.left ?? -1,
        modalRight: modalBox?.right ?? Infinity,
        modalBottom: modalBox?.bottom ?? Infinity,
        bodyHeight: body?.getBoundingClientRect().height || 0,
        bodyOverflowY: body ? getComputedStyle(body).overflowY : '',
        applyHeight: applyBox?.height || 0,
        applyVisible: Boolean(applyBox && applyBox.width > 0 && applyBox.height > 0),
      };
    });
    assert.equal(reviewLayout.documentWidth, 390, 'revisão não deve criar overflow mobile');
    assert.ok(reviewLayout.modalLeft >= 0 && reviewLayout.modalRight <= 390, 'modal deve caber na largura móvel');
    assert.ok(reviewLayout.modalBottom <= 844, 'modal deve caber na altura móvel');
    assert.ok(reviewLayout.bodyHeight > 0 && /auto|scroll/.test(reviewLayout.bodyOverflowY), 'conteúdo longo deve rolar dentro da revisão');
    assert.equal(reviewLayout.applyVisible, true, 'fronteira explícita de confirmação deve continuar visível');
    assert.ok(reviewLayout.applyHeight >= 44, 'confirmação deve manter alvo acessível');
    const preview = await app.page.evaluate(() => ({
      step: S.importCenterSession?.step,
      status: S.importCenterSession?.result?.status,
      writeCount: S.importCenterSession?.result?.writeCount,
      pendingReview: Boolean(S.importCenterSession?.pendingReview),
      parsedRows: S.b3MovementReview?.items?.length || 0,
      duplicates: b3MovementSummary().duplicates,
      movementCount: S.aportes.length,
      saveCalls: window.__v293SaveCalls,
      storage: JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
      financialState: JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals }),
    }));
    assert.equal(preview.step, 7);
    assert.equal(preview.status, 'REVIEW_OPEN');
    assert.equal(preview.writeCount, 0);
    assert.equal(preview.pendingReview, true);
    assert.equal(preview.parsedRows, 2);
    assert.equal(preview.duplicates, 1, 'registro sintético existente deve permanecer marcado como duplicado');
    assert.match(await app.page.getByRole('dialog').innerText(), /NEWQ3/);
    assert.match(await app.page.getByRole('dialog').innerText(), /Aplicar na carteira atual/);
    assert.match(await app.page.locator('.import-safety-result').innerText(), /Registros gravados\s+0/i);
    assert.equal(preview.saveCalls, 0);
    assert.equal(preview.movementCount, 2, 'os movimentos sintéticos anteriores devem permanecer intactos');
    assert.equal(preview.storage, await app.page.evaluate(() => window.__v293StorageBefore));
    assert.equal(preview.financialState, await app.page.evaluate(() => window.__v293FinancialStateBefore));
    await app.page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).first().click();
    const cancelled = await app.page.evaluate(() => ({
      status: S.importCenterSession?.result?.status,
      pendingReview: Boolean(S.importCenterSession?.pendingReview),
      reviewClosed: S.b3MovementReview === null,
      writes: document.querySelector('.import-safety-result')?.innerText || '',
      saveCalls: window.__v293SaveCalls,
      storage: JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
      financialState: JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals }),
    }));
    assert.equal(cancelled.status, 'CANCELLED');
    assert.equal(cancelled.pendingReview, false);
    assert.equal(cancelled.reviewClosed, true);
    assert.match(cancelled.writes, /Registros gravados\s+0/i);
    assert.equal(cancelled.saveCalls, 0);
    assert.equal(cancelled.storage, await app.page.evaluate(() => window.__v293StorageBefore));
    assert.equal(cancelled.financialState, await app.page.evaluate(() => window.__v293FinancialStateBefore));
    assert.deepEqual(app.errors, []);
  } finally {
    await closeApp(app);
  }
});

test('E3 Importar: seleção é primeira e catálogo secundário em sete larguras e dois temas', async () => {
  const app = await createApp();
  try {
    await app.page.getByRole('button', { name: 'Importar dados', exact: true }).click();
    for (const theme of ['dark', 'light']) {
      await app.page.evaluate(value => {
        if (value === 'light') document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
      }, theme);
      for (const width of [390, 430, 768, 1366, 1440, 1536, 1920]) {
        await app.page.setViewportSize({ width, height: width <= 430 ? 844 : width === 1366 ? 768 : 900 });
        const layout = await app.page.evaluate(() => {
          const shell = document.querySelector('.import-center-shell');
          const select = document.querySelector('.import-center-actions label[for="import-center-file-input"]');
          const catalog = shell?.querySelector('.import-center-source-catalog');
          const selectPanel = shell?.querySelector('.import-center-select-panel');
          return {
            width: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            hasRoute: Boolean(shell),
            selectHeight: select?.getBoundingClientRect().height || 0,
            selectBottom: select?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
            selectBeforeCatalog: Boolean(selectPanel && catalog && selectPanel.compareDocumentPosition(catalog) & Node.DOCUMENT_POSITION_FOLLOWING),
            catalogOpen: Boolean(catalog?.open),
            catalogEvidence: catalog?.querySelectorAll('.import-source-card').length || 0,
            bottomNavPresent: Boolean(document.querySelector('#investBottomNav')),
          };
        });
        assert.equal(layout.width, width);
        assert.equal(layout.documentWidth, width, `${theme}: overflow em ${width}px`);
        assert.equal(layout.hasRoute, true);
        assert.ok(layout.selectHeight >= 44, `${theme}: seleção menor que 44px em ${width}px`);
        assert.equal(layout.selectBeforeCatalog, true, `${theme}: ação deve preceder catálogo em ${width}px`);
        assert.equal(layout.catalogOpen, false, `${theme}: catálogo deve iniciar recolhido em ${width}px`);
        assert.equal(layout.catalogEvidence, 6, 'seis fontes devem continuar consultáveis');
        if (width <= 430) {
          assert.equal(layout.bottomNavPresent, true);
          assert.ok(layout.selectBottom <= 844, 'seleção deve permanecer acessível na primeira dobra móvel');
        }
      }
    }
    assert.deepEqual(app.errors, []);
  } finally {
    await closeApp(app);
  }
});
