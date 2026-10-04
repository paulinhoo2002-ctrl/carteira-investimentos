const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture, V289_VISUAL_SCENARIOS, makeV289VisualFixture } = require('./helpers/v289-visual-fixtures');
const chrome = 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';

async function withPage(viewport, run) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(5000);
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyV289VisualFixture(page, 'baseline');
    await run(page);
  } finally {
    if (browser) await browser.close();
    harness.server.close();
  }
}

const requiredMetrics = [
  'Patrimônio atual',
  'Resultado',
  'Recebido',
];

const viewports = [
  { width: 1366, height: 768, label: '1366x768' },
  { width: 390, height: 844, label: '390x844' },
  { width: 430, height: 932, label: '430x932' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1440, height: 900, label: '1440x900' },
  { width: 1536, height: 864, label: '1536x864' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

const themes = ['dark', 'light'];

test('Dashboard HYBRID V2 - first-fold three KPI units at 1366x768', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });

    // Exactly 3 KPI units in first fold
    const kpiUnits = await page.locator('.dashboard-executive-kpis .premium-metric').count();
    assert.equal(kpiUnits, 3, `Esperado 3 unidades KPI, encontrado ${kpiUnits}`);

    const labels = await page.locator('.dashboard-executive-kpis .premium-metric-label').allInnerTexts();
    
    // KPI 1: Patrimônio atual (dominant, with date-base context)
    assert.ok(labels.some(l => l.toLowerCase().includes('patrimônio atual')), 'KPI 1: Patrimônio atual ausente');
    
    // KPI 2: Resultado (R$ + % in same unit when same basis)
    assert.ok(labels.some(l => l.toLowerCase().includes('resultado')), 'KPI 2: Resultado ausente');
    
    // KPI 3: Renda recebida (received income)
    assert.ok(labels.some(l => l.toLowerCase().includes('recebido')), 'KPI 3: Renda recebida ausente');

    // Invested amount must be secondary context, not a peer KPI
    const investedCount = labels.filter(l => l.includes('Total investido')).length;
    assert.equal(investedCount, 0, 'Total investido NÃO deve ser card KPI peer (deve ser contexto secundário)');

    // Rentabilidade must NOT be separate KPI card - paired with Resultado when same basis
    const rentabilidadeCount = labels.filter(l => l.includes('Rentabilidade')).length;
    assert.equal(rentabilidadeCount, 0, 'Rentabilidade NÃO deve ser card KPI separado (par com Resultado na mesma unidade)');

    // Evolution chart present
    await expectVisible(page, '.dashboard-evolution-card', 'Evolução patrimonial ausente');

    // One compact allocation with a bar and text, within the first fold.
    await expectVisible(page, '.dashboard-v3-allocation', 'Alocação compacta ausente');
    assert.equal(await page.locator('.premium-dashboard table').count(), 0, 'Tabela completa não pertence ao Dashboard');
    assert.equal(await page.locator('.premium-dashboard .dashboard-home-composition-pie').count(), 0, 'Donut duplicado não pertence ao Dashboard');

    // NO separate "Renda passiva" panel - renda recebida is KPI 3
    const incomePanelCount = await page.locator('.dashboard-income-card').count();
    assert.equal(incomePanelCount, 0, 'Não deve haver painel separado "Renda passiva" - renda recebida é KPI 3');

    // At most one actionable priority in first layer
    const priorities = await page.locator('.dashboard-v3-priority').count();
    assert.ok(priorities <= 1, `Máximo 1 prioridade no primeiro nível: ${priorities}`);
    const fold = await page.evaluate(() => Object.fromEntries(['.dashboard-executive-kpis','.dashboard-evolution-card','.dashboard-v3-allocation'].map(selector => [selector, document.querySelector(selector)?.getBoundingClientRect().bottom])));
    for (const [selector,bottom] of Object.entries(fold)) assert.ok(bottom != null && bottom <= 768, `${selector} ultrapassa primeira dobra: ${bottom}`);

    // Check hideValues privacy
    await page.evaluate(() => { S.hideValues = true; render(); });
    const hiddenText = await page.locator('body').innerText();
    assert.ok(!hiddenText.match(/R\$\s*[\d.,]+/), 'hideValues: R$ vazou em texto visível');
    // Only financial sentinel values should be masked, not all digits
    assert.ok(!hiddenText.includes('128.43'), 'hideValues: valor sintético vazou');
    assert.ok(!hiddenText.includes('10101.21'), 'hideValues: histórico sintético vazou');

    // Check SVG titles don't leak
    const svgTitles = await page.locator('svg title').allInnerTexts();
    for (const title of svgTitles) {
      if (title) {
        assert.ok(!title.match(/R\$\s*[\d.,]+/), `hideValues: SVG title vazou: ${title}`);
      }
    }

    // Chart accessible summary
    const chartDesc = await page.locator('.dashboard-evolution-card .dashboard-patrimony-chart').getAttribute('aria-label');
    if (chartDesc) {
      assert.ok(!chartDesc.match(/R\$\s*[\d.,]+/), `hideValues: chart aria-label vazou: ${chartDesc}`);
    }

    // Restore
    await page.evaluate(() => { S.hideValues = false; render(); });
  });
});

