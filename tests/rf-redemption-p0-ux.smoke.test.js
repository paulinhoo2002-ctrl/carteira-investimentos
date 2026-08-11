const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

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

async function startServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const file = path.normalize(path.join(rootDir, pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(rootDir)) { res.writeHead(403); res.end(''); return; }
      const content = await fsp.readFile(file);
      res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain' });
      res.end(content);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end('');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

const viewports = [
  { width: 390, height: 844, label: '390x844' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

const round2 = value => Number(value.toFixed(2));

async function expandLedger(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('summary')].some(summary => summary.textContent.includes('audit')), { timeout: 5000 });
  await page.evaluate(() => {
    const summary = [...document.querySelectorAll('summary')].find(item => item.textContent.includes('audit'));
    if (!summary) throw new Error('Histórico RF não encontrado');
    const details = summary.closest('details');
    if (details && !details.open) summary.click();
  });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button =>
    button.getAttribute('onclick')?.includes('openRfMovementEditor')), { timeout: 5000 });
}

async function openEditor(page, id, mode) {
  await page.evaluate(({ id, mode }) => {
    const button = [...document.querySelectorAll('button')].find(item =>
      item.getAttribute('onclick')?.includes('openRfMovementEditor') &&
      item.getAttribute('onclick')?.includes(id) &&
      item.getAttribute('onclick')?.includes(mode));
    if (!button) throw new Error(`Botão ${mode} não encontrado para ${id}`);
    button.click();
  }, { id, mode });
  await page.waitForSelector('.rf-event-editor', { state: 'visible', timeout: 5000 });
}

async function ctaState(page) {
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll('.rf-event-editor button')].find(b => b.textContent.includes('Confirmar resgate'));
    return { exists: !!btn, disabled: !btn || btn.disabled };
  });
}

async function saldoAposValue(page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('.rf-movement-balance div')].find(d => d.textContent.includes('Saldo após'));
    if (!el) return null;
    const text = el.textContent.replace('Saldo após:', '').replace('R$', '').replace(/\s/g, '').trim();
    if (text === '—' || text === '') return null;
    const normalized = text.replace(/\./g, '').replace(',', '.');
    const value = parseFloat(normalized);
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  });
}

