// V283 Legacy-to-Engine Adapter for rentabilityHistory
// Minimal adapter connecting legacy UI to canonical HistoricalPerformance engine
// NO RUNTIME CHANGES TO CALCULATION LOGIC - only adapts inputs/outputs

(function initLegacyRentabilityAdapter() {
  // Store original for reference (not used in new path)
  const originalRentabilityHistory = window.rentabilityHistory;
  const originalRentBenchSeries = window.rentBenchSeries;

  // Check if engine is available
  const engine = window.HistoricalPerformance;

  // Engine readiness cache

  // ============ HELPERS ============

  function getEngine() {
    return window.HistoricalPerformance;
  }

  function isEngineAvailable() {
    const engine = getEngine();
    return !!(engine && typeof engine.calculatePerformance === 'function');
  }

  function ensureEngineReadiness() {
    const engine = getEngine();
    return engine && typeof engine.calculatePerformance === 'function'
      ? { available: true, reason: null }
      : { available: false, reason: 'ENGINE_NOT_LOADED' };
  }

  // ============ DATA ADAPTERS ============

  // Convert legacy S.aportes + S.assets to engine valuations format
  function buildValuationsFromLegacy() {
    const runtime = window.__V76_RUNTIME__ || {};
    const rawSnapshots = Array.isArray(runtime.snapshots?.snapshots) ? runtime.snapshots.snapshots : [];
    const walletId = String(S.activeWalletId || '');

    return rawSnapshots
      .filter(row => String(row.walletId || '') === walletId && walletId)
      .map(row => {
        const rawValue = row.totalPortfolioValue;
        const parsedValue = rawValue === null || rawValue === undefined || (typeof rawValue === 'string' && !rawValue.trim())
          ? null : Number(rawValue);
        return {
          date: row.localDate,
          value: parsedValue !== null && Number.isFinite(parsedValue) ? parsedValue / 100 : null,
          coverage: Number(row.totalCoveragePercent) >= 100 ? 'FULL_COVERAGE' :
                  Number(row.totalCoveragePercent) > 0 ? 'PARTIAL_COVERAGE' : 'UNKNOWN'
        };
      })
      .filter(v => v.value !== null);
  }

  // Convert legacy aportes to engine external flows
  function buildExternalFlowsFromLegacy() {
    const runtime = window.__V76_RUNTIME__ || {};
    const flows = Array.isArray(runtime.flows?.flows) ? runtime.flows.flows : [];
    const walletId = String(S.activeWalletId || '');
    const classifier = window.PortfolioCashFlowClassifier;

    if (!classifier) return [];

    const classified = flows.map(row => classifier.classifyEvent(row, { walletId, sourceSystem: 'V76_RUNTIME' }));
    return classified.filter(Boolean).map(flow => {
      const external = ['EXTERNAL_CONTRIBUTION', 'EXTERNAL_WITHDRAWAL'].includes(flow.classification);
      const classification = external && flow.isExternalFlow !== true
        ? 'AMBIGUOUS'
        : ['AMBIGUOUS', 'UNKNOWN'].includes(flow.classification)
          ? flow.classification
          : external ? flow.classification : 'INTERNAL';
      return { ...flow, type: classification, classification, isExternalFlow: external && flow.isExternalFlow === true };
    });
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

  function adaptedRentabilityHistory(typeFilter = 'all', period = 'all', bench = 'CDI') {
    // Try to use engine first
    const engine = getEngine();
    const readiness = ensureEngineReadiness();

    if (!readiness.available || !isEngineAvailable()) {
      // Engine not available - return legacy-compatible UNAVAILABLE state
      return createUnavailableResult('Historical performance engine not available');
    }

    // Build inputs for engine
    const valuations = buildValuationsFromLegacy();
    const events = buildExternalFlowsFromLegacy();
    const income = buildIncomeFromLegacy();
    const walletId = String(S.activeWalletId || '');

    if (String(typeFilter || 'all') !== 'all') {
      return createUnavailableResult('Asset-class historical valuations are not available');
    }
    if (String(period || 'all') !== 'all') {
      return createUnavailableResult('A dated opening valuation for the selected period is not available');
    }

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
      events,
      income,
      priceCoverage: { status: priceCoverage.status },
      benchmark: benchmark,
      walletId: String(S.activeWalletId || '')
    });

    // Check if engine returned usable results
    if (!engineResult || engineResult.coverage === 'INSUFFICIENT_DATA' || !engineResult.metrics) {
      return createUnavailableResult('Insufficient data for reliable calculation');
    }
    if (engineResult.coverage !== 'FULL_COVERAGE') {
      return { ...createUnavailableResult('Historical valuation coverage is not complete'), status: 'PARTIAL', coverage: engineResult.coverage };
    }

    // Map engine result to legacy format
    return mapEngineResultToLegacy(engineResult, period);
  }

  function createUnavailableResult(reason) {
    return {
      points: [], view: [], benchSeries: [], labels: [], months: [], years: [],
      current: null, prev12: null, firstView: null, currentBench: null,
      return12m: null, lastMonth: null, aboveBench: null, totalMonths: 0,
      status: 'UNAVAILABLE',
      reason: reason
    };
  }

  function mapEngineResultToLegacy(engineResult, period) {
    const metrics = engineResult.metrics || {};
    const twr = metrics.twr;
    const totalReturn = metrics.totalReturn;
    const selectedMetric = twr?.availability === 'AVAILABLE' && Number.isFinite(twr.value)
      ? { key: 'TWR', value: twr.value }
      : totalReturn?.availability === 'AVAILABLE' && Number.isFinite(totalReturn.value)
        ? { key: 'SIMPLE_RETURN', value: totalReturn.value }
        : null;
    if (!selectedMetric) return createUnavailableResult('No certified aggregate return is available');
    const valuations = engineResult.valuations || [];
    const lastValuation = valuations[valuations.length - 1] || null;
    const current = lastValuation ? {
      key: lastValuation.date.slice(0, 7), label: lastValuation.date,
      currentValue: lastValuation.value, cumReturn: selectedMetric.value * 100,
      delta: null, costBasis: null, proventos: null, provMonth: null
    } : null;

    return {
      points: [],
      view: [],
      benchSeries: [],
      labels: [],
      months: [],
      years: [],
      current,
      prev12: null,
      firstView: null,
      currentBench: null,
      return12m: null,
      lastMonth: null,
      aboveBench: null,
      totalMonths: 0,
      status: 'AVAILABLE',
      coverage: engineResult.coverage,
      metric: selectedMetric.key,
      period: engineResult.period,
      asOf: engineResult.asOf
    };
  }

  // ============ MAIN ADAPTER ============

  // Replace legacy functions
  window.rentabilityHistory = function(typeFilter = 'all', period = 'all', bench = 'CDI') {
    try {
      return adaptedRentabilityHistory(typeFilter, period, bench);
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
    return null;
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
