const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function app(viewport) {
  const harness = await startLocalHttpServer(require('node:path').join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport, isMobile: viewport.width <= 430, hasTouch: viewport.width <= 430 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(harness.url, { waitUntil: 'networkidle' });
  await page.evaluate(() => { restoreLocalTestData(); go('aportes'); });
  return { browser, page, errors, harness };
}

async function movement(page, kind) {
  await page.evaluate(kind => openQuickMovement(kind), kind);
  await page.locator('.quick-movement-modal').waitFor({ state: 'visible' });
}

test('Aportes E2E desktop bloqueia venda acima da posição', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await movement(page, 'venda');
    await page.selectOption('#qm-sale-asset', { index: 1 });
    const before = await page.locator('#qm-sale-info').innerText();
    await page.fill('#qm-qty', '999999');
    await page.fill('#qm-price', '10');
    await page.getByRole('button', { name: 'Confirmar venda' }).click();
    assert.match(await page.locator('.quick-movement-modal').innerText(), /saldo|dispon|maior|inválid/i);
    assert.match(before, /ITUB4|disp\.|disponível/i);
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { await page.evaluate(() => restoreLocalTestData()).catch(() => {}); await browser.close(); harness.server.close(); }
});

test('Aportes E2E edita e reabre um lançamento', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    await page.evaluate(() => { setAportesViewMode('extrato'); edP('ap-012'); });
    await page.locator('#p-ti').fill('RESERVA EDITADA');
    await page.locator('#p-dc').fill('motivo editado');
    await page.getByRole('button', { name: 'Salvar edição' }).click();
    await page.waitForFunction(() => !document.querySelector('#p-ti'));
    assert.match(await page.locator('.aporte-premium').innerText(), /RESERVA EDITADA/);
    await page.evaluate(() => edP('ap-012'));
    assert.equal(await page.locator('#p-ti').inputValue(), 'RESERVA EDITADA');
    assert.equal(await page.locator('#p-dc').inputValue(), 'motivo editado');
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { await page.evaluate(() => restoreLocalTestData()).catch(() => {}); await browser.close(); harness.server.close(); }
});

test('Aportes E2E exclui exatamente um lançamento', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    page.on('dialog', dialog => dialog.accept());
    await page.evaluate(() => setAportesViewMode('extrato'));
    const deleteButtons = page.locator('button.bdi');
    assert.ok(await deleteButtons.count() > 0, 'botão de exclusão não encontrado');
    const deleteButton = deleteButtons.first();
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
    const before = await page.evaluate(() => ({ count: S.proventos.length, id: S.proventos[S.proventos.length - 1].id }));
    await deleteButton.click();
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => ({ count: S.proventos.length }));
    assert.equal(after.count, before.count - 1);
    assert.equal(await page.evaluate(id => S.proventos.some(item => item.id === id), before.id), false);
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { await page.evaluate(() => restoreLocalTestData()).catch(() => {}); await browser.close(); harness.server.close(); }
});

for (const kind of ['venda', 'provento', 'renda-fixa', 'outro']) {
  test(`Aportes E2E mobile 390: ${kind}`, async () => {
    const { browser, page, errors, harness } = await app({ width: 390, height: 844 });
    try {
      await movement(page, kind);
      if (kind === 'renda-fixa') {
        await page.selectOption('#qm-rf-existing-asset', { index: 1 });
        await page.getByRole('button', { name: 'Continuar aplicação' }).click();
        await page.locator('[id$="-principal"]').first().waitFor({ state: 'visible' });
        await page.locator('[id$="-principal"]').first().fill('10');
        await page.locator('[id$="-source"]').first().fill('Teste E2E');
        await page.getByRole('button', { name: 'Salvar movimentação' }).click();
        await page.waitForTimeout(200);
        const flowText = await page.locator('.quick-movement-modal').innerText();
        assert.match(flowText, /salvar|movimenta|aplica|principal|rend/i);
      }
      const geometry = await page.evaluate(() => {
        const modal = document.querySelector('.quick-movement-modal');
        const nav = document.querySelector('#investBottomNav')?.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth, bottom: modal.getBoundingClientRect().bottom, navTop: nav?.top ?? innerHeight };
      });
      assert.equal(geometry.overflow, false);
      assert.ok(geometry.bottom <= 845);
      assert.equal(errors.length, 0, errors.join(' | '));
    } finally { await page.evaluate(() => restoreLocalTestData()).catch(() => {}); await browser.close(); harness.server.close(); }
  });
}

test('Aportes E2E smoke das telas principais', async () => {
  const { browser, page, errors, harness } = await app({ width: 1366, height: 768 });
  try {
    const screens = {
      dashboard: ['.canon-dashboard', /Dashboard/i],
      ativos: ['body', /Ativos[\s\S]*Patrimônio|Ativos[\s\S]*Total investido/i],
      dividendos: ['body', /Dividendos[\s\S]*Proventos|Dividendos[\s\S]*Resumo/i],
      rentabilidade: ['body', /Rentabilidade[\s\S]*Desempenho|Rentabilidade[\s\S]*Carteira/i]
    };
    for (const route of Object.keys(screens)) {
      await page.evaluate(route => go(route), route);
      const [selector, heading] = screens[route];
      await page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 });
      assert.match(await page.locator('body').innerText(), heading);
    }
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally { await page.evaluate(() => restoreLocalTestData()).catch(() => {}); await browser.close(); harness.server.close(); }
});
