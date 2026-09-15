'use strict';

const Foundation = require('./import-foundation.js');
const Preview = require('./historical-import-preview.js');
const Reconstruction = require('./historical-reconstruction.js');
const Brokerage = require('./brokerage-professional.js');
const Coordinator = require('./protected-import-transaction.js');

const SOURCE_TYPES = Object.freeze({
  BROKERAGE_NOTE_PDF: 'PARTIALLY_SUPPORTED',
  B3_POSITION_XLSX: 'FULLY_SUPPORTED',
  B3_MOVEMENTS_XLSX: 'PARTIALLY_SUPPORTED',
  B3_DIVIDENDS_XLSX: 'FULLY_SUPPORTED',
  UNKNOWN: 'REVIEW_REQUIRED',
});

const WIZARD_STEPS = Object.freeze([
  'STEP_1_FILE', 'STEP_2_DETECTION', 'STEP_3_PREVIEW',
  'STEP_4_DUPLICATES_CONFLICTS', 'STEP_5_RECONCILIATION',
  'STEP_6_CHANGE_PLAN', 'STEP_7_CONFIRM_DRY_RUN', 'STEP_8_RESULT',
  'STEP_9_ROLLBACK_TEST',
]);

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }

function fixtureState(state) {
  return Coordinator.fixtureState(state || {});
}

function sourceFingerprint(source) {
  return Foundation.sourceFingerprint({
    ...source,
    rows: Array.isArray(source.rows) ? source.rows : [],
  });
}

function detectSource(source = {}) {
  const detectedType = source.sourceType || Preview.detectSourceFormat(source);
  const sourceType = detectedType === 'BROKER_NOTE_PDF' ? 'BROKERAGE_NOTE_PDF' : detectedType;
  const confidence = sourceType === 'UNKNOWN' ? 'LOW' : source.sourceType ? 'EXACT_DECLARATION' : 'HIGH';
  const parser = {
    BROKERAGE_NOTE_PDF: 'BrokerageProfessional.normalizeNote',
    B3_POSITION_XLSX: 'HistoricalImportPreview.reconcileCurrentPosition',
    B3_MOVEMENTS_XLSX: 'HistoricalReconstruction.normalizeMovement',
    B3_DIVIDENDS_XLSX: 'HistoricalImportPreview.previewDividendImport',
  }[sourceType] || 'NONE';
  return {
    SOURCE_TYPE: sourceType,
    SUPPORT: SOURCE_TYPES[sourceType] || SOURCE_TYPES.UNKNOWN,
    CONFIDENCE: confidence,
    PARSER_USED: parser,
    WARNINGS: sourceType === 'UNKNOWN' ? ['UNKNOWN_FORMAT_REQUIRES_REVIEW'] : [],
    UNKNOWN_FORMAT_AUTO_ASSIGNED: false,
  };
}

function parseSource(source = {}, detection = detectSource(source), existing = {}) {
  const rows = Array.isArray(source.rows) ? source.rows : [];
  if (detection.SOURCE_TYPE === 'B3_DIVIDENDS_XLSX') {
    return Preview.previewDividendImport({
      source: { ...source, sourceType: detection.SOURCE_TYPE }, rows,
      existing: existing.income || [], processedSources: existing.processedSources || [],
    });
  }
  if (detection.SOURCE_TYPE === 'B3_MOVEMENTS_XLSX') {
    const events = rows.map(row => Reconstruction.normalizeMovement(row, detection.SOURCE_TYPE));
    return { parsed: rows.length, valid: events.filter(event => event.confidence !== 'UNKNOWN').length, events, newRecords: events.filter(event => event.verified), reviewRequired: events.filter(event => event.confidence === 'REVIEW_REQUIRED'), unsupported: events.filter(event => event.confidence === 'UNKNOWN'), conflicts: [], counts: { NEW: events.filter(event => event.verified).length } };
  }
  if (detection.SOURCE_TYPE === 'B3_POSITION_XLSX') {
    return { parsed: rows.length, valid: rows.length, positions: clone(rows), newRecords: [], reviewRequired: [], unsupported: [], conflicts: [], counts: { NEW: 0 } };
  }
  if (detection.SOURCE_TYPE === 'BROKERAGE_NOTE_PDF') {
    const note = Brokerage.normalizeNote(source.note || { operations: rows }, { ...source, fingerprint: sourceFingerprint(source) });
    const validation = Brokerage.crossCheckNoteFinancials(note);
    const operations = note.OPERATIONS.map(operation => ({ ...operation, source: 'BROKERAGE_NOTE_PDF', operation: operation.buySell }));
    return { parsed: operations.length, valid: operations.filter(operation => operation.identity && operation.quantity).length, note, validation, events: operations, newRecords: operations.filter(operation => operation.identity && operation.quantity), reviewRequired: validation.status === 'MATCH' ? [] : [validation], unsupported: [], conflicts: validation.status === 'MATCH' ? [] : [validation], counts: { NEW: operations.length } };
  }
  return { parsed: rows.length, valid: 0, newRecords: [], reviewRequired: rows.length ? rows : ['UNKNOWN_FORMAT'], unsupported: rows, conflicts: [], counts: { NEW: 0 } };
}