test('Dashboard HYBRID V2 - mobile 390x844 independent order', async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });

    const positions = await page.evaluate(() => {
      const selectors = ['.dashboard-page-heading', '.dashboard-executive-kpis .premium-metric:nth-child(1)', '.dashboard-executive-kpis .premium-metric:nth-child(2)', '.dashboard-executive-kpis .premium-metric:nth-child(3)', '.dashboard-evolution-card', '.dashboard-v3-allocation'];
      return selectors.map(selector => document.querySelector(selector)?.getBoundingClientRect().top);
    });
    assert.ok(positions.every(Number.isFinite), 'Todos os blocos essenciais devem estar presentes');
    assert.ok(positions.every((top, index) => index === 0 || top >= positions[index - 1]), `Ordem mobile incorreta: ${positions.join(', ')}`);
    assert.equal(await page.locator('.premium-dashboard table').count(), 0, 'Dashboard mobile sem tabela larga');
  });
});

test('Dashboard HYBRID V2 - financial truth: patrimony distinct from invested', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });

    const labels = await page.locator('.dashboard-executive-kpis .premium-metric-label').allInnerTexts();
    const values = await page.locator('.dashboard-executive-kpis .premium-metric-value').allInnerTexts();

    const patrimonyIdx = labels.findIndex(l => l.toLowerCase().includes('patrimônio atual'));
    const resultIdx = labels.findIndex(l => l.toLowerCase().includes('resultado'));

    assert.ok(patrimonyIdx >= 0, 'Patrimônio atual deve estar presente');
    assert.ok(resultIdx >= 0, 'Resultado deve estar presente');

    // Invested amount should appear as secondary context under Patrimônio, not as peer KPI
    const investedInContext = await page.locator('.dashboard-executive-kpis .premium-metric-note').allInnerTexts();
    const hasInvestedContext = investedInContext.some(n => n.toLowerCase().includes('investido') || n.toLowerCase().includes('aplicado'));
    assert.ok(hasInvestedContext, 'Capital investido deve aparecer como contexto secundário sob Patrimônio');

    // Result should be R$ and % in one unit for same period/base/method
    const resultValue = values[resultIdx];
    assert.ok(resultValue.includes('R$') || resultValue.includes('-'), 'Resultado deve mostrar valor monetário');
    // If same basis, should also contain %
    assert.ok(resultValue.includes('%'), 'Campos do produtor cx() usam mesma base e devem compartilhar a unidade');
  });
});

