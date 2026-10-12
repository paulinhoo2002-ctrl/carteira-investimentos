/* V255: read-only confidence and reconciliation for historical reconstruction. */
(function init(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HistoricalReconstructionHardening = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine() {
  const text = value => String(value ?? '').trim();
  const cleanTicker = value => text(value).toUpperCase().replace(/\s+/g, '');
  const isoDate = value => {
    const raw = text(value);
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!br) return '';
    const year = Number(br[3]) < 100 ? 2000 + Number(br[3]) : Number(br[3]);
    return `${String(year).padStart(4, '0')}-${String(Number(br[2])).padStart(2, '0')}-${String(Number(br[1])).padStart(2, '0')}`;
  };
  const finiteNumber = value => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const sourceStrength = source => {
    const normalized = text(source).toLowerCase();
    if (/broker|nota|confirmed|official/.test(normalized)) return 'HIGH';
    if (/import|b3|historical/.test(normalized)) return 'MEDIUM';
    return 'LOW';
  };
  const operationOf = value => {
    const normalized = text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (/COMPRA|BUY|APLICA/.test(normalized)) return 'BUY';
    if (/VENDA|SELL|RESGATE/.test(normalized)) return 'SELL';
    if (/TRANSFER|CUSTODIA/.test(normalized)) return 'TRANSFER';
    if (/SPLIT|DESDOBRA|GRUPA|BONIFIC|SUBSCRI|AMORTIZ|FUSA|INCORPOR/.test(normalized)) return 'CORPORATE_EVENT';
    return 'UNKNOWN';
  };
  function normalizeTransaction(row = {}, index = 0) {
    const ticker = cleanTicker(row.ticker ?? row.symbol ?? row.codigo);
    const date = isoDate(row.date ?? row.tradeDate ?? row.data);
    const operation = operationOf(row.operationType ?? row.interpretedOperation ?? row.action ?? row.side ?? row.operation ?? row.op ?? row.movement ?? row.movimento ?? row.type);
    const quantity = finiteNumber(row.quantity ?? row.qty ?? row.quantidade);
    const unitPrice = finiteNumber(row.unitPrice ?? row.price ?? row.preco);
    const total = finiteNumber(row.total ?? row.totalValue ?? row.grossValue ?? row.value ?? row.valor ?? (quantity !== null && unitPrice !== null ? quantity * unitPrice : null));
    const source = text(row.source ?? row.origin) || 'UNKNOWN';
    const reasons = [];
    if (!ticker || !date || quantity === null || quantity <= 0 || total === null || total < 0) reasons.push('MISSING_TRANSACTION_FIELDS');
    if (operation === 'UNKNOWN') reasons.push('UNKNOWN_OPERATION');
    if (operation === 'TRANSFER') reasons.push('TRANSFER_REQUIRES_REVIEW');
    if (operation === 'CORPORATE_EVENT') reasons.push('CORPORATE_EVENT_REQUIRES_REVIEW');
    if (sourceStrength(source) === 'LOW') reasons.push('WEAK_SOURCE');
    return {
      id: text(row.id) || `history:${index}`,
      ticker,
      date,
      operation,
      quantity,
      total,
      source,
      sourceStrength: sourceStrength(source),
      reasons,
      positionImpact: operation === 'BUY' ? quantity : operation === 'SELL' ? -quantity : 0,
      positionEligible: Boolean(ticker && date && quantity !== null && quantity > 0 && ['BUY', 'SELL'].includes(operation)),
    };
  }
  const economicKey = row => [row.ticker, row.date, row.operation, row.quantity, row.total].join('|');
  function deduplicate(transactions) {
    const groups = new Map();
    transactions.forEach(row => {
      const key = economicKey(row);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    const duplicateEconomicEvents = [...groups.values()].reduce((sum, group) => sum + Math.max(0, group.length - 1), 0);
    return { groups: [...groups.entries()].map(([key, rows]) => ({ key, rows })), duplicateEconomicEvents };
  }
  function historicalPositions(transactions) {
    const positions = new Map();
    transactions.filter(row => row.positionEligible).forEach(row => {
      const current = positions.get(row.ticker) || 0;
      positions.set(row.ticker, current + row.positionImpact);
    });
    return positions;
  }
  function currentPositionMap(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const ticker = cleanTicker(row.ticker ?? row.symbol ?? row.codigo);
      const quantity = finiteNumber(row.quantity ?? row.qty ?? row.quantidade);
      if (ticker && quantity !== null) map.set(ticker, quantity);
    });
    return map;
  }
  function reconcilePositions(transactions, currentRows) {
    const historical = historicalPositions(transactions);
    const current = currentPositionMap(currentRows);
    const tickers = [...new Set([...historical.keys(), ...current.keys()])].sort();
    const rows = tickers.map(ticker => {
      const historyQuantity = historical.get(ticker);
      const currentQuantity = current.get(ticker);
      const status = historyQuantity !== undefined && currentQuantity !== undefined && Math.abs(historyQuantity - currentQuantity) < 1e-8
        ? 'ALL_MATCH'
        : 'REVIEW_REQUIRED';
      return { ticker, historyQuantity: historyQuantity ?? null, currentQuantity: currentQuantity ?? null, status };
    });
    return { rows, status: rows.every(row => row.status === 'ALL_MATCH') ? 'ALL_MATCH' : rows.length ? 'REVIEW_REQUIRED' : 'UNAVAILABLE' };
  }
  function annualCoverage(transactions, years) {
    const selected = years?.length ? years.map(Number) : [...new Set(transactions.map(row => Number(row.date.slice(0, 4))).filter(Number.isFinite))].sort();
    return selected.map(year => {
      const rows = transactions.filter(row => row.date && Number(row.date.slice(0, 4)) <= year);
      if (!rows.length) return { year, status: 'UNAVAILABLE', eventCount: 0, reviewCount: 0 };
      const reviewCount = rows.filter(row => row.reasons.length > 0).length;
      return { year, status: reviewCount ? 'PARTIAL' : 'FULL', eventCount: rows.length, reviewCount };
    });
  }
  function buildHistoricalReconstructionAudit({ transactions = [], currentPositions = [], yearEndYears = [] } = {}) {
    const normalized = (Array.isArray(transactions) ? transactions : []).map(normalizeTransaction).sort((a, b) => `${a.date}|${a.id}`.localeCompare(`${b.date}|${b.id}`));
    const deduped = deduplicate(normalized);
    const reviewReasons = [];
    if (deduped.duplicateEconomicEvents) reviewReasons.push(`DUPLICATE_ECONOMIC_EVENTS:${deduped.duplicateEconomicEvents}`);
    if (normalized.some(row => row.reasons.includes('UNKNOWN_OPERATION'))) reviewReasons.push('UNKNOWN_EVENTS_REQUIRE_REVIEW');
    if (normalized.some(row => row.reasons.includes('MISSING_TRANSACTION_FIELDS'))) reviewReasons.push('INCOMPLETE_TRANSACTION_FIELDS');
    if (normalized.some(row => row.reasons.includes('WEAK_SOURCE'))) reviewReasons.push('WEAK_SOURCE_PROVENANCE');
    const dates = normalized.map(row => row.date).filter(Boolean).sort();
    const coverage = {
      status: normalized.length ? (reviewReasons.length ? 'PARTIAL' : 'FULL') : 'UNAVAILABLE',
      firstDate: dates[0] || null,
      lastDate: dates.at(-1) || null,
      eventCount: normalized.length,
      positionEligibleEvents: normalized.filter(row => row.positionEligible).length,
      reviewEvents: normalized.filter(row => row.reasons.length > 0).length,
    };
    const positionReconciliation = reconcilePositions(normalized, currentPositions);
    if (positionReconciliation.status === 'REVIEW_REQUIRED') reviewReasons.push('CURRENT_POSITION_MISMATCH');
    const annual = annualCoverage(normalized, yearEndYears);
    const status = !normalized.length ? 'UNAVAILABLE' : reviewReasons.length ? 'NEEDS_REVIEW' : 'FULL';
    return {
      version: 'V255_HISTORICAL_RECONSTRUCTION_HARDENING_V1',
      status,
      transactions: normalized,
      duplicateEconomicEvents: deduped.duplicateEconomicEvents,
      coverage,
      positionReconciliation,
      annualCoverage: annual,
      reviewReasons,
      semantics: { unknownIsNotZero: true, partialIsNotComplete: true, currentPositionIsNotOverwritten: true, duplicateEventsCountOnce: true },
      writeEnabled: false,
    };
  }
  const corporateEventType = value => {
    const normalized = text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (/REVERS|GRUPAMENTO/.test(normalized)) return 'REVERSE_SPLIT';
    if (/SPLIT|DESDOBR/.test(normalized)) return 'SPLIT';
    if (/BONIFIC/.test(normalized)) return 'BONUS';
    if (/TICKER|MUDANCA.*CODIGO|MIGRA/.test(normalized)) return 'TICKER_MIGRATION';
    if (/SUBSCRI/.test(normalized)) return 'SUBSCRIPTION';
    if (/AMORTIZ/.test(normalized)) return 'AMORTIZATION';
    if (/FUSA|INCORPOR/.test(normalized)) return 'MERGER';
    return 'UNKNOWN_EVENT';
  };
  const eventRatio = row => finiteNumber(row.ratio ?? row.factor ?? row.multiplier);
  const normalizedEvent = (row, index) => {
    const eventType = corporateEventType(row.type ?? row.operation ?? row.movement ?? row.movimento);
    const date = isoDate(row.date ?? row.eventDate ?? row.data);
    const ticker = cleanTicker(row.ticker ?? row.symbol ?? row.codigo);
    const ratio = eventRatio(row);
    const nextTicker = cleanTicker(row.newTicker ?? row.toTicker ?? row.tickerAfter);
    const reasons = [];
    if (!ticker || !date) reasons.push('MISSING_EVENT_FIELDS');
    if (!['SPLIT', 'REVERSE_SPLIT', 'TICKER_MIGRATION'].includes(eventType)) reasons.push('UNSUPPORTED_CORPORATE_EVENT');
    if (['SPLIT', 'REVERSE_SPLIT'].includes(eventType) && !(ratio > 0)) reasons.push('MISSING_EVENT_RATIO');
    if (eventType === 'TICKER_MIGRATION' && !nextTicker) reasons.push('MISSING_TICKER_LINEAGE');
    return { id: text(row.id) || `event:${index}`, eventType, date, ticker, nextTicker, ratio, source: text(row.source ?? row.origin) || 'UNKNOWN', confidence: reasons.length ? 'LOW' : 'HIGH', reasons };
  };
  function replayTransactions(transactions = [], { cutoff = null } = {}) {
    const normalized = transactions.map(normalizeTransaction).filter(row => row.date && (!cutoff || row.date <= cutoff));
    const ordered = [...normalized].sort((a, b) => `${a.date}|${a.id}`.localeCompare(`${b.date}|${b.id}`));
    const positions = new Map();
    const rows = [];
    const issues = [];
    ordered.forEach(row => {
      if (!['BUY', 'SELL'].includes(row.operation)) return;
      const position = positions.get(row.ticker) || { ticker: row.ticker, quantity: 0, costBasis: 0, averageCost: null, confidence: 'HIGH', coverage: 'FULL', issues: [] };
      if (row.operation === 'BUY') {
        position.quantity += row.quantity || 0;
        position.costBasis += row.total || 0;
      } else if (position.averageCost === null || row.quantity > position.quantity) {
        position.confidence = 'LOW'; position.coverage = 'PARTIAL'; position.issues.push('SELL_WITHOUT_CONFIDENT_BASIS'); issues.push({ id: row.id, ticker: row.ticker, type: 'SELL_WITHOUT_CONFIDENT_BASIS' });
      } else {
        const allocated = position.averageCost * row.quantity;
        const proceeds = row.total || 0;
        position.quantity -= row.quantity;
        position.costBasis -= allocated;
        rows.push({ id: row.id, ticker: row.ticker, date: row.date, quantity: row.quantity, proceeds, allocatedCostBasis: allocated, realizedResult: proceeds - allocated, confidence: row.reasons.length ? 'LOW' : 'HIGH', coverage: row.reasons.length ? 'PARTIAL' : 'FULL' });
      }
      position.averageCost = position.quantity > 0 ? position.costBasis / position.quantity : (position.quantity === 0 ? 0 : null);
      if (row.reasons.length) { position.confidence = 'LOW'; position.coverage = 'PARTIAL'; position.issues.push(...row.reasons); }
      positions.set(row.ticker, position);
    });
    return { normalized: ordered, positions: [...positions.values()], realizedSales: rows, issues, writeEnabled: false };
  }
  function applyCorporateEvents(snapshot, events = []) {
    const positions = new Map((snapshot || []).map(row => [row.ticker, { ...row }]));
    const applied = []; const review = [];
    [...events].map(normalizedEvent).sort((a, b) => `${a.date}|${a.id}`.localeCompare(`${b.date}|${b.id}`)).forEach(event => {
      const position = positions.get(event.ticker);
      if (!position || event.reasons.length) { review.push(event); return; }
      if (event.eventType === 'SPLIT') { position.quantity *= event.ratio; position.costBasis = position.costBasis; position.averageCost = position.quantity ? position.costBasis / position.quantity : 0; applied.push(event); return; }
      if (event.eventType === 'REVERSE_SPLIT') { position.quantity /= event.ratio; position.averageCost = position.quantity ? position.costBasis / position.quantity : 0; applied.push(event); return; }
      if (event.eventType === 'TICKER_MIGRATION') { positions.delete(event.ticker); position.ticker = event.nextTicker; positions.set(event.nextTicker, position); applied.push(event); return; }
      review.push(event);
    });
    return { positions: [...positions.values()], applied, review, writeEnabled: false };
  }
  function buildHistoricalReconstructionCompleteness({ transactions = [], currentPositions = [], yearEndYears = [], corporateEvents = [], authoritativeCostBasis = null } = {}) {
    const baseReplay = replayTransactions(transactions);
    const eventAudit = corporateEvents.map(normalizedEvent);
    const replayWithEvents = applyCorporateEvents(baseReplay.positions, corporateEvents);
    const current = currentPositionMap(currentPositions);
    const authoritativePositions = Array.isArray(authoritativeCostBasis?.positions) ? authoritativeCostBasis.positions : [];
    const authoritativeByTicker = new Map(authoritativePositions.filter(row => row?.ticker).map(row => [cleanTicker(row.ticker), row]));
    const v254CostBasisReconciliation = replayWithEvents.positions.filter(row => row?.ticker).map(row => {
      const authoritative = authoritativeByTicker.get(row.ticker);
      if (!authoritative) return { ticker: row.ticker, status: 'UNAVAILABLE', diff: null };
      const diff = Number(authoritative.costBasis) - Number(row.costBasis);
      return { ticker: row.ticker, status: Number.isFinite(diff) && Math.abs(diff) < 0.01 ? 'MATCH' : 'NEEDS_REVIEW', diff: Number.isFinite(diff) ? diff : null };
    });
    const tickers = [...new Set([...replayWithEvents.positions.map(row => row.ticker), ...current.keys()])].sort();
    const reconciliation = tickers.map(ticker => {
      const reconstructed = replayWithEvents.positions.find(row => row.ticker === ticker);
      const reconstructedQuantity = reconstructed?.quantity ?? null;
      const currentQuantity = current.get(ticker) ?? null;
      const match = reconstructedQuantity !== null && currentQuantity !== null && Math.abs(reconstructedQuantity - currentQuantity) < 1e-8;
      return { ticker, reconstructedQuantity, currentQuantity, diff: reconstructedQuantity === null || currentQuantity === null ? null : currentQuantity - reconstructedQuantity, status: match ? 'MATCH' : reconstructedQuantity === null || currentQuantity === null ? 'PARTIAL' : 'NEEDS_REVIEW', confidence: reconstructed?.confidence || 'UNKNOWN', coverage: reconstructed?.coverage || 'UNAVAILABLE', reason: match ? 'HISTORICAL_REPLAY_MATCHES_CURRENT' : 'HISTORICAL_REPLAY_REQUIRES_REVIEW' };
    });
    const replay = { ...baseReplay, ...replayWithEvents };
    const snapshots = (yearEndYears.length ? yearEndYears : [...new Set(replay.normalized.map(row => Number(row.date.slice(0, 4))))]).map(year => {
      const yearReplay = replayTransactions(transactions, { cutoff: `${year}-12-31` });
      const yearNormalized = transactions.map(normalizeTransaction).filter(row => row.date && row.date <= `${year}-12-31`);
      const yearEvents = corporateEvents.filter(row => isoDate(row.date ?? row.eventDate ?? row.data) <= `${year}-12-31`);
      const withEvents = applyCorporateEvents(yearReplay.positions, yearEvents);
      const reviewCount = yearReplay.issues.length + withEvents.review.length + yearNormalized.filter(row => row.operation === 'UNKNOWN' || row.reasons.length).length;
      return { year, positions: withEvents.positions.map(row => ({ ticker: row.ticker, quantity: row.quantity, costBasis: row.costBasis, averageCost: row.averageCost, coverage: row.coverage, confidence: row.confidence })), status: reviewCount ? 'PARTIAL' : withEvents.positions.length ? 'FULL' : 'UNAVAILABLE', reviewCount };
    });
    const normalized = transactions.map(normalizeTransaction);
    const buys = normalized.filter(row => row.operation === 'BUY');
    const sells = normalized.filter(row => row.operation === 'SELL');
    const loans = normalized.filter(row => /loan|emprest/i.test(row.source) || row.operation === 'UNKNOWN' && /loan/i.test(row.id));
    return { version: 'V259_HISTORICAL_RECONSTRUCTION_COMPLETENESS_V1', writeEnabled: false, normalized, replay, eventAudit, reconciliation, yearEndSnapshots: snapshots, coverage: { firstDate: normalized.map(row => row.date).filter(Boolean).sort()[0] || null, lastDate: normalized.map(row => row.date).filter(Boolean).sort().at(-1) || null, status: normalized.length ? 'PARTIAL' : 'UNAVAILABLE', eventCount: normalized.length }, counts: { buy: buys.length, sell: sells.length, corporate: eventAudit.length, reference: normalized.filter(row => row.operation === 'TRANSFER').length, stockLoan: loans.length, unknown: normalized.filter(row => row.operation === 'UNKNOWN').length }, sales: { total: sells.length, confidentBasis: replay.realizedSales.filter(row => row.confidence === 'HIGH').length, partialBasis: replay.realizedSales.filter(row => row.confidence !== 'HIGH').length, needsReview: replay.issues.filter(row => row.type === 'SELL_WITHOUT_CONFIDENT_BASIS').length }, issues: replay.issues, unsupportedEvents: eventAudit.filter(row => row.reasons.length), appliedEvents: replayWithEvents.applied, v254CostBasisEngineReused: authoritativePositions.length > 0, v254CostBasisReconciliation, currentPositionAuthority: true, currentPositionAutoOverwriteCount: 0, forcedReconciliationCount: 0, syntheticTransactionCount: 0, stockLoanPositionMutationCount: 0, stockLoanCostBasisMutationCount: 0, referenceTransactionFinancialEffectCount: 0 };
  }
  return { normalizeTransaction, deduplicate, reconcilePositions, annualCoverage, buildHistoricalReconstructionAudit, replayTransactions, normalizeCorporateEvent: normalizedEvent, applyCorporateEvents, buildHistoricalReconstructionCompleteness };
});
