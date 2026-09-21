(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PortfolioMonitoring = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA_VERSION = 1;
  const STATUSES = Object.freeze(['NEW', 'CHANGED', 'ONGOING', 'RESOLVED', 'INFORMATIONAL']);
  const CHANGE_TYPES = Object.freeze(['ADDED', 'REMOVED', 'SEVERITY_CHANGED', 'STATUS_CHANGED', 'FRESHNESS_CHANGED', 'COVERAGE_CHANGED', 'EVIDENCE_CHANGED']);
  const DOMAINS = Object.freeze(['DATA_QUALITY', 'MARKET_DATA', 'COST_BASIS', 'HISTORICAL_COVERAGE', 'INCOME_DATA', 'CORPORATE_EVENTS', 'IMPORT', 'FIXED_INCOME', 'SYSTEM', 'POSITIONS', 'INCOME', 'TRANSACTIONS', 'IMPORTS', 'TAX', 'HISTORY']);

  const text = (value, fallback = '') => {
    const result = String(value ?? '').trim();
    return result || fallback;
  };
  const upper = value => text(value).toUpperCase();
  const list = value => Array.isArray(value) ? value : [];
  const clean = value => upper(value).replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 100) || 'UNKNOWN';
  const stableJson = value => JSON.stringify(value, Object.keys(value || {}).sort());

  function normalizeIssue(input = {}) {
    const domain = upper(input.domain || input.category || 'SYSTEM');
    const entityId = text(input.entityId || input.entityLabel || input.assetId, 'unknown');
    const entityLabel = text(input.entityLabel || input.entityId || input.assetId, 'Registro sem identificação');
    const field = text(input.field, 'unknown');
    const rootCause = text(input.rootCause || input.category, 'DATA_QUALITY_REVIEW');
    return Object.freeze({
      id: text(input.id || input.issueId),
      key: text(input.key),
      fingerprint: text(input.fingerprint) || fingerprint({ rootCause, domain, entityId, entityLabel, field, source: input.source }),
      rootCause,
      domain,
      entityId,
      entityLabel,
      field,
      severity: upper(input.severity || 'INFO'),
      state: upper(input.state || 'OPEN'),
      dataState: upper(input.dataState || input.coverage || 'UNKNOWN'),
      coverage: upper(input.coverage || input.dataState || 'UNKNOWN'),
      freshness: upper(input.freshness || input.dataState || 'UNKNOWN'),
      confidence: upper(input.confidence || 'UNKNOWN'),
      source: text(input.source, 'derived_read_only'),
      message: text(input.message, 'Há uma condição de dados que merece acompanhamento.'),
      impact: text(input.impact, 'A interpretação permanece condicionada à qualidade da fonte.'),
      route: text(input.route),
      firstSeenAt: text(input.firstSeenAt),
      lastSeenAt: text(input.lastSeenAt),
      lastChangedAt: text(input.lastChangedAt),
    });
  }

  function fingerprint(input = {}) {
    const source = input.source || 'derived_read_only';
    return [input.rootCause, input.domain, input.entityId || input.entityLabel, input.field, source].map(clean).join('|');
  }

  function dedupeIssues(items) {
    const byFingerprint = new Map();
    list(items).map(normalizeIssue).forEach(item => {
      const previous = byFingerprint.get(item.fingerprint);
      if (!previous || severityRank(item.severity) < severityRank(previous.severity)) byFingerprint.set(item.fingerprint, item);
    });
    return [...byFingerprint.values()].sort(compareIssues);
  }

  function normalizeSnapshot(input = {}) {
    return {
      userId: text(input.userId, 'anonymous'),
      capturedAt: text(input.capturedAt, new Date().toISOString()),
      complete: input.complete !== false,
      issues: dedupeIssues(input.issues),
    };
  }

  function createBaseline(input = {}) {
    const snapshot = normalizeSnapshot(input);
    return Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      userId: snapshot.userId,
      capturedAt: snapshot.capturedAt,
      complete: snapshot.complete,
      issues: Object.freeze(snapshot.issues.map(issue => Object.freeze({ ...issue }))),
    });
  }

  function validBaseline(input, userId) {
    return Boolean(input && Number(input.schemaVersion) === SCHEMA_VERSION && text(input.userId, 'anonymous') === text(userId, 'anonymous') && Array.isArray(input.issues));
  }

  function changeTypes(previous, current) {
    const changes = [];
    if (previous.severity !== current.severity) changes.push('SEVERITY_CHANGED');
    if (previous.state !== current.state) changes.push('STATUS_CHANGED');
    if (previous.freshness !== current.freshness) changes.push('FRESHNESS_CHANGED');
    if (previous.coverage !== current.coverage) changes.push('COVERAGE_CHANGED');
    if (stableJson({ message: previous.message, impact: previous.impact, confidence: previous.confidence, source: previous.source }) !== stableJson({ message: current.message, impact: current.impact, confidence: current.confidence, source: current.source })) changes.push('EVIDENCE_CHANGED');
    return changes;
  }

  function buildAlert(current, previous, status, types = []) {
    const item = current || previous;
    return Object.freeze({
      id: item.id || item.fingerprint,
      fingerprint: item.fingerprint,
      issueId: item.id || null,
      rootCause: item.rootCause,
      domain: item.domain,
      severity: item.severity,
      previousSeverity: previous?.severity || null,
      severityBefore: previous?.severity || null,
      severityAfter: current?.severity || null,
      state: item.state,
      status,
      changeTypes: Object.freeze(types),
      entityId: item.entityId,
      entityLabel: item.entityLabel,
      field: item.field,
      message: item.message,
      impact: item.impact,
      source: item.source,
      coverage: item.coverage,
      freshness: item.freshness,
      confidence: item.confidence,
      firstSeenAt: current?.firstSeenAt || previous?.firstSeenAt || null,
      lastSeenAt: current ? current.lastSeenAt || previous?.lastSeenAt || null : previous?.lastSeenAt || null,
      lastChangedAt: current ? current.lastChangedAt || previous?.lastChangedAt || null : previous?.lastChangedAt || null,
      route: item.route,
    });
  }

  function issueWithTimes(issue, previous, now) {
    return { ...issue, firstSeenAt: previous?.firstSeenAt || now, lastSeenAt: now, lastChangedAt: previous ? previous.lastChangedAt : now };
  }

  function diffMonitoringState(previousBaseline, currentInput, options = {}) {
    const current = normalizeSnapshot(currentInput);
    const now = text(options.now, current.capturedAt || new Date().toISOString());
    const previous = validBaseline(previousBaseline, current.userId) ? normalizeSnapshot(previousBaseline) : null;
    const currentMap = new Map(current.issues.map(item => [item.fingerprint, item]));
    const previousMap = new Map((previous?.issues || []).map(item => [item.fingerprint, item]));
    const alerts = [];
    let baselineInitialized = false;
    let comparisonState = previous ? (current.complete ? 'COMPLETE' : 'PARTIAL') : 'CURRENT_ONLY';

    if (!previous) {
      baselineInitialized = true;
      current.issues.forEach(item => alerts.push(buildAlert(issueWithTimes(item, null, now), null, item.state === 'INFORMATIONAL' ? 'INFORMATIONAL' : 'ONGOING')));
    } else {
      current.issues.forEach(item => {
        const old = previousMap.get(item.fingerprint);
        if (!old) alerts.push(buildAlert(issueWithTimes(item, null, now), null, 'NEW', ['ADDED']));
        else {
          const changes = changeTypes(old, item);
          alerts.push(buildAlert(issueWithTimes(item, old, now), old, changes.length ? 'CHANGED' : (item.state === 'INFORMATIONAL' ? 'INFORMATIONAL' : 'ONGOING'), changes));
        }
      });
      if (current.complete) previous.issues.forEach(item => {
        if (!currentMap.has(item.fingerprint)) alerts.push(buildAlert(null, item, 'RESOLVED', ['REMOVED']));
      });
    }

    const summary = {
      new: alerts.filter(item => item.status === 'NEW').length,
      changed: alerts.filter(item => item.status === 'CHANGED').length,
      ongoing: alerts.filter(item => item.status === 'ONGOING').length,
      resolved: alerts.filter(item => item.status === 'RESOLVED').length,
      informational: alerts.filter(item => item.status === 'INFORMATIONAL').length,
      falseNew: previous ? 0 : 0,
      falseResolved: current.complete ? 0 : alerts.filter(item => item.status === 'RESOLVED').length,
    };
    const sorted = alerts.sort(compareAlerts);
    return Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      mode: previous ? 'COMPARED' : 'CURRENT_ONLY',
      comparisonState,
      baselineInitialized,
      userId: current.userId,
      capturedAt: current.capturedAt,
      currentIssueCount: current.issues.length,
      alerts: Object.freeze(sorted),
      summary: Object.freeze(summary),
      baseline: createBaseline({ ...current, issues: current.issues.map(item => issueWithTimes(item, previousMap.get(item.fingerprint), now)) }),
    });
  }

  function severityRank(value) { return ({ CRITICAL: 1, HIGH: 2, WARNING: 3, MEDIUM: 3, LOW: 4, INFO: 5 }[upper(value)] || 9); }
  function statusRank(value) { return ({ NEW: 1, CHANGED: 2, ONGOING: 3, INFORMATIONAL: 4, RESOLVED: 5 }[upper(value)] || 9); }
  function compareIssues(a, b) { return severityRank(a.severity) - severityRank(b.severity) || a.fingerprint.localeCompare(b.fingerprint); }
  function compareAlerts(a, b) { return statusRank(a.status) - statusRank(b.status) || severityRank(a.severity) - severityRank(b.severity) || String(a.entityLabel).localeCompare(String(b.entityLabel), 'pt-BR'); }

  function filterAlerts(alerts, filters = {}) {
    const search = upper(filters.search);
    return list(alerts).filter(item =>
      (!filters.status || filters.status === 'ALL' || item.status === filters.status) &&
      (!filters.severity || filters.severity === 'ALL' || item.severity === filters.severity) &&
      (!filters.domain || filters.domain === 'ALL' || item.domain === filters.domain) &&
      (!search || [item.entityLabel, item.entityId, item.message, item.rootCause, item.domain].some(value => upper(value).includes(search)))
    ).sort(compareAlerts);
  }

  function groupAlerts(alerts) {
    const groups = new Map();
    list(alerts).forEach(item => {
      const key = `${item.domain || 'SYSTEM'}|${item.rootCause || 'DATA_QUALITY_REVIEW'}`;
      const group = groups.get(key) || { key, domain: item.domain, rootCause: item.rootCause, count: 0, statuses: new Set(), assets: new Set(), highestSeverity: 'INFO' };
      group.count += 1;
      group.statuses.add(item.status);
      group.assets.add(item.entityLabel || item.entityId || 'Registro sem identificação');
      if (severityRank(item.severity) < severityRank(group.highestSeverity)) group.highestSeverity = item.severity;
      groups.set(key, group);
    });
    return [...groups.values()].map(group => ({ ...group, statuses: Object.freeze([...group.statuses].sort()), assets: Object.freeze([...group.assets].sort((a, b) => a.localeCompare(b, 'pt-BR'))) })).sort((a, b) => b.count - a.count || severityRank(a.highestSeverity) - severityRank(b.highestSeverity) || a.key.localeCompare(b.key));
  }

  function storageKey(userId = 'anonymous') { return `v258-monitoring-baseline-v${SCHEMA_VERSION}:${clean(userId)}`; }
  function readBaseline(storage, userId) {
    try { return JSON.parse(storage?.getItem?.(storageKey(userId)) || 'null'); } catch (_) { return null; }
  }
  function writeBaseline(storage, baseline) {
    try { storage?.setItem?.(storageKey(baseline?.userId), JSON.stringify(baseline)); return true; } catch (_) { return false; }
  }

  return { SCHEMA_VERSION, STATUSES, CHANGE_TYPES, DOMAINS, fingerprint, normalizeIssue, normalizeSnapshot, createBaseline, diffMonitoringState, filterAlerts, groupAlerts, storageKey, readBaseline, writeBaseline, severityRank, statusRank };
});
