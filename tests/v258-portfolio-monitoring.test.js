const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Monitoring = require('../portfolio-monitoring.js');

const issue = (overrides = {}) => ({
  id: overrides.id || overrides.key || 'ISSUE-1', key: overrides.key || overrides.id || 'ISSUE-1',
  rootCause: overrides.rootCause || 'MISSING_SOURCE_FIELD', domain: overrides.domain || 'INCOME',
  entityId: overrides.entityId || 'PETR4', entityLabel: overrides.entityLabel || 'PETR4', field: overrides.field || 'currency',
  severity: overrides.severity || 'WARNING', state: overrides.state || 'NEEDS_REVIEW', dataState: overrides.dataState || 'PARTIAL',
  coverage: overrides.coverage || 'PARTIAL', confidence: overrides.confidence || 'MEDIUM', source: overrides.source || 'v257',
  message: overrides.message || 'Moeda ausente', impact: overrides.impact || 'Interpretação parcial',
});
const current = (issues, extra = {}) => ({ issues, complete: extra.complete !== false, userId: extra.userId || 'user-a', capturedAt: extra.capturedAt || '2026-09-21T12:00:00.000Z' });

test('first run initializes baseline without false NEW alerts', () => {
  const result = Monitoring.diffMonitoringState(null, current([issue(), issue({ id: 'ISSUE-2', key: 'ISSUE-2', entityId: 'VALE3', entityLabel: 'VALE3' })]));
  assert.equal(result.mode, 'CURRENT_ONLY'); assert.equal(result.baselineInitialized, true); assert.equal(result.summary.new, 0); assert.equal(result.summary.falseNew, 0); assert.equal(result.summary.ongoing, 2);
});
test('same baseline reports ongoing without repeated alerts', () => {
  const before = current([issue(), issue({ id: 'ISSUE-2', key: 'ISSUE-2', entityId: 'VALE3', entityLabel: 'VALE3' })]);
  const result = Monitoring.diffMonitoringState(Monitoring.createBaseline(before), before);
  assert.deepEqual(result.summary, { new: 0, changed: 0, ongoing: 2, resolved: 0, informational: 0, falseNew: 0, falseResolved: 0 });
});
test('detects added, resolved and severity changes with stable fingerprints', () => {
  const previous = current([issue(), issue({ id: 'ISSUE-2', key: 'ISSUE-2', entityId: 'VALE3', entityLabel: 'VALE3' })]);
  const next = current([issue({ severity: 'CRITICAL' }), issue({ id: 'ISSUE-3', key: 'ISSUE-3', entityId: 'ITUB4', entityLabel: 'ITUB4' })]);
  const result = Monitoring.diffMonitoringState(Monitoring.createBaseline(previous), next);
  assert.equal(result.summary.new, 1); assert.equal(result.summary.changed, 1); assert.equal(result.summary.resolved, 1);
  assert.equal(result.alerts.some((alert) => alert.status === 'CHANGED' && alert.severityAfter === 'CRITICAL'), true);
  assert.equal(result.alerts.some((alert) => alert.status === 'RESOLVED' && alert.entityLabel === 'VALE3'), true);
});
test('partial current state never marks absent issues resolved', () => {
  const previous = current([issue(), issue({ id: 'ISSUE-2', key: 'ISSUE-2', entityId: 'VALE3', entityLabel: 'VALE3' })]);
  const result = Monitoring.diffMonitoringState(Monitoring.createBaseline(previous), current([issue()], { complete: false }));
  assert.equal(result.summary.resolved, 0); assert.equal(result.summary.falseResolved, 0); assert.equal(result.comparisonState, 'PARTIAL');
});
test('freshness and coverage changes are factual changes', () => {
  const previous = current([issue({ domain: 'MARKET_DATA', dataState: 'KNOWN', coverage: 'FULL' })]);
  const next = current([issue({ domain: 'MARKET_DATA', dataState: 'STALE', coverage: 'PARTIAL', severity: 'INFO' })]);
  const result = Monitoring.diffMonitoringState(Monitoring.createBaseline(previous), next);
  assert.equal(result.summary.changed, 1); assert.equal(result.alerts[0].changeTypes.includes('FRESHNESS_CHANGED'), true); assert.equal(result.alerts[0].changeTypes.includes('COVERAGE_CHANGED'), true);
});
test('announced and cost-basis alerts remain in factual domains', () => {
  const result = Monitoring.diffMonitoringState(null, current([issue({ id: 'DIV-1', key: 'DIV-1', domain: 'INCOME', dataState: 'ANNOUNCED', state: 'INFORMATIONAL' }), issue({ id: 'TAX-1', key: 'TAX-1', domain: 'TAX', rootCause: 'SALE_COST_BASIS_MISSING' })]));
  assert.equal(result.alerts.every((alert) => alert.status !== 'NEW'), true); assert.equal(result.alerts.some((alert) => alert.domain === 'INCOME'), true); assert.equal(result.alerts.some((alert) => alert.domain === 'TAX'), true);
});
test('user binding prevents baseline reuse across users', () => {
  const baseline = Monitoring.createBaseline(current([issue()], { userId: 'user-a' })); const result = Monitoring.diffMonitoringState(baseline, current([issue()], { userId: 'user-b' }));
  assert.equal(result.mode, 'CURRENT_ONLY'); assert.equal(result.baselineInitialized, true); assert.equal(result.summary.falseNew, 0);
});
test('deduplication and filters remain deterministic', () => {
  const result = Monitoring.diffMonitoringState(null, current([issue(), issue()])); assert.equal(result.currentIssueCount, 1); assert.equal(result.summary.ongoing, 1);
  assert.equal(Monitoring.filterAlerts(result.alerts, { domain: 'INCOME', search: 'PETR4' }).length, 1); assert.equal(Monitoring.filterAlerts(result.alerts, { domain: 'TAX' }).length, 0);
  assert.equal(Monitoring.groupAlerts(result.alerts)[0].count, 1);
});
test('diff and search scale to thousands of findings without quadratic output', () => {
  const issues = Array.from({ length: 5000 }, (_, index) => issue({ id: `ISSUE-${index}`, key: `ISSUE-${index}`, entityId: `ASSET-${index}`, entityLabel: `ASSET-${index}` }));
  const result = Monitoring.diffMonitoringState(null, current(issues));
  assert.equal(result.currentIssueCount, 5000);
  assert.equal(result.summary.falseNew, 0);
  assert.equal(Monitoring.filterAlerts(result.alerts, { search: 'ASSET-4999' }).length, 1);
});
test('module is pure and UI wiring is read-only by contract', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'); const source = fs.readFileSync(path.join(__dirname, '..', 'portfolio-monitoring.js'), 'utf8');
  assert.match(html, /portfolio-monitoring\.js/); assert.match(html, /Alert Center|Monitoramento/); assert.doesNotMatch(source, /setDoc\(|updateDoc\(|addDoc\(|deleteDoc\(|fetch\(|XMLHttpRequest/);
});
