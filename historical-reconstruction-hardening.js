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
    const operation = operationOf(row.operation ?? row.op ?? row.movement ?? row.movimento ?? row.type);
    const quantity = finiteNumber(row.quantity ?? row.qty ?? row.quantidade);
    const total = finiteNumber(row.total ?? row.totalValue ?? row.grossValue ?? row.value ?? row.valor);
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
  return { normalizeTransaction, deduplicate, reconcilePositions, annualCoverage, buildHistoricalReconstructionAudit };
});
