/* V253: derived dividend intelligence. Read-only, deterministic and storage-free. */
(function init(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DividendIntelligence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine() {
  const text = value => String(value ?? '').trim();
  const finite = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const dateOnly = value => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }
    const raw = text(value);
    let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) return `${String(Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3])).padStart(4, '0')}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`;
    return '';
  };
  const monthKey = date => date ? date.slice(0, 7) : '';
  const normalizeKey = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const typeOf = value => {
    const type = normalizeKey(value);
    if (type.includes('JCP') || type.includes('JUROS SOBRE CAPITAL')) return 'JCP';
    if (type.includes('RENDIMENTO') && (type.includes('FII') || type === 'RENDIMENTO') || type === 'FII_INCOME') return 'FII_INCOME';
    if (type.includes('DIVIDENDO') || type === 'DIVIDEND') return 'DIVIDEND';
    if (type.includes('JUROS') || type.includes('INTEREST')) return 'INTEREST';
    return 'OTHER_INCOME';
  };
  const stateOf = row => {
    const state = normalizeKey(row?.state || row?.status || row?.incomeState || row?.paymentState || row?.raw?.state || row?.raw?.status);
    if (state.includes('ANNOUNCED') || state.includes('ANUNCIAD')) return 'ANNOUNCED';
    if (state.includes('ESTIMATED') || state.includes('PROJECTED') || state.includes('PREVIST')) return 'ESTIMATED';
    if (state.includes('UNKNOWN') || state.includes('DESCONHEC')) return 'UNKNOWN';
    return 'PAID';
  };
  const coverageOf = ({ totalRows, validRows, firstDate, lastDate } = {}) => {
    if (!totalRows) return 'UNKNOWN';
    if (!validRows || !firstDate || !lastDate) return 'UNAVAILABLE';
    return validRows === totalRows ? 'FULL_COVERAGE' : 'PARTIAL_COVERAGE';
  };
  const classOf = row => text(row?.assetClass || row?.assetType || row?.className || row?.raw?.assetClass || row?.raw?.asset_type) || 'UNKNOWN';
  const sourceOf = row => text(row?.source || row?.origin || row?.raw?.source || row?.raw?.origin) || 'UNKNOWN';
  const dedupeKey = row => text(row?.canonicalIncomeEventId || row?.sourceEventId) || [row.ticker, row.type, row.date, Number(row.value).toFixed(8)].join('|');
  function normalizeIncomeEvent(row = {}, index = 0) {
    const date = dateOnly(row.paymentDate || row.paymentDt || row.dataPagamento || row.date || row.raw?.paymentDate || row.raw?.date);
    const value = finite(row.value ?? row.netValue ?? row.amount ?? row.raw?.value);
    const state = stateOf(row);
    const type = typeOf(row.type || row.eventType || row.canonical || row.raw?.type);
    return {
      id: text(row.id) || `income:${index}`,
      ticker: text(row.ticker || row.symbol || row.asset?.ticker).toUpperCase() || 'UNKNOWN',
      name: text(row.name || row.assetName || row.asset?.name) || 'Ativo não identificado',
      type,
      state,
      className: classOf(row),
      value,
      date,
      month: monthKey(date),
      source: sourceOf(row),
      paymentDate: date,
      exDate: dateOnly(row.exDate || row.dataEx || row.raw?.exDate),
      recordDate: dateOnly(row.recordDate || row.dataCom || row.raw?.recordDate),
      announcementDate: dateOnly(row.announcementDate || row.dataAnuncio || row.raw?.announcementDate),
      valid: Boolean(date && value !== null && value >= 0),
      dedupeKey: dedupeKey({ ...row, ticker: text(row.ticker || row.symbol).toUpperCase(), type, date, value, source: sourceOf(row) }),
    };
  }
  function uniqueEvents(rows) {
    const seen = new Set();
    return rows.map(normalizeIncomeEvent).filter(row => {
      if (seen.has(row.dedupeKey)) return false;
      seen.add(row.dedupeKey);
      return true;
    });
  }
  function paidEvents(rows) {
    return uniqueEvents(rows).filter(row => row.valid && row.state === 'PAID' && row.value >= 0);
  }
  function aggregateMonthlyIncome(rows, { now = new Date(), period = 'MAX' } = {}) {
    const normalized = uniqueEvents(rows);
    const all = normalized.filter(row => row.valid && row.state === 'PAID' && row.value >= 0);
    const valid = all.filter(row => row.month);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = period === '12M' || period === '24M' || period === '36M' ? Number(period.slice(0, -1)) : null;
    const start = count ? new Date(end.getFullYear(), end.getMonth() - count + 1, 1) : null;
    const filtered = start ? valid.filter(row => row.month >= `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}` && row.month <= `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`) : valid;
    const map = new Map();
    filtered.forEach(row => {
      const item = map.get(row.month) || { month: row.month, paidDividend: 0, paidJcp: 0, paidFiiIncome: 0, paidOther: 0, paidTotal: 0, eventCount: 0 };
      const key = row.type === 'DIVIDEND' ? 'paidDividend' : row.type === 'JCP' ? 'paidJcp' : row.type === 'FII_INCOME' ? 'paidFiiIncome' : 'paidOther';
      item[key] += row.value; item.paidTotal += row.value; item.eventCount += 1; map.set(row.month, item);
    });
    const result = [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
    const firstDate = result[0]?.month ? `${result[0].month}-01` : '';
    const lastDate = result.at(-1)?.month ? `${result.at(-1).month}-01` : '';
    const paidCandidates = normalized.filter(row => row.state === 'PAID');
    return { rows: result, total: result.reduce((sum, row) => sum + row.paidTotal, 0), coverage: coverageOf({ totalRows: paidCandidates.length, validRows: valid.length, firstDate, lastDate }), eventCount: filtered.length, state: 'PAID' };
  }
  function aggregateBy(rows, key) {
    const paid = paidEvents(rows); const map = new Map();
    paid.forEach(row => { const name = text(row[key]) || 'UNKNOWN'; const item = map.get(name) || { name, paidIncome: 0, eventCount: 0 }; item.paidIncome += row.value; item.eventCount += 1; map.set(name, item); });
    const total = paid.reduce((sum, row) => sum + row.value, 0);
    return [...map.values()].sort((a, b) => b.paidIncome - a.paidIncome || a.name.localeCompare(b.name)).map(row => ({ ...row, shareOfCoveredIncome: total ? row.paidIncome / total : null, coverage: paid.length ? 'FULL_COVERAGE' : 'UNKNOWN' }));
  }
  function aggregateIncomeByAsset(rows) { return aggregateBy(rows, 'ticker'); }
  function aggregateIncomeByClass(rows) { return aggregateBy(rows, 'className'); }
  function aggregateIncomeByType(rows) { return aggregateBy(rows, 'type'); }
  function buildIncomeCalendar(rows) {
    return uniqueEvents(rows).filter(row => row.valid && (row.state === 'PAID' || row.state === 'ANNOUNCED')).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.ticker.localeCompare(b.ticker));
  }
  function buildDividendIntelligence({ rows = [], now = new Date() } = {}) {
    const events = uniqueEvents(rows); const paid = events.filter(row => row.state === 'PAID' && row.valid);
    const monthly = aggregateMonthlyIncome(events, { now, period: 'MAX' });
    const ytd = paid.filter(row => row.date.startsWith(String(now.getFullYear()))).reduce((sum, row) => sum + row.value, 0);
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1); const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const ttm = paid.filter(row => row.month >= startKey && row.month <= `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).reduce((sum, row) => sum + row.value, 0);
    return { version: 'V253_DIVIDEND_INTELLIGENCE_V1', writeEnabled: false, events, paidEvents: paid, monthly, ytdPaidIncome: ytd, ttmPaidIncome: ttm, byAsset: aggregateIncomeByAsset(events), byClass: aggregateIncomeByClass(events), byType: aggregateIncomeByType(events), calendar: buildIncomeCalendar(events), semantics: { paidIsRealized: true, announcedIsNotPaid: true, estimatedIsNotPaid: true, unknownIsNotZero: true, partialIsNotComplete: true } };
  }
  return { normalizeIncomeEvent, classifyIncomeState: stateOf, aggregateMonthlyIncome, aggregateIncomeByAsset, aggregateIncomeByClass, aggregateIncomeByType, buildIncomeCalendar, buildDividendIntelligence };
});
