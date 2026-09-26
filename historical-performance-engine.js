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
    if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  };
  function validDate(value) {
    if (typeof value !== 'string') return value instanceof Date && Number.isFinite(value.getTime());
    const text = value.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})?)?$/.exec(text);
    if (!match) return false;
    const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone] = match;
    const year = Number(yearText), month = Number(monthText), day = Number(dayText);
    const calendar = new Date(Date.UTC(year, month - 1, day));
    if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return false;
    if (hourText !== undefined && (Number(hourText) > 23 || Number(minuteText) > 59 || Number(secondText) > 59)) return false;
    if (zone && zone !== 'Z') {
      const [hours, minutes] = zone.slice(1).split(':').map(Number);
      if (hours > 23 || minutes > 59) return false;
    }
    return Number.isFinite(Date.parse(text));
  }
  const dateMs = value => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    if (!validDate(value)) return null;
    const text = value.trim();
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
    if (['EXTERNAL_CONTRIBUTION', 'CONTRIBUTION', 'APORTE_EXTERNO', 'TRANSFER_IN_EXTERNAL'].includes(raw)) return { kind: 'EXTERNAL_CONTRIBUTION', sign: -1 };
    if (['EXTERNAL_WITHDRAWAL', 'WITHDRAWAL', 'RETIRADA_EXTERNA', 'TRANSFER_OUT_EXTERNAL'].includes(raw)) return { kind: 'EXTERNAL_WITHDRAWAL', sign: 1 };
    if (['DIVIDEND', 'JCP', 'FII_INCOME', 'AMORTIZATION', 'INCOME', 'PROVENTO'].includes(raw)) return { kind: 'INCOME', sign: 0 };
    if (['BUY', 'COMPRA', 'SELL', 'VENDA', 'CUSTODY_TRANSFER', 'TRANSFER_INTERNAL', 'STOCK_LOAN', 'CORPORATE_EVENT'].includes(raw)) return { kind: 'INTERNAL', sign: 0 };
    return { kind: 'UNKNOWN', sign: 0 };
  }

  function normalizeExternalFlows(rows = []) {
    const normalized = sorted(rows, (row, index) => {
      const date = typeof row?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && validDate(row.date) ? row.date : null;
      const amount = numberOrNull(row?.amount);
      const classification = String(row?.classification || '');
      if (!date || amount === null || amount <= 0 || row?.isExternalFlow !== true || row?.confidence !== 'HIGH' ||
        !row?.walletId || !row?.sourceIdentity || !row?.provenance?.sourceSystem || !(row?.provenance?.sourceId || row?.eventId || row?.id) ||
        !['EXTERNAL_CONTRIBUTION', 'EXTERNAL_WITHDRAWAL'].includes(classification)) return null;
      const expectedSign = classification === 'EXTERNAL_CONTRIBUTION' ? -1 : 1;
      const signedAmount = numberOrNull(row.investorSignedAmount);
      if (signedAmount !== amount * expectedSign) return null;
      return { id: row.eventId || row.id || `${date}:${classification}:${amount}:${index}`, date, dateMs: dateMs(date), amount, type: classification, signedAmount, portfolioSignedAmount: -signedAmount, walletId: row.walletId, sourceIdentity: row.sourceIdentity, timing: row.timing || null };
    });
    const identityCounts = normalized.reduce((counts, row) => counts.set(row.sourceIdentity, (counts.get(row.sourceIdentity) || 0) + 1), new Map());
    const duplicated = new Set([...identityCounts].filter(([, count]) => count > 1).map(([identity]) => identity));
    return normalized.filter(row => !duplicated.has(row.sourceIdentity));
  }

  function metric(status, value, extra = {}) {
    const availability = status === 'PASS' ? 'AVAILABLE'
      : status === 'INVALID_INPUT' ? 'INVALID_INPUT'
        : status === 'PARTIAL' ? 'PARTIAL' : 'UNAVAILABLE';
    return { status, availability, value: value === null || value === undefined ? null : value, ...extra };
  }

  function gatedMetric(result, coverage, reason) {
    const coverageStatus = coverage || 'UNKNOWN';
    if (coverageStatus !== 'FULL_COVERAGE') {
      return metric('INSUFFICIENT_DATA', null, {
        formula: result?.formula,
        coverage: coverageStatus,
        reason: reason || 'HISTORICAL_COVERAGE_INSUFFICIENT',
      });
    }
    return { ...result, coverage: coverageStatus };
  }

  function simpleReturn(startValue, endValue, externalFlows = []) {
    const start = numberOrNull(startValue), end = numberOrNull(endValue);
    if (start === null || end === null || start <= EPSILON || end < 0 || externalFlows.length) return metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.simpleReturn });
    return metric('PASS', (end - start) / start, { formula: FORMULA_VERSIONS.simpleReturn });
  }

  function twr(valuations, externalFlows) {
    const points = sorted(valuations, row => {
      const date = isoDate(row.date), value = numberOrNull(row.value);
      return date && value !== null ? { id: row.id ?? row.snapshotId ?? null, date, dateMs: dateMs(date), value } : null;
    });
    if (points.length < 2) return metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.twr, flowTiming: 'END_OF_SUBPERIOD' });
    if (points.some(point => point.value < 0)) return metric('INVALID_INPUT', null, { formula: FORMULA_VERSIONS.twr, reason: 'NEGATIVE_VALUATION' });
    const valuationDates = new Set(points.map(point => point.date));
    if (externalFlows.some(flow => flow.timing !== 'END_OF_SUBPERIOD' || !valuationDates.has(flow.date) || flow.date === points[0].date)) {
      return metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.twr, flowTiming: 'END_OF_SUBPERIOD', reason: 'FLOW_BOUNDARY_VALUATION_MISSING' });
    }
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

  function calculatePerformance({ valuations = [], events = [], income = [], priceCoverage = null, benchmark = null, walletId = null } = {}) {
    const points = sorted(valuations, row => {
      const date = isoDate(row.date), value = numberOrNull(row.value);
      return date && value !== null ? { date, dateMs: dateMs(date), value } : null;
    });
    const eventRows = Array.isArray(events) ? events : [];
    const normalizedFlows = normalizeExternalFlows(eventRows);
    const flows = walletId ? normalizedFlows.filter(flow => flow.walletId === walletId) : [];
    const possibleFlowEvidence = eventRows.filter(row =>
      ['EXTERNAL_CONTRIBUTION', 'EXTERNAL_WITHDRAWAL', 'AMBIGUOUS', 'UNKNOWN'].includes(row?.classification) ||
      ['EXTERNAL_CONTRIBUTION', 'EXTERNAL_WITHDRAWAL', 'UNKNOWN'].includes(classifyCashFlow(row).kind));
    const untrustedExternalFlowCount = Math.max(0, possibleFlowEvidence.length - flows.length);
    const incomes = incomeRows(income);
    const start = points[0]?.value ?? null, end = points[points.length - 1]?.value ?? null;
    const coverage = priceCoverage?.status || (points.length >= 2 ? 'FULL_COVERAGE' : 'INSUFFICIENT_DATA');
    const totalIncome = incomes.reduce((sum, row) => sum + row.amount, 0);
    const capitalEnd = end === null ? null : end - totalIncome;
    const unsafeFlowGate = result => untrustedExternalFlowCount
      ? metric('INSUFFICIENT_DATA', null, { formula: result?.formula, reason: 'UNTRUSTED_EXTERNAL_FLOW_EVIDENCE', untrustedExternalFlowCount })
      : result;
    const xirrInputs = flows.length && end !== null && points.at(-1)?.date
      ? [...flows.map(flow => ({ id: flow.id, date: flow.date, amount: flow.signedAmount })), { id: 'terminal-valuation', date: points.at(-1).date, amount: end }]
      : [];
    const metrics = {
      simpleReturn: gatedMetric(unsafeFlowGate(simpleReturn(start, end, flows)), coverage),
      twr: gatedMetric(unsafeFlowGate(twr(points, flows)), coverage),
      xirr: gatedMetric(unsafeFlowGate(xirr(xirrInputs)), coverage),
      incomeReturn: gatedMetric(flows.length || start === null || start <= EPSILON ? metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.incomeReturn, reason: flows.length ? 'EXTERNAL_FLOW_REQUIRES_SUBPERIOD_DECOMPOSITION' : undefined }) : metric('PASS', totalIncome / start, { formula: FORMULA_VERSIONS.incomeReturn }), coverage),
      capitalReturn: gatedMetric(flows.length || start === null || start <= EPSILON || capitalEnd === null ? metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.capitalReturn, reason: flows.length ? 'EXTERNAL_FLOW_REQUIRES_SUBPERIOD_DECOMPOSITION' : undefined }) : metric('PASS', (capitalEnd - start) / start, { formula: FORMULA_VERSIONS.capitalReturn }), coverage),
      totalReturn: gatedMetric(flows.length || start === null || start <= EPSILON || end === null ? metric('INSUFFICIENT_DATA', null, { formula: FORMULA_VERSIONS.simpleReturn, reason: flows.length ? 'EXTERNAL_FLOW_REQUIRES_FLOW_ADJUSTED_METRIC' : undefined }) : metric('PASS', (end - start) / start, { formula: FORMULA_VERSIONS.simpleReturn }), coverage),
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
      engineAvailability: { simpleReturn: true, twr: true, xirr: true },
      evidence: {
        valuationSnapshotIds: points.map(point => point.id).filter(Boolean),
        valuationCount: points.length,
        externalFlowIds: flows.map(flow => flow.id),
        externalFlowCount: flows.length,
        priceCoverage: coverage,
        historySpanDays: points.length > 1 ? Math.floor((points.at(-1).dateMs - points[0].dateMs) / DAY) : 0,
        calculationVersion: FORMULA_VERSIONS
      },
      period: { start: points[0]?.date || null, end: points.at(-1)?.date || null },
      asOf: points.at(-1)?.date || null,
      dataReadiness: { state: untrustedExternalFlowCount ? 'PARTIAL' : flows.length ? 'UNASSESSED' : 'UNAVAILABLE', untrustedExternalFlowCount, reason: untrustedExternalFlowCount ? 'UNTRUSTED_EXTERNAL_FLOW_EVIDENCE' : 'WALLET_READINESS_REQUIRED' },
      benchmark: benchmarkResult,
      writeEnabled: false,
    };
  }

  return { FORMULA_VERSIONS, validDate, classifyCashFlow, normalizeExternalFlows, xirr, calculatePerformance, simulatePosition, normalizeBenchmark, buildYearEndPosition };
});
