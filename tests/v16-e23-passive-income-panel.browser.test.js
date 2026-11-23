'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures.js');

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => {
    try { fs.accessSync(candidate); return true; } catch { return false; }
  });
}

test('E2.3 passive income panel stays readable and isolated across required viewports', async () => {
  const executablePath = resolveBrowser();
  assert.ok(executablePath, 'Chrome/Edge not found');
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const expectedHost = new URL(harness.url).hostname;
  const browser = await chromium.launch({ executablePath, headless: true });
  const pageErrors = [];
  const productionFirebaseRequests = [];
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS[0] });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
      if (/firestore\.googleapis\.com|firebaseio\.com|identitytoolkit\.googleapis\.com/i.test(request.url())) {
        productionFirebaseRequests.push(request.url());
      }
    });
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    await applyV289VisualFixture(page, 'baseline');
    await page.evaluate(() => window.go('dashboard'));
    await page.waitForFunction(() => S.tab === 'dashboard');
    await page.locator('[data-testid="dashboard-passive-income"]').waitFor();

    const runtime = await page.evaluate(() => ({
      host: location.hostname,
      contractLoaded: typeof PassiveIncomeReadContract?.readPassiveIncomeContract === 'function',
      readModelLoaded: typeof PassiveIncomeUnifiedReadModel?.buildPassiveIncomeReadModel === 'function',
      testMode: document.documentElement.dataset.testMode === 'true' || new URLSearchParams(location.search).get('testMode') === '1',
      noFirebaseApp: typeof FB === 'undefined' || FB.app === null,
      noFirestore: typeof FB === 'undefined' || FB.db === null,
    }));
    assert.deepEqual(pageErrors, [], 'browser scripts must load without runtime errors');
    assert.equal(runtime.contractLoaded, true, 'E2.2 read contract must load before dashboard rendering');
    assert.equal(runtime.readModelLoaded, true, 'E2.2 read model must load before dashboard rendering');

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      const metrics = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="dashboard-passive-income"]');
        const cards = panel?.querySelectorAll('[role="listitem"]') || [];
        const textClip = [...(panel?.querySelectorAll('*') || [])].some(element => {
          const style = getComputedStyle(element);
          const clips = ['hidden', 'clip'].includes(style.overflowX) || ['hidden', 'clip'].includes(style.overflowY);
          return clips && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1);
        });
        return {
          panelPresent: !!panel,
          cardCount: cards.length,
          documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          panelOverflow: panel ? panel.scrollWidth > panel.clientWidth + 1 : true,
          textClip,
          headings: panel ? panel.querySelectorAll('h2').length : 0,
          received: panel?.textContent.includes('Recebido no mês'),
          estimated: panel?.textContent.includes('Renda projetada / mês'),
          goal: panel?.textContent.includes('Meta mensal'),
          progress: panel?.textContent.includes('Progresso da meta'),
          nonFiniteValues: /\b(?:NaN|Infinity|-Infinity)\b/.test(panel?.textContent || ''),
        };
      });

      assert.equal(metrics.panelPresent, true, `${viewport.width}px: panel present`);
      assert.equal(metrics.cardCount, 4, `${viewport.width}px: four separate indicators`);
      assert.equal(metrics.documentOverflow, false, `${viewport.width}px: no horizontal document overflow`);
      assert.equal(metrics.panelOverflow, false, `${viewport.width}px: no panel overflow`);
      assert.equal(metrics.textClip, false, `${viewport.width}px: no clipped panel text`);
      assert.equal(metrics.headings, 1, `${viewport.width}px: semantic panel heading`);
      assert.equal(metrics.received && metrics.estimated && metrics.goal && metrics.progress, true, `${viewport.width}px: all indicators present`);
      assert.equal(metrics.nonFiniteValues, false, `${viewport.width}px: no NaN/Infinity in panel text`);
    }

    assert.equal(runtime.host, expectedHost);
    assert.equal(runtime.testMode, true);
    assert.equal(runtime.noFirebaseApp, true, 'synthetic UI test must not initialize a hosted Firebase app');
    assert.equal(runtime.noFirestore, true, 'synthetic UI test must not initialize Firestore');
    assert.deepEqual(productionFirebaseRequests, []);
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => harness.server.close(resolve));
  }
});

test('E2.3 renders confirmed PAID, ESTIMATE, configured goal, and valid progress separately', async () => {
  const executablePath = resolveBrowser();
  assert.ok(executablePath, 'Chrome/Edge not found');
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath, headless: true });
  const pageErrors = [];
  const firebaseRequests = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
      if (/firestore\.googleapis\.com|firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com/i.test(request.url())) {
        firebaseRequests.push(request.url());
      }
    });
    await page.goto(harness.url, { waitUntil: 'networkidle' });
    await applyV289VisualFixture(page, 'baseline');
    await page.evaluate(() => {
      const now = new Date();
      const monthKeys = Array.from({ length: 12 }, (_, index) => {
        const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 11 + index, 1));
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      });
      const currentMonthKey = monthKeys[monthKeys.length - 1];
      const income = {
        target: 100,
        currentMonthKey,
        currentMonthCoverage: 'COMPLETE',
        currentMonthTotal: 40,
        monthlyAverageStatus: 'COMPLETE',
        monthlyAvg: 40,
        completeMonthCount: 12,
        percent: 40,
        missing: 60,
        monthKeys,
      };
      S.assets = [{ ticker: 'QAAA3', type: 'Ação', qty: 10, current_price: 120, dy: 5 }];
      S.goals.proventos = { types: ['Ação'], monthly: 100 };
      const container = document.createElement('div');
      container.innerHTML = dashboardPassiveIncomePanel({ income });
      document.body.appendChild(container);
    });

    const panel = page.locator('[data-testid="dashboard-passive-income"]').last();
    const result = await panel.evaluate(element => {
      const card = label => [...element.querySelectorAll('[role="listitem"]')]
        .find(item => item.querySelector('.premium-metric-label')?.textContent.trim() === label);
      const value = label => card(label)?.querySelector('.premium-metric-value')?.textContent.trim().replace(/\s+/g, ' ');
      return {
        received: { state: card('Recebido no mês')?.dataset.state, value: value('Recebido no mês') },
        estimate: { state: card('Renda projetada / mês')?.dataset.state, value: value('Renda projetada / mês') },
        goal: { state: card('Meta mensal')?.dataset.state, value: value('Meta mensal') },
        progress: { state: card('Progresso da meta')?.dataset.state, value: value('Progresso da meta') },
        hasCombinedTotal: /Total combinado|combinedIncome/i.test(element.textContent),
        nonFiniteValues: /\b(?:NaN|Infinity|-Infinity)\b/.test(element.textContent),
        documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        panelOverflow: element.scrollWidth > element.clientWidth + 1,
      };
    });

    assert.deepEqual(result.received, { state: 'PAID', value: 'R$ 40,00' });
    assert.deepEqual(result.estimate, { state: 'ESTIMATE', value: 'R$ 5,00' });
    assert.deepEqual(result.goal, { state: 'CONFIGURED', value: 'R$ 100,00' });
    assert.deepEqual(result.progress, { state: 'AVAILABLE', value: '40,0%' });
    assert.equal(result.hasCombinedTotal, false);
    assert.equal(result.nonFiniteValues, false);
    assert.equal(result.documentOverflow, false);
    assert.equal(result.panelOverflow, false);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(firebaseRequests, []);
  } finally {
    await browser.close();
    await new Promise(resolve => harness.server.close(resolve));
  }
});