test('Dashboard HYBRID V2 - result pair: matching basis only', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    const cases = await page.evaluate(() => {
      const values = (tG, tGP) => {
        const html = executiveKPIs({ portfolio:{tC:110,tI:100,tG,tGP}, recent:{month:passiveIncomeMonthKey(new Date()),total:0} });
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        return parsed.querySelectorAll('.premium-metric')[1]?.querySelector('.premium-metric-value')?.textContent || '';
      };
      return { matched:values(10,10), mismatch:values(10,12), amountOnly:values(10,null), percentOnly:values(null,10), neither:values(null,null), source:executiveKPIs.toString() };
    });
    assert.match(cases.matched, /R\$.*%/);
    assert.match(cases.mismatch, /R\$/);
    assert.doesNotMatch(cases.mismatch, /%/);
    assert.match(cases.amountOnly, /R\$/);
    assert.doesNotMatch(cases.amountOnly, /%/);
    assert.match(cases.percentOnly, /%/);
    assert.doesNotMatch(cases.percentOnly, /R\$/);
    assert.doesNotMatch(cases.neither, /R\$|%/);
    assert.doesNotMatch(cases.source, /__V289_VISUAL_SCENARIO__/);
  });
});

test('Dashboard HYBRID V2 - history gaps remain visible', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    const proof = await page.evaluate(() => {
      const html = lineChart([{name:'Histórico sintético',values:[10,null,20],color:'#34d399'}],['jan','fev','mar'],'qa-gap',v=>String(v));
      const doc = new DOMParser().parseFromString(html,'text/html');
      return {lines:[...doc.querySelectorAll('svg path[stroke="#34d399"]')].map(node=>node.getAttribute('d')), summary:doc.querySelector('svg desc')?.textContent || '',points:doc.querySelectorAll('.chart-data-point').length};
    });
    assert.equal(proof.lines.length, 2, 'Lacuna deve interromper a linha; não ligar janeiro a março');
    assert.match(proof.summary, /fev.*sem dado|intervalo sem dados/i);
    assert.equal(proof.points, 2, 'Lacuna não deve virar ponto zero');
  });
});

test('Dashboard HYBRID V2 - chart axis labels remain readable on desktop and mobile', async () => {
  for (const viewport of [{width:1366,height:768},{width:390,height:844}]) {
    await withPage(viewport, async page => {
      const axis = await page.evaluate(() => {
        const svg = document.querySelector('.dashboard-patrimony-chart');
        const labels = [...svg.querySelectorAll('text')].filter(node => Number(node.getAttribute('y')) > Number(svg.viewBox.baseVal.height) - 20);
        const boxes = labels.map(node => node.getBoundingClientRect());
        return { count:labels.length, font:Math.min(...labels.map(node => Number(getComputedStyle(node).fontSize.replace('px','')) * node.getScreenCTM().a)), overlap:boxes.some((box,index) => index > 0 && box.left < boxes[index-1].right) };
      });
      assert.ok(axis.count >= 3 && axis.count <= 8, `${viewport.width}: datas essenciais sem excesso`);
      assert.ok(axis.font >= 9, `${viewport.width}: rótulo do eixo menor que 9px: ${axis.font}`);
      assert.equal(axis.overlap, false, `${viewport.width}: rótulos de período sobrepostos`);
    });
  }
});

test('Dashboard HYBRID V2 - allocation unknown state', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await applyV289VisualFixture(page, 'allocation-unknown');
    await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });

    const allocationText = await page.locator('.dashboard-v3-allocation').innerText();
    assert.match(allocationText, /1 valor atual indisponível|1 posição sem valor atual/i);
    await applyV289VisualFixture(page, 'baseline');
    assert.doesNotMatch(await page.locator('.dashboard-v3-allocation').innerText(), /valor atual indisponível|posição sem valor atual/i);
  });
});

test('Dashboard HYBRID V2 - allocation class opens the corresponding Ativos filter', async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    const row = page.locator('.dashboard-v3-allocation-row').filter({hasText:'Renda Fixa'});
    await row.click();
    assert.equal(await page.evaluate(() => S.tab), 'ativos');
    assert.deepEqual(await page.evaluate(() => S.assetsFilterClasses), ['Renda Fixa']);
  });
});

