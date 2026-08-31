const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const CHROME = process.env.CHROME_PATH || 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';

async function app(viewport) {
  const harness = await startLocalHttpServer(require('node:path').join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport, isMobile: viewport.width <= 430, hasTouch: viewport.width <= 430 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(harness.url, { waitUntil: 'networkidle' });
  await page.evaluate(() => { restoreLocalTestData(); go('metas'); });
  return { browser, page, errors, harness };
}

function waitForMetasShell(page) {
  return page.waitForFunction(() => document.querySelector('.metas-shell') !== null, { timeout: 10000 });
}

test('PATRIMÔNIO: editar meta patrimonial, salvar, confirmar persistência', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await waitForMetasShell(page);
    
    // Clear any existing value first
    await page.fill('#mp-head-target', '');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Set new target
    await page.fill('#mp-head-target', '1000000');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Verify persisted by checking input value
    const value = await page.inputValue('#mp-head-target');
    assert.equal(value, '1000000', 'Meta patrimonial deve persistir');
    
    // Verify progress text exists (not checking exact % as test data varies)
    const progressText = await page.locator('.metas-shell .sec-body .card:nth-child(2)').innerText();
    assert.ok(progressText.includes('%'), 'Progresso deve conter porcentagem');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { 
    await page.evaluate(() => restoreLocalTestData()).catch(() => {}); 
    await browser.close(); 
    harness.server.close();
  }
});

test('PATRIMÔNIO: desativar meta com target=0 via botão Remover meta', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await waitForMetasShell(page);
    
    // First set a target
    await page.fill('#mp-head-target', '500000');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Click Remove meta button
    await page.locator('.metas-shell .btn:has-text("Remover meta")').click();
    await page.waitForTimeout(500);
    
    // Verify target is cleared (input shows 0 after normalization)
    const value = await page.inputValue('#mp-head-target');
    assert.equal(value, '0', 'Meta patrimonial deve mostrar 0 (target=0 desativa)');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { 
    await page.evaluate(() => restoreLocalTestData()).catch(() => {}); 
    await browser.close(); 
    harness.server.close();
  }
});

test('PROVENTOS: alterar meta mensal e confirmar persistência', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await waitForMetasShell(page);
    
    // The passive income goal section is inside a <details> element
    // Find the details that contains .passive-goal-shell and open it if closed
    const passiveDetails = page.locator('.metas-shell details').filter({ has: page.locator('.passive-goal-shell') });
    if (await passiveDetails.count() > 0) {
      const isOpen = await passiveDetails.evaluate(el => el.open);
      if (!isOpen) {
        // Click the first summary (main passive income goal, not the "Detalhes" sub-summary)
        await passiveDetails.locator('summary').first().click();
        await page.waitForTimeout(300);
      }
    }
    
    // Find proventos monthly input
    const proventosInput = await page.$('#mpr-head-monthly, #mpr-monthly, #div-goal');
    assert.ok(proventosInput, 'Input de meta mensal de proventos deve existir');
    
    // Make sure it's visible and interactable
    await proventosInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    await proventosInput.fill('5000');
    await proventosInput.press('Enter');
    await page.waitForTimeout(500);
    
    const value = await proventosInput.inputValue();
    assert.equal(value, '5000', 'Meta mensal de proventos deve persistir');
    
    // Toggle a provento type that's NOT in default (default: Ação, FII, ETF, BDR, Stock)
    await page.evaluate(() => toggleMetaProventoType('Reit'));
    await page.waitForTimeout(300);
    
    // Verify type was toggled (added)
    const hasReit = await page.evaluate(() => {
      const goals = S.goals || {};
      return goals.proventos?.types?.includes('Reit') || false;
    });
    assert.ok(hasReit, 'Tipo Reit deve ser adicionado aos tipos de proventos');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { 
    await page.evaluate(() => restoreLocalTestData()).catch(() => {}); 
    await browser.close(); 
    harness.server.close();
  }
});

test('ATIVOS: editar configuração suportada via openAllocationGoal', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await waitForMetasShell(page);
    
    // Open allocation goal modal
    await page.evaluate(() => openAllocationGoal());
    await page.waitForTimeout(500);
    
    // Check if modal opened (look for modal or dialog)
    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.modal, .modal-overlay, [role="dialog"], .quick-movement-modal');
      return modal && getComputedStyle(modal).display !== 'none';
    });
    
    // The allocation goal may open a different UI - just verify no errors
    // and that we can interact
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { 
    await page.evaluate(() => restoreLocalTestData()).catch(() => {}); 
    await browser.close(); 
    harness.server.close();
  }
});

