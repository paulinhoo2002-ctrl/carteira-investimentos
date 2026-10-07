const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function withPage(viewport, run) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(5000);
    page.__v289Errors = { console: [], page: [] };
    page.on('console', message => { if (message.type() === 'error') page.__v289Errors.console.push(message.text()); });
    page.on('pageerror', error => page.__v289Errors.page.push(error.message));
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyV289VisualFixture(page, 'baseline');
    await run(page);
  } finally {
    if (browser) await browser.close();
    harness.server.close();
  }
}

async function openDesktopRoute(page, label) {
  await page.locator(`.tabs-desktop button.tab[aria-label="${label}"]`).click();
}

test('V289 C1 Ativos owns grouped positions, discoverable filters, and detail access', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await openDesktopRoute(page, 'Ativos');
    await page.getByRole('heading', { name: 'Ativos', exact: true }).waitFor();

    const search = page.getByRole('searchbox', { name: 'Buscar ativo por ticker ou nome' });
    assert.equal(await search.isVisible(), true, 'Busca precisa estar disponível em Ativos');
    const filters = page.getByRole('button', { name: /Filtros/ });
    assert.equal(await filters.isVisible(), true, 'Filtros precisam estar disponíveis em Ativos');
    const desktopHeading = page.getByRole('heading', { name: 'Ativos', exact: true });
    const headingMetrics = await desktopHeading.evaluate(element => ({
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    }));

    const groups = page.locator('.assets-premium-shell details.ag');
    const groupCount = await groups.count();
    if (!(await groups.first().evaluate(element => element.open))) await groups.first().locator(':scope > summary').click();
    const groupDetailsVisible = await groups.first().locator('.ag-body').isVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileHeading = page.getByRole('heading', { name: 'Ativos', exact: true });
    const mobileHeadingMetrics = await mobileHeading.evaluate(element => ({
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    }));
    const mobilePositions = page.locator('#ativosAccordion');
    const mobilePositionsVisible = await mobilePositions.isVisible();
    const firstMobileCard = mobilePositions.locator('.asset-mobile-cards details.asset-premium-card').first();
    await firstMobileCard.locator(':scope > summary').click();
    const detailButton = mobilePositions.getByRole('button', { name: 'Detalhes', exact: true }).first();
    await detailButton.click();
    const detailHeading = page.locator('#asset-detail-title');
    await detailHeading.waitFor();
    const detailNavigationPreserved = await detailHeading.isVisible();
    await page.getByRole('button', { name: 'Voltar para a tela anterior' }).click();
    await applyV289VisualFixture(page, 'long-label-large-value');
    await page.setViewportSize({ width: 1366, height: 768 });
    await openDesktopRoute(page, 'Ativos');
    await page.setViewportSize({ width: 390, height: 844 });
    const longNameCard = page.locator('#ativosAccordion .asset-mobile-cards details.asset-premium-card').first();
    await longNameCard.locator(':scope > summary').click();
    const longName = longNameCard.locator('.asset-ticker');
    const longNameLayout = await longName.evaluate(element => ({
      text: element.innerText,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      height: element.getBoundingClientRect().height,
    }));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

    const order = await page.evaluate(() => {
      const positions = document.querySelector('#ativosAccordion');
      const panel = document.querySelector('.assets-premium-shell .asset-inner-panel, .assets-premium-shell .asset-premium-analysis');
      return !panel || (positions?.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING) ? 'before' : 'after';
    });
    assert.ok(headingMetrics.fontSize >= 24 && headingMetrics.width > 0 && headingMetrics.height > 0, `Título de Ativos precisa seguir a hierarquia desktop de 24–26px (${headingMetrics.fontSize}px)`);
    assert.ok(groupCount > 0, 'Posições precisam estar agrupadas por classe em Ativos');
    assert.equal(groupDetailsVisible, true, 'Detalhes do grupo/posição precisam continuar acessíveis');
    assert.ok(mobileHeadingMetrics.fontSize >= 20 && mobileHeadingMetrics.width > 0 && mobileHeadingMetrics.height > 0, `Título de Ativos precisa seguir a hierarquia mobile de 20–22px (${mobileHeadingMetrics.fontSize}px)`);
    assert.equal(mobilePositionsVisible, true, 'Posições precisam ter composição própria no mobile');
    assert.equal(detailNavigationPreserved, true, 'O acesso ao detalhe do ativo precisa continuar disponível no mobile');
    assert.match(longNameLayout.text, /denominação extraordinariamente extensa/, 'Nomes longos devem permanecer completos no mobile');
    assert.ok(longNameLayout.clientWidth > 0 && longNameLayout.scrollWidth <= longNameLayout.clientWidth && longNameLayout.height >= longNameLayout.fontSize * 2, 'Nomes longos devem quebrar linha sem corte horizontal');
    assert.equal(overflow, false, 'Ativos não deve gerar overflow horizontal no mobile');
    assert.equal(order, 'before', 'A primeira leitura de Ativos deve começar pelas posições, sem repetir o resumo patrimonial do Dashboard');
    assert.deepEqual(page.__v289Errors.console, [], `Ativos não deve gerar erros de console: ${page.__v289Errors.console.join(' | ')}`);
    assert.deepEqual(page.__v289Errors.page, [], `Ativos não deve gerar erros de página: ${page.__v289Errors.page.join(' | ')}`);
  });
});

