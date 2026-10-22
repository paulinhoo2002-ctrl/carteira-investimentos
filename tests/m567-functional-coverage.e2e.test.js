// M567 — Cobertura funcional E2E sintética das ações reais ainda não cobertas
// pela suite (v317 cobre compra/venda/provento/RF/importação).
// Este arquivo cobre: editar/salvar/cancelar ativo (edA/svA/clA), excluir e
// editar lançamentos (rmP/rmD/deleteMovementLaunch/edP/svP), metas reais
// (mp-head-target/mpr-head-monthly/alloc goal), configurações (tema/ocultar
// valores), IRPF (steps + export CSV), relatórios (período) e filtros
// (aportes/ativos/dividendos). Isolamento: carteira sintética M567, zero
// escritas externas (rotas não-locais bloqueadas), localStorage preservado.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.join(__dirname, '..');
// M568: browsers em npm test no CI rodam ANTES da etapa "Resolve Chromium" do workflow —
// resolver por env, depois paths conhecidos (Windows local, Linux CI); sem browser, skip
// graceful em vez de travar o runner com servidores HTTP vazados.
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
];
const CHROME = process.env.CHROME_PATH || CHROME_CANDIDATES.find(p => fs.existsSync(p)) || CHROME_CANDIDATES[0];
const BROWSER_AVAILABLE = Boolean(process.env.CHROME_PATH) || fs.existsSync(CHROME);
const it = BROWSER_AVAILABLE ? test : test.skip;

async function openApp() {
  const harness = await startLocalHttpServer(ROOT);
  let browser;
  try {
    browser = await chromium.launch({ executablePath: CHROME, headless: true });
  } catch (error) {
    await new Promise(resolve => harness.server.close(resolve));
    throw error;
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  const outboundRequests = [];
  const localOrigin = new URL(harness.url).origin;
  page.on('pageerror', error => outboundRequests.push({ type: 'pageerror', message: error.message }));
  await page.route('**/*', async route => {
    const request = route.request();
    if (new URL(request.url()).origin === localOrigin) return route.continue();
    outboundRequests.push({ type: 'blocked-request', method: request.method(), url: request.url() });
    return route.abort();
  });
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && Array.isArray(S.aportes) && typeof go === 'function');
  await page.evaluate(() => {
    restoreLocalTestData();
    fetchQuotes = async () => {};
    scheduleAutoProventosGratis = () => {};
    const active = activeWallet();
    const testWallet = { ...active, id: 'M567_QA_WALLET', name: 'Carteira sintética M567', assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals };
    const primaryWallet = { id: 'M567_QA_PRIMARY', name: 'Carteira principal sintética', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} };
    S.wallets = [primaryWallet, testWallet];
    S.activeWalletId = testWallet.id;
    window.__m567Confirms = [];
    window.__m567ConfirmNext = true;
    window.confirm = message => { window.__m567Confirms.push(String(message)); return window.__m567ConfirmNext; };
    window.__m567Alerts = [];
    window.alert = message => { window.__m567Alerts.push(String(message)); };
  });
  return { browser, context, page, harness, outboundRequests };
}

async function closeApp(app) {
  await app.context.close();
  await app.browser.close();
  await new Promise(resolve => app.harness.server.close(resolve));
}

function assertNoOutboundWrites(outboundRequests) {
  const writes = outboundRequests.filter(request =>
    request.type === 'blocked-request' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  );
  assert.deepEqual(writes, [], 'nenhuma escrita deve sair do navegador isolado');
}

async function storageSnapshot(page) {
  return page.evaluate(() => ({ civ5: localStorage.getItem('civ5'), cfg: localStorage.getItem('civ5_cfg') }));
}

function seedAsset() {
  return { id: 'M567_ASSET1', ticker: 'M567QA', name: 'M567 QA Ação', type: 'Ação', sector: 'Bancos', avg_price: 10, current_price: 11, dy: 0, price_target: 0, qty: 5 };
}