test('Dashboard HYBRID V2 - availability follows authoritative allocation values', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    const proof = await page.evaluate(() => {
      S.assets = [{ id:'QA_EXPLICIT_CURRENT', ticker:'QAEX3', type:'Ação', qty:1, current_price:null, currentValue:20 }];
      const availability = dashboardCurrentValueAvailability();
      const allocation = portfolioAllocationSnapshot();
      render();
      return {state:availability.state, known:allocation.knownPositionCount, kpi:document.querySelector('.dashboard-executive-kpis .premium-metric')?.innerText};
    });
    assert.equal(proof.known, 1);
    assert.equal(proof.state, 'AVAILABLE', 'Valor atual explícito não pode aparecer como desconhecido no KPI');
    assert.doesNotMatch(proof.kpi, /indisponível|desconhecido/i);
    const invalid = await page.evaluate(() => {
      S.assets = [{ id:'QA_INVALID_PRICE', ticker:'QAIN3', type:'Ação', qty:1, current_price:'invalid' }];
      const state = dashboardCurrentValueAvailability().state;
      render();
      return {state, kpi:document.querySelector('.dashboard-executive-kpis .premium-metric')?.innerText};
    });
    assert.equal(invalid.state, 'UNKNOWN', 'Preço inválido não pode virar zero conhecido');
    assert.match(invalid.kpi, /valor atual indisponível/i);
  });
});

test('Dashboard HYBRID V2 - priority cardinality: 0/1/many', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await applyV289VisualFixture(page, 'priority-zero');
    assert.equal(await page.evaluate(() => S.assets.length + S.aportes.length + S.proventos.length), 0);
    assert.equal(await page.locator('.dashboard-v3-priority').count(), 0, 'Carteira vazia não deve criar alerta grande');
  });
  await withPage({ width: 1366, height: 768 }, async page => {
    await applyV289VisualFixture(page, 'priority-one');
    assert.equal(await page.evaluate(() => S.goals.proventos.monthly), 1200);
    const priority = page.locator('.dashboard-v3-priority');
    assert.equal(await priority.count(), 1);
    assert.match(await priority.innerText(), /meta de renda|renda passiva/i);
    assert.match(await priority.innerText(), /abaixo|falta|meta/i);
    await priority.locator('button').click();
    assert.equal(await page.evaluate(() => S.tab), 'metas');
  });
  await withPage({ width: 1366, height: 768 }, async page => {
    await applyV289VisualFixture(page, 'priority-many');
    assert.ok(await page.evaluate(() => portfolioInsightsSnapshot().length) > 1);
    const priority = page.locator('.dashboard-v3-priority');
    assert.equal(await priority.count(), 1);
    assert.match(await priority.innerText(), /pontos/i);
    assert.match(await priority.innerText(), /atenção|importante/i);
    assert.match(await priority.innerText(), /fontes e cobertura.*antes de interpretar/i, 'Prioridade resume motivo e impacto sem códigos de auditoria');
    assert.doesNotMatch(await priority.innerText(), /ocorrências|QA_PRIORITY/i);
  });
});

test('Dashboard HYBRID V2 - long labels and large BRL values no clip at 1366x768', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await applyV289VisualFixture(page, 'long-label-large-value');
    await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, 'Overflow horizontal com label longo/valor grande');

    // Check metric values don't clip internally
    const metrics = await page.locator('.premium-metric').all();
    for (const metric of metrics) {
      const box = await metric.boundingBox();
      const value = await metric.locator('.premium-metric-value').boundingBox();
      if (value && box) {
        assert.ok(value.width <= box.width + 2, 'Valor clippou dentro do card');
      }
    }
  });
});

test('Dashboard HYBRID V2 - long labels and large BRL values no clip at 390x844', async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    await applyV289VisualFixture(page, 'long-label-large-value');
    await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, 'Overflow horizontal mobile com label longo/valor grande');
  });
});