test('V289 C1 Análise owns descriptive exposure and ranking without buy advice', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await openDesktopRoute(page, 'Análise');
    await page.getByRole('heading', { name: 'Análise da carteira' }).waitFor();

    const analysis = page.locator('.analysis-destination .asset-premium-analysis');
    assert.equal(await analysis.isVisible(), true, 'Análise deve ser a rota dona da leitura analítica');
    const copy = await analysis.innerText();
    assert.doesNotMatch(copy, /\b(?:evitar|aumentar|reduzir|comprar|vender|aportar|manter|revisar|rebalancear|acompanhar|aguardar)\b|pode estudar aporte/i, 'Análise deve descrever exposição sem instruir ação do investidor');
    assert.match(copy, /Concentração elevada/i, 'O estado deve continuar evidente em linguagem descritiva');
    assert.match(copy, /concentra|posição/i, 'Concentração/posições devem estar na Análise');
    assert.match(copy, /setor/i, 'Exposição por setor deve estar na Análise');
    assert.match(copy, /desempenho|atenção/i, 'A interpretação descritiva deve estar na Análise');

    const buyAdvice = page.locator('.analysis-destination button, .analysis-destination a').filter({ hasText: /comprar agora|recomendação de compra/i });
    assert.equal(await buyAdvice.count(), 0, 'A Análise não pode recomendar compra');

    await applyV289VisualFixture(page, 'partial');
    await openDesktopRoute(page, 'Análise');
    await page.locator('details.asset-premium-section').filter({ hasText: 'Dados incompletos' }).locator(':scope > summary').click();
    const partialCopy = await page.locator('.analysis-destination').innerText();
    assert.doesNotMatch(partialCopy, /\b(?:evitar|aumentar|reduzir|comprar|vender|aportar|manter|revisar|revise|rebalancear|acompanhar|aguardar)\b|pode estudar aporte/i, 'Estados parciais também devem descrever a base sem instruir ação');
    assert.match(partialCopy, /insuficiente|incompleto|indisponível|revisar/i, 'Dados parciais devem continuar identificados como incompletos');
  });
});

