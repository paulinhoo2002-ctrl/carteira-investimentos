const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer: startServer } = require('./local-http-server.js');

function contrastRatio(foreground, background) {
  const luminance = color => {
    const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const [high, low] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => {
    try { fs.accessSync(candidate); return true; } catch { return false; }
  });
}

// Carteira sintética: RF com lucro, prejuízo, zero legítimo e valor desconhecido,
// além de uma ação com preço médio distinto do atual. Nenhum dado real.
function syntheticRfAssets() {
  return [
    { id:'QA_RF_LUCRO', ticker:'QARFL01', name:'CDB sintético lucro', product:'CDB sintético lucro', type:'Renda Fixa', subtype:'CDB', rf_subtype:'CDB',
      rf_applied_value:1000, rf_liquid_value:1100, rf_gross_value:1100, rf_ir_iof:0, rf_unavailable_value:0,
      rf_contract_rate:'100% CDI', institution:'Banco Sintético', rf_maturity_date:'2027-06-15', rf_application_date:'2025-06-15' },
    { id:'QA_RF_PREJU', ticker:'QARFP01', name:'CDB sintético prejuízo', product:'CDB sintético prejuízo', type:'Renda Fixa', subtype:'CDB', rf_subtype:'CDB',
      rf_applied_value:1000, rf_liquid_value:900, rf_gross_value:900, rf_ir_iof:0, rf_unavailable_value:0,
      rf_contract_rate:'IPCA + 6%', rf_maturity_date:'2028-01-01' },
    { id:'QA_RF_ZERO', ticker:'QARFZ01', name:'Tesouro sintético zero', product:'Tesouro sintético zero', type:'Renda Fixa', subtype:'Tesouro Direto', rf_subtype:'Tesouro Direto',
      rf_applied_value:1000, rf_liquid_value:1000, rf_gross_value:1000, rf_ir_iof:0, rf_unavailable_value:0 },
    { id:'QA_RF_DESC', ticker:'QARFD01', name:'CDB sintético sem valor atual', product:'CDB sintético sem valor atual', type:'Renda Fixa', subtype:'CDB', rf_subtype:'CDB',
      rf_applied_value:1000, rf_liquid_value:0, rf_gross_value:0, rf_ir_iof:0, rf_unavailable_value:0 },
    { id:'QA_ACao', ticker:'QAAA3', name:'Ação sintética Alfa', type:'Ação', sector:'Setor sintético', qty:10, avg_price:10, current_price:12, dy:1 },
  ];
}

const viewports = [
  { width: 390, height: 844, label: '390x844', mobile: true },
  { width: 1366, height: 768, label: '1366x768', mobile: false },
];