it('M567 editar ativo salva preço médio, DY e alvo com uma única persistência', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(asset => { S.assets.push(asset); go('ativos'); }, seedAsset());
    const before = await storageSnapshot(app.page);
    await app.page.evaluate(() => { window.__m567SaveCalls = 0; const original = window.save; window.save = function (...args) { window.__m567SaveCalls += 1; return original.apply(this, args); }; });
    await app.page.evaluate(() => edA('M567_ASSET1'));
    await app.page.locator('.note-overlay[aria-label="Editar ativo"]').waitFor({ state: 'visible', timeout: 5000 });
    await app.page.locator('#f-ap').fill('12,5');
    await app.page.locator('#f-dy').fill('1.25');
    await app.page.locator('#f-pt').fill('45.5');
    await app.page.locator('.note-overlay[aria-label="Editar ativo"] button.btn.bsv').click();
    await app.page.locator('.note-overlay[aria-label="Editar ativo"]').waitFor({ state: 'detached' });
    const edited = await app.page.evaluate(() => {
      const a = S.assets.find(x => x.id === 'M567_ASSET1');
      return { avg: Number(a.avg_price), dy: Number(a.dy), pt: Number(a.price_target), cur: Number(a.current_price), ticker: a.ticker, type: a.type };
    });
    assert.deepEqual(edited, { avg: 12.5, dy: 1.25, pt: 45.5, cur: 11, ticker: 'M567QA', type: 'Ação' });
    assert.equal(await app.page.evaluate(() => window.__m567SaveCalls), 1, 'edição confirmada persiste uma única vez');
    assert.deepEqual(await storageSnapshot(app.page), before, 'sessão QA não deve tocar o armazenamento persistido');
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 cancelar edição de ativo preserva valores originais', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(asset => { S.assets.push(asset); go('ativos'); }, seedAsset());
    await app.page.evaluate(() => edA('M567_ASSET1'));
    await app.page.locator('.note-overlay[aria-label="Editar ativo"]').waitFor({ state: 'visible', timeout: 5000 });
    await app.page.locator('#f-ap').fill('999');
    await app.page.locator('.note-overlay[aria-label="Editar ativo"] button.btn.bgh').first().click();
    await app.page.locator('.note-overlay[aria-label="Editar ativo"]').waitFor({ state: 'detached' });
    const unchanged = await app.page.evaluate(() => {
      const a = S.assets.find(x => x.id === 'M567_ASSET1');
      return { avg: Number(a.avg_price), dy: Number(a.dy), pt: Number(a.price_target) };
    });
    assert.deepEqual(unchanged, { avg: 10, dy: 0, pt: 0 });
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 excluir operação exige confirmação e remove apenas o alvo', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => {
      S.aportes.push({ id: 'M567_OP1', date: '10/09/2026', ticker: 'M567QA', qty: 2, price: 10, operation: 'compra' });
      S.aportes.push({ id: 'M567_OP2', date: '11/09/2026', ticker: 'M567QA', qty: 3, price: 11, operation: 'compra' });
    });
    const before = await app.page.evaluate(() => S.aportes.length);
    await app.page.evaluate(() => { window.__m567ConfirmNext = false; rmP('M567_OP1'); });
    assert.equal(await app.page.evaluate(() => S.aportes.some(x => x.id === 'M567_OP1')), true, 'confirmação negada deve manter a operação');
    await app.page.evaluate(() => { window.__m567ConfirmNext = true; rmP('M567_OP1'); });
    const after = await app.page.evaluate(() => ({ len: S.aportes.length, op1: S.aportes.some(x => x.id === 'M567_OP1'), op2: S.aportes.some(x => x.id === 'M567_OP2') }));
    assert.equal(after.len, before - 1);
    assert.equal(after.op1, false);
    assert.equal(after.op2, true);
    const confirms = await app.page.evaluate(() => window.__m567Confirms);
    assert.equal(confirms.length, 2, 'cada exclusão exige confirmação');
    assert.match(confirms[0], /Remover esta operação\?/);
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 excluir provento exige confirmação e persiste apenas quando confirmado', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => {
      S.proventos.push({ id: 'M567_PR1', date: '10/09/2026', ticker: 'M567QA', value: 5.2, type: 'Dividendo' });
    });
    const before = await app.page.evaluate(() => S.proventos.length);
    await app.page.evaluate(() => { window.__m567ConfirmNext = false; rmD('M567_PR1'); });
    assert.equal(await app.page.evaluate(() => S.proventos.some(x => x.id === 'M567_PR1')), true, 'confirmação negada deve manter o provento');
    await app.page.evaluate(() => { window.__m567SaveCalls = 0; const original = window.save; window.save = function (...args) { window.__m567SaveCalls += 1; return original.apply(this, args); }; window.__m567ConfirmNext = true; rmD('M567_PR1'); });
    const after = await app.page.evaluate(() => ({ len: S.proventos.length, present: S.proventos.some(x => x.id === 'M567_PR1'), saves: window.__m567SaveCalls }));
    assert.equal(after.len, before - 1);
    assert.equal(after.present, false);
    assert.equal(after.saves, 1, 'provento excluído deve persistir uma única vez');
    const confirms = await app.page.evaluate(() => window.__m567Confirms);
    assert.match(confirms[confirms.length - 1], /Remover este provento\?/);
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 excluir lançamento (extrato) exige confirmação para aporte e provento', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => {
      S.aportes.push({ id: 'M567_OP4', date: '12/09/2026', ticker: 'M567QA', qty: 1, price: 9, operation: 'compra' });
      S.proventos.push({ id: 'M567_PR3', date: '12/09/2026', ticker: 'M567QA', value: 1.5, type: 'JCP' });
    });
    const before = await app.page.evaluate(() => ({ aportes: S.aportes.length, proventos: S.proventos.length }));
    await app.page.evaluate(() => { window.__m567ConfirmNext = false; deleteMovementLaunch('M567_OP4', 'aporte'); deleteMovementLaunch('M567_PR3', 'provento'); });
    assert.deepEqual(await app.page.evaluate(() => ({ aportes: S.aportes.length, proventos: S.proventos.length })), before, 'confirmações negadas não alteram nada');
    await app.page.evaluate(() => { window.__m567ConfirmNext = true; deleteMovementLaunch('M567_OP4', 'aporte'); deleteMovementLaunch('M567_PR3', 'provento'); });
    const after = await app.page.evaluate(() => ({ aportes: S.aportes.length, proventos: S.proventos.length }));
    assert.equal(after.aportes, before.aportes - 1);
    assert.equal(after.proventos, before.proventos - 1);
    const confirms = await app.page.evaluate(() => window.__m567Confirms);
    confirms.slice(-2).forEach(message => assert.match(message, /Deseja excluir este lançamento\?/));
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 editar lançamento atualiza quantidade e preço com validação de erro', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => {
      S.aportes.push({ id: 'M567_OP3', date: '10/09/2026', ticker: 'M567QA', qty: 2, price: 10, operation: 'compra' });
      go('aportes');
    });
    const before = await app.page.evaluate(() => S.aportes.find(x => x.id === 'M567_OP3'));
    await app.page.evaluate(() => edP('M567_OP3'));
    await app.page.locator('#p-qt').waitFor({ state: 'visible', timeout: 5000 });
    await app.page.waitForTimeout(120); // edP agenda applyMetaToAporte em 50ms
    // erro: quantidade vazia deve manter o formulário aberto com alerta
    await app.page.locator('#p-qt').fill('');
    await app.page.locator('.ap-form-actions button.btn.bsv').click();
    await app.page.waitForTimeout(100);
    assert.equal(await app.page.evaluate(() => S.aportes.find(x => x.id === 'M567_OP3').qty), before.qty, ' salvamento inválido não altera o lançamento');
    const alerts = await app.page.evaluate(() => window.__m567Alerts);
    assert.ok(alerts.some(m => /Preencha Ativo\/Ticker, Quantidade e Preço/.test(m)), `deve alertar campos obrigatórios: ${JSON.stringify(alerts)}`);
    // sucesso: editar quantidade e preço
    await app.page.locator('#p-qt').fill('3');
    await app.page.locator('#p-pr').fill('77,77');
    await app.page.locator('.ap-form-actions button.btn.bsv').click();
    await app.page.locator('#p-qt').waitFor({ state: 'detached' });
    const edited = await app.page.evaluate(() => {
      const a = S.aportes.find(x => x.id === 'M567_OP3');
      return { qty: Number(a.qty), price: Number(a.price), operation: a.operation, ticker: a.ticker };
    });
    assert.deepEqual(edited, { qty: 3, price: 77.77, operation: 'compra', ticker: 'M567QA' });
    // cancelar edição preserva valores
    await app.page.evaluate(() => edP('M567_OP3'));
    await app.page.locator('#p-qt').waitFor({ state: 'visible', timeout: 5000 });
    await app.page.locator('#p-pr').fill('1');
    await app.page.locator('.ap-form-actions button.btn.bgh').click();
    await app.page.locator('#p-qt').waitFor({ state: 'detached' });
    assert.equal(await app.page.evaluate(() => Number(S.aportes.find(x => x.id === 'M567_OP3').price)), 77.77, 'cancelar não aplica alterações');
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 meta de patrimônio salva alvo pelo input do cabeçalho e permite remover', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => { go('metas'); document.querySelectorAll('details').forEach(d => { d.open = true; }); });
    await app.page.locator('#mp-head-target').waitFor({ state: 'visible', timeout: 5000 });
    await app.page.evaluate(() => { window.__m567SaveCalls = 0; const original = window.save; window.save = function (...args) { window.__m567SaveCalls += 1; return original.apply(this, args); }; });
    await app.page.locator('#mp-head-target').fill('500000');
    await app.page.locator('#mp-head-target').press('Enter');
    await app.page.waitForFunction(() => Number(S.goals?.patrimonio?.target) === 500000);
    assert.ok(await app.page.evaluate(() => window.__m567SaveCalls >= 1), 'salvar meta persiste');
    // remover meta zera o alvo
    await app.page.locator('#mp-head-target').fill('');
    await app.page.locator('#mp-head-target').press('Enter');
    await app.page.waitForFunction(() => Number(S.goals?.patrimonio?.target) === 0);
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 meta de renda passiva salva mensalidade e sincroniza divGoal', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => { go('metas'); document.querySelectorAll('details').forEach(d => { d.open = true; }); });
    await app.page.locator('#mpr-head-monthly').waitFor({ state: 'visible', timeout: 5000 });
    await app.page.locator('#mpr-head-monthly').fill('3000');
    await app.page.locator('#mpr-head-monthly').press('Enter');
    await app.page.waitForFunction(() => Number(S.goals?.proventos?.monthly) === 3000);
    const synced = await app.page.evaluate(() => ({ monthly: Number(S.goals.proventos.monthly), divGoal: Number(S.divGoal) }));
    assert.deepEqual(synced, { monthly: 3000, divGoal: 3000 });
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 toggle de tipos de provento da meta alterna estado sem escritas', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => { go('metas'); });
    const before = await app.page.evaluate(() => [...((S.goals?.proventos?.types) || [])].sort());
    await app.page.evaluate(() => toggleMetaProventoType('FII'));
    const afterToggle = await app.page.evaluate(() => [...((S.goals?.proventos?.types) || [])].sort());
    const had = before.includes('FII');
    assert.equal(afterToggle.includes('FII'), !had, 'toggle deve alternar a presença do tipo');
    await app.page.evaluate(() => toggleMetaProventoType('FII'));
    const restored = await app.page.evaluate(() => [...((S.goals?.proventos?.types) || [])].sort());
    assert.deepEqual(restored, before, 'segundo toggle restaura o estado');
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 modal de distribuição da carteira (meta de alocação) abre e fecha', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => { go('metas'); openAllocationGoal(); });
    await app.page.locator('.note-overlay[aria-label="Distribuição da carteira"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await app.page.evaluate(() => S.allocGoalOpen), true);
    await app.page.evaluate(() => closeAllocationGoal());
    await app.page.locator('.note-overlay[aria-label="Distribuição da carteira"]').waitFor({ state: 'detached' });
    assert.equal(await app.page.evaluate(() => S.allocGoalOpen), false);
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 tema alterna claro/escuro e ocultar valores não vaza valores monetários', async () => {
  const app = await openApp();
  try {
    const before = await storageSnapshot(app.page);
    const themeBefore = await app.page.evaluate(() => document.documentElement.dataset.theme);
    await app.page.evaluate(() => toggleTheme());
    const themeAfter = await app.page.evaluate(() => document.documentElement.dataset.theme);
    assert.notEqual(themeAfter, themeBefore, 'toggle deve alternar o tema');
    assert.ok(['light', 'dark'].includes(themeAfter));
    await app.page.evaluate(() => toggleTheme());
    assert.equal(await app.page.evaluate(() => document.documentElement.dataset.theme), themeBefore, 'segundo toggle restaura');

    const visibleBefore = await app.page.evaluate(() => (document.body.innerText.match(/R\$\s*\d/g) || []).length);
    assert.ok(visibleBefore > 0, 'com valores visíveis deve haver moeda renderizada na fixture');
    await app.page.evaluate(() => toggleHideValues());
    const hidden = await app.page.evaluate(() => ({
      text: (document.body.innerText.match(/R\$\s*\d/g) || []).length,
      attrs: [...document.querySelectorAll('[aria-label],[title]')].filter(el => /R\$\s*\d/.test(`${el.getAttribute('aria-label')||''} ${el.getAttribute('title')||''}`)).length,
      flag: S.hideValues,
    }));
    assert.equal(hidden.flag, true);
    assert.equal(hidden.text, 0, 'ocultar valores remove moeda do texto visível');
    assert.equal(hidden.attrs, 0, 'ocultar valores não pode vazar em aria-label/title');
    await app.page.evaluate(() => toggleHideValues());
    assert.equal(await app.page.evaluate(() => S.hideValues), false);
    assert.deepEqual(await storageSnapshot(app.page), before, 'preferências de tema/ocultar não persistem fora da sessão QA');
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 IRPF navega etapas com clamp e exporta CSV do ano-base', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => { go('irpf'); });
    await app.page.waitForFunction(() => S.tab === 'irpf');
    await app.page.evaluate(() => setIrpfStep(2));
    assert.equal(await app.page.evaluate(() => S.irpfStep), 2);
    await app.page.evaluate(() => setIrpfStep(99));
    assert.equal(await app.page.evaluate(() => S.irpfStep), 4, 'etapa máxima é 4');
    await app.page.evaluate(() => setIrpfStep(0));
    assert.equal(await app.page.evaluate(() => S.irpfStep), 1, 'etapa mínima é 1');
    const captured = await app.page.evaluate(() => {
      window.__m567Csv = null;
      const original = irpfDownloadText;
      irpfDownloadText = (name, content) => { window.__m567Csv = { name, content }; };
      irpfExportCSV();
      irpfDownloadText = original;
      return window.__m567Csv;
    });
    assert.ok(captured, 'exportação deve produzir um arquivo');
    assert.match(captured.name, /carteira-irpf-\d{4}-\d{2}-\d{2}-ano-base-\d{4}\.csv/);
    assert.ok(captured.content.length > 10, 'CSV deve ter conteúdo');
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 exportação de relatórios abre painel e dispara export sintético sem dados reais', async () => {
  const app = await openApp();
  try {
    const before = await storageSnapshot(app.page);
    await app.page.evaluate(() => { go('relatorios'); });
    await app.page.waitForFunction(() => S.tab === 'relatorios');
    await app.page.locator('.reports-export-cta').click();
    await app.page.locator('#reports-export-details').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await app.page.evaluate(() => document.getElementById('reports-export-details').open), true, 'CTA Exportar deve abrir o painel');
    const captured = await app.page.evaluate(() => {
      window.__m567Exports = [];
      const wrap = name => (...args) => { window.__m567Exports.push({ name, args: args.map(String) }); };
      exportReportCSV = wrap('csv');
      exportReportJSON = wrap('json');
      const buttons = [...document.querySelectorAll('.reports-export-grid button')];
      const csvBtn = buttons.find(b => /Exportar CSV/.test(b.textContent));
      const jsonBtn = buttons.find(b => /Exportar JSON/.test(b.textContent));
      if (csvBtn) csvBtn.click();
      if (jsonBtn) jsonBtn.click();
      return { total: buttons.length, clicked: [csvBtn, jsonBtn].filter(Boolean).length };
    });
    assert.ok(captured.total > 0, 'painel de exportação deve oferecer relatórios');
    assert.ok(captured.clicked > 0, 'deve haver botão de exportação clicável');
    const exports = await app.page.evaluate(() => window.__m567Exports);
    assert.ok(exports.length >= 1, 'exportação sintética deve disparar sem dados reais');
    assert.ok(exports.every(e => e.name === 'csv' || e.name === 'json'));
    assert.deepEqual(await storageSnapshot(app.page), before, 'exportação sintética não persiste nada');
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M579 relatórios exportam CSV e JSON com conteúdo sintético e sem escrita externa', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(asset => { S.assets.push(asset); go('relatorios'); }, seedAsset());
    const before = await storageSnapshot(app.page);
    const exports = await app.page.evaluate(() => {
      const captured = [];
      const original = downloadTextFile;
      downloadTextFile = (name, content, mime) => captured.push({ name, content, mime });
      try {
        exportReportCSV('assets');
        exportReportJSON('assets');
      } finally { downloadTextFile = original; }
      return captured;
    });
    assert.equal(exports.length, 2);
    assert.match(exports[0].name, /\.csv$/);
    assert.match(exports[0].content, /M567QA/);
    assert.match(exports[1].name, /\.json$/);
    assert.ok(JSON.parse(exports[1].content).rows.some(row => JSON.stringify(row).includes('M567QA')));
    assert.deepEqual(await storageSnapshot(app.page), before);
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});