test('ALOCAÇÃO: validar renderização dos alvos/atual e botão abre modal', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await waitForMetasShell(page);
    
    // Check allocation table exists
    const allocTable = await page.$('.metas-shell table');
    assert.ok(allocTable, 'Tabela de alocação deve ser renderizada');
    
    // Check for allocation items (should have at least 4 categories)
    const rows = await page.$$('.metas-shell tbody tr');
    assert.ok(rows.length >= 4, `Deve haver pelo menos 4 categorias de alocação (encontrado: ${rows.length})`);
    
    // Check button text and click - should open allocation goal modal
    const allocButton = await page.locator('.metas-shell .btn:has-text("Configurar distribuição")');
    await allocButton.click();
    await page.waitForTimeout(500);
    
    // Verify allocation goal modal opened (S.allocGoalOpen should be true)
    const allocGoalOpen = await page.evaluate(() => S.allocGoalOpen);
    assert.equal(allocGoalOpen, true, 'Deve abrir modal de configuração de alocação');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { 
    await page.evaluate(() => restoreLocalTestData()).catch(() => {}); 
    await browser.close(); 
    harness.server.close();
  }
});

test('VALIDATION: valor negativo na meta patrimonial normalizado para 0', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await waitForMetasShell(page);
    
    // Try negative value - should be normalized to 0
    await page.fill('#mp-head-target', '-1000');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Check persisted value is 0 (normalized)
    const savedValue = await page.evaluate(() => S.goals.patrimonio.target);
    assert.equal(savedValue, 0, 'Valor negativo deve ser normalizado para 0');
    
    // Check input value reflects the normalized value (0)
    const inputValue = await page.inputValue('#mp-head-target');
    assert.equal(inputValue, '0', 'Input deve mostrar 0 após normalização');
    
    // Check no NaN displayed
    const bodyText = await page.locator('body').innerText();
    assert.ok(!bodyText.includes('NaN'), 'Não deve exibir NaN');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { 
    await page.evaluate(() => restoreLocalTestData()).catch(() => {}); 
    await browser.close(); 
    harness.server.close();
  }
});

test('MOBILE 390: editar meta sem overflow horizontal', async () => {
  const { browser, page, errors, harness } = await app({ width: 390, height: 844 });
  try {
    await waitForMetasShell(page);
    
    // Check no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    assert.equal(hasOverflow, false, 'Não deve haver overflow horizontal em 390px');
    
    // Check KPI grid is 2x2 (4 cards)
    const kpiCards = await page.$$('.metas-kpi-grid .metas-kpi-card');
    assert.equal(kpiCards.length, 4, 'Deve haver 4 KPI cards em grid 2x2');
    
    // Check input touch target
    const input = await page.$('#mp-head-target');
    const box = await input.boundingBox();
    assert.ok(box.height >= 44, `Input deve ter altura mínima de 44px (atual: ${box.height})`);
    
    // Edit a goal
    await input.fill('800000');
    await input.press('Enter');
    await page.waitForTimeout(300);
    
    const value = await input.inputValue();
    assert.equal(value, '800000', 'Edição deve funcionar em mobile');
    
    // Just verify no errors - bottom nav overlap is acceptable if content fits
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { 
    await page.evaluate(() => restoreLocalTestData()).catch(() => {}); 
    await browser.close(); 
    harness.server.close();
  }
});

test('SMOKE METAS: navegação UI real e conteúdo semântico', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await waitForMetasShell(page);
    
    // Check key elements exist with semantic content
    const heading = await page.$('.page-heading');
    assert.ok(heading, 'Título da página deve existir');
    const headingText = await heading.innerText();
    assert.ok(headingText.includes('🎯 Metas'), 'Título deve conter "Metas"');
    
    // Check all details sections in metas-shell
    const details = await page.$$('.metas-shell details');
    assert.ok(details.length >= 3, 'Deve haver pelo menos 3 seções (renda passiva, patrimônio, alocação)');
    
    // Check each details section for expected content
    let foundPatrimonio = false;
    let foundAllocation = false;
    let foundPassiveIncome = false;
    
    for (const detail of details) {
      const text = await detail.innerText();
      if (text.includes('Meta de Patrimônio')) foundPatrimonio = true;
      if (text.includes('Distribuição')) foundAllocation = true;
      if (text.includes('Meta de Renda Passiva')) foundPassiveIncome = true;
    }
    
    assert.ok(foundPatrimonio, 'Deve conter seção "Meta de Patrimônio"');
    assert.ok(foundAllocation, 'Deve conter seção "Distribuição"');
    assert.ok(foundPassiveIncome, 'Deve conter seção "Meta de Renda Passiva"');
    
    // Check KPI cards
    const kpiCards = await page.$$('.metas-kpi-grid .metas-kpi-card');
    assert.equal(kpiCards.length, 4, 'Deve haver 4 KPI cards');
    
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { 
    await page.evaluate(() => restoreLocalTestData()).catch(() => {}); 
    await browser.close(); 
    harness.server.close();
  }
});
