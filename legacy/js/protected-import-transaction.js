'use strict';

const crypto = require('node:crypto');
const { classifyRfIncomeEvent } = require('./rf-income-classifier');

const TRANSACTION_STATES = Object.freeze([
  'PREVIEWED', 'READY_FOR_CONFIRMATION', 'SNAPSHOT_CREATED', 'WRITE_STARTED',
  'WRITE_COMPLETED', 'RECONCILING', 'RECONCILED', 'COMPLETED',
  'VALIDATION_FAILED', 'WRITE_FAILED', 'RECONCILIATION_FAILED',
  'ROLLBACK_REQUIRED', 'ROLLED_BACK', 'ROLLBACK_FAILED',
]);
const FAILURE_POINTS = Object.freeze([
  'before_snapshot', 'after_snapshot', 'first_write', 'middle_write',
  'last_write', 'before_reconciliation', 'during_reconciliation', 'before_audit_completion',
]);
const INCOME_TYPES = Object.freeze([
  'EQUITY_DIVIDEND', 'JCP', 'FII_INCOME', 'RF_INTEREST', 'RF_COUPON', 'OTHER_SUPPORTED_INCOME',
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(stable(value)).digest('hex');
}

function now() { return new Date().toISOString(); }

function assertTestFixture(state, options = {}) {
  if (options.mode !== 'test' || state?.__fixture !== true) throw new Error('REAL_DATA_WRITE_BLOCKED');
}

function fixtureState(overrides = {}) {
  return {
    __fixture: true,
    transactions: [],
    income: [],
    assets: [],
    audit: [],
    unrelated: [],
    ...clone(overrides),
  };
}

function normalizeRecord(record = {}, kind = 'transactions', index = 0) {
  const item = clone(record) || {};
  const explicit = item.importRecordId || item.id || `${kind}-${index + 1}`;
  return {
    ...item,
    importRecordId: String(explicit),
    source: String(item.source || 'TEST_FIXTURE'),
    kind,
    recordFingerprint: item.recordFingerprint || fingerprint({ kind, item }),
  };
}

function planImport({
  sessionId = `import-${fingerprint({ at: now(), random: Math.random() }).slice(0, 16)}`,
  sourceFiles = [], sourceFingerprints = [], currentState,
  transactions = [], income = [], recordsToIgnore = [], recordsRequiringReview = [],
  assetLinks = [], expectedPositionImpact = [], expectedIncomeImpact = [], expectedHistoryImpact = [],
  period = '',
} = {}) {
  const state = fixtureState(currentState);
  const normalizedTransactions = transactions.map((record, index) => normalizeRecord(record, 'transactions', index));
  const normalizedIncome = income.map((record, index) => normalizeRecord(record, 'income', index));
  const plan = {
    IMPORT_SESSION_ID: String(sessionId),
    SOURCE_FILES: clone(sourceFiles),
    SOURCE_FINGERPRINTS: clone(sourceFingerprints),
    CURRENT_STATE_FINGERPRINT: fingerprint(state),
    RECORDS_TO_ADD: { transactions: normalizedTransactions, income: normalizedIncome },
    RECORDS_TO_IGNORE: clone(recordsToIgnore),
    RECORDS_REQUIRING_REVIEW: clone(recordsRequiringReview),
    ASSET_LINKS: clone(assetLinks),
    EXPECTED_POSITION_IMPACT: clone(expectedPositionImpact),
    EXPECTED_INCOME_IMPACT: clone(expectedIncomeImpact),
    EXPECTED_HISTORY_IMPACT: clone(expectedHistoryImpact),
    PERIOD: String(period),
    UNRESOLVED_REVIEW_ITEMS: recordsRequiringReview.length,
    AUTO_ASSET_CREATION: false,
    CURRENT_POSITION_AUTO_OVERWRITE: false,
    AVG_PRICE_AUTO_RECALC: false,
    STATE: recordsRequiringReview.length ? 'VALIDATION_FAILED' : 'PREVIEWED',
    CREATED_AT: now(),
  };
  return clone(plan);
}

function confirmPlan(plan, state, confirmation = {}) {
  const next = clone(plan);
  if (!confirmation.confirmed) throw new Error('EXPLICIT_CONFIRMATION_REQUIRED');
  if (next.UNRESOLVED_REVIEW_ITEMS !== 0) throw new Error('UNRESOLVED_REVIEW_ITEMS');
  if (fingerprint(state) !== next.CURRENT_STATE_FINGERPRINT) throw new Error('STALE_PREVIEW_BLOCKED');
  next.STATE = 'READY_FOR_CONFIRMATION';
  next.CONFIRMED_AT = now();
  return next;
}

function validateSnapshot(snapshot, state) {
  if (!snapshot || snapshot.SNAPSHOT_ID === '' || !snapshot.STATE_FINGERPRINT) return false;
  if (snapshot.STATE_FINGERPRINT !== fingerprint(state)) return false;
  if (snapshot.DOMAIN_FINGERPRINT !== fingerprint(snapshot.DOMAINS)) return false;
  return true;
}

function validateSnapshotIntegrity(snapshot) {
  return Boolean(snapshot && snapshot.SNAPSHOT_ID && snapshot.STATE_FINGERPRINT && snapshot.DOMAIN_FINGERPRINT === fingerprint(snapshot.DOMAINS));
}

function createSnapshot(state, plan) {
  const domains = {
    transactions: clone(state.transactions || []),
    income: clone(state.income || []),
    audit: clone(state.audit || []),
  };
  return {
    SNAPSHOT_ID: `snapshot-${fingerprint({ session: plan.IMPORT_SESSION_ID, domains }).slice(0, 20)}`,
    IMPORT_SESSION_ID: plan.IMPORT_SESSION_ID,
    CREATED_AT: now(),
    STATE_FINGERPRINT: fingerprint(state),
    DOMAIN_FINGERPRINT: fingerprint(domains),
    DOMAINS: domains,
    VALIDATED: false,
  };
}

function exactDuplicate(record, records = []) {
  return records.find(item => item.recordFingerprint === record.recordFingerprint || item.importRecordId === record.importRecordId);
}

function revalidateDedup(plan, state) {
  const transactions = state.transactions || [];
  const income = state.income || [];
  const transactionDuplicates = plan.RECORDS_TO_ADD.transactions.filter(record => exactDuplicate(record, transactions));
  const incomeDuplicates = plan.RECORDS_TO_ADD.income.filter(record => exactDuplicate(record, income));
  const sourceDuplicate = (state.audit || []).some(audit => (plan.SOURCE_FINGERPRINTS || []).some(fp => audit.SOURCE_FINGERPRINTS?.includes(fp)));
  return {
    PRE_WRITE_DEDUP_REVALIDATION: true,
    transactionDuplicates,
    incomeDuplicates,
    SOURCE_ALREADY_PROCESSED: sourceDuplicate,
    NEW_TRANSACTIONS: sourceDuplicate ? [] : plan.RECORDS_TO_ADD.transactions.filter(record => !exactDuplicate(record, transactions)),
    NEW_INCOME: sourceDuplicate ? [] : plan.RECORDS_TO_ADD.income.filter(record => !exactDuplicate(record, income)),
  };
}

function applyRecord(state, record) {
  const domain = record.kind === 'income' ? 'income' : 'transactions';
  state[domain] = [...(state[domain] || []), clone(record)];
}

function reconcileAfterWrite(plan, before, after, dedup) {
  const addedTransactions = (after.transactions || []).filter(item => !(before.transactions || []).some(old => old.recordFingerprint === item.recordFingerprint));
  const addedIncome = (after.income || []).filter(item => !(before.income || []).some(old => old.recordFingerprint === item.recordFingerprint));
  const expectedTransactions = dedup.NEW_TRANSACTIONS.length;
  const expectedIncome = dedup.NEW_INCOME.length;
  const status = addedTransactions.length === expectedTransactions && addedIncome.length === expectedIncome ? 'MATCH' : 'MISMATCH';
  return {
    status,
    eventCounts: { expectedTransactions, actualTransactions: addedTransactions.length, expectedIncome, actualIncome: addedIncome.length },
    incomeTotals: { expectedRecords: expectedIncome, actualRecords: addedIncome.length },
    positionImpact: clone(plan.EXPECTED_POSITION_IMPACT),
    duplicateCount: dedup.transactionDuplicates.length + dedup.incomeDuplicates.length,
    historicalTotals: clone(plan.EXPECTED_HISTORY_IMPACT),
  };
}

function restoreTargeted(state, snapshot, sessionId) {
  const restored = clone(state);
  const previousTransactionIds = new Set(snapshot.DOMAINS.transactions.map(item => item.importRecordId));
  const previousIncomeIds = new Set(snapshot.DOMAINS.income.map(item => item.importRecordId));
  restored.transactions = (restored.transactions || []).filter(item => item.importSessionId !== sessionId || previousTransactionIds.has(item.importRecordId));
  restored.income = (restored.income || []).filter(item => item.importSessionId !== sessionId || previousIncomeIds.has(item.importRecordId));
  for (const previous of snapshot.DOMAINS.transactions) {
    const index = restored.transactions.findIndex(item => item.importRecordId === previous.importRecordId);
    if (index >= 0) restored.transactions[index] = clone(previous); else restored.transactions.push(clone(previous));
  }
  for (const previous of snapshot.DOMAINS.income) {
    const index = restored.income.findIndex(item => item.importRecordId === previous.importRecordId);
    if (index >= 0) restored.income[index] = clone(previous); else restored.income.push(clone(previous));
  }
  restored.audit = (restored.audit || []).filter(item => item.IMPORT_SESSION_ID !== sessionId);
  return restored;
}

function rollbackTransaction(state, snapshot, sessionId) {
  if (!validateSnapshotIntegrity(snapshot)) {
    return { state: clone(state), status: 'ROLLBACK_FAILED', reason: 'SNAPSHOT_INVALID' };
  }
  return { state: restoreTargeted(state, snapshot, sessionId), status: 'ROLLED_BACK', reason: 'TARGETED_RESTORE' };
}

function executeImport({ plan, state, confirmation = { confirmed: true }, failurePoint = '' } = {}) {
  assertTestFixture(state, { mode: 'test' });
  const existingAudit = (state.audit || []).find(item => item.IMPORT_SESSION_ID === plan?.IMPORT_SESSION_ID);
  if (existingAudit?.STATUS === 'COMPLETED') {
    return { state: clone(state), audit: clone(existingAudit), snapshot: null, reconciliation: { status: 'IDEMPOTENT_NOOP' }, status: 'COMPLETED', NEW_RECORDS: 0 };
  }
  let working = fixtureState(state);
  let snapshot = null;
  const confirmed = confirmPlan(plan, working, confirmation);
  const audit = {
    IMPORT_SESSION_ID: confirmed.IMPORT_SESSION_ID,
    CREATED_AT: confirmed.CREATED_AT,
    CONFIRMED_AT: confirmed.CONFIRMED_AT,
    SOURCE_FINGERPRINTS: clone(confirmed.SOURCE_FINGERPRINTS),
    PERIOD: confirmed.PERIOD,
    BEFORE_STATE_FINGERPRINT: confirmed.CURRENT_STATE_FINGERPRINT,
    SNAPSHOT_ID: '',
    RECORDS_ADDED: { transactions: 0, income: 0 },
    DUPLICATES_IGNORED: 0,
    CONFLICTS: [],
    REVIEW_ITEMS: 0,
    POST_WRITE_RECONCILIATION: null,
    SNAPSHOT_VALIDATED_BEFORE_WRITE: false,
    PRE_WRITE_DEDUP_REVALIDATION: false,
    AUTO_ASSET_CREATION: Boolean(confirmed.AUTO_ASSET_CREATION),
    CURRENT_POSITION_AUTO_OVERWRITE: Boolean(confirmed.CURRENT_POSITION_AUTO_OVERWRITE),
    AVG_PRICE_AUTO_RECALC: Boolean(confirmed.AVG_PRICE_AUTO_RECALC),
    ROLLBACK_STATUS: 'NOT_REQUIRED',
    STATUS: 'READY_FOR_CONFIRMATION',
  };
  const fail = point => { if (failurePoint === point) throw new Error(`INJECTED_FAILURE:${point}`); };
  try {
    fail('before_snapshot');
    snapshot = createSnapshot(working, confirmed);
    audit.SNAPSHOT_ID = snapshot.SNAPSHOT_ID;
    if (!validateSnapshot(snapshot, working)) throw new Error('SNAPSHOT_VALIDATION_FAILED');
    snapshot.VALIDATED = true;
    audit.SNAPSHOT_VALIDATED_BEFORE_WRITE = true;
    audit.STATUS = 'SNAPSHOT_CREATED';
    fail('after_snapshot');
    const dedup = revalidateDedup(confirmed, working);
    audit.PRE_WRITE_DEDUP_REVALIDATION = dedup.PRE_WRITE_DEDUP_REVALIDATION;
    if (dedup.SOURCE_ALREADY_PROCESSED && dedup.NEW_TRANSACTIONS.length === 0 && dedup.NEW_INCOME.length === 0) {
      audit.STATUS = 'COMPLETED';
      audit.DUPLICATES_IGNORED = confirmed.RECORDS_TO_ADD.transactions.length + confirmed.RECORDS_TO_ADD.income.length;
      working.audit = [...(working.audit || []), audit];
      return { state: working, audit, snapshot, reconciliation: { status: 'IDEMPOTENT_NOOP' }, status: 'COMPLETED', NEW_RECORDS: 0 };
    }
    audit.STATUS = 'WRITE_STARTED';
    const writes = [...dedup.NEW_TRANSACTIONS, ...dedup.NEW_INCOME];
    writes.forEach((record, index) => {
      if (index === 0) fail('first_write');
      else if (index === writes.length - 1) fail('last_write');
      else fail('middle_write');
      applyRecord(working, { ...record, importSessionId: confirmed.IMPORT_SESSION_ID });
    });
    audit.RECORDS_ADDED = { transactions: dedup.NEW_TRANSACTIONS.length, income: dedup.NEW_INCOME.length };
    audit.DUPLICATES_IGNORED = dedup.transactionDuplicates.length + dedup.incomeDuplicates.length;
    audit.STATUS = 'WRITE_COMPLETED';
    fail('before_reconciliation');
    audit.STATUS = 'RECONCILING';
    fail('during_reconciliation');
    const reconciliation = reconcileAfterWrite(confirmed, state, working, dedup);
    audit.POST_WRITE_RECONCILIATION = reconciliation;
    if (reconciliation.status !== 'MATCH') throw new Error('RECONCILIATION_FAILED');
    audit.STATUS = 'RECONCILED';
    fail('before_audit_completion');
    audit.STATUS = 'COMPLETED';
    working.audit = [...(working.audit || []), audit];
    return { state: working, audit, snapshot, reconciliation, status: 'COMPLETED', NEW_RECORDS: audit.RECORDS_ADDED.transactions + audit.RECORDS_ADDED.income };
  } catch (error) {
    const rollback = snapshot ? rollbackTransaction(working, snapshot, confirmed.IMPORT_SESSION_ID) : { state: clone(state), status: 'ROLLBACK_REQUIRED', reason: 'NO_SNAPSHOT' };
    audit.STATUS = error.message === 'RECONCILIATION_FAILED' ? 'RECONCILIATION_FAILED' : 'WRITE_FAILED';
    audit.ROLLBACK_STATUS = rollback.status;
    audit.ERROR = error.message;
    if (rollback.status === 'ROLLED_BACK') audit.STATUS = 'ROLLED_BACK';
    return { state: rollback.state, audit, snapshot, reconciliation: null, status: audit.STATUS, NEW_RECORDS: 0, error: error.message, NO_PARTIAL_SILENT_SUCCESS: true };
  }
}

function buildImportAuditReport({ plan, audit, reconciliation = null } = {}) {
  return {
    IMPORT_STATUS: audit?.STATUS || 'UNKNOWN',
    SOURCE: clone(plan?.SOURCE_FILES || []),
    PERIOD: plan?.PERIOD || '',
    ADDED: clone(audit?.RECORDS_ADDED || { transactions: 0, income: 0 }),
    DUPLICATES_IGNORED: audit?.DUPLICATES_IGNORED || 0,
    REVIEWED: plan?.UNRESOLVED_REVIEW_ITEMS === 0,
    CONFLICTS: clone(audit?.CONFLICTS || []),
    POSITION_DIFFS: clone(plan?.EXPECTED_POSITION_IMPACT || []),
    INCOME_TOTALS: clone(reconciliation?.incomeTotals || {}),
    POST_WRITE_RECONCILIATION: clone(reconciliation),
    ROLLBACK_AVAILABLE: Boolean(audit?.SNAPSHOT_ID),
  };
}

function renderImportReconciliationReport(report = {}) {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const rows = [['Status', report.STATUS || report.IMPORT_STATUS], ['Período', report.PERIOD], ['Adicionados', stable(report.ADDED)], ['Duplicados ignorados', report.DUPLICATES_IGNORED], ['Revisões pendentes', report.REVIEWED ? 0 : 'revisar'], ['Rollback disponível', report.ROLLBACK_AVAILABLE ? 'Sim' : 'Não']];
  const coverage = report.COVERAGE?.length ? `<h2>Cobertura</h2><pre>${esc(stable(report.COVERAGE))}</pre>` : '';
  const warnings = report.WARNINGS?.length ? `<h2>Avisos</h2><pre>${esc(stable(report.WARNINGS))}</pre>` : '';
  const footer = `<footer>${esc(report.FOOTER || 'Relatório humano; não substitui backup técnico.')}</footer>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Relatório de reconciliação de importação</title><style>:root{font-family:Arial,sans-serif;color:#172033;background:#fff}body{margin:32px;line-height:1.4}h1{font-size:22px;margin:0 0 4px}p{color:#526078}.report-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:20px 0}.report-item{border:1px solid #d8dee8;padding:10px;border-radius:6px}.report-item small{display:block;color:#63718a;text-transform:uppercase;font-size:10px}.report-item strong{display:block;margin-top:4px;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:28px;padding-top:10px;border-top:1px solid #d8dee8;color:#63718a;font-size:11px}@media print{body{margin:12mm}.no-print{display:none}.report-item{break-inside:avoid}footer{position:fixed;bottom:0;left:0;right:0}}</style></head><body><h1>Relatório de reconciliação de importação</h1><p>Gerado em ${esc(now())}.</p><div class="report-grid">${rows.map(([label,value]) => `<div class="report-item"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}</div><h2>Fontes</h2><p>${esc((report.SOURCE || []).join(', ') || 'Não informado')}</p>${coverage}<h2>Novos registros e duplicados</h2><pre>${esc(stable({ added: report.ADDED, duplicatesIgnored: report.DUPLICATES_IGNORED }))}</pre><h2>Reconciliação de posição e renda</h2><pre>${esc(stable({ positionDiffs: report.POSITION_DIFFS, incomeTotals: report.INCOME_TOTALS, reconciliation: report.POST_WRITE_RECONCILIATION }))}</pre>${warnings}${footer}</body></html>`;
}

function passiveIncomeWriteContract(event = {}) {
  const rf = classifyRfIncomeEvent(event);
  const type = event.incomeType || (rf.type === 'RF_INTEREST' || rf.type === 'RF_COUPON' ? rf.type : '');
  const allowed = INCOME_TYPES.includes(type);
  return { type: type || 'UNKNOWN', allowed, principalAsPassiveIncome: 0, doubleCount: false, reviewRequired: !allowed };
}

module.exports = {
  TRANSACTION_STATES, FAILURE_POINTS, INCOME_TYPES, fixtureState, fingerprint,
  planImport, confirmPlan, createSnapshot, validateSnapshot, revalidateDedup,
  executeImport, rollbackTransaction, buildImportAuditReport, renderImportReconciliationReport,
  passiveIncomeWriteContract,
};
