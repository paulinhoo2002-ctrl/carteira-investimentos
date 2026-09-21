/* V252: derived portfolio intelligence. Read-only, deterministic and storage-free. */
(function init(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PerformanceIntelligence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine() {
  const EPSILON = 1e-8;
  const finite = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const text = value => String(value ?? '').trim();
  const statusFor = (complete, hasRows) => !hasRows ? 'UNKNOWN' : complete ? 'FULL_COVERAGE' : 'PARTIAL_COVERAGE';

  function assetRow(asset = {}, index = 0) {
    const invested = finite(asset.invested ?? asset.applied ?? asset.costBasis ?? asset.avgCost);
    const current = finite(asset.current ?? asset.currentValue ?? asset.marketValue);
    const result = invested !== null && current !== null ? current - invested : null;
    return {
      id: text(asset.id) || `${text(asset.ticker || asset.name) || 'asset'}:${index}`,
      ticker: text(asset.ticker || asset.name),
      className: text(asset.className || asset.type || asset.assetClass) || 'UNKNOWN',
      sector: text(asset.sector) || 'UNKNOWN',
      invested,
      current,
      result,
      status: invested !== null && current !== null ? 'PASS' : 'INSUFFICIENT_DATA',
    };
  }

  function groupRows(rows, key) {
    const groups = new Map();
    rows.forEach(row => {
      const name = text(row[key]) || 'UNKNOWN';
      if (!groups.has(name)) groups.set(name, { name, invested: 0, current: 0, result: 0, complete: 0, incomplete: 0 });
      const group = groups.get(name);
      if (row.invested !== null && row.current !== null) {
        group.invested += row.invested;
        group.current += row.current;
        group.result += row.result;
        group.complete += 1;
      } else group.incomplete += 1;
    });
    return [...groups.values()].map(group => ({
      ...group,
      status: statusFor(group.incomplete === 0, group.complete + group.incomplete > 0),
      returnPct: group.invested > EPSILON ? (group.result / group.invested) * 100 : null,
    }));
  }

  function flowRows(rows = []) {
    return (Array.isArray(rows) ? rows : []).map((row, index) => {
      const amount = Math.abs(finite(row.amount ?? row.value ?? row.amountCents / 100) ?? NaN);
      if (!Number.isFinite(amount)) return null;
      const raw = text(row.type || row.kind || row.operation).toUpperCase();
      if (/WITHDRAW|RETIRADA|TRANSFER_OUT/.test(raw)) return { id: row.id || String(index), amount, kind: 'WITHDRAWAL' };
      if (/CONTRIBUT|APORTE|TRANSFER_IN/.test(raw)) return { id: row.id || String(index), amount, kind: 'CONTRIBUTION' };
      return null;
    }).filter(Boolean);
  }

  function incomeRows(rows = []) {
    return (Array.isArray(rows) ? rows : []).map((row, index) => {
      const amount = finite(row.amount ?? row.value);
      const state = text(row.state || row.status || row.kind).toUpperCase();
      if (amount === null || amount < 0 || /ANNOUNCED|PROJECTED|ESTIMATED/.test(state)) return null;
      return { id: row.id || String(index), amount, state: 'PAID' };
    }).filter(Boolean);
  }

  function realizedRows(rows = []) {
    return (Array.isArray(rows) ? rows : []).map((row, index) => {
      const amount = finite(row.result ?? row.realizedResult ?? row.profit);
      return amount === null ? null : { id: row.id || String(index), amount };
    }).filter(Boolean);
  }

  function buildPerformanceIntelligence({ assets = [], externalFlows = [], income = [], realized = [] } = {}) {
    const rows = (Array.isArray(assets) ? assets : []).map(assetRow);
    const complete = rows.filter(row => row.status === 'PASS');
    const totalCurrent = complete.reduce((sum, row) => sum + row.current, 0);
    const totalInvested = complete.reduce((sum, row) => sum + row.invested, 0);
    const allComplete = rows.length > 0 && complete.length === rows.length;
    const flows = flowRows(externalFlows);
    const contributions = flows.filter(row => row.kind === 'CONTRIBUTION').reduce((sum, row) => sum + row.amount, 0);
    const withdrawals = flows.filter(row => row.kind === 'WITHDRAWAL').reduce((sum, row) => sum + row.amount, 0);
    const paidIncomeRows = incomeRows(income);
    const paidIncome = paidIncomeRows.length ? paidIncomeRows.reduce((sum, row) => sum + row.amount, 0) : null;
    const realizedResult = realizedRows(realized);
    const hasRealized = realizedResult.length > 0;
    return {
      version: 'V252_PERFORMANCE_INTELLIGENCE_V1',
      writeEnabled: false,
      coverage: statusFor(allComplete, rows.length > 0),
      portfolio: {
        currentPatrimony: complete.length ? totalCurrent : null,
        investedCapital: complete.length ? totalInvested : null,
        unrealizedResult: allComplete ? totalCurrent - totalInvested : null,
        returnPct: allComplete && totalInvested > EPSILON ? ((totalCurrent - totalInvested) / totalInvested) * 100 : null,
        status: statusFor(allComplete, rows.length > 0),
      },
      cashFlow: {
        contributions: flows.length ? contributions : null,
        withdrawals: flows.length ? withdrawals : null,
        netContributions: flows.length ? contributions - withdrawals : null,
        status: flows.length ? 'PASS' : 'UNKNOWN',
      },
      income: { paid: paidIncome, status: paidIncomeRows.length ? 'PASS' : 'UNKNOWN' },
      realized: { value: hasRealized ? realizedResult.reduce((sum, row) => sum + row.amount, 0) : null, status: hasRealized ? 'PASS' : 'UNAVAILABLE' },
      byClass: groupRows(rows, 'className'),
      bySector: groupRows(rows, 'sector'),
      rows,
      semantics: { unknownIsNotZero: true, partialIsNotComplete: true, estimatedIsNotActual: true },
    };
  }

  function compareBenchmark({ portfolioReturn = null, benchmarkReturn = null, portfolioCoverage = 'UNKNOWN', benchmarkCoverage = 'UNKNOWN' } = {}) {
    const portfolio = finite(portfolioReturn), benchmark = finite(benchmarkReturn);
    const aligned = portfolioCoverage === 'FULL_COVERAGE' && benchmarkCoverage === 'FULL_COVERAGE';
    if (!aligned || portfolio === null || benchmark === null) return { status: 'UNAVAILABLE', value: null, reason: 'ALIGNED_COVERAGE_REQUIRED' };
    return { status: 'PASS', value: portfolio - benchmark, reason: 'ALIGNED_SAME_WINDOW' };
  }

  return { buildPerformanceIntelligence, compareBenchmark, assetRow, flowRows, incomeRows };
});
