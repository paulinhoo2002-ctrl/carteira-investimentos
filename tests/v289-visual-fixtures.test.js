const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { V289_VISUAL_SCENARIOS, makeV289VisualFixture, applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');
const { startLocalHttpServer } = require('./local-http-server');

const required = [
  'baseline', 'no-data', 'unknown', 'partial', 'stale', 'valid-zero',
  'long-label-large-value', 'return-pair-mismatch', 'history-gap',
  'allocation-unknown', 'priority-zero', 'priority-one', 'priority-many',
  'dense-reliability',
];

test('all V289 scenarios exist and contain JSON-cloneable synthetic identities', () => {
  for (const name of required) {
    assert.ok(V289_VISUAL_SCENARIOS.includes(name), `missing scenario ${name}`);
    const fixture = makeV289VisualFixture(name);
    assert.deepEqual(JSON.parse(JSON.stringify(fixture)), fixture);
    assert.match(fixture.wallet.id, /^QA_/);
    assert.equal(fixture.wallet.name, 'Conta sintética');
    for (const collection of ['assets', 'aportes', 'proventos', 'rfEvents']) {
      for (const row of fixture[collection]) {
        assert.match(row.id, /^QA_/);
        if (row.ticker) assert.match(row.ticker, /^QA[A-Z0-9]*$/);
      }
    }
    assert.doesNotMatch(JSON.stringify(fixture), /Paulo|PETR4|BBAS3|R\$ 82\.460/i);
  }
});

test('unknown, partial, stale and valid zero remain separate fixture states', () => {
  assert.equal(makeV289VisualFixture('unknown').visual.valueState, 'UNKNOWN');
  assert.equal(makeV289VisualFixture('partial').visual.valueState, 'PARTIAL');
  assert.equal(makeV289VisualFixture('stale').visual.valueState, 'STALE');
  const zero = makeV289VisualFixture('valid-zero');
  assert.equal(zero.visual.valueState, 'AVAILABLE');
  assert.equal(zero.assets[0].current_price, 0);
  assert.equal(makeV289VisualFixture('no-data').assets.length, 0);
});

test('visual cases preserve explicit mismatch, gaps, allocation uncertainty and priority cardinality', () => {
  assert.equal(makeV289VisualFixture('return-pair-mismatch').visual.returnPair.sameBasis, false);
  assert.ok(makeV289VisualFixture('history-gap').visual.history.some(point => point.value === null));
  assert.equal(makeV289VisualFixture('allocation-unknown').visual.allocationState, 'UNKNOWN');
  assert.equal(makeV289VisualFixture('priority-zero').visual.priorities.length, 0);
  assert.equal(makeV289VisualFixture('priority-one').visual.priorities.length, 1);
  assert.ok(makeV289VisualFixture('priority-many').visual.priorities.length > 1);
});

test('scenario edits cannot mutate baseline or another scenario', () => {
  const baselineBefore = makeV289VisualFixture('baseline');
  const one = makeV289VisualFixture('priority-one');
  const many = makeV289VisualFixture('priority-many');
  one.goals.proventos.monthly = 1;
  one.visual.priorities.push({ id: 'QA_EXTRA' });
  many.assets[0].name = 'Alterado apenas no teste';
  many.visual.history[0].value = -1;
  assert.deepEqual(makeV289VisualFixture('baseline'), baselineBefore);
  assert.equal(makeV289VisualFixture('priority-one').visual.priorities.length, 1);
  assert.equal(makeV289VisualFixture('priority-one').goals.proventos.monthly, 1200);
  assert.notEqual(makeV289VisualFixture('priority-many').assets[0].name, 'Alterado apenas no teste');
  assert.notEqual(makeV289VisualFixture('priority-many').visual.history[0].value, -1);
});

test('fixture rejects non-local or non-test browser before evaluating page code', async () => {
  for (const url of ['https://example.com/index.html?testMode=1', 'http://127.0.0.1/index.html']) {
    let evaluated = false;
    const page = { url: () => url, evaluate: async () => { evaluated = true; } };
    await assert.rejects(applyV289VisualFixture(page, 'baseline'), /local test mode/i);
    assert.equal(evaluated, false);
  }
});

test('fixture seeds only memory and aliases static account label across render', async () => {
  const { chromium } = require('playwright-core');
  const server = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(server.url, { waitUntil: 'domcontentloaded' });
    const before = await page.evaluate(() => JSON.stringify(localStorage));
    await applyV289VisualFixture(page, 'baseline');
    const after = await page.evaluate(() => ({ storage: JSON.stringify(localStorage), assets: S.assets.map(a => a.ticker), wallet: S.wallets[0].name }));
    assert.equal(after.storage, before);
    assert.deepEqual(after.assets, makeV289VisualFixture('baseline').assets.map(a => a.ticker));
    assert.equal(after.wallet, 'Conta sintética');
    await page.evaluate(() => render());
    assert.match(await page.locator('.side-brand-sub').innerText(), /Conta sintética/);
    assert.doesNotMatch(await page.locator('.side-brand-sub').innerText(), /Paulo/);
  } finally {
    await browser.close();
    server.server.close();
  }
});