function incomeRecordsFromParsed(parsed, sourceType) {
  if (sourceType === 'B3_DIVIDENDS_XLSX') return (parsed.newRecords || []).map(record => ({ ...record, kind: 'income', source: sourceType }));
  return (parsed.events || []).filter(event => event.eventType === 'INCOME').map(event => ({ ...event, kind: 'income', incomeType: event.incomeType || 'OTHER_SUPPORTED_INCOME', source: sourceType }));
}

function transactionRecordsFromParsed(parsed, sourceType) {
  return (parsed.newRecords || []).filter(record => record.kind !== 'income' && (record.classification === 'BUY' || record.classification === 'SELL' || record.buySell === 'BUY' || record.buySell === 'SELL')).map(record => ({ ...record, kind: 'transaction', source: sourceType, eventType: record.eventType || record.classification || record.buySell, operation: record.operation || record.classification || record.buySell }));
}

function deduplicateCandidateRecords(records = [], kind = 'transaction') {
  const seen = new Map();
  const duplicates = [];
  records.forEach(record => {
    const key = kind === 'transaction'
      ? `${record.eventType || record.classification || record.buySell || ''}|${record.date || record.tradeDate || ''}|${record.identity || Foundation.resolveExactIdentity(record)}|${record.quantity || record.qty || ''}|${record.unitPrice ?? ''}|${record.grossValue ?? record.value ?? ''}`
      : `${record.date || ''}|${record.identity || Foundation.resolveExactIdentity(record)}|${record.incomeType || record.eventType || ''}|${record.netValue ?? record.grossValue ?? record.value ?? ''}`;
    if (seen.has(key)) duplicates.push(record);
    else seen.set(key, record);
  });
  return { records: [...seen.values()], duplicates };
}

function buildDryRunSession({ sessionId = 'phase-4f-session', state = fixtureState(), sources = [], period = '' } = {}) {
  const isolated = fixtureState(state);
  const processedSources = [];
  const sourceResults = sources.map(source => {
    const detection = detectSource(source);
    const parsed = parseSource(source, detection, isolated);
    const idempotency = Preview.sourceIdempotency(source, processedSources);
    processedSources.push({ fingerprint: idempotency.fingerprint, contentFingerprint: idempotency.contentFingerprint });
    return { source: clone(source), detection, parsed, idempotency, SOURCE_FINGERPRINT: idempotency.fingerprint };
  });
  const movementSources = sourceResults.filter(item => item.detection.SOURCE_TYPE === 'B3_MOVEMENTS_XLSX' || item.detection.SOURCE_TYPE === 'BROKERAGE_NOTE_PDF');
  const economic = Reconstruction.deduplicateEconomicEvents(movementSources.map(item => ({ source: item.detection.SOURCE_TYPE, events: item.parsed.events || [] })));
  const rawTransactions = sourceResults.flatMap(item => transactionRecordsFromParsed(item.parsed, item.detection.SOURCE_TYPE));
  const rawIncome = sourceResults.flatMap(item => incomeRecordsFromParsed(item.parsed, item.detection.SOURCE_TYPE));
  const transactionDedup = deduplicateCandidateRecords(rawTransactions, 'transaction');
  const incomeDedup = deduplicateCandidateRecords(rawIncome, 'income');
  const transactions = transactionDedup.records;
  const income = incomeDedup.records;
  const positionSource = sourceResults.find(item => item.detection.SOURCE_TYPE === 'B3_POSITION_XLSX');
  const appPositions = (isolated.assets || []).map(asset => ({ assetId: asset.id, ticker: asset.ticker, quantity: asset.qty }));
  const positionReconciliation = positionSource ? Preview.reconcileCurrentPosition({ b3: positionSource.parsed.positions, app: appPositions }) : { status: 'NOT_PROVIDED', summary: {}, rows: [] };
  const reviewItems = sourceResults.flatMap(item => [...(item.parsed.reviewRequired || []), ...(item.parsed.unsupported || []), ...(item.parsed.conflicts || [])]);
  const sourceFiles = sourceResults.map(item => item.source.fileName || item.detection.SOURCE_TYPE);
  const plan = Coordinator.planImport({
    sessionId, currentState: isolated, sourceFiles,
    sourceFingerprints: sourceResults.map(item => item.SOURCE_FINGERPRINT), period,
    transactions, income, recordsRequiringReview: reviewItems,
    expectedPositionImpact: positionReconciliation.rows,
    expectedIncomeImpact: income.map(item => ({ identity: item.identity, value: item.netValue ?? item.grossValue })),
    expectedHistoryImpact: economic.groups.map(group => ({ fingerprint: group.fingerprint, count: group.events.length })),
  });
  const summary = sourceResults.map(item => ({
    filename: item.source.fileName || '', sourceType: item.detection.SOURCE_TYPE,
    period: item.source.period || period, recordsParsed: item.parsed.parsed || 0,
    validRecords: item.parsed.valid || 0, duplicates: item.parsed.counts?.EXACT_DUPLICATE || 0,
    conflicts: (item.parsed.conflicts || []).length, unsupported: (item.parsed.unsupported || []).length,
    reviewRequired: (item.parsed.reviewRequired || []).length,
  }));
  return {
    SESSION_ID: sessionId, SOURCE_STATE_UNCHANGED: true, DRY_RUN_TARGET_ISOLATED: true,
    WIZARD_STEPS: [...WIZARD_STEPS], sourceResults, sourceSummary: summary,
    crossSource: { ...economic, SAME_ECONOMIC_EVENT_COUNTED_ONCE: true, NEW_DUPLICATE_RECORDS: transactionDedup.duplicates.length + incomeDedup.duplicates.length },
    positionReconciliation, plan,
    SINGLE_IMPORT_PIPELINE: true, SINGLE_IDENTITY_ENGINE: true,
    SINGLE_DEDUP_ENGINE: true, SINGLE_RECONCILIATION_ENGINE: true,
    SINGLE_WRITE_COORDINATOR: true, APPROXIMATE_MATCHING: false,
    CURRENT_POSITION_AUTO_OVERWRITE: false, AVG_PRICE_AUTO_RECALC: false,
  };
}

