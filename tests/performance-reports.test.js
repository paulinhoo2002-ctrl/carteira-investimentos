const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function readIndexHtml() {
  return fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
}

function extractSnippet(startMarker, endMarker) {
  const html = readIndexHtml();
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Start marker not found: ${startMarker}`);
  assert.notEqual(end, -1, `End marker not found: ${endMarker}`);
  return html.slice(start, end);
}

function makeReportsHarness() {
  const counters = {
    portfolio: 0,
    income: 0,
    fixed: 0,
    audit: 0
  };

  const context = {
    S: {
      assets: [{ id: 'a1' }, { id: 'a2' }],
      aportes: [{ id: 'ap1', date: '2026-01-10' }],
      proventos: [{ id: 'pr1', date: '2026-01-20' }]
    },
    cx() {
      counters.portfolio += 1;
      return { tC: 1000, tI: 800, tG: 200 };
    },
    passiveIncomeGoalStats() {
      counters.income += 1;
      return { monthlyAvg: 80, byMonth: [] };
    },
    rfIntelligenceSnapshot() {
      counters.fixed += 1;
      return { assets: [] };
    },
    dataAuditSnapshot() {
      counters.audit += 1;
      return { alerts: [] };
    },
    reportsDateAllowed() {
      return true;
    },
    reportsPeriod() {
      return 'all';
    },
    reportsPeriodLabel() {
      return 'Todos';
    },
    Date
  };

  const bundle = extractSnippet('let renderCycleReportCache=null;', 'function reportNumber(value){');
  const exported = vm.runInNewContext(`${bundle}\n({ reportsSnapshot, withRenderCycleReportCache })`, context);
  return { ...exported, context, counters };
}

test('reportsSnapshot reutiliza o mesmo snapshot apenas dentro do ciclo atual de render', () => {
  const harness = makeReportsHarness();

  const result = harness.withRenderCycleReportCache(() => {
    const first = harness.reportsSnapshot();
    const second = harness.reportsSnapshot();
    return { first, second };
  });

  assert.equal(result.first, result.second);
  assert.equal(harness.counters.portfolio, 1);
  assert.equal(harness.counters.income, 1);
  assert.equal(harness.counters.fixed, 1);
  assert.equal(harness.counters.audit, 1);
  assert.equal(result.first.proventosCount, 1);
  assert.equal(result.first.aportesCount, 1);
});

test('reportsSnapshot recalcula no render seguinte e reflete dados novos sem cache obsoleto', () => {
  const harness = makeReportsHarness();

  const first = harness.withRenderCycleReportCache(() => harness.reportsSnapshot());
  harness.context.S.proventos.push({ id: 'pr2', date: '2026-02-20' });
  harness.context.S.aportes.push({ id: 'ap2', date: '2026-02-10' });

  const second = harness.withRenderCycleReportCache(() => harness.reportsSnapshot());

  assert.equal(first.proventosCount, 1);
  assert.equal(second.proventosCount, 2);
  assert.equal(first.aportesCount, 1);
  assert.equal(second.aportesCount, 2);
  assert.equal(harness.counters.portfolio, 2);
  assert.equal(harness.counters.income, 2);
  assert.equal(harness.counters.fixed, 2);
  assert.equal(harness.counters.audit, 2);
});
