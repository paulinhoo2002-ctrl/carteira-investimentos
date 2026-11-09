'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');

async function withPage(width, fn) {
  const harness = await startLocalHttpServer(repo);
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyRichFixture(page);
    await page.addScriptTag({ content: axeSource });
    await page.evaluate(() => applyTheme('light'));
    await fn(page);
  } finally {
    await browser.close();
    harness.server.close();
  }
}

test('D3: varredura completa mantém linguagem visível em português sem alterar códigos internos', () => {
  const output = execFileSync(process.execPath, ['tests/helpers/scan-lang.js'], { cwd: repo, encoding: 'utf8' });
  assert.match(output, /ocorrências distintas: 0/);
  assert.match(source, /<h1 class="st">Lançamentos<\/h1>/);
  assert.match(source, /<h1 class="premium-settings-title">Configurações<\/h1>/);
  assert.match(source, /row\.date\?brDate\(row\.date\)/);
  assert.match(source, /v257QualityFilters/);
  assert.match(source, /setV257QualityFilter/);
});

test('D2: áreas roláveis financeiras têm nome e foco por teclado', async () => {
  for (const theme of ['light', 'dark']) for (const width of [1366, 390]) await withPage(width, async page => {
    await page.evaluate(name => applyTheme(name), theme);
    for (const route of ['confiabilidade', 'renda-fixa', 'rentabilidade']) {
      await page.evaluate(routeName => go(routeName), route);
      await page.waitForTimeout(80);
      const regions = await page.locator('.scrollable-region-focusable, .data-trust-list, .rf-table-wrap, .rent-table').evaluateAll(nodes => nodes.map(node => ({
        tabindex: node.closest('[tabindex]')?.getAttribute('tabindex') || node.getAttribute('tabindex'),
        label: node.closest('[aria-label]')?.getAttribute('aria-label') || node.getAttribute('aria-label')
      })));
      if (route === 'confiabilidade') assert.ok(regions.some(region => region.tabindex === '0' && /posições/i.test(region.label || '')));
      if (route === 'renda-fixa') assert.ok(regions.some(region => region.tabindex === '0' && /renda fixa/i.test(region.label || '')));
      if (route === 'rentabilidade') assert.ok(regions.some(region => region.tabindex === '0' && /rentabilidade/i.test(region.label || '')));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${route} ${width}px sem overflow global`);
      const axe = await page.evaluate(async () => axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast', 'scrollable-region-focusable'] } }));
      assert.deepEqual(axe.violations, [], `${route} ${theme} ${width}px: ${axe.violations.map(issue => `${issue.id} (${issue.nodes.length})`).join(', ')}`);
    }
  });
});

test('D2: paleta semântica clara e textos de auditoria usam tokens de contraste', async () => {
  await withPage(1366, async page => {
    const tokens = { '--fp-pos': '#0a7a4b', '--fp-neg': '#c4283c', '--fp-warn': '#8f5b00', '--fp-info': '#1f66c9', '--fp-text-2': '#4c5a72', '--fp-surface': '#ffffff', '--fp-subtle': '#eef1f6' };
    for (const [name, value] of Object.entries(tokens)) assert.ok(source.includes(`${name}:${value}`), `token claro ausente ou alterado: ${name}`);
    const luminance = hex => { const values = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * values[0] + .7152 * values[1] + .0722 * values[2]; };
    const contrast = (a, b) => { const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (high + .05) / (low + .05); };
    const ratios = ['--fp-pos', '--fp-neg', '--fp-warn', '--fp-info', '--fp-text-2'].flatMap(fg => ['--fp-surface', '--fp-subtle'].map(bg => [fg, bg, contrast(tokens[fg], tokens[bg])]));
    assert.ok(ratios.every(([, , ratio]) => ratio >= 4.5), JSON.stringify(ratios));
    assert.match(source, /html\[data-theme="light"\] body \.data-quality-field,html\[data-theme="light"\] body \.data-quality-recommendation\{color:var\(--fp-text-2\)\}/);
  });
});

test('D2: aba ativa em tablet claro e valores de resumo mantêm contraste computado AA nos dois temas', async () => {
  await withPage(768, async page => {
    const result = await page.evaluate(() => {
      const luminance = color => {
        const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
        if (channels.length !== 3) return null;
        const linear = channels.map(value => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
        return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
      };
      const ratio = (foreground, background) => {
        const fg = luminance(foreground), bg = luminance(background);
        if (fg == null || bg == null) return null;
        return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
      };
      const themes = {};
      for (const theme of ['light', 'dark']) {
        applyTheme(theme);
        go('ativos');
        goAssetInner('desempenho');
        const tab = document.querySelector('.tabs-mobile .tab.on');
        const tabStyle = tab && getComputedStyle(tab);
        const activeTab = tab ? { name: tab.getAttribute('aria-label') || tab.textContent.trim(), color: tabStyle.color, background: tabStyle.backgroundColor, ratio: ratio(tabStyle.color, tabStyle.backgroundColor) } : null;
        const summaries = [];
        for (const route of ['dashboard', 'ativos', 'rentabilidade', 'relatorios', 'irpf', 'metas']) {
          go(route);
          document.querySelectorAll('.analysis-summary-value').forEach(value => {
            if (summaries.length >= 8) return;
            const card = value.closest('.analysis-summary-card, .irpf-summary-card, .analysis-summary');
            const color = getComputedStyle(value).color;
            const background = card ? getComputedStyle(card).backgroundColor : getComputedStyle(document.body).backgroundColor;
            summaries.push({ route, color, background, ratio: ratio(color, background) });
          });
        }
        themes[theme] = {
          tab: activeTab,
          summaries
        };
      }
      return themes;
    });
    for (const theme of ['light', 'dark']) {
      assert.ok(result[theme].tab, `${theme}: guia ativa mobile/tablet presente`);
      assert.ok(result[theme].tab.ratio >= 4.5, `${theme}: guia ativa ${JSON.stringify(result[theme].tab)}`);
      assert.ok(result[theme].summaries.length > 0, `${theme}: encontrou valores reais de resumo para medir`);
      assert.ok(result[theme].summaries.every(item => item.ratio >= 4.5), `${theme}: resumo ${JSON.stringify(result[theme].summaries)}`);
    }
  });
});

test('D2: sidebar e cartões de Dividendos no tema claro seguem os tokens visuais; Chart.js não está carregado', async () => {
  await withPage(1366, async page => {
    const result = await page.evaluate(() => {
      applyTheme('light');
      const probe = document.createElement('div');
      probe.innerHTML = desktopTabs();
      document.body.append(probe);
      const sidebar = probe.querySelector('.tabs-desktop');
      go('dividendos');
      const cards = [...document.querySelectorAll('.fp-dividends .dividend-executive-kpi, .fp-dividends .dividend-annual-summary')];
      return {
        sidebar: sidebar ? getComputedStyle(sidebar).backgroundColor : null,
        sidebarToken: getComputedStyle(document.documentElement).getPropertyValue('--fp-sidebar').trim(),
        surfaceToken: getComputedStyle(document.documentElement).getPropertyValue('--fp-surface').trim(),
        cards: cards.map(card => getComputedStyle(card).backgroundColor),
        chartJsLoaded: typeof window.Chart !== 'undefined'
      };
    });
    assert.ok(result.sidebar, 'sidebar desktop presente');
    assert.equal(result.sidebar, 'rgb(255, 255, 255)');
    assert.equal(result.sidebarToken, '#ffffff');
    assert.ok(result.cards.length > 0, 'cartões reais de Dividendos presentes');
    assert.ok(result.cards.every(color => color === 'rgb(255, 255, 255)' || color === 'rgba(0, 0, 0, 0)'), JSON.stringify(result.cards));
    assert.equal(result.surfaceToken, '#ffffff');
    assert.equal(result.chartJsLoaded, false, 'o frontend não carrega Chart.js; os gráficos ativos são SVG');
  });
});

test('D5: estados e projeções diferenciam estimativa, parcial e indisponibilidade', async () => {
  await withPage(390, async page => {
    const labels = await page.evaluate(() => ['fresh', 'stale', 'partial', 'unavailable', 'demo', 'estimated'].map(state => dataStateLabel(state)));
    assert.deepEqual(labels, ['Atualizado', 'Desatualizado', 'Parcial', 'Indisponível', 'Demonstração', 'Estimativa']);
    await page.evaluate(() => go('metas'));
    await page.locator('#root details').evaluateAll(nodes => nodes.forEach(node => node.open = true));
    const metasText = await page.locator('#root').innerText();
    assert.match(metasText, /Monte Carlo em 10 anos · estimativa por simulação/);
    assert.match(metasText, /Estimativa · não recebida/);
    assert.match(source, /Estimativa por simulação; pode variar/);
    assert.match(source, /data-state-badge\.state-estimated/);
  });
});

test('D6: Monte Carlo inválido exibe parâmetros a corrigir sem probabilidade fictícia', async () => {
  await withPage(390, async page => {
    const result = await page.evaluate(() => ({
      volatility: monteCarloInvalidInputText({ valid: false, error: 'INVALID_INPUT', invalidParameters: ['volatility'] }),
      combined: monteCarloInvalidInputText({ valid: false, error: 'INVALID_INPUT', invalidParameters: ['expectedReturn', 'years'] }),
      overflow: monteCarloInvalidInputText({ valid: false, error: 'RESULT_OVERFLOW', invalidParameters: [] }),
      bothUiCallersGuardInvalid: (document.documentElement.innerHTML.match(/mc\.valid === false/g) || []).length >= 2,
    }));
    assert.equal(result.volatility, 'Corrija: volatilidade.');
    assert.equal(result.combined, 'Corrija: retorno esperado, horizonte em anos.');
    assert.match(result.overflow, /Reduza o horizonte, o retorno ou a volatilidade/);
    assert.equal(result.bothUiCallersGuardInvalid, true);
    assert.match(source, /Nenhuma probabilidade foi calculada/);
  });
});

test('D4: navegação complementar mobile preserva rótulos e usa SVGs existentes', async () => {
  await withPage(390, async page => {
    await page.getByRole('button', { name: 'Abrir navegação complementar' }).click();
    const items = await page.locator('#investMenuSheet .sheet-grid button').evaluateAll(nodes => nodes.map(node => ({
      text: node.innerText.trim(),
      name: node.getAttribute('aria-label') || node.innerText.trim(),
      icon: !!node.querySelector('svg[aria-hidden="true"]'),
      hasEmoji: /\p{Extended_Pictographic}/u.test(node.innerText)
    })));
    assert.equal(items.length, 14);
    assert.ok(items.every(item => item.icon && !item.hasEmoji));
    assert.ok(items.some(item => item.name === 'Aportes'));
    assert.ok(items.some(item => item.name === 'IRPF'));
  });
});

test('D7: IRPF oferece botão de PDF alcançável e funcional em mobile', async () => {
  await withPage(390, async page => {
    await page.evaluate(() => go('irpf'));
    const pdfButton = page.getByRole('button', { name: /PDF/ }).first();
    await pdfButton.waitFor({ state: 'visible' });
    const target = await pdfButton.boundingBox();
    assert.ok(target && target.width >= 40 && target.height >= 40, `alvo mobile PDF ${JSON.stringify(target)}`);
    await page.evaluate(() => {
      window.__irpfPdfHtml = '';
      window.open = () => ({ closed: false, focus() {}, print() {}, document: { readyState: 'complete', open() {}, write(html) { window.__irpfPdfHtml = String(html); }, close() {} } });
      window.setTimeout = () => 0;
      window.toast = () => {};
    });
    await pdfButton.click();
    const pdf = await page.evaluate(() => window.__irpfPdfHtml);
    assert.match(pdf, /Declaração IRPF/);
    assert.match(pdf, /Posições em 31\/12/);
  });
});

test('D2: ação de venda sem fluxo fica desativada e explica a indisponibilidade', async () => {
  await withPage(1366, async page => {
    await applyRichFixture(page);
    const result = await page.evaluate(() => ({ row: renderAssetRow(S.assets[0], 0), saleFlow: typeof openAssetQuickMovement }));
    assert.equal(result.saleFlow, 'function', 'o fluxo de venda ativo continua existente');
    assert.match(result.row, /class="btn btn-sell"[^>]*disabled|disabled[^>]*class="btn btn-sell"/);
    assert.match(result.row, /aria-label="Vender — indisponível nesta linha"/);
    assert.match(result.row, /title="Fluxo de venda indisponível nesta lista"/);
  });
});

test('D5: privacidade mascara valores nas telas Relatórios e IRPF', async () => {
  await withPage(390, async page => {
    const states = await page.evaluate(() => {
      S.hideValues = true;
      go('relatorios');
      const reports = document.querySelector('#root').innerText;
      go('irpf');
      const irpf = document.querySelector('#root').innerText;
      return {
        reportsMasked: reports.includes('••••'),
        irpfMasked: irpf.includes('••••'),
        reportsState: S.hideValues,
        irpfState: S.hideValues
      };
    });
    assert.equal(states.reportsMasked, true, 'Relatórios mostram o estado de privacidade');
    assert.equal(states.irpfMasked, true, 'IRPF mostra o estado de privacidade');
    assert.equal(states.reportsState && states.irpfState, true);
  });
});

test('D4: Metas e Renda Fixa preservam tabela, filtros e alvos mobile', async () => {
  for (const width of [360, 390, 768]) await withPage(width, async page => {
    await page.evaluate(() => go('metas'));
    await page.locator('.metas-goal-section').last().evaluate(node => node.open = true);
    await page.locator('#root details').evaluateAll(nodes => nodes.forEach(node => node.open = true));
    const goalTable = page.locator('.metas-goal-section .ts').first();
    assert.equal(await goalTable.count(), 1);
    assert.equal(await goalTable.isVisible(), true);
    const smallGoalText = await page.locator('.metas-shell :is(.sec-meta,.metas-summary-label,.metas-summary-detail,.metas-goal-status,.metas-projection-note,.metas-kpi-sub,.passive-goal-kicker,.passive-goal-sub,.passive-goal-empty-note,.passive-goal-list-label,.passive-goal-list-value,.passive-goal-badge)').evaluateAll(nodes => nodes.filter(node => parseFloat(getComputedStyle(node).fontSize) < 12).length);
    assert.equal(smallGoalText, 0, `Metas com texto-chave abaixo de 12px em ${width}px`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Metas ${width}px`);
    await page.evaluate(() => go('renda-fixa'));
    await page.locator('.premium-rf-filter-details').evaluate(node => node.open = true);
    const options = await page.locator('.premium-rf-filter-options').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
    if (width < 560) assert.equal(options, 2);
    const smallRfText = await page.locator('.premium-rf-page :is(.rf-event-kpi-label,.rf-event-kpi-sub,.rf-event-badge,.rf-event-sub,.premium-rf-row-meta,.premium-rf-row-sub)').evaluateAll(nodes => nodes.filter(node => parseFloat(getComputedStyle(node).fontSize) < 12).length);
    assert.equal(smallRfText, 0, `Renda Fixa com texto-chave abaixo de 12px em ${width}px`);
    const tooSmall = await page.locator('.premium-rf-row-actions :is(.btn,.asset-detail-link,.premium-rf-act)').evaluateAll(nodes => nodes.filter(node => {
      const rect = node.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).length);
    assert.equal(tooSmall, 0, `ações RF abaixo de 44px em ${width}px`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Renda Fixa ${width}px`);
  });
});