test('Dashboard HYBRID V2 - hideValues privacy across all vectors', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });
    const sentinels = await page.evaluate(() => {
      const root = document.querySelector('.premium-dashboard');
      const svgText = [...root.querySelectorAll('svg title, svg desc')].map(node => node.textContent).join(' ');
      return [...new Set(`${root.innerText} ${svgText}`.match(/R\$\s*[\d.,]+/g) || [])].filter(value => /[1-9]/.test(value));
    });
    assert.ok(sentinels.length >= 2, 'Fixture deve expor valores sintéticos distintos antes de ocultar');
    await page.evaluate(() => { S.hideValues = true; render(); });
    const hiddenSurface = await page.evaluate(() => {
      const root = document.querySelector('.premium-dashboard');
      const attributes = [...root.querySelectorAll('*')].flatMap(node => ['aria-label', 'title', 'data-chart-tooltip'].map(name => node.getAttribute(name) || ''));
      const svgText = [...root.querySelectorAll('svg title, svg desc, svg text')].map(node => node.textContent);
      return [root.innerText, ...svgText, ...attributes].join(' ');
    });
    for (const sentinel of sentinels) assert.ok(!hiddenSurface.includes(sentinel), `hideValues: valor sintético vazou: ${sentinel}`);
    assert.match(hiddenSurface, /2026|12M/, 'Datas e períodos continuam legíveis');

    // Toggle off
    await page.evaluate(() => { S.hideValues = false; render(); });
    const restoredText = await page.locator('.premium-dashboard').innerText();
    assert.ok(sentinels.some(value => restoredText.includes(value)), 'Valores sintéticos devem retornar ao desativar hideValues');
  });
});

test('Dashboard HYBRID V2 - state labels: NO_DATA/UNKNOWN/PARTIAL/STALE/ZERO distinct', async () => {
  const states = [
    { scenario: 'no-data', expect: /sem ativos|sem dados/i },
    { scenario: 'unknown', expect: /valor atual indisponível|desconhecido/i },
    { scenario: 'partial', expect: /parcial/i },
    { scenario: 'stale', expect: /desatualizad|defasad/i },
    { scenario: 'valid-zero', expect: /zero conhecido|valor conhecido: zero/i },
  ];

  for (const { scenario, expect } of states) {
    await withPage({ width: 1366, height: 768 }, async page => {
      await applyV289VisualFixture(page, scenario);
      await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });

      const context = await page.locator('.dashboard-executive-kpis .premium-metric').first().innerText();
      assert.match(context, expect, `Cenário "${scenario}" deve explicitar estado junto ao patrimônio`);
      if (scenario === 'valid-zero') assert.match(await page.locator('.dashboard-v3-allocation').innerText(), /valor atual conhecido: zero/i, 'Alocação deve preservar zero conhecido');
    });
  }
});

