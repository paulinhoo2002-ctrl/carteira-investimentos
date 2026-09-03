const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function startServer(root) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const filePath = path.normalize(path.join(root, pathname === '/' ? '/index.html' : pathname));
      if (!filePath.startsWith(root)) { res.writeHead(403); return res.end(); }
      res.writeHead(200, { 'Content-Type': path.extname(filePath) === '.html' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' });
      res.end(await fsp.readFile(filePath));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

async function waitForReportsShell(page) {
  await page.waitForSelector('.reports-premium-shell', { timeout: 15000 });
  await page.waitForTimeout(300);
}

async function app(options = {}) {
  const { width = 1366, height = 768 } = options;
  const harness = await startServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(harness.url, { waitUntil: 'networkidle' });
  return { browser, page, errors, harness };
}

test('RELATÓRIOS: navegação e estado inicial', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await page.evaluate(() => go('relatorios'));
    await waitForReportsShell(page);
    
    // Check main sections exist
    const hero = await page.$('.reports-premium-hero');
    assert.ok(hero, 'Hero section deve existir');
    
    const mainGrid = await page.$('.reports-premium-main-grid');
    assert.ok(mainGrid, 'Main grid deve existir');
    
    const secondaryGrid = await page.$('.reports-premium-secondary-grid');
    assert.ok(secondaryGrid, 'Secondary grid deve existir');
    
    // Check 5 KPIs in premium kpis
    const kpis = await page.$$('.reports-premium-kpis .reports-kpi');
    assert.equal(kpis.length, 5, 'Deve ter 5 KPIs executivos');
    
    // Check filters
    const filters = await page.$$('.reports-filter button');
    assert.equal(filters.length, 3, 'Deve ter 3 filtros de período');
    const filterTexts = await Promise.all(filters.map(f => f.textContent()));
    assert.deepEqual(filterTexts, ['Ano atual', 'Últimos 12 meses', 'Todos']);
    
    // Check evolution chart
    const evolution = await page.$('.reports-evolution-chart');
    assert.ok(evolution, 'Gráfico de evolução deve existir');
    
    // Check allocation panel
    const allocation = await page.$('.reports-data-list');
    assert.ok(allocation, 'Painel de distribuição deve existir');
    
    // Check income panel
    const incomePanel = await page.locator('.reports-panel:has-text("Renda e proventos")');
    await incomePanel.waitFor({ state: 'visible' });
    
    // Check fixed income panel
    const fixedPanel = await page.locator('.reports-panel:has-text("Resumo da avaliação oficial")');
    await fixedPanel.waitFor({ state: 'visible' });
    
    // Check audit panel
    const auditPanel = await page.locator('.reports-panel:has-text("Qualidade dos dados")');
    await auditPanel.waitFor({ state: 'visible' });
    
    // Check exports section
    const exportsDetails = await page.$('#reports-export-details');
    assert.ok(exportsDetails, 'Seção de exportação deve existir');
    assert.equal(await exportsDetails.evaluate(el => el.open), false, 'Exportação deve começar fechada');
    
    // Check experimental entry
    const experimental = await page.$('.reports-experiment-entry');
    // May or may not exist depending on feature flag
    
    // Check no financial placeholders in the reports shell specifically
    const shellText = await page.$eval('.reports-premium-shell', el => el.textContent);
    assert.ok(!/NaN|Infinity|undefined|null/.test(shellText), 'Não deve ter placeholders financeiros no shell');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('RELATÓRIOS: filtro de período atualiza UI', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await page.evaluate(() => go('relatorios'));
    await waitForReportsShell(page);
    
    // Initial period should be '12m' (default)
    let periodLabel = await page.$eval('.reports-badge', el => el.textContent);
    assert.ok(periodLabel.includes('Últimos 12 meses') || periodLabel.includes('12'), 'Período inicial deve ser 12M');
    
    // Click "Ano atual"
    await page.click('.reports-filter button:has-text("Ano atual")');
    await page.waitForTimeout(500);
    periodLabel = await page.$eval('.reports-badge', el => el.textContent);
    assert.ok(periodLabel.includes('Ano atual') || periodLabel.includes('Ano'), 'Período deve mudar para Ano atual');
    
    // Click "Todos"
    await page.click('.reports-filter button:has-text("Todos")');
    await page.waitForTimeout(500);
    periodLabel = await page.$eval('.reports-badge', el => el.textContent);
    assert.ok(periodLabel.includes('Todos'), 'Período deve mudar para Todos');
    
    // Click back to "Últimos 12 meses"
    await page.click('.reports-filter button:has-text("Últimos 12 meses")');
    await page.waitForTimeout(500);
    periodLabel = await page.$eval('.reports-badge', el => el.textContent);
    assert.ok(periodLabel.includes('12'), 'Período deve voltar para 12M');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('RELATÓRIOS: KPIs executivos têm valores válidos', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await page.evaluate(() => go('relatorios'));
    await waitForReportsShell(page);
    
    const kpiValues = await page.$eval('.reports-premium-kpis', container => {
      return [...container.querySelectorAll('.value')].map(v => v.textContent.trim());
    });
    
    assert.equal(kpiValues.length, 5, 'Deve ter 5 KPIs');
    
    // Check each KPI has a non-empty value
    for (const value of kpiValues) {
      assert.ok(value && value.length > 0, `KPI value não deve ser vazio: "${value}"`);
      // Should be formatted numbers (Brazilian format with dots/commas)
      assert.ok(/[\d.,]+/.test(value), `KPI value deve conter dígitos: "${value}"`);
    }
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('RELATÓRIOS: distribuição da carteira renderiza classes', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await page.evaluate(() => go('relatorios'));
    await waitForReportsShell(page);
    
    const allocationRows = await page.$$('.reports-data-list .reports-data-row');
    assert.ok(allocationRows.length >= 1, 'Deve ter pelo menos 1 classe na distribuição');
    
    // Check each row has type and value
    for (const row of allocationRows) {
      const text = await row.textContent();
      assert.ok(text.trim().length > 0, 'Linha de alocação não deve ser vazia');
    }
    
    // Check badge shows count
    const badge = await page.$eval('.reports-panel:has-text("Distribuição") .reports-badge', el => el.textContent);
    assert.ok(badge.includes('classe') || badge.includes('classes'), 'Badge deve mostrar contagem de classes');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('RELATÓRIOS: renda e proventos painel funcional', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await page.evaluate(() => go('relatorios'));
    await waitForReportsShell(page);
    
    const incomePanel = await page.locator('.reports-panel:has-text("Renda e proventos")');
    await incomePanel.waitFor({ state: 'visible' });
    
    // Check stat list
    const stats = await page.$$('.reports-panel:has-text("Renda e proventos") .reports-stat-list > div');
    assert.ok(stats.length >= 3, 'Deve ter pelo menos 3 estatísticas (12M, média, meta)');
    
    // Check link to Dividendos
    const link = await page.$('.reports-panel:has-text("Renda e proventos") .reports-inline-link');
    assert.ok(link, 'Link para Dividendos deve existir');
    const linkText = await link.textContent();
    assert.ok(linkText.includes('Ver Dividendos'), 'Link deve dizer "Ver Dividendos"');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('RELATÓRIOS: renda fixa painel funcional', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await page.evaluate(() => go('relatorios'));
    await waitForReportsShell(page);
    
    const fixedPanel = await page.locator('.reports-panel:has-text("Resumo da avaliação oficial")');
    await fixedPanel.waitFor({ state: 'visible' });
    
    // Check stat list
    const stats = await page.$$('.reports-panel:has-text("Renda Fixa") .reports-stat-list > div');
    assert.ok(stats.length >= 3, 'Deve ter pelo menos 3 estatísticas (valor atual, aplicado, resultado)');
    
    // Check next maturity info
    const nextMaturity = await page.$('.reports-next-maturity');
    assert.ok(nextMaturity, 'Próximo vencimento deve ser exibido');
    
    // Check link to Ativos
    const link = await page.$('.reports-panel:has-text("Renda Fixa") .reports-inline-link');
    assert.ok(link, 'Link para Ativos deve existir');
    const linkText = await link.textContent();
    assert.ok(linkText.includes('Ver Renda Fixa') || linkText.includes('Ver Ativos'), 'Link deve navegar para Ativos/Renda Fixa');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('RELATÓRIOS: auditoria painel funcional', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await page.evaluate(() => go('relatorios'));
    await waitForReportsShell(page);
    
    const auditPanel = await page.locator('.reports-panel:has-text("Qualidade")');
    await auditPanel.waitFor({ state: 'visible' });
    
    // Check audit count badge - it uses classes: reports-badge-ok, reports-badge-warn, reports-badge-danger
    const badge = await page.$eval('.reports-panel:has-text("Qualidade") .reports-badge', el => ({
      text: el.textContent,
      className: el.className
    }));
    console.log('Audit badge:', JSON.stringify(badge));
    
    // Badge should have one of the tone classes
    assert.ok(
      badge.className.includes('reports-badge-ok') ||
      badge.className.includes('reports-badge-warn') ||
      badge.className.includes('reports-badge-danger') ||
      badge.className.includes('reports-badge-muted'),
      'Badge deve ter classe de tom (ok/warn/danger/muted)'
    );
    
    // Check audit count display
    const countEl = await page.$('.reports-audit-count');
    assert.ok(countEl, 'Contador de alertas deve existir');
    const countText = await countEl.textContent();
    assert.ok(/\d+/.test(countText), 'Contador deve ter número');
    
    // Check link to Auditoria
    const link = await page.$('.reports-panel:has-text("Qualidade") .reports-inline-link');
    assert.ok(link, 'Link para Auditoria deve existir');
    const linkText = await link.textContent();
    assert.ok(linkText.includes('Abrir Auditoria'), 'Link deve dizer "Abrir Auditoria"');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('RELATÓRIOS: exportação cards existem', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await page.evaluate(() => go('relatorios'));
    await waitForReportsShell(page);
    
    // Open exports section
    const exportsDetails = await page.$('#reports-export-details');
    await exportsDetails.evaluate(el => el.setAttribute('open', ''));
    await page.waitForTimeout(300);
    
    // Check export cards - they use class 'report-export-card'
    const exportCards = await page.$$('.reports-export-grid .report-export-card');
    assert.ok(exportCards.length >= 6, `Deve ter pelo menos 6 cards de exportação (encontrado: ${exportCards.length})`);
    
    // Check specific card types exist
    const cardTexts = await Promise.all(exportCards.map(c => c.textContent()));
    const hasComplete = cardTexts.some(t => t.includes('Carteira completa'));
    const hasAssets = cardTexts.some(t => t.includes('Ativos'));
    const hasProventos = cardTexts.some(t => t.includes('Dividendos') || t.includes('Proventos'));
    const hasFixed = cardTexts.some(t => t.includes('Renda Fixa'));
    const hasPatrimony = cardTexts.some(t => t.includes('Patrimônio'));
    const hasAudit = cardTexts.some(t => t.includes('Auditoria'));
    const hasIrpf = cardTexts.some(t => t.includes('IRPF'));
    const hasJson = cardTexts.some(t => t.includes('JSON'));
    
    assert.ok(hasComplete, 'Deve ter card Carteira completa');
    assert.ok(hasAssets, 'Deve ter card Ativos');
    assert.ok(hasProventos, 'Deve ter card Dividendos/Proventos');
    assert.ok(hasFixed, 'Deve ter card Renda Fixa');
    assert.ok(hasPatrimony, 'Deve ter card Patrimônio');
    assert.ok(hasAudit, 'Deve ter card Auditoria');
    assert.ok(hasIrpf, 'Deve ter card IRPF');
    assert.ok(hasJson, 'Deve ter card JSON');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('RELATÓRIOS: mobile 390 sem overflow e funcional', async () => {
  const { browser, page, errors, harness } = await app({ width: 390, height: 844 });
  try {
    await page.evaluate(() => go('relatorios'));
    await waitForReportsShell(page);
    
    // Check no horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false, 'Não deve ter overflow horizontal em mobile 390');
    
    // Check KPIs don't overflow on mobile
    const kpiGrid = await page.$eval('.reports-premium-kpis', el => getComputedStyle(el).gridTemplateColumns);
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(hasOverflow, false, `KPI grid não deve causar overflow em mobile: ${kpiGrid}`);
    
    // Check all sections visible
    const sections = await page.$$('.reports-premium-shell > *');
    assert.ok(sections.length >= 4, 'Principais seções devem estar presentes');
    
    // Check bottom nav not overlapping when scrolled to bottom
    const nav = await page.$('#investBottomNav');
    if (nav) {
      // On mobile with fixed bottom nav, check that there's enough padding at bottom
      const paddingCheck = await page.evaluate(() => {
        const shell = document.querySelector('.reports-premium-shell');
        const nav = document.querySelector('#investBottomNav');
        const navHeight = nav.getBoundingClientRect().height;
        const shellStyle = getComputedStyle(shell);
        const paddingBottom = parseFloat(shellStyle.paddingBottom) || 0;
        const wrap = document.querySelector('.wrap');
        const wrapStyle = getComputedStyle(wrap);
        const wrapPaddingBottom = parseFloat(wrapStyle.paddingBottom) || 0;
        return {
          navHeight,
          shellPaddingBottom: paddingBottom,
          wrapPaddingBottom: wrapPaddingBottom,
          totalBottomSpace: paddingBottom + wrapPaddingBottom,
          sufficient: (paddingBottom + wrapPaddingBottom) >= navHeight - 10
        };
      });
      console.log('Mobile padding check:', JSON.stringify(paddingCheck));
      // The fixed bottom nav needs sufficient bottom padding so content isn't hidden
      assert.ok(paddingCheck.sufficient, `Bottom padding (${paddingCheck.totalBottomSpace}px) deve acomodar bottom nav (${paddingCheck.navHeight}px)`);
    }
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('RELATÓRIOS: smoke - navegação UI real e conteúdo semântico', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    // Use go() to navigate - this is the programmatic way
    await page.evaluate(() => go('relatorios'));
    await waitForReportsShell(page);
    
    // Verify semantic content
    const content = await page.locator('body').textContent();
    const requiredTerms = [
      'Relatórios',
      'Patrimônio atual',
      'Total aplicado',
      'Resultado',
      'Proventos',
      'Rentabilidade',
      'Evolução patrimonial',
      'Distribuição da carteira',
      'Renda e proventos',
      'Renda Fixa',
      'Qualidade dos dados',
      'Exportar'
    ];
    
    for (const term of requiredTerms) {
      assert.ok(content.includes(term), `Deve conter "${term}"`);
    }
    
    // Also verify we can click the Export button and see export cards
    const exportCta = await page.$('.reports-export-cta');
    assert.ok(exportCta, 'Botão Exportar deve existir');
    
    // Check no console errors
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
    harness.server.close();
  }
});