it('M567 período de relatórios e filtros mudam estado sem erros de página', async () => {
  const app = await openApp();
  try {
    await app.page.evaluate(() => { go('relatorios'); });
    await app.page.waitForFunction(() => S.tab === 'relatorios');
    const periods = await app.page.evaluate(() => {
      const out = {};
      ['year', 'all', 'xx'].forEach(v => { setReportsPeriod(v); out[v] = S.reportsPeriod; });
      return out;
    });
    assert.equal(periods.year, 'year');
    assert.equal(periods.all, 'all');
    assert.equal(periods.xx, '12m', 'período inválido cai em 12m');

    await app.page.evaluate(() => { go('aportes'); });
    const aportesFilter = await app.page.evaluate(() => {
      const out = {};
      ['venda', 'x'].forEach(v => { setAportesFilter(v); out[v] = S.aportesFilter; });
      setAportesSort('value-desc');
      out.sort = S.aportesSort;
      return out;
    });
    assert.equal(aportesFilter.venda, 'venda');
    assert.equal(aportesFilter.x, 'todos', 'filtro inválido cai em todos');
    assert.equal(aportesFilter.sort, 'value-desc');

    await app.page.evaluate(() => { go('dividendos'); });
    const yearFilter = await app.page.evaluate(() => {
      const out = {};
      ['2026', 'xx'].forEach(v => { setDividendYearFilter(v); out[v] = S.dividendYearFilter; });
      return out;
    });
    assert.equal(yearFilter['2026'], '2026');
    assert.equal(yearFilter.xx, 'all', 'ano inválido cai em all');

    await app.page.evaluate(() => { go('ativos'); });
    const classFilter = await app.page.evaluate(() => {
      const classes = [...new Set((S.assets || []).map(a => String(a?.assetClass || a?.class || a?.category || a?.type || '').trim()).filter(Boolean))];
      const sample = classes[0] || 'all';
      setAssetsClassFilter(sample);
      const applied = S.assetsClassFilter;
      setAssetsClassFilter('zzz-invalid');
      return { sample, applied, invalid: S.assetsClassFilter };
    });
    assert.equal(classFilter.applied, classFilter.sample);
    assert.equal(classFilter.invalid, 'all', 'classe inválida cai em all');

    const pageErrors = app.outboundRequests.filter(r => r.type === 'pageerror');
    assert.deepEqual(pageErrors, [], 'navegação e filtros não podem gerar page errors');
    assertNoOutboundWrites(app.outboundRequests);
  } finally { await closeApp(app); }
});