test('Dashboard HYBRID V2 - responsive matrix 7 viewports x 2 themes', async () => {
  for (const viewport of viewports) {
    for (const theme of themes) {
      await withPage(viewport, async page => {
        const pageErrors = [];
        const consoleErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
        await page.evaluate(t => { applyTheme(t); render(); }, theme);
        await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });

        const geometry = await page.evaluate(() => {
          const rect = selector => document.querySelector(selector)?.getBoundingClientRect();
          const chart = rect('.dashboard-patrimony-chart');
          const chartCard = rect('.dashboard-evolution-card');
          const metrics = [...document.querySelectorAll('.dashboard-executive-kpis .premium-metric')];
          const allocation = rect('.dashboard-v3-allocation');
          const financialContext = [...document.querySelectorAll('.dashboard-executive-kpis .premium-metric-note, .dashboard-evolution-header .premium-panel-sub, .dashboard-v3-context, .dashboard-v3-priority span')]
            .filter(element => element.textContent.trim() && getComputedStyle(element).display !== 'none')
            .map(element => ({ text: element.textContent.trim(), font: Number.parseFloat(getComputedStyle(element).fontSize) }));
          const interactive = [...document.querySelectorAll('.premium-dashboard button, .premium-dashboard a')]
            .filter(element => getComputedStyle(element).display !== 'none')
            .map(element => ({ label: element.textContent.trim(), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            chartInsideCard: !!chart && !!chartCard && chart.top >= chartCard.top && chart.bottom <= chartCard.bottom + 2,
            chartFont: Number(getComputedStyle(document.querySelector('.dashboard-evolution-card .premium-panel-title')).fontSize.replace('px', '')),
            metricCount: metrics.length,
            clippedMetric: metrics.some(metric => metric.scrollWidth > metric.clientWidth + 2),
            allocationVisible: !!allocation && allocation.width > 0 && allocation.height > 0,
            smallFinancialContext: financialContext.filter(item => item.font < 12),
            smallTargets: interactive.filter(item => item.width < 44 || item.height < 44),
          };
        });
        assert.equal(geometry.overflow, false, `${viewport.label} ${theme}: overflow horizontal`);
        assert.equal(geometry.chartInsideCard, true, `${viewport.label} ${theme}: gráfico cortado dentro do painel`);
        assert.ok(geometry.chartFont >= 12, `${viewport.label} ${theme}: título do gráfico pequeno (${geometry.chartFont}px)`);
        assert.equal(geometry.metricCount, 3, `${viewport.label} ${theme}: unidades KPI`);
        assert.equal(geometry.clippedMetric, false, `${viewport.label} ${theme}: KPI cortado`);
        assert.equal(geometry.allocationVisible, true, `${viewport.label} ${theme}: alocação ausente`);
        assert.deepEqual(geometry.smallFinancialContext, [], `${viewport.label} ${theme}: contexto financeiro menor que 12px`);
        assert.deepEqual(geometry.smallTargets, [], `${viewport.label} ${theme}: alvos menores que 44px`);
        assert.deepEqual(pageErrors, [], `${viewport.label} ${theme}: page errors`);
        assert.deepEqual(consoleErrors, [], `${viewport.label} ${theme}: console errors`);
      });
    }
  }
});

test('Dashboard HYBRID V2 - dark and light themes readable contrast', async () => {
  for (const theme of themes) {
    await withPage({ width: 1366, height: 768 }, async page => {
      await page.evaluate(t => { applyTheme(t); render(); }, theme);
      await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });

      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const result = await page.evaluate(async () => axe.run('.premium-dashboard', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'cat.color'] }
      }));
      assert.deepEqual(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), [], `${theme}: contraste no dashboard`);
    });
  }
});

test('Dashboard HYBRID V2 - keyboard focus and 44x44 targets', async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });

    const buttons = await page.locator('.premium-dashboard button, .premium-dashboard a[role="button"]').all();
    for (const btn of buttons) {
      const box = await btn.boundingBox();
      if (box) {
        assert.ok(box.width >= 44 && box.height >= 44, `Target < 44px: ${await btn.textContent()} (${box.width}x${box.height})`);
      }
    }

    // Tab through dashboard
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    assert.ok(['BUTTON', 'A'].includes(focused), 'Primeiro focus deve ser interativo');
  });
});

test('Dashboard HYBRID V2 - reduced motion respected', async () => {
  await withPage({ width: 1366, height: 768 }, async page => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForSelector('.premium-dashboard', { state: 'visible', timeout: 5000 });

    const transitions = await page.locator('.premium-metric, .dashboard-evolution-card').evaluateAll(nodes =>
      nodes.map(n => getComputedStyle(n).transitionDuration)
    );
    for (const t of transitions) {
      const ms = t.endsWith('ms') ? parseFloat(t) : parseFloat(t) * 1000;
      assert.ok(ms <= 0.01, `Transição persiste com reduced-motion: ${t}`);
    }
  });
});

async function expectVisible(page, selector, msg) {
  const count = await page.locator(selector).count();
  assert.ok(count > 0, msg);
}

async function expectContains(locator, text, msg) {
  const content = await locator.innerText();
  assert.ok(content.includes(text), msg);
}

module.exports = { requiredMetrics, viewports, themes };