test('V291 C2 Análise prioritizes interpretation and keeps secondary detail under demand', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await openDesktopRoute(page, 'Análise');
    const heading = page.getByRole('heading', { name: 'Análise da carteira' });
    await heading.waitFor();

    const desktopMetrics = await heading.evaluate(element => ({
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
    }));
    const portfolioSummaryCount = await page.getByText('Carteira analisada', { exact: true }).count();
    const desktopSections = await page.locator('details.asset-premium-section').evaluateAll(elements =>
      elements.map(element => ({
        title: element.querySelector('summary')?.innerText.trim(),
        open: element.open,
      }))
    );
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileMetrics = await heading.evaluate(element => ({
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
    }));
    const mobileLayout = await page.locator('.asset-premium-hero').evaluate(element => ({
      contentOverflow: Array.from(element.children).some(child => child.scrollWidth > child.clientWidth),
      pageOverflow: document.documentElement.scrollWidth > innerWidth,
    }));

    await page.setViewportSize({ width: 1366, height: 768 });
    await applyV289VisualFixture(page, 'partial');
    await openDesktopRoute(page, 'Análise');
    const partialStatus = page.locator('.analysis-destination [role="status"]');
    const partialStatusVisible = await partialStatus.isVisible().catch(() => false);
    const partialStatusText = partialStatusVisible ? await partialStatus.innerText() : '';
    const errors = {
      console: [...page.__v289Errors.console],
      page: [...page.__v289Errors.page],
    };

    const violations = [];
    if (desktopMetrics.fontSize < 24) violations.push(`título desktop ${desktopMetrics.fontSize}px (mínimo 24px)`);
    if (mobileMetrics.fontSize < 20) violations.push(`título mobile ${mobileMetrics.fontSize}px (mínimo 20px)`);
    if (portfolioSummaryCount > 0) violations.push('resumo patrimonial duplicado em Análise');
    for (const requiredOpen of ['Maiores concentrações', 'Merecem atenção']) {
      if (!desktopSections.some(section => section.title?.includes(requiredOpen) && section.open)) {
        violations.push(`síntese primária recolhida ou ausente: ${requiredOpen}`);
      }
    }
    for (const requiredCollapsed of ['Maiores altas', 'Maiores baixas', 'Maiores posições', 'Dados incompletos', 'Exposição por setor']) {
      if (!desktopSections.some(section => section.title?.includes(requiredCollapsed) && !section.open)) {
        violations.push(`detalhe secundário aberto ou ausente: ${requiredCollapsed}`);
      }
    }
    const sectionIndex = title => desktopSections.findIndex(section => section.title?.includes(title));
    const firstSecondaryIndex = Math.min(...['Maiores altas', 'Maiores baixas', 'Maiores posições', 'Dados incompletos', 'Exposição por setor'].map(sectionIndex));
    if (sectionIndex('Maiores concentrações') > firstSecondaryIndex || sectionIndex('Merecem atenção') > firstSecondaryIndex) {
      violations.push('concentração e atenção devem preceder os rankings e detalhes secundários');
    }
    if (desktopOverflow || mobileLayout.pageOverflow) violations.push('overflow horizontal da página');
    if (mobileLayout.contentOverflow) violations.push('recorte horizontal interno no conteúdo do destaque de Análise');
    if (!partialStatusVisible || !/parcial|incomplet/i.test(partialStatusText)) violations.push('cobertura parcial sem status textual visível');
    if (errors.console.length || errors.page.length) violations.push('erros de console ou página');

    assert.deepEqual(violations, [], `Contrato C2 de hierarquia e leitura de Análise: ${violations.join('; ')}`);
  });
});

