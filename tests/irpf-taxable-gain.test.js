// Regressão: "Ganhos tributáveis" do relatório IRPF não pode incluir o resultado isento.
// Dados 100% sintéticos (tickers SYN*). Valores esperados calculados à mão.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { startLocalHttpServer } = require('./local-http-server.js');

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  ].filter(Boolean).find(candidate => {
    try { fs.accessSync(candidate); return true; } catch { return false; }
  });
}

const aportes = [
  { id: 1, date: '2025-01-10', ticker: 'SYNA3', type: 'Ação', operation: 'compra', qty: 100, price: 10 },
  { id: 2, date: '2025-03-10', ticker: 'SYNA3', type: 'Ação', operation: 'compra', qty: 50, price: 12 },
  { id: 3, date: '2025-06-10', ticker: 'SYNA3', type: 'Ação', operation: 'venda', qty: 60, price: 20 }, // mês isento: ganho 560
  { id: 4, date: '2025-02-05', ticker: 'SYNB4', type: 'Ação', operation: 'compra', qty: 1000, price: 10 },
  { id: 5, date: '2025-07-15', ticker: 'SYNB4', type: 'Ação', operation: 'venda', qty: 1000, price: 25 }, // mês tributável: ganho 15000
  { id: 6, date: '2025-04-01', ticker: 'SYNF11', type: 'FII', operation: 'compra', qty: 10, price: 100 },
  { id: 7, date: '2025-08-20', ticker: 'SYNF11', type: 'FII', operation: 'venda', qty: 10, price: 120 }, // ganho 200
  { id: 8, date: '2025-02-01', ticker: 'SYNRF01', type: 'Renda Fixa', operation: 'compra', qty: 1, price: 1000 },
  { id: 9, date: '2025-10-01', ticker: 'SYNRF01', type: 'Renda Fixa', operation: 'venda', qty: 1, price: 1200 }, // ganho 200
];

test('IRPF: ganhos tributáveis excluem o resultado de vendas isentas', async () => {
  const executablePath = resolveBrowser();
  assert.ok(executablePath, 'Chrome/Edge não encontrado para o teste de regressão do IRPF');
  const { chromium } = require('playwright-core');
  const harness = await startLocalHttpServer(require('node:path').join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LOCAL_TEST_MODE__ === true && typeof irpfBuildYearReport === 'function');
    const totals = await page.evaluate(rows => {
      S.aportes = JSON.parse(JSON.stringify(rows));
      S.assets = []; S.proventos = []; S.rfEvents = [];
      return irpfBuildYearReport(2025).totals;
    }, aportes);
    assert.equal(totals.exemptGain, 560);
    assert.equal(totals.taxableGain, 15400); // 15000 (ações) + 200 (FII) + 200 (RF); sem os 560 isentos
    assert.equal(totals.tax, 2320); // 15000*15% + 200*20% + 200*15%
  } finally {
    await browser.close();
    harness.server.close();
  }
});