for (const viewport of viewports) {
  test(`Renda Fixa resumida em Ativos - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke Playwright');
    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const errors = [];
    const requestFailures = [];
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.mobile, isMobile: viewport.mobile,
    });
    const page = await context.newPage();
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', request => requestFailures.push(`${request.url()} (${request.failure()?.errorText || 'unknown'})`));
    await page.addInitScript(() => {
      window.__financialWrites = [];
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (...args) {
          if (this === localStorage) window.__financialWrites.push(method);
          return original.apply(this, args);
        };
      }
    });
    try {
      await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__LOCAL_TEST_MODE__ === true && typeof S !== 'undefined' && typeof go === 'function');
      await page.evaluate(assets => {
        S.assets = JSON.parse(JSON.stringify(assets));
        S.aportes = []; S.proventos = []; S.rfEvents = []; S.quotes = {};
        S.hideValues = false;
        render();
      }, syntheticRfAssets());
      await page.evaluate(() => go('ativos'));

      const before = await page.evaluate(() => ({
        assets: structuredClone(S.assets),
        rfEvents: structuredClone(S.rfEvents || []),
        writes: window.__financialWrites.length,
      }));

      // Expansão funcional: categoria RF abre e fecha pelo acordeão nativo.
      const rfGroup = page.locator('.ag[data-asset-group="Renda Fixa"]');
      assert.ok(await rfGroup.count() === 1, `categoria RF ausente em ${viewport.label}`);
      if (!(await rfGroup.evaluate(element => element.open))) await rfGroup.locator(':scope > summary').click();
      await rfGroup.locator('.rf-category-row').first().waitFor({ state: 'visible' });

      const summary = await page.evaluate(() => {
        const visible = element => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
        };
        const rows = [...document.querySelectorAll('.ag[data-asset-group="Renda Fixa"] .rf-category-row')].filter(visible);
        const rowFor = id => rows.find(row => row.dataset.id === id);
        const metric = (row, label) => [...(row?.querySelectorAll('.rf-category-metric') || [])].find(node => node.textContent.includes(label));
        const metricText = (row, label) => metric(row, label) ? metric(row, label).textContent : '';
        const metricClass = (row, label) => metric(row, label) ? metric(row, label).className : '';
        const hint = [...document.querySelectorAll('.ag[data-asset-group="Renda Fixa"]')].find(node => node.textContent.includes('Gestão detalhada em Renda Fixa'));
        const routeLink = [...document.querySelectorAll('.ag[data-asset-group="Renda Fixa"] button')].find(button => button.textContent.trim() === 'Ver Renda Fixa');
        const colorOf = (row, label) => {
          const node = metric(row, label)?.querySelector('b');
          return node ? getComputedStyle(node).color : '';
        };
        return {
          rowCount: rows.length,
          hintVisible: Boolean(hint),
          routeLinkVisible: Boolean(routeLink && visible(routeLink)),
          lucro: {
            identity: rowFor('QA_RF_LUCRO')?.querySelector('.rf-category-identity')?.textContent || '',
            aplicado: metricText(rowFor('QA_RF_LUCRO'), 'Aplicado'),
            atual: metricText(rowFor('QA_RF_LUCRO'), 'Atual'),
            resultado: metricText(rowFor('QA_RF_LUCRO'), 'Resultado'),
            resultadoClass: metricClass(rowFor('QA_RF_LUCRO'), 'Resultado'),
            resultadoColor: colorOf(rowFor('QA_RF_LUCRO'), 'Resultado'),
          },
          prejuizo: {
            resultado: metricText(rowFor('QA_RF_PREJU'), 'Resultado'),
            resultadoClass: metricClass(rowFor('QA_RF_PREJU'), 'Resultado'),
            resultadoColor: colorOf(rowFor('QA_RF_PREJU'), 'Resultado'),
            identity: rowFor('QA_RF_PREJU')?.querySelector('.rf-category-identity')?.textContent || '',
          },
          zero: { resultado: metricText(rowFor('QA_RF_ZERO'), 'Resultado'), resultadoClass: metricClass(rowFor('QA_RF_ZERO'), 'Resultado') },
          desconhecido: {
            atual: metricText(rowFor('QA_RF_DESC'), 'Atual'),
            resultado: metricText(rowFor('QA_RF_DESC'), 'Resultado'),
            rentab: metricText(rowFor('QA_RF_DESC'), 'Rentab.'),
            resultadoClass: metricClass(rowFor('QA_RF_DESC'), 'Resultado'),
            identity: rowFor('QA_RF_DESC')?.querySelector('.rf-category-identity')?.textContent || '',
          },
          acaoRows: [...document.querySelectorAll('.ag[data-asset-group="Ação"] .ag-table tbody tr, .ag[data-asset-group="Ação"] .asset-mobile-cards details.asset-premium-card')].filter(visible).length,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });

      assert.equal(summary.rowCount, 4, `RF deve listar 4 títulos sintéticos em ${viewport.label}`);
      assert.equal(summary.hintVisible, true, `hint de gestão detalhada ausente em ${viewport.label}`);
      assert.equal(summary.routeLinkVisible, true, `botão Ver Renda Fixa ausente em ${viewport.label}`);

      // Lucro verde: 1000 -> 1100 com resultado +100,00 e identidade com detalhes disponíveis.
      assert.match(summary.lucro.aplicado, /R\$\s*1\.000,00/, `aplicado ilegível em ${viewport.label}`);
      assert.match(summary.lucro.atual, /R\$\s*1\.100,00/, `atual ilegível em ${viewport.label}`);
      assert.match(summary.lucro.resultado, /\+\s*R\$\s*100,00/, `resultado do lucro ausente em ${viewport.label}`);
      assert.match(summary.lucro.resultadoClass, /\bpos\b/, `lucro deve usar tom positivo em ${viewport.label}`);
      assert.match(summary.lucro.identity, /CDI/, `indexador ausente quando disponível em ${viewport.label}`);
      assert.match(summary.lucro.identity, /Banco Sintético/, `instituição explícita ausente em ${viewport.label}`);
      assert.match(summary.lucro.identity, /15\/06\/2027/, `vencimento legível ausente em ${viewport.label}`);

      // Prejuízo vermelho: 1000 -> 900 com resultado -100,00.
      assert.match(summary.prejuizo.resultado, /-\s*R\$\s*100,00/, `prejuízo ausente em ${viewport.label}`);
      assert.match(summary.prejuizo.resultadoClass, /\bneg\b/, `prejuízo deve usar tom negativo em ${viewport.label}`);
      assert.match(summary.prejuizo.identity, /IPCA/, `indexador IPCA ausente em ${viewport.label}`);
      assert.notEqual(summary.lucro.resultadoColor, summary.prejuizo.resultadoColor, `cores de lucro e prejuízo iguais em ${viewport.label}`);

      // Zero legítimo neutro: 1000 -> 1000 mostra 0,00 sem tom de lucro/prejuízo.
      assert.match(summary.zero.resultado, /R\$\s*0,00/, `zero legítimo ausente em ${viewport.label}`);
      assert.match(summary.zero.resultadoClass, /\bneutral\b/, `zero legítimo deve ser neutro em ${viewport.label}`);

      // Desconhecido: sem valor atual explícito o resultado permanece '—', nunca zero certificado.
      assert.ok(summary.desconhecido.atual.includes('—'), `atual desconhecido deve exibir — em ${viewport.label}`);
      assert.ok(summary.desconhecido.resultado.includes('—'), `resultado desconhecido deve exibir — em ${viewport.label}`);
      assert.ok(summary.desconhecido.rentab.includes('—'), `rentabilidade desconhecida deve exibir — em ${viewport.label}`);
      assert.ok(!summary.desconhecido.resultado.includes('0,00'), `resultado desconhecido não pode virar 0,00 em ${viewport.label}`);
      assert.match(summary.desconhecido.resultadoClass, /\bneutral\b/, `desconhecido deve ser neutro em ${viewport.label}`);
      // Instituição nunca inferida do emissor: título sem campo explícito não mostra banco.
      assert.ok(!summary.desconhecido.identity.includes('Banco'), `instituição inferida indevidamente em ${viewport.label}`);

      // Ação com preço médio distinto do atual continua listada na categoria própria.
      assert.ok(summary.acaoRows > 0, `ação sintética ausente em ${viewport.label}`);
      assert.equal(summary.overflow, false, `overflow horizontal em ${viewport.label}`);

      // Comprar/Vender/Mais sem gravação involuntária: menu RF abre editor e cancelar não persiste.
      await page.locator('.ag[data-asset-group="Renda Fixa"] .rf-category-row .asset-action-trigger:visible').first().click();
      await page.waitForTimeout(120);
      const menuActions = await page.evaluate(() => [...document.querySelectorAll('.asset-action-menu-panel.open button')].map(button => button.textContent.trim()));
      assert.ok(menuActions.includes('Movimentar'), `ação Movimentar ausente em ${viewport.label}`);
      assert.ok(menuActions.includes('Resgatar'), `ação Resgatar ausente em ${viewport.label}`);
      assert.ok(menuActions.includes('Editar'), `ação Editar ausente em ${viewport.label}`);
      await page.locator('.asset-action-menu-panel.open button', { hasText: 'Movimentar' }).click();
      await page.getByRole('dialog', { name: /movimentação de renda fixa/i }).waitFor({ state: 'visible' });
      await page.locator('.note-modal button', { hasText: 'Fechar' }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });

      // Ver Renda Fixa navega para a rota dedicada, que preserva a gestão completa.
      await page.evaluate(() => { document.querySelector('.ag[data-asset-group="Renda Fixa"] summary').click(); });
      await page.evaluate(() => go('renda-fixa'));
      await page.waitForFunction(() => S.tab === 'renda-fixa');
      const rfRouteRendered = await page.evaluate(() => document.body.textContent.includes('Renda Fixa'));
      assert.equal(rfRouteRendered, true, `rota dedicada RF não renderizou em ${viewport.label}`);

      const after = await page.evaluate(() => ({
        assets: structuredClone(S.assets),
        rfEvents: structuredClone(S.rfEvents || []),
        writes: window.__financialWrites.length,
      }));
      assert.deepEqual({ assets: after.assets, rfEvents: after.rfEvents }, { assets: before.assets, rfEvents: before.rfEvents },
        `interações não podem alterar dados financeiros em ${viewport.label}`);
      assert.equal(after.writes, before.writes, `interações não podem persistir estado financeiro em ${viewport.label}`);
      assert.deepEqual(errors, [], `erros de console em ${viewport.label}: ${errors.join(' | ')}`);
      assert.deepEqual(requestFailures, [], `requestfailed em ${viewport.label}: ${requestFailures.join(' | ')}`);
    } finally {
      await context.close();
      await browser.close();
      harness.server.closeAllConnections();
      harness.server.close();
    }
  });

  test(`Renda Fixa expandida mantém contraste AA em claro e escuro - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke Playwright');
    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    try {
      await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__LOCAL_TEST_MODE__ === true && typeof S !== 'undefined');
      await page.evaluate(assets => {
        S.assets = JSON.parse(JSON.stringify(assets));
        S.aportes = []; S.proventos = []; S.rfEvents = []; S.quotes = {};
        render();
      }, syntheticRfAssets());
      await page.addScriptTag({ path: require.resolve('axe-core') });
      await page.evaluate(() => go('ativos'));
      const group = page.locator('.ag[data-asset-group="Renda Fixa"]');
      if (!(await group.evaluate(element => element.open))) await group.locator(':scope > summary').click();
      for (const theme of ['light', 'dark']) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        const colors = await page.locator('.ag[data-asset-group="Renda Fixa"] .rf-category-summary .rf-category-row').first().evaluate(row => {
          const background = getComputedStyle(row.closest('.rf-category-summary')).backgroundColor;
          return [...row.querySelectorAll('.rf-category-identity strong, .rf-category-identity span, .rf-category-metric small, .rf-category-metric b')]
            .map(node => ({ text: node.textContent.trim(), color: getComputedStyle(node).color, background, fontSize: Number.parseFloat(getComputedStyle(node).fontSize) }));
        });
        assert.ok(colors.length > 0, `detalhes RF sem textos auditáveis em ${theme}`);
        assert.ok(colors.every(item => item.fontSize >= 12), `texto funcional RF abaixo de 12px em ${theme}: ${JSON.stringify(colors.filter(item => item.fontSize < 12))}`);
        for (const item of colors) assert.ok(contrastRatio(item.color, item.background) >= 4.5,
          `contraste abaixo de WCAG AA (${contrastRatio(item.color, item.background).toFixed(2)}:1) em ${theme}: ${item.text}`);
        const axe = await page.evaluate(async () => {
          const region = document.querySelector('.ag[data-asset-group="Renda Fixa"] .rf-category-summary');
          const result = await window.axe.run(region, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
          return result.violations.map(({ id, impact, help }) => ({ id, impact, help }));
        });
        assert.deepEqual(axe, [], `Axe A/AA encontrou violações no detalhe RF em ${theme}: ${JSON.stringify(axe)}`);
      }
    } finally {
      await context.close();
      await browser.close();
      harness.server.closeAllConnections();
      harness.server.close();
    }
  });
}
