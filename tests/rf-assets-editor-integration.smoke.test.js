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

for (const viewport of viewports) {
  test(`Editor RF abre a partir de Ativos · ${viewport.label}`, async () => {
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
      await page.waitForFunction(() => document.querySelector('[onclick="setAssetsInnerTab(\'patrimonio\')"]') !== null, { timeout: 5000 });

      const before = await page.evaluate(() => {
        const asset = S.assets.filter(isRendaFixaAsset).find(item => Number(rfPrincipalBalance(item).value) > 0);
        if (!asset) throw new Error('Nenhum ativo RF elegível em S.assets');
        const id = rfAssetEventId(asset);
        return {
          id,
          ticker: rfAssetEventTicker(asset),
          balance: rfPrincipalBalance(asset).value,
          applied: Number(asset.rf_applied_value || 0),
          liquid: Number(asset.rf_liquid_value || asset.fixed_current_value || asset.current_price || 0),
          gross: Number(asset.rf_gross_value || asset.fixed_gross_value || 0),
          rfEventsLength: (S.rfEvents || []).length,
          domId: rfMovementEditorDomId(asset),
        };
      });

      const openGroup = async () => {
        await page.evaluate(() => {
          const details = [...document.querySelectorAll('details.ag')].find(item =>
            (item.getAttribute('data-asset-group') || '').toLowerCase().includes('renda'));
          if (!details) throw new Error('Grupo Renda Fixa não encontrado em Ativos');
          if (!details.open) details.querySelector('summary').click();
        });
        await page.waitForFunction(id => [...document.querySelectorAll('button')].some(button =>
          button.getAttribute('onclick')?.includes('openRfMovementEditor') &&
          button.getAttribute('onclick')?.includes(id) &&
          button.getAttribute('onclick')?.includes('"aporte"')), before.id, { timeout: 5000 });
      };

      const clickEditorButton = async (id, mode) => {
        await page.evaluate(([assetId, modeArg]) => {
          const button = [...document.querySelectorAll('button')].find(item =>
            item.getAttribute('onclick')?.includes('openRfMovementEditor') &&
            item.getAttribute('onclick')?.includes(assetId) &&
            item.getAttribute('onclick')?.includes(`"${modeArg}"`));
          if (!button) throw new Error(`Botão de movimentação não encontrado para ${assetId} (${modeArg})`);
          button.click();
        }, [id, mode]);
      };

      const editorVisible = async () => {
        await page.waitForSelector('.rf-event-editor', { state: 'visible', timeout: 5000 });
      };
      const editorGone = async () => {
        await page.waitForSelector('.rf-event-editor', { state: 'detached', timeout: 5000 });
      };
      const snapshotState = async () => page.evaluate(id => {
        const asset = S.assets.find(item => rfAssetEventId(item) === id);
        return {
          rfMovementEditor: S.rfMovementEditor,
          rfEventsLength: (S.rfEvents || []).length,
          applied: Number(asset?.rf_applied_value || 0),
          liquid: Number(asset?.rf_liquid_value || asset?.fixed_current_value || asset?.current_price || 0),
          gross: Number(asset?.rf_gross_value || asset?.fixed_gross_value || 0),
        };
      }, before.id);

      await openGroup();

      // 1. Abre o editor pelo botão real "Movimentar" em Ativos → Patrimônio
      await clickEditorButton(before.id, 'aporte');
      await editorVisible();
      assert.equal(await page.locator('.rf-event-editor').count(), 1, 'Deve existir apenas um editor RF');
      assert.equal(await page.locator('.note-overlay[role="dialog"][aria-modal="true"]').count(), 1, 'Editor deve estar em modal role=dialog');
      assert.equal(await page.locator('[aria-label="Tipo de movimentação"]').inputValue(), 'aporte');
      const badge = await page.$eval('.rf-event-editor .rf-panel-badge', el => el.textContent.trim());
      assert.ok(badge.includes(before.ticker), `Badge deveria conter o ticker ${before.ticker}`);
      const balanceText = await page.$eval('.rf-movement-balance', el => el.textContent);
      assert.match(balanceText, /Saldo atual/);
      assert.match(balanceText, /Saldo após/);
      await page.waitForFunction(id => document.activeElement?.id === `${id}-date`, before.domId, { timeout: 3000 });

      // 2. Sem overflow horizontal com o modal aberto
      const overflowOpen = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflowOpen <= 1, `Overflow horizontal com modal aberto: ${overflowOpen}px`);

      // 3. Cancelar fecha e preserva dados
      await page.locator('.rf-event-editor button', { hasText: 'Cancelar' }).click();
      await editorGone();
      assert.equal(await page.locator('.note-overlay[role="dialog"]').count(), 0, 'Modal deve fechar após cancelar');
      const stateAfterCancel = await snapshotState();
      assert.equal(stateAfterCancel.rfMovementEditor, null);
      assert.equal(stateAfterCancel.rfEventsLength, before.rfEventsLength);
      assert.equal(stateAfterCancel.applied, before.applied);
      assert.equal(stateAfterCancel.liquid, before.liquid);
      assert.equal(stateAfterCancel.gross, before.gross);
      assert.ok(await page.locator('.asset-inner-tabs').isVisible(), 'Deve permanecer na tela Ativos');

      // 4. Resgatar abre com modo resgate_parcial
      await clickEditorButton(before.id, 'resgate_parcial');
      await editorVisible();
      assert.equal(await page.locator('.rf-event-editor').count(), 1);
      assert.equal(await page.locator('[aria-label="Tipo de movimentação"]').inputValue(), 'resgate_parcial');
      const principalBefore = await page.$eval('.rf-event-editor input[aria-label="Valor do principal movimentado"]', el => el.readOnly);
      assert.equal(principalBefore, false, 'Resgate parcial não deve ser readonly');

      // 5. Resgate total deixa o principal readonly e preenchido com o saldo
      await page.selectOption('[aria-label="Tipo de movimentação"]', 'resgate_total');
      await editorVisible();
      assert.equal(await page.locator('[aria-label="Tipo de movimentação"]').inputValue(), 'resgate_total');
      const principalTotal = await page.$eval('.rf-event-editor input[aria-label="Valor do principal movimentado"]', el => ({ readOnly: el.readOnly, value: el.value }));
      assert.equal(principalTotal.readOnly, true, 'Resgate total deve travar o principal');
      const expectedTotal = before.balance.toFixed(2).replace('.', ',');
      assert.equal(principalTotal.value, expectedTotal, 'Principal do resgate total deve ser igual ao saldo');

      // 6. Touch targets do editor (não fatal)
      const targets = await page.$$eval('.rf-event-editor button, .note-head button', els =>
        els.map(el => { const r = el.getBoundingClientRect(); return { text: el.textContent.trim(), width: r.width, height: r.height }; }));
      for (const t of targets) {
        if (t.width < 44 || t.height < 44) console.warn(`Touch target "${t.text}" small: ${t.width}x${t.height}`);
      }

      // 7. Fecha via botão Fechar do cabeçalho do modal
      await page.locator('.note-head button', { hasText: 'Fechar' }).click();
      await editorGone();
      const stateAfterHeadClose = await snapshotState();
      assert.equal(stateAfterHeadClose.rfMovementEditor, null);
      assert.equal(stateAfterHeadClose.rfEventsLength, before.rfEventsLength);

      // 8. Clique no overlay também fecha
      await clickEditorButton(before.id, 'aporte');
      await editorVisible();
      await page.mouse.click(5, 5);
      await editorGone();
      const stateAfterOverlay = await snapshotState();
      assert.equal(stateAfterOverlay.rfMovementEditor, null);
      assert.equal(stateAfterOverlay.applied, before.applied);
      assert.equal(stateAfterOverlay.rfEventsLength, before.rfEventsLength);

      // 9. Digitar valor no principal e cancelar preserva tudo
      await clickEditorButton(before.id, 'aporte');
      await editorVisible();
      await page.fill('.rf-event-editor input[aria-label="Valor do principal movimentado"]', '1234,56');
      await page.locator('.rf-event-editor input[aria-label="Valor do principal movimentado"]').press('Tab');
      const draftAfterTyping = await page.evaluate(() => S.rfMovementEditor?.draft?.principalDelta || '');
      assert.equal(draftAfterTyping, '1234,56', 'Draft do principal deveria ser atualizado após o Tab');
      await page.locator('.rf-event-editor button', { hasText: 'Cancelar' }).click();
      await editorGone();
      const stateAfterDraft = await snapshotState();
      assert.equal(stateAfterDraft.rfMovementEditor, null);
      assert.equal(stateAfterDraft.applied, before.applied);
      assert.equal(stateAfterDraft.liquid, before.liquid);
      assert.equal(stateAfterDraft.rfEventsLength, before.rfEventsLength);

      assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join(' | ')}`);
      assert.equal(pageErrors.length, 0, `page errors: ${pageErrors.join(' | ')}`);
      assert.equal(requestFailures.length, 0, `request failures: ${requestFailures.join(' | ')}`);
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