for (const viewport of viewports) {
  test(`RF P0 redemption UX smoke - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    if (!executablePath) return;

    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.width <= 430,
      hasTouch: viewport.width <= 430,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => requestFailures.push(`${request.url()} :: ${request.failure()?.errorText || 'unknown'}`));

    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('ativos'));
      await page.waitForFunction(() => document.querySelector('[onclick="setAssetsInnerTab(\'renda-fixa\')"]') !== null, { timeout: 5000 });
      await page.locator('[onclick="setAssetsInnerTab(\'renda-fixa\')"]').click();
      await expandLedger(page);

      const before = await page.evaluate(() => {
        const asset = S.assets.filter(isRendaFixaAsset)
          .filter(item => Number(rfPrincipalBalance(item).value) > 1)
          .sort((a, b) => Number(rfPrincipalBalance(b).value) - Number(rfPrincipalBalance(a).value))[0];
        if (!asset) throw new Error('Nenhum ativo RF com saldo elegível em S.assets');
        const id = rfAssetEventId(asset);
        return {
          id,
          ticker: asset.ticker,
          saldo: Number(rfPrincipalBalance(asset).value),
          applied: Number(asset.rf_applied_value || 0),
          rfEventsCount: (S.rfEvents || []).length,
        };
      });

      // CASO 1: resgate parcial válido -> CTA habilitado, saldo após correto, salva
      await openEditor(page, before.id, 'resgate_parcial');
      assert.equal(await page.locator('.rf-event-editor').count(), 1);
      let state = await ctaState(page);
      assert.equal(state.disabled, true, 'CTA deve iniciar desabilitado sem principal');
      assert.equal(await page.locator('.rf-movement-summary').count(), 1, 'resumo inline deve estar visível no modo resgate');
      assert.ok(await page.getByText('Resumo do resgate', { exact: false }).first().isVisible(), 'título do resumo deve existir');

      const redemption = Math.min(1000, before.saldo - 1);
      assert.ok(redemption > 0 && redemption < before.saldo, 'valor de resgate parcial deve ser válido');
      const principalInput = page.locator('.rf-event-editor input[aria-label="Valor do principal movimentado"]');
      await principalInput.fill(redemption.toFixed(2).replace('.', ','));
      await principalInput.press('Tab');
      await page.waitForFunction(() => {
        const btn = [...document.querySelectorAll('.rf-event-editor button')].find(b => b.textContent.includes('Confirmar resgate'));
        return btn && !btn.disabled;
      }, { timeout: 5000 });

      const expectedAfter1 = round2(before.saldo - redemption);
      const saldoApos1 = await saldoAposValue(page);
      assert.equal(saldoApos1, expectedAfter1, 'saldo após deve refletir o resgate parcial');
      assert.ok(await page.getByText('Principal a resgatar', { exact: false }).first().isVisible(), 'label contextual deve ser Principal a resgatar');

      await page.locator('.rf-event-editor button').filter({ hasText: 'Confirmar resgate' }).click();
      await page.waitForFunction(() => !document.querySelector('.rf-event-editor'), { timeout: 5000 });
      let events = await page.evaluate(id => S.rfEvents || [], before.id);
      assert.equal(events.length, before.rfEventsCount + 1, 'resgate parcial deve gravar exatamente um evento');
      const partialEvent = events.find(e => e.assetId === before.id && e.type === 'resgate_parcial');
      assert.ok(partialEvent, 'resgate parcial deve gravar evento');
      assert.equal(partialEvent.principalDelta, -redemption);
      const appliedAfter1 = await page.evaluate(id => Number((S.assets.find(a => rfAssetEventId(a) === id) || {}).rf_applied_value || 0), before.id);
      assert.equal(appliedAfter1, expectedAfter1, 'rf_applied_value deve reduzir após o resgate parcial');

      // CASO 2: resgate parcial acima do saldo -> erro inline, CTA desabilitado, nada gravado
      await expandLedger(page);
      await openEditor(page, before.id, 'resgate_parcial');
      const currentSaldo = expectedAfter1;
      const overValue = currentSaldo + 50000;
      const principalInput2 = page.locator('.rf-event-editor input[aria-label="Valor do principal movimentado"]');
      await principalInput2.fill(overValue.toFixed(2).replace('.', ','));
      await principalInput2.press('Tab');
      await page.waitForSelector('.rf-field-error', { state: 'visible', timeout: 5000 });

      const errorText = await page.locator('.rf-field-error').textContent();
      assert.match(errorText, /Valor maior que o saldo disponível/, 'erro inline de saldo insuficiente deve aparecer');
      const describedby = await principalInput2.getAttribute('aria-describedby');
      assert.ok(describedby && describedby.endsWith('-principal-error'), 'aria-describedby deve apontar para o erro');
      const inputClass = await principalInput2.getAttribute('class');
      assert.match(inputClass || '', /rf-input-error/, 'campo deve receber estado de erro');
      assert.equal(await saldoAposValue(page), null, 'saldo após não pode exibir valor falso (R$ 0,00)');
      state = await ctaState(page);
      assert.equal(state.disabled, true, 'CTA deve permanecer desabilitado com valor acima do saldo');

      const eventsBeforeInvalid = await page.evaluate(() => (S.rfEvents || []).length);
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('.rf-event-editor button')].find(b => b.textContent.includes('Confirmar resgate'));
        if (btn) btn.click();
      });
      await page.waitForTimeout(120);
      const eventsAfterInvalid = await page.evaluate(() => (S.rfEvents || []).length);
      assert.equal(eventsAfterInvalid, eventsBeforeInvalid, 'CTA desabilitado não pode gravar nada');
      assert.equal(await page.locator('.rf-event-editor').count(), 1, 'editor deve permanecer aberto');

      await page.locator('.rf-event-editor button').filter({ hasText: 'Cancelar' }).click();
      await page.waitForFunction(() => !document.querySelector('.rf-event-editor'), { timeout: 5000 });

      // CASO 3: resgate total -> principal automático/readonly, saldo após zero, confirma e zera
      await expandLedger(page);
      await openEditor(page, before.id, 'resgate_parcial');
      await page.locator('.rf-event-editor select').selectOption('resgate_total');
      await page.waitForFunction(() => {
        const input = document.querySelector('.rf-event-editor input[aria-label="Valor do principal movimentado"]');
        return input && input.readOnly;
      }, { timeout: 5000 });

      const expectedPrincipal = currentSaldo.toFixed(2).replace('.', ',');
      assert.equal(await principalInput.inputValue(), expectedPrincipal, 'principal automático deve ser o saldo');
      assert.ok(await page.locator('.rf-event-editor input[aria-label="Valor do principal movimentado"][readonly]').count() === 1, 'principal deve ser readonly no resgate total');
      assert.equal(await saldoAposValue(page), 0, 'saldo após do resgate total deve ser zero');
      assert.ok(await page.getByText('Este resgate zera o principal aplicado deste título.').first().isVisible(), 'hint de zeragem deve aparecer');

      await page.evaluate(() => { window.confirm = () => true; });
      state = await ctaState(page);
      assert.equal(state.disabled, false, 'CTA do resgate total deve estar habilitado com saldo maior que zero');
      await page.locator('.rf-event-editor button').filter({ hasText: 'Confirmar resgate' }).click();
      await page.waitForFunction(() => !document.querySelector('.rf-event-editor'), { timeout: 5000 });
      events = await page.evaluate(() => S.rfEvents || []);
      const totalEvent = events.find(e => e.assetId === before.id && e.type === 'resgate_total');
      assert.ok(totalEvent, 'resgate total deve gravar evento resgate_total');
      const appliedAfterTotal = await page.evaluate(id => Number((S.assets.find(a => rfAssetEventId(a) === id) || {}).rf_applied_value || 0), before.id);
      assert.equal(appliedAfterTotal, 0, 'saldo do título deve zerar após resgate total');
      await expandLedger(page);
      await page.waitForFunction(() => {
        const badge = [...document.querySelectorAll('.rf-event-badge.zero')].find(b => b.textContent.includes('Saldo zerado'));
        return !!badge;
      }, { timeout: 5000 });
      assert.equal(await page.locator('.rf-event-badge.zero').filter({ hasText: 'Saldo zerado' }).count(), 1, 'badge Saldo zerado deve aparecer para título zerado');

      // CASO 4 (somente mobile 390x844): touch targets >=44px, sem overflow, resumo legível
      if (viewport.width === 390) {
        await expandLedger(page);
        await openEditor(page, before.id, 'resgate_parcial');
        assert.equal(await page.locator('.rf-movement-summary').count(), 1);
        const metrics = await page.evaluate(() => {
          const heightOf = el => Math.round(el.getBoundingClientRect().height);
          const buttons = [...document.querySelectorAll('.rf-event-editor .btn, .rf-event-actions .btn')];
          const fields = [...document.querySelectorAll('.rf-event-editor input, .rf-event-editor select')];
          return {
            buttons: buttons.map(b => ({ text: (b.textContent || '').trim(), height: heightOf(b) })),
            fields: fields.map(f => ({ text: f.getAttribute('aria-label') || 'campo', height: heightOf(f) })),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        for (const button of metrics.buttons) {
          assert.ok(button.height >= 44, `botão "${button.text}" tem altura ${button.height}px (mínimo 44px)`);
        }
        for (const field of metrics.fields) {
          assert.ok(field.height >= 44, `campo "${field.text}" tem altura ${field.height}px (mínimo 44px)`);
        }
        assert.ok(metrics.overflow <= 0, `overflow horizontal proibido no 390px (encontrado ${metrics.overflow}px)`);
      }

      assert.equal(consoleErrors.length, 0, consoleErrors.join(' | '));
      assert.equal(pageErrors.length, 0, pageErrors.join(' | '));
      assert.equal(requestFailures.length, 0, requestFailures.join(' | '));
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
