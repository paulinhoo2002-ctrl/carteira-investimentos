'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const root = path.join(__dirname, '..');
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const viewports = [390, 430, 768, 1024, 1280, 1366, 1440, 1920];

function syntheticNote(changed = false) {
  const quantities = changed ? [2] : [1, 94, 1, 211];
  return {
    broker: 'Corretora Sintética', noteNumber: 'QA-330-01', tradeDate: '2026-10-01', settlementDate: '2026-10-03',
    operations: quantities.map((quantity, index) => ({
      ticker: 'SYN1', side: 'SELL', quantity, unitPrice: '12,50', grossValue: (quantity * 12.5).toFixed(2),
      market: 'À vista', executionSequence: index + 1,
    })),
    fees: {}, irrf: {},
  };
}

test('V330 preview stays readable, accessible, responsive and read-only in isolated synthetic browser', async () => {
  const harness = await startLocalHttpServer(root);
  let browser;
  let context;
  const consoleErrors = [];
  const pageErrors = [];
  const firebaseRequests = [];
  const screenshotDir = path.join(root, '.qa-state', `v330-browser-${Date.now()}`);
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const axePath = require.resolve('axe-core/axe.min.js');
    for (const width of viewports) {
      context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, isMobile: width <= 430, hasTouch: width <= 430 });
      const page = await context.newPage();
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('request', request => {
        if (/firebaseio\.com|firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com/i.test(request.url())) firebaseRequests.push(request.url());
      });
      await page.addInitScript(() => {
        window.__V330_STORAGE_WRITES__ = [];
        window.__V330_FINANCIAL_AT_BOOT__ = localStorage.getItem('civ5');
        const originalSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (this === localStorage) window.__V330_STORAGE_WRITES__.push(String(key));
          return originalSet.call(this, key, value);
        };
      });
      await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__LOCAL_TEST_MODE__ === true && typeof BrokerageProfessional?.buildNotePreview === 'function' && typeof S !== 'undefined');
      if (width === 390) {
        const parsedNote = await page.evaluate(async () => {
          const source = [
            'NOTA DE CORRETAGEM', 'INTER DTVM LTDA.', 'Nr. nota 999',
            'Data do pregão 01/10/2026', 'Data de liquidação 03/10/2026',
            'NEGÓCIOS REALIZADOS', 'Bovespa C VIS TSTX1 Synthetic ETF 1 10,00 10,00 D',
            'Taxa de liquidação 0,42', 'Emolumentos 0,18',
            'Taxa de transferência de ativos 0,00', 'Líquido da nota 10,60',
          ].join('\n');
          const original = window.extractBrokerNotePdfText;
          window.extractBrokerNotePdfText = async () => source;
          try {
            const result = await importCenterParsePdf({ name: 'nota-sintetica.pdf', arrayBuffer: async () => new ArrayBuffer(0) });
            const financials = result.parsed.v330Preview.noteFinancials;
            return {
              status: result.status,
              rawCount: result.parsed.v330Preview.rawExecutions.length,
              settlementDate: financials.settlementDate,
              fees: financials.fees.components,
              feeStatus: financials.fees.status,
              netSettlementCents: financials.netSettlementCents,
              irrfStatus: financials.irrf.status,
              missingBrokerage: financials.fees.components.brokerage,
            };
          } finally {
            window.extractBrokerNotePdfText = original;
          }
        });
        assert.equal(parsedNote.status, 'READY_FOR_REVIEW');
        assert.equal(parsedNote.rawCount, 1);
        assert.equal(parsedNote.settlementDate, '2026-10-03');
        assert.equal(parsedNote.fees.settlement, 42);
        assert.equal(parsedNote.fees.emoluments, 18);
        assert.equal(parsedNote.fees.transfer, 0);
        assert.equal(parsedNote.feeStatus, 'PARTIAL');
        assert.equal(parsedNote.netSettlementCents, 1060);
        assert.equal(parsedNote.irrfStatus, 'UNKNOWN');
        assert.equal(parsedNote.missingBrokerage, null);
      }
      await page.evaluate(() => {
        const makeNote = changed => {
          const quantities = changed ? [2] : [1, 94, 1, 211];
          return { broker:'Corretora Sintética',noteNumber:'QA-330-01',tradeDate:'2026-10-01',settlementDate:'2026-10-03',operations:quantities.map((quantity,index)=>({ticker:'SYN1',side:'SELL',quantity,unitPrice:'12,50',grossValue:(quantity*12.5).toFixed(2),market:'À vista',executionSequence:index+1})),fees:{},irrf:{}};
        };
        const note = makeNote(false);
        const preview = BrokerageProfessional.buildNotePreview(note,{sourceId:'synthetic:QA-330-01'});
        window.__V330_BASE_NOTE__ = preview.note;
        S.importCenterSession={files:[{name:'nota-sintetica.pdf',size:4096}],step:7,result:{status:'REVIEW_OPEN',fileName:'nota-sintetica.pdf',provider:'Corretora Sintética',sourceType:'BROKERAGE_NOTE_PDF',recordCount:4,notePreview:preview,writeCount:0},pendingReview:true,history:[]};
        S.tab='importacao';
        render();
      });
      const preview = page.locator('.v330-note-preview');
      await preview.waitFor();
      assert.equal((await page.locator('.import-review-item').innerText()).trim(),'Revisão aberta');
      assert.match(await preview.innerText(), /Resumo da nota/);
      assert.match(await preview.innerText(), /Não informado/);
      assert.match(await preview.innerText(), /Resultado realizado: Não calculado/);
      const layout = await preview.evaluate(node => ({ left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth }));
      assert.ok(layout.left >= 0 && layout.right <= width, `preview clipped at ${width}px: ${JSON.stringify(layout)}`);
      assert.ok(layout.scrollWidth <= layout.viewportWidth, `horizontal overflow at ${width}px: ${JSON.stringify(layout)}`);
      const summary = preview.locator('details > summary').first();
      await summary.click();
      assert.equal(await preview.locator('details').first().evaluate(node => node.open), true);
      assert.match(await preview.innerText(), /94 × R\$[\s\u00a0]12,50/);
      if ([390, 1366].includes(width)) {
        await fs.promises.mkdir(screenshotDir, { recursive: true });
        await page.addStyleTag({ content:'.hdr,#investBottomNav{visibility:hidden!important}' });
        await preview.screenshot({ path:path.join(screenshotDir,`preview-${width}-expanded.png`) });
        await page.addScriptTag({ path:axePath });
        const axe = await page.evaluate(async () => window.axe.run(document.querySelector('.v330-note-preview'), { runOnly: { type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa'] } }));
        assert.deepEqual(axe.violations.map(item => ({ id:item.id,targets:item.nodes.map(node => node.target) })), [], `V330 axe violations at ${width}px`);
      }
      const storage = await page.evaluate(() => ({ writes:window.__V330_STORAGE_WRITES__, financialAtBoot:window.__V330_FINANCIAL_AT_BOOT__, financialNow:localStorage.getItem('civ5') }));
      assert.deepEqual(storage.writes.filter(key => key !== 'civ5_edit_lock'), [], `unexpected localStorage writes at ${width}px: ${storage.writes}`);
      assert.equal(storage.financialNow, storage.financialAtBoot, `financial localStorage changed at ${width}px`);
      await context.close(); context = null;
    }

    for (const scenario of ['duplicate','conflict']) {
      context = await browser.newContext({ viewport:{width:390,height:844},isMobile:true,hasTouch:true });
      const page = await context.newPage();
      page.on('console', message => { if(message.type()==='error') consoleErrors.push(message.text()); });
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('request', request => {
        if (/firebaseio\.com|firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com/i.test(request.url())) firebaseRequests.push(request.url());
      });
      await page.addInitScript(() => {
        window.__V330_STORAGE_WRITES__ = [];
        window.__V330_FINANCIAL_AT_BOOT__ = localStorage.getItem('civ5');
        const originalSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (this === localStorage) window.__V330_STORAGE_WRITES__.push(String(key));
          return originalSet.call(this, key, value);
        };
      });
      await page.goto(harness.url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(() => window.__LOCAL_TEST_MODE__ === true && typeof BrokerageProfessional?.buildNotePreview === 'function');
      await page.evaluate(scenario => {
        const changed = scenario==='conflict';
        const quantities=changed?[2]:[1,94,1,211];
        const note={broker:'Corretora Sintética',noteNumber:'QA-330-01',tradeDate:'2026-10-01',settlementDate:'2026-10-03',operations:quantities.map((quantity,index)=>({ticker:'SYN1',side:'SELL',quantity,unitPrice:'12,50',grossValue:(quantity*12.5).toFixed(2),market:'À vista',executionSequence:index+1})),fees:{},irrf:{}};
        const original={broker:'Corretora Sintética',noteNumber:'QA-330-01',tradeDate:'2026-10-01',settlementDate:'2026-10-03',operations:[1,94,1,211].map((quantity,index)=>({ticker:'SYN1',side:'SELL',quantity,unitPrice:'12,50',grossValue:(quantity*12.5).toFixed(2),market:'À vista',executionSequence:index+1})),fees:{},irrf:{}};
        const prior=BrokerageProfessional.buildNotePreview(original,{sourceId:'synthetic:QA-330-01'}).note;
        const preview=BrokerageProfessional.buildNotePreview(note,{sourceId:'synthetic:QA-330-01'},[prior]);
        S.importCenterSession={files:[{name:'nota-sintetica.pdf',size:4096}],step:7,result:{status:'REVIEW_OPEN',fileName:'nota-sintetica.pdf',provider:'Corretora Sintética',sourceType:'BROKERAGE_NOTE_PDF',recordCount:preview.rawExecutions.length,notePreview:preview,writeCount:0},pendingReview:true,history:[]};
        S.tab='importacao';render();
      },scenario);
      await page.locator('.v330-note-preview').waitFor();
      const text=await page.locator('.v330-note-preview').innerText();
      assert.match(text,scenario==='duplicate'?/Esta nota já foi processada/:/A nota tem a mesma identidade, mas conteúdo diferente/);
      assert.match(text,scenario==='duplicate'?/Nota já processada\nSim/:/Nota já processada\nNão/);
      const storage=await page.evaluate(()=>({writes:window.__V330_STORAGE_WRITES__,financialAtBoot:window.__V330_FINANCIAL_AT_BOOT__,financialNow:localStorage.getItem('civ5')}));
      assert.deepEqual(storage.writes.filter(key=>key!=='civ5_edit_lock'),[],`${scenario} preview wrote localStorage: ${storage.writes}`);
      assert.equal(storage.financialNow,storage.financialAtBoot,`${scenario} preview changed financial localStorage`);
      await fs.promises.mkdir(screenshotDir,{recursive:true});
      await page.addStyleTag({ content:'.hdr,#investBottomNav{visibility:hidden!important}' });
      await page.locator('.v330-note-preview').screenshot({path:path.join(screenshotDir,`${scenario}-390.png`)});
      await context.close();context=null;
    }
    assert.deepEqual(pageErrors,[],'V330 browser page errors');
    assert.deepEqual(consoleErrors,[],'V330 browser console errors');
    assert.deepEqual(firebaseRequests,[],'V330 synthetic browser requested Firebase');
    console.log(`V330 browser screenshots: ${screenshotDir}`);
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    harness.server.closeAllConnections();
    harness.server.close();
  }
});

