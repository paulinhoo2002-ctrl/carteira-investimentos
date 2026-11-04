'use strict';
/**
 * E2E Playwright: valida que os data-testid dos cards de métrica do dashboard
 * renderizam valores não-vazios após o bootstrap da aplicação com dados sintéticos.
 *
 * Seletores estáveis (gerados por dashboardMetricCard()):
 *  - data-testid="metric-patrimonio-atual"
 *  - data-testid="metric-recebido-no-mes"
 *  - data-testid="metric-resultado-da-posicao"
 *
 * Segue o padrão do projeto em tests/auth-access-browser.test.js:
 *  - sobe tests/local-http-server.js com --synthetic-qa
 *  - lança Chromium via require('playwright')
 *  - injeta ambiente de acesso REAL + S.assets sintético
 *  - navega para dashboard e renderiza
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PORT = Number(process.env.QA_METRICS_PORT || 4199);
const BASE = `http://127.0.0.1:${PORT}`;
let server, browser, context, page;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitReady() {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) })).ok) return;
    } catch (_) {}
    await sleep(500);
  }
  throw new Error('local QA server did not become ready');
}

async function freshPage() {
  if (context) await context.close();
  context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  page = await context.newPage();
  // Evita chamadas reais ao Firebase/hosted resources durante o teste sintético.
  await page.route('https://www.gstatic.com/firebasejs/10.12.5/firebase-*-compat.js', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  );
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof FB !== 'undefined' && typeof S !== 'undefined' && typeof render === 'function' && document.querySelector('#root'), { timeout: 8000 });
}

async function bootstrapRealWithAsset() {
  await page.evaluate(() => {
    FB.authResolved = true;
    FB.accountMode = 'REAL';
    FB.access = { loading: false, loaded: true, allowed: true, reason: '' };
    FB.user = { uid: 'qa-synthetic-owner', email: 'qa@synthetic.invalid', emailVerified: true };
    // Ativo com cotação atual -> gera patrimônio > 0 para metric-patrimonio-atual.
    S.assets = [
      { id: 'qa-asset-1', ticker: 'QAON3', type: 'Ação', qty: 10, avg_price: 10, current_price: 15.5 },
    ];
    S.wallets = [
      { id: 'qa-wallet', name: 'Carteira QA', assets: S.assets, aportes: [], proventos: [] },
    ];
    S.activeWalletId = 'qa-wallet';
    // Provento no mês corrente -> gera recebido-no-mes > 0.
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    S.proventos = [
      { id: 'qa-provento-1', ticker: 'QAON3', assetType: 'Ação', value: 28.90, date: `${monthKey}-15`, monthKey, status: 'RECEIVED', classifyIncomeState: () => 'PAID' },
    ];
  });
  await page.evaluate(() => { go('dashboard'); render(); });
}

before(async () => {
  server = spawn(process.execPath, [path.join(__dirname, 'local-http-server.js'), '--port', String(PORT), '--synthetic-qa'], { stdio: 'ignore' });
  server.unref();
  await waitReady();
  browser = await require('playwright').chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
});

after(async () => {
  if (browser) await browser.close().catch(() => {});
  if (context) await context.close().catch(() => {});
  if (server) {
    try { server.kill(); } catch (_) {}
    if (process.platform === 'win32' && server.pid) spawn('taskkill', ['/PID', String(server.pid), '/F', '/T'], { stdio: 'ignore' });
  }
});

test('metric data-testid render non-empty values on dashboard', async () => {
  await freshPage();
  await bootstrapRealWithAsset();

  // Espera os cards de métrica aparecerem no DOM.
  await page.waitForSelector('[data-testid="metric-patrimonio-atual"]', { timeout: 10000 });

  const patrimonio = await page.locator('[data-testid="metric-patrimonio-atual"]').innerText();
  const recebido = await page.locator('[data-testid="metric-recebido-no-mes"]').innerText();
  const posicao = await page.locator('[data-testid="metric-resultado-da-posicao"]').innerText();

  assert.ok(patrimonio.trim().length > 0, 'metric-patrimonio-atual deve renderizar valor');
  assert.ok(recebido.trim().length > 0, 'metric-recebido-no-mes deve renderizar valor');
  assert.ok(posicao.trim().length > 0, 'metric-resultado-da-posicao deve renderizar valor');

  // Patrimônio = 10 * 15.5 = 155,00 (fmt pt-BR -> 'R$ 155,00').
  assert.match(patrimonio, /155/, 'patrimônio deve refletir o ativo sintético');
  // Recebido no mês = 28,90 (fmt pt-BR -> 'R$ 28,90').
  assert.match(recebido, /28/, 'recebido no mês deve refletir o provento sintético');
});
