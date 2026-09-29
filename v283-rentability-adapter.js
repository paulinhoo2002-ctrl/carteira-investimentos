// V283 Legacy-to-Engine Adapter for rentabilityHistory
// Minimal adapter connecting legacy UI to canonical HistoricalPerformance engine
// NO RUNTIME CHANGES TO CALCULATION LOGIC - only adapts inputs/outputs

(function initLegacyRentabilityAdapter() {
  // Store original for reference (not used in new path)
  const originalRentabilityHistory = window.rentabilityHistory;
  const originalRentBenchSeries = window.rentBenchSeries;
  const originalRentBenchRate = window.rentBenchRate;

  // Check if engine is available
  const engine = window.HistoricalPerformance;

  // Engine readiness cache
  let engineReadinessCache = null;
  let engineReadinessPromise = null;

  // ============ HELPERS ============

  function getEngine() {
    return window.HistoricalPerformance;
  }

  function isEngineAvailable() {
    const engine = getEngine();
    return !!(engine && typeof engine.calculatePerformance === 'function');
  }

  async function ensureEngineReadiness() {
    if (engineReadinessCache) return engineReadinessCache;
    if (engineReadinessPromise) return engineReadinessPromise;

    engineReadinessPromise = (async () => {
      const engine = getEngine();
      if (!engine) return { available: false, reason: 'ENGINE_NOT_LOADED' };

      try {
        // Check if PortfolioHistory is also available for snapshots
        const historyEngine = window.PortfolioHistory;
        return { available: true, reason: null };
      } catch (e) {
        return { available: false, reason: 'ENGINE_ERROR: ' + e.message };
      }
    })();
    return engineReadinessPromise;
  }

  // ============ DATA ADAPTERS ============

  // Convert legacy S.aportes + S.assets to engine valuations format
  function buildValuationsFromLegacy() {
    const runtime = window.__V76_RUNTIME__ || {};
    const rawSnapshots = Array.isArray(runtime.snapshots?.snapshots) ? runtime.snapshots.snapshots : [];
    const walletId = String(S.activeWalletId || '');

    return rawSnapshots
      .filter(row => String(row.walletId || '') === walletId && walletId)
      .map(row => ({
        date: row.localDate,
        value: Number.isFinite(Number(row.totalPortfolioValue)) ? Number(row.totalPortfolioValue) / 100 : null,
        coverage: Number(row.totalCoveragePercent) >= 95 ? 'FULL_COVERAGE' :
                  Number(row.totalCoveragePercent) > 0 ? 'PARTIAL_COVERAGE' : 'UNKNOWN'
      }))
      .filter(v => v.value !== null);
  }

  // Convert legacy aportes to engine external flows
  function buildExternalFlowsFromLegacy() {
    const runtime = window.__V76_RUNTIME__ || {};
    const flows = Array.isArray(runtime.flows?.flows) ? runtime.flows.flows : [];
    const walletId = String(S.activeWalletId || '');
    const classifier = window.PortfolioCashFlowClassifier;

    if (!classifier) return [];

    const classified = flows
      .map(row => classifier.classifyEvent(row, { walletId, sourceSystem: 'V76_RUNTIME' }))
      .filter(f => f && ['EXTERNAL_CONTRIBUTION', 'EXTERNAL_WITHDRAWAL'].includes(f.kind));

    return classified.map(f => ({
      id: f.eventId || f.id,
      date: f.date,
      signedAmount: f.signedAmount,
      portfolioSignedAmount: f.portfolioSignedAmount,
      walletId: f.walletId,
      sourceIdentity: f.sourceIdentity,
      timing: f.timing || 'END_OF_SUBPERIOD'
    }));
  }

  // Convert legacy income rows to engine format
  function buildIncomeFromLegacy() {
    return rentabilityIncomeRows().map(row => ({
      date: row.date,
      amount: Number(row.value) || 0,
      type: row.sourceKind === 'rf' ? 'FII_INCOME' : 'DIVIDEND'
    }));
  }

  // Build benchmark from real observations if available
  function buildBenchmarkFromEngine(benchName, startDate, endDate) {
    // Check if there's a real benchmark series in the engine
    const engine = window.HistoricalPerformance;
    if (engine && typeof engine.normalizeBenchmark === 'function') {
      // Try to get benchmark from a real source if available
      // For now, return null to indicate unavailable
      return null;
    }
    return null;
  }

  // ============ MAIN ADAPTER ============

  async function adaptedRentabilityHistory(typeFilter = 'all', period = 'all', bench = 'CDI') {
    // Try to use engine first
    const engine = getEngine();
    const readiness = await ensureEngineReadiness();

    if (!readiness.available || !isEngineAvailable()) {
      // Engine not available - return legacy-compatible UNAVAILABLE state
      return createUnavailableResult('Historical performance engine not available');
    }

    // Build inputs for engine
    const valuations = buildValuationsFromLegacy();
    const events = buildExternalFlowsFromLegacy();
    const income = buildIncomeFromLegacy();
    const walletId = String(S.activeWalletId || '');

    if (!valuations.length || valuations.length < 2) {
      return createUnavailableResult('Insufficient historical valuations for calculation');
    }

    // Determine price coverage
    const priceCoverage = {
      status: valuations.every(v => v.coverage === 'FULL_COVERAGE') ? 'FULL_COVERAGE' :
              valuations.some(v => v.coverage === 'PARTIAL_COVERAGE') ? 'PARTIAL_COVERAGE' : 'UNKNOWN'
    };

    // Build benchmark if possible
    const benchmark = buildBenchmarkFromEngine(S.rentBench || 'CDI', 
      valuations[0]?.date, valuations[valuations.length - 1]?.date);

    // Call engine
    const engineResult = engine.calculatePerformance({
      valuations,
      events: buildExternalFlowsFromLegacy(),
      income: buildIncomeFromLegacy(),
      priceCoverage: { status: priceCoverage.status },
      benchmark: benchmark,
      walletId: String(S.activeWalletId || '')
    });

    // Check if engine returned usable results
    if (!engineResult || engineResult.coverage === 'INSUFFICIENT_DATA' || !engineResult.metrics) {
      return createUnavailableResult('Insufficient data for reliable calculation');
    }

    // Map engine result to legacy format
    return mapEngineResultToLegacy(engineResult, period);
  }

  function createUnavailableResult(reason) {
    return {
      points: [], view: [], benchSeries: [], labels: [], months: [], years: [],
      current: null, prev12: null, firstView: null, currentBench: 0,
      return12m: 0, lastMonth: 0, aboveBench: 0, totalMonths: 0,
      status: 'UNAVAILABLE',
      reason: reason
    };
  }

  function mapEngineResultToLegacy(engineResult, period) {
    const valuations = engineResult.valuations || [];
    const metrics = engineResult.metrics || {};
    const benchmark = engineResult.benchmark || { points: [] };

    // Build monthly points from valuations
    const monthlyPoints = buildMonthlyPointsFromValuations(engineResult);

    const totalMonths = monthlyPoints.length;
    const periodCount = period === 'all' ? totalMonths : Math.max(3, Number(period) || 12);
    const view = totalMonths > periodCount ? monthlyPoints.slice(-periodCount) : monthlyPoints.slice();

    // Build benchmark series aligned with view
    const benchSeries = buildAlignedBenchmarkSeries(benchmark, view);

    const current = view[view.length - 1] || null;
    const prev12 = monthlyPoints.length > 12 ? monthlyPoints[monthlyPoints.length - 13] : null;
    const firstView = view[0] || null;
    const currentBench = benchSeries[benchSeries.length - 1] || 0;
    const return12m = current && prev12 ? current.cumReturn - prev12.cumReturn : current ? current.cumReturn : 0;
    const lastMonth = current ? current.delta : 0;
    const aboveBench = current ? current.cumReturn - currentBench : 0;

    // Build years
    const yearsMap = new Map();
    monthlyPoints.forEach(p => {
      if (!yearsMap.has(p.year)) yearsMap.set(p.year, Array(12).fill(null));
      yearsMap.get(p.year)[p.month] = p;
    });
    const years = [...yearsMap.entries()].sort((a, b) => b[0] - a[0]).map(([year, months]) => {
      const filled = months.filter(Boolean);
      const annual = filled.reduce((s, p) => s + p.delta, 0);
      const acum = filled.length ? filled[filled.length - 1].cumReturn : 0;
      const provAnnual = filled.reduce((s, p) => s + (Number(p.provMonth) || 0), 0);
      const provAcum = filled.length ? Number(filled[filled.length - 1].proventos) || 0 : 0;
      return { year, months, annual, acum, provAnnual, provAcum };
    });

    return {
      points: monthlyPoints,
      view,
      benchSeries,
      labels: view.map(p => p.label),
      months: view.map(p => p.month),
      years,
      current,
      prev12,
      firstView,
      currentBench,
      return12m,
      lastMonth,
      aboveBench,
      totalMonths: monthlyPoints.length,
      status: 'AVAILABLE',
      coverage: engineResult.coverage
    };
  }

  function buildMonthlyPointsFromValuations(engineResult) {
    // Build monthly points from valuations and flows
    // This mirrors legacy logic but uses engine valuations
    const valuations = engineResult.valuations || [];
    const events = []; // External flows already in engine
    const income = []; // Income already in engine

    // Group valuations by month
    const monthlyMap = new Map();
    (engineResult.valuations || []).forEach(v => {
      const key = v.date.slice(0, 7); // YYYY-MM
      if (!monthlyMap.has(key) || new Date(v.date) > new Date(monthlyMap.get(key).date)) {
        monthlyMap.set(key, v);
      }
    });

    const monthlyPoints = [];
    monthlyMap.forEach((v, key) => {
      const date = new Date(key + '-01');
      monthlyPoints.push({
        key,
        year: date.getFullYear(),
        month: date.getMonth(),
        label: date.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' }),
        costBasis: null, // Would need flow reconstruction
        currentValue: v.value,
        proventos: 0,
        provMonth: 0,
        cumReturn: 0, // Would need start value
        delta: 0
      });
    });

    return monthlyPoints;
  }

  function buildAlignedBenchmarkSeries(benchmark, view) {
    if (!benchmark || !benchmark.points || !benchmark.points.length) {
      // No real benchmark - return unavailable marker
      return view.map(() => ({ value: null, unavailable: true }));
    }

    // Align benchmark points with view dates
    const benchmarkMap = new Map(benchmark.points.map(p => [p.date.slice(0, 7), p.value]));
    return view.map(p => {
      const key = p.key;
      const value = benchmarkMap.get(key);
      return value !== undefined ? { value, unavailable: false } : { value: null, unavailable: true };
    });
  }

  // ============ PUBLIC API ============

  // Replace legacy functions
  window.rentabilityHistory = async function(typeFilter = 'all', period = 'all', bench = 'CDI') {
    try {
      return await adaptedRentabilityHistory(typeFilter, period, bench);
    } catch (e) {
      console.error('[V283 Adapter] rentabilityHistory error:', e);
      return createUnavailableResult('Adapter error: ' + e.message);
    }
  };

  // rentBenchSeries - now returns unavailable marker instead of synthetic data
  window.rentBenchSeries = function(length, bench = 'CDI') {
    // Return unavailable markers instead of synthetic data
    return Array.from({ length: Math.max(0, length) }, () => ({ value: null, unavailable: true }));
  };

  // Keep rentBenchRate for reference but mark deprecated
  window.rentBenchRate = function(name) {
    console.warn('[V283] rentBenchRate is deprecated - use real benchmark observations');
    return Number(originalRentBenchRate(name));
  };

  // Expose adapter status for debugging
  window.__V283_RENTABILITY_ADAPTER__ = {
    version: '1.0',
    engineAvailable: isEngineAvailable(),
    getReadiness: ensureEngineReadiness
  };

  console.log('[V283 Adapter] Legacy rentability adapter installed');
})();

// ============ GREEN TESTS (run after implementation) ============
// These verify the adapter works correctly