test('brokerage confirmation button follows V330 readiness in synthetic browser', async () => {
  const harness = await startLocalHttpServer(root);
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LOCAL_TEST_MODE__ === true && typeof brokerNoteImportModal === 'function');
    const cases = await page.evaluate(() => {
      const raw = (quantity = 1) => ({
        broker: 'Corretora Sintética', noteNumber: 'QA-CONFIRM-01', tradeDate: '2026-10-01', settlementDate: '2026-10-03',
        operations: [{ ticker: 'TSTX1', side: 'BUY', quantity, unitPrice: '10,00', grossValue: (quantity * 10).toFixed(2), market: 'À vista', executionSequence: 1 }],
      });
      const full = raw();
      full.fees = { settlement: '0,00', emoluments: '0,00', transfer: '0,00', brokerage: '0,00', taxes: '0,00', other: '0,00' };
      full.irrf = { amount: '0,00', includedInSettlement: false, base: '0,00' };
      const ready = BrokerageProfessional.buildNotePreview(full, { sourceId: 'synthetic:ready' });
      const incomplete = BrokerageProfessional.buildNotePreview({ ...raw(), fees: {}, irrf: {} }, { sourceId: 'synthetic:review' });
      const original = BrokerageProfessional.buildNotePreview(full, { sourceId: 'synthetic:conflict' });
      const conflict = BrokerageProfessional.buildNotePreview({ ...full, operations: [{ ...full.operations[0], quantity: 2, grossValue: '20,00' }] }, { sourceId: 'synthetic:conflict' }, [original.note]);
      const parsed = { valid: true, noteNumber: 'QA-CONFIRM-01', tradeDate: '01/10/2026', broker: 'Corretora Sintética', rows: [{ ticker: 'TSTX1', qty: 1, price: 10, total: 10, operation: 'compra', include: true }], operationsTotal: 10, costs: 0, netTotal: 10, settlementFee: 0, emoluments: 0, transferFee: 0, warnings: [] };
      const render = preview => {
        S.aportes = [];
        S.brokerNoteImport = { open: true, status: 'ready', parsed, v330Preview: preview, fileName: 'nota-sintetica.pdf', rateCosts: false, allowDuplicate: false };
        const container = document.createElement('div');
        container.innerHTML = brokerNoteImportModal();
        const button = container.querySelector('button[onclick="confirmBrokerNoteImport()"]');
        return { disabled: button.disabled, explanation: container.querySelector('.broker-note-confirm-bar').innerText };
      };
      return { ready: render(ready), review: render(incomplete), conflict: render(conflict), states: [ready.status, incomplete.status, conflict.status] };
    });
    assert.deepEqual(cases.states, ['SOURCE_CONFIRMED', 'HUMAN_DATA_REQUIRED', 'SOURCE_CONFLICT']);
    assert.equal(cases.ready.disabled, false, 'ready note should expose confirmation');
    assert.equal(cases.review.disabled, true, 'human review must block confirmation');
    assert.match(cases.review.explanation, /Necessita revisão antes da confirmação/);
    assert.equal(cases.conflict.disabled, true, 'source conflict must block confirmation');
    assert.match(cases.conflict.explanation, /Necessita revisão antes da confirmação/);
  } finally {
    await browser?.close();
    harness.server.closeAllConnections();
    await new Promise(resolve => harness.server.close(resolve));
  }
});