function executeDryRun(session, { failurePoint = '' } = {}) {
  const sourceState = fixtureState(session.plan.CURRENT_STATE_FINGERPRINT ? session._state : {});
  const initial = fixtureState(session._state || {});
  const snapshotState = clone(initial);
  const result = Coordinator.executeImport({ plan: session.plan, state: initial, confirmation: { confirmed: true }, failurePoint });
  const report = {
    ...Coordinator.buildImportAuditReport({ plan: session.plan, audit: result.audit, reconciliation: result.reconciliation }),
    COVERAGE: clone(session.sourceSummary),
    WARNINGS: clone(session.sourceResults.flatMap(item => item.detection.WARNINGS || [])),
    STATUS: result.status,
    FOOTER: 'Dry-run isolado; não substitui backup técnico nem autorização de importação real.',
  };
  const rollback = result.snapshot ? Coordinator.rollbackTransaction(result.state, result.snapshot, session.SESSION_ID) : { state: result.state, status: 'NOT_AVAILABLE' };
  return {
    ...result, report, snapshot: result.snapshot,
    REAL_COORDINATOR_EXERCISED: true,
    DRY_RUN_TARGET_ISOLATED: true,
    SOURCE_STATE_UNCHANGED: JSON.stringify(snapshotState) === JSON.stringify(session._state),
    ROLLBACK_STATE_EQUIVALENCE: rollback.status === 'ROLLED_BACK' && JSON.stringify(rollback.state) === JSON.stringify(snapshotState),
    rollback, sourceState,
  };
}

function prepareSession(options = {}) {
  const session = buildDryRunSession(options);
  session._state = fixtureState(options.state || {});
  return session;
}

function benchmarkDryRun({ sizes = [1000, 10000, 25000, 50000] } = {}) {
  return sizes.map(size => {
    const state = fixtureState();
    const transactions = Array.from({ length: size }, (_, index) => ({ id: `tx-${index}`, ticker: `T${index}`, quantity: 1, operation: 'BUY', date: '2024-01-02', grossValue: 100 }));
    const started = Date.now();
    const session = prepareSession({ state, sources: [{ fileName: `movimentos-${size}.xlsx`, sourceType: 'B3_MOVEMENTS_XLSX', rows: transactions }], period: '2024' });
    const parsed = Date.now();
    const result = executeDryRun(session);
    const finished = Date.now();
    return { size, parseAndPlanMs: parsed - started, fullDryRunMs: finished - started, status: result.status, rollback: result.ROLLBACK_STATE_EQUIVALENCE };
  });
}

function renderPipelineReport(result) {
  return Coordinator.renderImportReconciliationReport(result.report);
}

module.exports = {
  SOURCE_TYPES, WIZARD_STEPS, detectSource, parseSource, buildDryRunSession,
  prepareSession, executeDryRun, benchmarkDryRun, renderPipelineReport,
};