test('V291 C3 Movimentações opens on Extrato, preserves signed entries, and keeps contributions distinct from patrimony', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await openDesktopRoute(page, 'Lançamentos');
    await page.getByRole('heading', { name: 'Aportes', exact: true }).waitFor();

    const extract = page.locator('.aporte-premium .aporte-extract');
    const extractOpensFirst = await extract.isVisible();
    const desktopLayout = await extract.evaluate(element => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      cardOverflow: [...element.querySelectorAll('.aporte-history-card')].some(card => card.scrollWidth > card.clientWidth),
    }));
    assert.equal(desktopLayout.overflow, false, 'Movimentações não deve gerar overflow horizontal em 1366px');
    assert.equal(desktopLayout.cardOverflow, false, 'Registros não devem ter recorte interno no desktop');
    const hierarchy = await page.evaluate(() => {
      const selectors = ['.aporte-premium .aporte-primary-toolbar .btn.bp', '.aporte-premium .aporte-view-tabs', '#aporte-premium-search', '.aporte-premium .aporte-filter-row', '.aporte-premium .aporte-sort-control', '.aporte-premium .aporte-extract', '.aporte-premium .aporte-secondary-summary'];
      const nodes = selectors.map(selector => document.querySelector(selector));
      const summary = document.querySelector('.aporte-secondary-summary');
      const summaryKpis = summary?.querySelector('.aporte-contribution-grid');
      return {
        controlsPresent: nodes.every(Boolean),
        extratoSelected: document.querySelector('.aporte-view-tab.on')?.textContent.trim() === 'Extrato',
        ordered: nodes.every(Boolean) && nodes.every((node, index) => index === 0 || !!(nodes[index - 1].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)),
        summaryCollapsed: !!summary && !summary.open,
        summaryKpisPresent: !!summaryKpis,
        summaryMetricsHidden: !!summaryKpis && !summaryKpis.checkVisibility(),
      };
    });
    assert.equal(hierarchy.controlsPresent, true, 'Extrato deve oferecer ação, modos, busca, filtro, ordenação, histórico e resumo secundário');
    assert.equal(hierarchy.extratoSelected, true, 'Extrato deve iniciar como modo ativo');
    assert.equal(hierarchy.ordered, true, 'A leitura deve priorizar ação e controles antes dos registros, deixando resumo depois do histórico');
    assert.equal(hierarchy.summaryCollapsed, true, 'Resumo dos aportes deve permanecer sob demanda');
    assert.equal(hierarchy.summaryKpisPresent, true, 'Os indicadores úteis devem continuar disponíveis no resumo');
    assert.equal(hierarchy.summaryMetricsHidden, true, 'Os quatro KPIs secundários não devem ocupar o primeiro plano');
    const secondarySummary = page.locator('.aporte-secondary-summary');
    await secondarySummary.locator(':scope > summary').click();
    assert.equal(await secondarySummary.locator('.aporte-contribution-grid').isVisible(), true, 'Os indicadores devem continuar acessíveis sob demanda');
    await secondarySummary.locator(':scope > summary').click();
    await page.getByRole('button', { name: 'Extrato', exact: true }).click();
    assert.equal(await extract.isVisible(), true, 'A opção Extrato precisa abrir o histórico de movimentações');
    const row = extract.locator('.aporte-history-card').filter({ hasText: 'Compra' }).first();
    assert.ok(await row.count() > 0, 'Extrato deve listar a movimentação sintética');
    for (const selector of ['.aporte-history-date', '.aporte-kind', '.aporte-history-ticker', '.aporte-history-total', '.aporte-history-unit']) {
      assert.ok((await row.locator(selector).innerText()).trim(), `Extrato precisa exibir ${selector}`);
    }
    assert.equal((await row.locator('.aporte-history-date').innerText()).trim(), '2026-05-06');
    assert.equal((await row.locator('.aporte-kind').innerText()).trim(), 'Compra');
    assert.equal((await row.locator('.aporte-history-ticker').innerText()).trim(), 'QAAA3');
    assert.match((await row.locator('.aporte-history-total').innerText()).trim(), /^\+/u, 'Compra deve manter sinal positivo no extrato');
    assert.match((await row.locator('.aporte-history-unit').innerText()).trim(), /QA_MANUAL|Manual/);
    assert.ok(await row.getByRole('button', { name: 'Editar movimentação', exact: true }).count(), 'Acesso ao detalhe/edição deve permanecer disponível');

    await page.evaluate(() => {
      S.aportes.push({ id:'QA_MOVE_SELL', date:'2026-06-06', ticker:'QAAA3', name:'Ativo sintético Alfa', type:'Ação', asset_type:'Ação', sector:'Setor sintético', qty:2, price:10, operation:'venda', source:'QA_SYNTHETIC' });
      setAportesViewMode('extrato');
    });
    const sale = page.locator('.aporte-premium .aporte-extract .aporte-history-card').filter({ hasText: 'Venda' }).first();
    assert.equal((await sale.locator('.aporte-kind').innerText()).trim(), 'Venda');
    assert.match((await sale.locator('.aporte-history-total').innerText()).trim(), /^[−-]/, 'Venda deve manter sinal negativo no extrato');
    assert.match((await sale.locator('.aporte-history-unit').innerText()).trim(), /QA_SYNTHETIC/);

    await page.getByRole('button', { name: 'Compra', exact: true }).click();
    assert.equal(await page.locator('.aporte-extract .aporte-history-card').count(), 1, 'Filtro Compra deve ocultar a venda sintética');
    await page.getByRole('button', { name: 'Todos', exact: true }).click();

    await openDesktopRoute(page, 'Resumo');
    const chartTitle = await page.locator('.dashboard-evolution-header .premium-panel-title').innerText();
    assert.match(chartTitle, /aportes acumulados/i, 'Aportes acumulados devem ser identificados como aportes, não como patrimônio');
    assert.equal(extractOpensFirst, true, 'Aportes deve abrir no extrato de movimentações');

    await openDesktopRoute(page, 'Lançamentos');
    await page.getByRole('button', { name: 'Extrato', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileExtract = page.locator('.aporte-premium .aporte-extract');
    const mobileLayout = await mobileExtract.evaluate(element => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      cardOverflow: [...element.querySelectorAll('.aporte-history-card')].some(card => card.scrollWidth > card.clientWidth),
      firstCardVisible: !!element.querySelector('.aporte-history-card') && getComputedStyle(element.querySelector('.aporte-history-card')).display !== 'none',
    }));
    const mobileFold = await page.evaluate(() => {
      const nav = document.querySelector('#investBottomNav');
      const navTop = nav?.getBoundingClientRect().top ?? innerHeight;
      const mode = document.querySelector('.aporte-view-tabs');
      const search = document.querySelector('#aporte-premium-search');
      const filter = document.querySelector('.aporte-filter-row');
      const firstRecord = document.querySelector('.aporte-extract .aporte-history-card');
      return {
        navTop,
        modeVisible: !!mode && mode.getBoundingClientRect().bottom < navTop,
        searchVisible: !!search && search.getBoundingClientRect().bottom < navTop,
        filterVisible: !!filter && filter.getBoundingClientRect().bottom < navTop,
        recordReachable: !!firstRecord && firstRecord.getBoundingClientRect().top < navTop,
      };
    });
    assert.equal(mobileLayout.firstCardVisible, true, 'O extrato deve manter cartões legíveis no mobile');
    assert.equal(mobileLayout.cardOverflow, false, 'O extrato não deve exigir tabela larga nem cortar conteúdo no mobile');
    assert.equal(mobileLayout.overflow, false, 'A tela de movimentações não deve gerar overflow horizontal no mobile');
    assert.equal(mobileFold.modeVisible, true, 'A seleção do Extrato deve ficar acessível antes da navegação inferior');
    assert.equal(mobileFold.searchVisible, true, 'Busca deve ficar acessível sem percorrer o resumo no mobile');
    assert.equal(mobileFold.filterVisible, true, 'Filtros devem ficar acessíveis sem percorrer o resumo no mobile');
    assert.equal(mobileFold.recordReachable, true, 'Primeiro registro deve começar antes da navegação inferior');
    await page.evaluate(() => { const shell=document.querySelector('#root>.shell'); shell.scrollTop=shell.scrollHeight; });
    const bottomClearance = await page.evaluate(() => {
      const navTop = document.querySelector('#investBottomNav').getBoundingClientRect().top;
      return document.querySelector('.aporte-secondary-summary').getBoundingClientRect().bottom <= navTop;
    });
    assert.equal(bottomClearance, true, 'O conteúdo final deve continuar acessível acima da navegação inferior');
    assert.deepEqual(page.__v289Errors.console, [], `C3 não deve gerar erros de console: ${page.__v289Errors.console.join(' | ')}`);
    assert.deepEqual(page.__v289Errors.page, [], `C3 não deve gerar erros de página: ${page.__v289Errors.page.join(' | ')}`);
  });
});
