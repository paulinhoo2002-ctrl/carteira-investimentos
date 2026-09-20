/* V248: derived historical/performance calculations. No storage, network or writes. */
(function init(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HistoricalPerformance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine() {
  const DAY = 86400000;
  const EPSILON = 1e-8;
  const FORMULA_VERSIONS = Object.freeze({
    simpleReturn: 'SIMPLE_RETURN_V1',
    twr: 'TWR_V1',
    xirr: 'XIRR_V1',
    incomeReturn: 'INCOME_RETURN_V1',
    capitalReturn: 'CAPITAL_RETURN_V1',
    historicalPatrimony: 'HISTORICAL_PATRIMONY_V1',
  });

  const numberOrNull = value => {
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  };
  const dateMs = value => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    const text = String(value ?? '').trim();
    if (!text) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text;
    const result = Date.parse(normalized);
    return Number.isFinite(result) ? result : null;
  };
  const isoDate = value => {
    const ms = dateMs(value);
    return ms === null ? null : new Date(ms).toISOString().slice(0, 10);
  };
  const sorted = (rows, mapper) => (Array.isArray(rows) ? rows : [])
    .map(mapper)
    .filter(Boolean)
    .sort((a, b) => a.dateMs - b.dateMs || String(a.id || '').localeCompare(String(b.id || '')));

  function classifyCashFlow(row = {}) {
    const raw = String(row.type ?? row.category ?? row.classification ?? row.operation ?? '').toUpperCase();
    if (/EXTERNAL_CONTRIBUTION|CONTRIBUTION|APORTE_EXTERNO|APORTE/.test(raw)) return { kind: 'EXTERNAL_CONTRIBUTION', sign: -1 };
    if (/EXTERNAL_WITHDRAWAL|WITHDRAWAL|RETIRADA_EXTERNA|RETIRADA/.test(raw)) return { kind: 'EXTERNAL_WITHDRAWAL', sign: 1 };
    if (/DIVIDEND|JCP|FII_INCOME|AMORTIZATION|INCOME|PROVENT/.test(raw)) return { kind: 'INCOME', sign: 0 };
    if (/BUY|COMPRA|SELL|VENDA|CUSTODY_TRANSFER|TRANSFER|STOCK_LOAN|CORPORATE_EVENT/.test(raw)) return { kind: 'INTERNAL', sign: 0 };
    return { kind: 'UNKNOWN', sign: 0 };
  }

  function normalizeExternalFlows(rows = []) {
    return sorted(rows, (row, index) => {
      const date = isoDate(row.date);
      const amount = numberOrNull(row.amount ?? row.value);
      const classification = classifyCashFlow(row);
      if (!date || amount === null || !['EXTERNAL_CONTRIBUTION', 'EXTERNAL_WITHDRAWAL'].includes(classification.kind)) return null;
      return { id: row.id ?? `${date}:${classification.kind}:${amount}:${index}`, date, dateMs: dateMs(date), amount: Math.abs(amount), type: classification.kind, signedAmount: Math.abs(amount) * classification.sign };
    });
  }

  function metric(status, value, extra = {}) {
    return { status, value: value === null || value === undefined ? null : value, ...extra };
  }

  function simpleReturn(startValue, endValue, externalFlows = []) {
    const start = numberOrNull(startValue), end = numberOrNull(endValue);
    if (start === null || end === null || start <= EPSILON || externalFlows.length) return metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.simpleReturn });
    return metric('PASS', (end - start) / start, { formula: FORMULA_VERSIONS.simpleReturn });
  }

  function twr(valuations, externalFlows) {
    const points = sorted(valuations, row => {
      const date = isoDate(row.date), value = numberOrNull(row.value);
      return date && value !== null ? { date, dateMs: dateMs(date), value } : null;
    });
    if (points.length < 2) return metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.twr, flowTiming: 'END_OF_SUBPERIOD' });
    let factor = 1;
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1], end = points[index];
      if (Math.abs(start.value) <= EPSILON) return metric('ERROR', null, { formula: FORMULA_VERSIONS.twr, reason: 'ZERO_START_VALUE' });
      const flow = externalFlows.filter(item => item.dateMs > start.dateMs && item.dateMs <= end.dateMs)
        .reduce((sum, item) => sum + item.signedAmount, 0);
      factor *= (end.value + flow) / start.value;
      if (!Number.isFinite(factor)) return metric('ERROR', null, { formula: FORMULA_VERSIONS.twr, reason: 'NON_FINITE_RESULT' });
    }
    return metric('PASS', factor - 1, { formula: FORMULA_VERSIONS.twr, flowTiming: 'END_OF_SUBPERIOD' });
  }

  function xirr(flows) {
    const rows = sorted(flows, row => {
      const date = isoDate(row.date), amount = numberOrNull(row.signedAmount ?? row.amount);
      return date && amount !== null ? { date, dateMs: dateMs(date), amount } : null;
    });
    if (rows.length < 2 || !rows.some(row => row.amount < 0) || !rows.some(row => row.amount > 0)) return metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.xirr });
    const base = rows[0].dateMs;
    const years = row => (row.dateMs - base) / DAY / 365;
    const npv = rate => rows.reduce((sum, row) => sum + row.amount / Math.pow(1 + rate, years(row)), 0);
    let low = -0.999999, high = 10;
    let lowValue = npv(low), highValue = npv(high);
    if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue * highValue > 0) return metric('NO_SOLUTION', null, { formula: FORMULA_VERSIONS.xirr });
    for (let index = 0; index < 200; index += 1) {
      const mid = (low + high) / 2;
      const value = npv(mid);
      if (!Number.isFinite(value)) return metric('ERROR', null, { formula: FORMULA_VERSIONS.xirr });
      if (Math.abs(value) <= 1e-8 || Math.abs(high - low) <= 1e-10) return metric('PASS', mid, { formula: FORMULA_VERSIONS.xirr, tolerance: 1e-8, iterations: index + 1 });
      if (lowValue * value <= 0) { high = mid; highValue = value; } else { low = mid; lowValue = value; }
    }
    return metric('NO_SOLUTION', null, { formula: FORMULA_VERSIONS.xirr });
  }

  function incomeRows(rows = []) {
    return sorted(rows, (row, index) => {
      const date = isoDate(row.date), amount = numberOrNull(row.amount ?? row.value);
      return date && amount !== null ? { id: row.id ?? `${date}:${index}`, date, dateMs: dateMs(date), amount, type: String(row.type || 'OTHER_INCOME').toUpperCase() } : null;
    });
  }

  function simulatePosition({ quantity, unitPrice, event = {} } = {}) {
    const beforeQty = numberOrNull(quantity), beforePrice = numberOrNull(unitPrice), ratio = numberOrNull(event.ratio);
    if (beforeQty === null || beforePrice === null || ratio === null || ratio <= 0) return { status: 'REVIEW_REQUIRED', writeEnabled: false };
    if (!['SPLIT', 'REVERSE_SPLIT'].includes(String(event.type || '').toUpperCase())) return { status: 'REVIEW_REQUIRED', writeEnabled: false };
    const multiplier = String(event.type).toUpperCase() === 'REVERSE_SPLIT' ? 1 / ratio : ratio;
    const afterQty = beforeQty * multiplier;
    const afterPrice = beforePrice / multiplier;
    const beforeValue = beforeQty * beforePrice;
    const afterValue = afterQty * afterPrice;
    return { status: 'SIMULATED', quantity: afterQty, unitPrice: afterPrice, totalValueBefore: beforeValue, totalValueAfter: afterValue, returnValue: Math.abs(beforeValue) <= EPSILON ? null : (afterValue - beforeValue) / beforeValue, writeEnabled: false };
  }

  function normalizeBenchmark(points = [], startDate, endDate) {
    const startMs = dateMs(startDate), endMs = dateMs(endDate);
    const valid = sorted(points, row => {
      const date = isoDate(row.date), value = numberOrNull(row.value);
      return date && value !== null && (startMs === null || dateMs(date) >= startMs) && (endMs === null || dateMs(date) <= endMs) ? { date, dateMs: dateMs(date), rawValue: value } : null;
    });
    if (!valid.length || Math.abs(valid[0].rawValue) <= EPSILON) return { coverage: 'UNKNOWN', points: [] };
    const base = valid[0].rawValue;
    return { coverage: valid.length >= 2 && (startMs === null || valid[0].dateMs === startMs) && (endMs === null || valid[valid.length - 1].dateMs === endMs) ? 'FULL_COVERAGE' : 'PARTIAL_COVERAGE', points: valid.map(row => ({ date: row.date, value: row.rawValue / base })) };
  }

  function buildYearEndPosition(rows = [], year) {
    const wantedYear = Number(year);
    const latest = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const date = isoDate(row.date);
      if (!date || (Number.isFinite(wantedYear) && Number(date.slice(0, 4)) !== wantedYear)) return;
      const previous = latest.get(String(row.ticker || row.assetId || ''));
      if (!previous || date >= previous.date) latest.set(String(row.ticker || row.assetId || ''), { ticker: String(row.ticker || row.assetId || ''), date, quantity: numberOrNull(row.quantity), value: numberOrNull(row.value), coverage: row.coverage || 'FULL_COVERAGE' });
    });
    return { year: wantedYear, rows: [...latest.values()].filter(row => row.ticker), coverage: [...latest.values()].some(row => row.coverage !== 'FULL_COVERAGE') ? 'PARTIAL_COVERAGE' : 'FULL_COVERAGE', writeEnabled: false };
  }

  function calculatePerformance({ valuations = [], events = [], income = [], priceCoverage = null, benchmark = null } = {}) {
    const points = sorted(valuations, row => {
      const date = isoDate(row.date), value = numberOrNull(row.value);
      return date && value !== null ? { date, dateMs: dateMs(date), value } : null;
    });
    const flows = normalizeExternalFlows(events);
    const incomes = incomeRows(income);
    const start = points[0]?.value ?? null, end = points[points.length - 1]?.value ?? null;
    const coverage = priceCoverage?.status || (points.length >= 2 ? 'FULL_COVERAGE' : 'INSUFFICIENT_DATA');
    const totalIncome = incomes.reduce((sum, row) => sum + row.amount, 0);
    const capitalEnd = end === null ? null : end - totalIncome;
    const metrics = {
      simpleReturn: simpleReturn(start, end, flows),
      twr: twr(points, flows),
      xirr: xirr([{ date: points[0]?.date, amount: -(start ?? 0) }, ...flows.map(flow => ({ date: flow.date, amount: flow.signedAmount })), { date: points.at(-1)?.date, amount: end ?? 0 }]),
      incomeReturn: flows.length || start === null || start <= EPSILON ? metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.incomeReturn, reason: flows.length ? 'EXTERNAL_FLOW_REQUIRES_SUBPERIOD_DECOMPOSITION' : undefined }) : metric('PASS', totalIncome / start, { formula: FORMULA_VERSIONS.incomeReturn }),
      capitalReturn: flows.length || start === null || start <= EPSILON || capitalEnd === null ? metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.capitalReturn, reason: flows.length ? 'EXTERNAL_FLOW_REQUIRES_SUBPERIOD_DECOMPOSITION' : undefined }) : metric('PASS', (capitalEnd - start) / start, { formula: FORMULA_VERSIONS.capitalReturn }),
      totalReturn: flows.length || start === null || start <= EPSILON || end === null ? metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.simpleReturn, reason: flows.length ? 'EXTERNAL_FLOW_REQUIRES_FLOW_ADJUSTED_METRIC' : undefined }) : metric('PASS', (end - start) / start, { formula: FORMULA_VERSIONS.simpleReturn }),
    };
    const benchmarkResult = benchmark ? normalizeBenchmark(benchmark.points || benchmark, points[0]?.date, points.at(-1)?.date) : { coverage: 'UNKNOWN', points: [] };
    return {
      formulaVersions: FORMULA_VERSIONS,
      coverage,
      valuations: points.map(({ date, value }) => ({ date, value })),
      externalFlows: flows,
      income: incomes,
      knownValue: end,
      missingAssets: priceCoverage?.missingAssets || [],
      metrics,
      benchmark: benchmarkResult,
      writeEnabled: false,
    };
  }

  return { FORMULA_VERSIONS, classifyCashFlow, normalizeExternalFlows, xirr, calculatePerformance, simulatePosition, normalizeBenchmark, buildYearEndPosition };
});
