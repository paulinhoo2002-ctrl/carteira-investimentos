const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const DQ = require('../data-quality-remediation.js');

test('model exposes explicit remediation states and never writes', () => {
  assert.deepEqual(DQ.STATES, ['OPEN', 'NEEDS_REVIEW', 'BLOCKED_BY_MISSING_DATA', 'RESOLVABLE', 'INFORMATIONAL', 'RESOLVED']);
  const model = DQ.build({ xpStatus: 'FIXTURE_REQUIRED', btgStatus: 'FIXTURE_REQUIRED', corporateEventsMode: 'SHADOW_READ_ONLY', fixedIncomeManualAuthority: true });
  assert.equal(model.writeCount, 0);
  assert.equal(model.summary.open, 2);
  assert.equal(model.summary.informational, 2);
  assert.equal(model.issues.some((item) => item.dataState === 'FIXTURE_REQUIRED'), true);
});

test('deduplication keeps the most severe deterministic record', () => {
  const items = DQ.dedupeIssues([
    DQ.issue({ key: 'A', severity: 'INFO', state: 'INFORMATIONAL', domain: 'POSITIONS' }),
    DQ.issue({ key: 'A', severity: 'CRITICAL', state: 'NEEDS_REVIEW', domain: 'POSITIONS' }),
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].severity, 'CRITICAL');
});

test('unknown, partial and needs review stay distinct', () => {
  const model = DQ.build({
    assets: [{ ticker: 'PETR4', qty: null }],
    transactions: [{ ticker: 'PETR4', type: 'SELL', proceeds: 100 }],
  });
  const states = model.issues.map((item) => item.dataState);
  assert.equal(states.includes('UNKNOWN'), true);
  assert.equal(states.includes('NEEDS_REVIEW'), true);
  assert.equal(states.includes('UNKNOWN') && states.includes('NEEDS_REVIEW'), true);
  assert.equal(model.issues.every((item) => item.message && !/R\$\s*0,00/.test(item.message)), true);
});

test('root causes group across domains and navigation remains safe', () => {
  const model = DQ.build({
    legacyIssues: [
      { category: 'Dividendos', severity: 'warning', entityType: 'Provento', entityLabel: 'PETR4', field: 'currency', message: 'Moeda ausente' },
      { category: 'Movimentações', severity: 'warning', entityType: 'Movimentação', entityLabel: 'PETR4', field: 'date', message: 'Data ausente' },
    ],
    xpStatus: 'FIXTURE_REQUIRED',
    btgStatus: 'FIXTURE_REQUIRED',
  });
  const importGroup = model.rootCauses.find((group) => group.rootCause === 'IMPORT_FIXTURE_REQUIRED');
  assert.equal(importGroup.count, 2);
  assert.equal(model.byDomain.INCOME, 1);
  assert.equal(model.byDomain.TRANSACTIONS, 1);
  assert.equal(model.issues.every((item) => item.financialWriteRequired === false && item.safeNavigation === true), true);
});

test('legacy UI loads remediation module and renders its contract', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const moduleSource = fs.readFileSync(path.join(__dirname, '..', 'data-quality-remediation.js'), 'utf8');
  assert.match(html, /data-quality-remediation\.js/);
  assert.match(html, /Centro de remediação/);
  assert.match(html, /NEEDS_REVIEW/);
  assert.match(html, /BLOCKED_BY_MISSING_DATA/);
  assert.match(html, /data-quality-remediation-center/);
  assert.doesNotMatch(moduleSource, /setItem\(|setDoc\(|updateDoc\(|addDoc\(|deleteDoc\(|fetch\(|XMLHttpRequest/);
});
