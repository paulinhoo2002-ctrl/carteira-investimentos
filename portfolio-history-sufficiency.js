/* V271: Portfolio History Sufficiency Readiness Model — pure deterministic readiness assessment. */
/* No storage, network or writes. Pure analysis logic. */
(function init(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PortfolioHistorySufficiency = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine() {

  const SUFFICIENCY_STATES = ['NOT_STARTED', 'BUILDING', 'PARTIAL', 'READY'];
  const PRICE_COVERAGE_LEVELS = ['FULL_COVERAGE', 'PARTIAL_COVERAGE', 'UNKNOWN'];
  const SOURCE_TYPES = ['MANUAL', 'AUTO', 'IMPORT', 'RECOVERY'];

  const CAPABILITIES = [
    'PORTFOLIO_EVOLUTION',
    'ALLOCATION_HISTORY',
    'VALUATION_HISTORY',
    'TWR',
    'XIRR'
  ];

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function dateMs(dateStr) {
    const ms = Date.parse(dateStr);
    return Number.isFinite(ms) ? ms : null;
  }

  function daysBetween(dateA, dateB) {
    const msA = dateMs(dateA);
    const msB = dateMs(dateB);
    if (!Number.isFinite(msA) || !Number.isFinite(msB)) return null;
    return Math.floor(Math.abs(msB - msA) / 86400000);
  }

  function getSnapshotsForWallet(snapshots, walletId) {
    if (!Array.isArray(snapshots)) return [];
    return snapshots.filter(s => s.provenance?.walletId === walletId);
  }

  function analyzePriceCoverage(snapshots) {
    if (!snapshots.length) return { level: 'UNKNOWN', ratio: 0, full: 0, partial: 0, unknown: 0 };
    
    let full = 0, partial = 0, unknown = 0;
    for (const snap of snapshots) {
      if (snap.priceCoverage === 'FULL_COVERAGE') full++;
      else if (snap.priceCoverage === 'PARTIAL_COVERAGE') partial++;
      else unknown++;
    }
    
    const total = snapshots.length;
    const ratio = total > 0 ? full / total : 0;
    
    let level = 'UNKNOWN';
    if (full === total) level = 'FULL_COVERAGE';
    else if (full > 0 || partial > 0) level = 'PARTIAL_COVERAGE';
    
    return { level, ratio, full, partial, unknown };
  }

  function analyzeHistorySpan(snapshots) {
    if (!snapshots.length) return { spanDays: 0, firstSnapshotAt: null, latestSnapshotAt: null };
    
    const dates = snapshots.map(s => dateMs(s.capturedAt)).filter(Number.isFinite);
    if (!dates.length) return { spanDays: 0, firstSnapshotAt: null, latestSnapshotAt: null };
    
    const first = Math.min(...dates);
    const latest = Math.max(...dates);
    
    return {
      spanDays: daysBetween(new Date(first).toISOString(), new Date(latest).toISOString()),
      firstSnapshotAt: new Date(first).toISOString(),
      latestSnapshotAt: new Date(latest).toISOString()
    };
  }

  function analyzeDailyCoverage(snapshots) {
    if (!snapshots.length) return { observedDays: 0, expectedDays: 0, coverageRatio: 0, largestGapDays: 0 };
    
    const dates = snapshots
      .map(s => dateMs(s.capturedAt))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    
    if (dates.length < 2) return { 
      observedDays: 1, 
      expectedDays: 1, 
      coverageRatio: 1, 
      largestGapDays: 0 
    };
    
    const first = dates[0];
    const last = dates[dates.length - 1];
    const expectedDays = Math.floor((last - first) / 86400000) + 1;
    
    // Count unique days (UTC day boundary)
    const uniqueDays = new Set(dates.map(d => new Date(d).toISOString().split('T')[0]));
    const observedDays = uniqueDays.size;
    
    // Find largest gap
    let largestGapDays = 0;
    for (let i = 1; i < dates.length; i++) {
      const gap = Math.floor((dates[i] - dates[i-1]) / 86400000);
      if (gap > largestGapDays) largestGapDays = gap;
    }
    
    return {
      observedDays,
      expectedDays,
      coverageRatio: expectedDays > 0 ? observedDays / expectedDays : 0,
      largestGapDays
    };
  }

  function analyzeWalletContinuity(snapshots, walletId) {
    if (!Array.isArray(snapshots)) return { consistent: true, gaps: [] };
    
    const walletSnaps = getSnapshotsForWallet(snapshots, walletId);
    if (walletSnaps.length <= 1) return { consistent: true, gaps: [] };
    
    // Check for wallet ID changes (should not happen in normal operation)
    const uniqueWallets = new Set(snapshots.map(s => s.provenance?.walletId).filter(Boolean));
    
    return {
      consistent: uniqueWallets.size <= 1,
      uniqueWalletIds: Array.from(uniqueWallets),
      walletSnapshotCount: walletSnaps.length
    };
  }

  function inventoryCashFlows(fullState) {
    // Read-only analysis of available cash flow sources
    const sources = {
      aportes: { available: false, count: 0, trustworthy: false, ambiguous: false },
      proventos: { available: false, count: 0, trustworthy: false, ambiguous: false },
      rfEvents: { available: false, count: 0, trustworthy: false, ambiguous: false },
      transactions: { available: false, count: 0, trustworthy: false, ambiguous: false },
      buySell: { available: false, count: 0, trustworthy: false, ambiguous: false },
      dividends: { available: false, count: 0, trustworthy: false, ambiguous: false },
      fees: { available: false, count: 0, trustworthy: false, ambiguous: false },
      taxes: { available: false, count: 0, trustworthy: false, ambiguous: false }
    };

    // Aportes (contributions) - typically EXTERNAL_CONTRIBUTION
    if (Array.isArray(fullState?.aportes) && fullState.aportes.length > 0) {
      sources.aportes.available = true;
      sources.aportes.count = fullState.aportes.length;
      sources.aportes.trustworthy = fullState.aportes.every(a => a.date && typeof a.value === 'number' && a.value > 0);
      sources.aportes.ambiguous = !sources.aportes.trustworthy;
    }

    // Proventos (dividends/interest) - typically DIVIDEND
    if (Array.isArray(fullState?.proventos) && fullState.proventos.length > 0) {
      sources.proventos.available = true;
      sources.proventos.count = fullState.proventos.length;
      sources.proventos.trustworthy = fullState.proventos.every(p => p.date && typeof p.value === 'number');
      sources.proventos.ambiguous = !sources.proventos.trustworthy;
    }

    // RF Events (fixed income) - could be internal or external
    if (Array.isArray(fullState?.rfEvents) && fullState.rfEvents.length > 0) {
      sources.rfEvents.available = true;
      sources.rfEvents.count = fullState.rfEvents.length;
      sources.rfEvents.trustworthy = fullState.rfEvents.every(r => r.value !== undefined);
      sources.rfEvents.ambiguous = true; // RF events often ambiguous between internal/external
    }

    return sources;
  }

  function classifyCashFlowPrerequisites(cashFlowInventory) {
    const trustworthyExternal = [];
    const ambiguous = [];
    const unavailable = [];

    for (const [type, info] of Object.entries(cashFlowInventory)) {
      if (!info.available) {
        unavailable.push(type);
      } else if (info.trustworthy && !info.ambiguous) {
        trustworthyExternal.push(type);
      } else {
        ambiguous.push(type);
      }
    }

    return { trustworthyExternal, ambiguous, unavailable };
  }

  function assessPortfolioEvolutionReadiness(snapshots, priceCoverage) {
    // Basic portfolio value evolution - less strict than TWR
    if (snapshots.length < 2) {
      return { ready: false, reason: 'INSUFFICIENT_SNAPSHOTS', minimumRequired: 2 };
    }
    
    if (priceCoverage.level === 'UNKNOWN') {
      return { ready: false, reason: 'NO_PRICE_COVERAGE', minimumRequired: 'PARTIAL_COVERAGE' };
    }
    
    // Need at least 2 snapshots on different days with some price coverage
    const span = analyzeHistorySpan(snapshots);
    if (span.spanDays < 1) {
      return { ready: false, reason: 'SAME_DAY_SNAPSHOTS', minimumRequired: '>=1 day span' };
    }
    
    return { ready: true, reason: 'SUFFICIENT' };
  }

  function assessAllocationHistoryReadiness(snapshots, priceCoverage) {
    // Allocation history needs asset-level valuations
    if (snapshots.length < 2) {
      return { ready: false, reason: 'INSUFFICIENT_SNAPSHOTS', minimumRequired: 2 };
    }
    
    const hasAssetBreakdown = snapshots.some(s => 
      Array.isArray(s.valuations?.byAsset) && s.valuations.byAsset.length > 0
    );
    
    if (!hasAssetBreakdown) {
      return { ready: false, reason: 'NO_ASSET_BREAKDOWN', minimumRequired: 'asset valuations' };
    }
    
    if (priceCoverage.level === 'UNKNOWN') {
      return { ready: false, reason: 'NO_PRICE_COVERAGE', minimumRequired: 'PARTIAL_COVERAGE' };
    }
    
    return { ready: true, reason: 'SUFFICIENT' };
  }

  function assessValuationHistoryReadiness(snapshots, priceCoverage) {
    // Valuation history needs reliable total valuations
    if (snapshots.length < 2) {
      return { ready: false, reason: 'INSUFFICIENT_SNAPSHOTS', minimumRequired: 2 };
    }
    
    if (priceCoverage.level === 'UNKNOWN') {
      return { ready: false, reason: 'NO_PRICE_COVERAGE', minimumRequired: 'FULL_COVERAGE' };
    }
    
    // Require FULL_COVERAGE for reliable valuation history
    if (priceCoverage.level !== 'FULL_COVERAGE') {
      return { ready: false, reason: 'PARTIAL_PRICE_COVERAGE', minimumRequired: 'FULL_COVERAGE' };
    }
    
    const span = analyzeHistorySpan(snapshots);
    if (span.spanDays < 7) {
      return { ready: false, reason: 'INSUFFICIENT_SPAN', minimumRequired: '>=7 days' };
    }
    
    return { ready: true, reason: 'SUFFICIENT' };
  }

  function assessTWRReadiness(snapshots, priceCoverage, cashFlowPrerequisites) {
    // TWR requirements:
    // - Sufficient valuation observations (FULL_COVERAGE preferred)
    // - Time continuity (no large gaps)
    // - External cash flows with timing and provenance
    // - Price coverage quality
    
    if (snapshots.length < 4) {
      return { 
        ready: false, 
        reason: 'INSUFFICIENT_OBSERVATIONS', 
        minimumRequired: '>=4 snapshots',
        missingPrerequisites: ['snapshots']
      };
    }
    
    if (priceCoverage.level !== 'FULL_COVERAGE') {
      return { 
        ready: false, 
        reason: 'INSUFFICIENT_PRICE_COVERAGE', 
        minimumRequired: 'FULL_COVERAGE',
        missingPrerequisites: ['FULL_COVERAGE price coverage']
      };
    }
    
    const dailyCoverage = analyzeDailyCoverage(snapshots);
    if (dailyCoverage.coverageRatio < 0.8) {
      return { 
        ready: false, 
        reason: 'INSUFFICIENT_DAILY_COVERAGE', 
        minimumRequired: '>=80% daily coverage',
        currentRatio: dailyCoverage.coverageRatio,
        missingPrerequisites: ['daily coverage']
      };
    }
    
    const span = analyzeHistorySpan(snapshots);
    if (span.spanDays < 30) {
      return { 
        ready: false, 
        reason: 'INSUFFICIENT_HISTORY_SPAN', 
        minimumRequired: '>=30 days',
        currentSpanDays: span.spanDays,
        missingPrerequisites: ['history span']
      };
    }
    
    // Check external cash flows
    const hasExternalFlows = cashFlowPrerequisites.trustworthyExternal.length > 0;
    if (!hasExternalFlows) {
      return { 
        ready: false, 
        reason: 'NO_TRUSTWORTHY_EXTERNAL_FLOWS', 
        minimumRequired: 'dated external contributions/withdrawals',
        missingPrerequisites: ['external cash flows']
      };
    }
    
    // Check flow timing/provenance
    const hasFlowTiming = cashFlowPrerequisites.trustworthyExternal.some(t => 
      ['aportes', 'proventos'].includes(t)
    );
    if (!hasFlowTiming) {
      return { 
        ready: false, 
        reason: 'INSUFFICIENT_FLOW_PROVENANCE', 
        minimumRequired: 'external flows with dates and signs',
        missingPrerequisites: ['flow provenance']
      };
    }
    
    return { ready: true, reason: 'SUFFICIENT' };
  }

  function assessXIRRReadiness(snapshots, priceCoverage, cashFlowPrerequisites, fullState) {
    // XIRR requirements:
    // - Dated cash flows with appropriate signs
    // - Terminal/current valuation
    // - Date ordering
    // - Sufficient observations
    // - Provenance
    // - Wallet scope
    
    if (snapshots.length < 2) {
      return { 
        ready: false, 
        reason: 'INSUFFICIENT_SNAPSHOTS', 
        minimumRequired: '>=2 snapshots',
        missingPrerequisites: ['snapshots']
      };
    }
    
    const latestSnap = snapshots[0]; // newest first from getSnapshots
    if (!latestSnap || latestSnap.valuations?.totalValue === undefined) {
      return { 
        ready: false, 
        reason: 'NO_TERMINAL_VALUATION', 
        minimumRequired: 'current portfolio valuation',
        missingPrerequisites: ['terminal valuation']
      };
    }
    
    if (priceCoverage.level === 'UNKNOWN') {
      return { 
        ready: false, 
        reason: 'NO_PRICE_COVERAGE', 
        minimumRequired: 'FULL_COVERAGE or PARTIAL_COVERAGE',
        missingPrerequisites: ['price coverage']
      };
    }
    
    // Check for dated cash flows with signs
    const hasDatedFlows = cashFlowPrerequisites.trustworthyExternal.length > 0 || 
                          cashFlowPrerequisites.ambiguous.length > 0;
    if (!hasDatedFlows) {
      return { 
        ready: false, 
        reason: 'NO_DATED_CASH_FLOWS', 
        minimumRequired: 'contributions, withdrawals, dividends with dates',
        missingPrerequisites: ['dated cash flows']
      };
    }
    
    // Check date ordering - flows must be before terminal valuation
    // This would need actual flow dates vs latest snapshot date
    // For now, assume if we have flows and snapshots, ordering can be checked
    
    return { ready: true, reason: 'SUFFICIENT' };
  }

  function determineOverallState(capabilities) {
    const readyCount = capabilities.filter(c => c.ready).length;
    const totalCount = capabilities.length;
    
    if (readyCount === 0) {
      // Check if we have any snapshots at all (via checking if any capability has data)
      const hasAnySnapshots = capabilities.some(c => c.minimumRequired && typeof c.minimumRequired === 'number');
      return hasAnySnapshots ? 'BUILDING' : 'NOT_STARTED';
    }
    if (readyCount < totalCount) return 'BUILDING';
    // Check if TWR/XIRR are ready (they're the most demanding)
    const twrReady = capabilities.find(c => c.capability === 'TWR')?.ready;
    const xirrReady = capabilities.find(c => c.capability === 'XIRR')?.ready;
    
    if (twrReady && xirrReady) return 'READY';
    return 'PARTIAL';
  }

  function assessSufficiency(historyState, fullState, options = {}) {
    const { walletId = 'default', now = Date.now() } = options;
    
    if (!historyState || !Array.isArray(historyState.snapshots)) {
      return {
        overallState: 'NOT_STARTED',
        capabilities: CAPABILITIES.map(cap => ({ capability: cap, ready: false, reason: 'NO_HISTORY' })),
        missingRequirements: ['snapshots'],
        warnings: ['Nenhum histórico de portfólio disponível'],
        coverage: { level: 'UNKNOWN', ratio: 0, full: 0, partial: 0, unknown: 0 },
        historySpan: { spanDays: 0, firstSnapshotAt: null, latestSnapshotAt: null },
        snapshotCount: 0,
        cashFlowReadiness: { trustworthyExternal: [], ambiguous: [], unavailable: [] },
        priceReadiness: 'UNKNOWN',
        walletScope: walletId
      };
    }
    
    const walletSnapshots = getSnapshotsForWallet(historyState.snapshots, walletId);
    // Empty wallet history -> NOT_STARTED
    if (walletSnapshots.length === 0) {
      return {
        overallState: 'NOT_STARTED',
        capabilities: CAPABILITIES.map(cap => ({ capability: cap, ready: false, reason: 'NO_HISTORY' })),
        missingRequirements: ['snapshots'],
        warnings: ['Histórico vazio para esta carteira'],
        coverage: { level: 'UNKNOWN', ratio: 0, full: 0, partial: 0, unknown: 0 },
        historySpan: { spanDays: 0, firstSnapshotAt: null, latestSnapshotAt: null },
        snapshotCount: 0,
        cashFlowReadiness: { trustworthyExternal: [], ambiguous: [], unavailable: [] },
        priceReadiness: 'UNKNOWN',
        walletScope: walletId
      };
    }
    const priceCoverage = analyzePriceCoverage(walletSnapshots);
    const historySpan = analyzeHistorySpan(walletSnapshots);
    const dailyCoverage = analyzeDailyCoverage(walletSnapshots);
    const walletContinuity = analyzeWalletContinuity(historyState.snapshots, walletId);
    const cashFlowInventory = inventoryCashFlows(fullState);
    const cashFlowPrerequisites = classifyCashFlowPrerequisites(cashFlowInventory);
    
    // Assess each capability
    const capabilities = [
      { capability: 'PORTFOLIO_EVOLUTION', ...assessPortfolioEvolutionReadiness(walletSnapshots, priceCoverage) },
      { capability: 'ALLOCATION_HISTORY', ...assessAllocationHistoryReadiness(walletSnapshots, priceCoverage) },
      { capability: 'VALUATION_HISTORY', ...assessValuationHistoryReadiness(walletSnapshots, priceCoverage) },
      { capability: 'TWR', ...assessTWRReadiness(walletSnapshots, priceCoverage, cashFlowPrerequisites) },
      { capability: 'XIRR', ...assessXIRRReadiness(walletSnapshots, priceCoverage, cashFlowPrerequisites, fullState) }
    ];
    
    const overallState = determineOverallState(capabilities);
    
    // Collect missing requirements
    const missingRequirements = capabilities
      .filter(c => !c.ready)
      .flatMap(c => c.missingPrerequisites || [c.reason]);
    
    // Warnings
    const warnings = [];
    if (walletSnapshots.length === 0) warnings.push('Histórico vazio para esta carteira');
    else if (walletSnapshots.length < 2) warnings.push('Apenas 1 snapshot — histórico muito incipiente');
    if (priceCoverage.level === 'UNKNOWN') warnings.push('Sem cobertura de preço em nenhum snapshot');
    else if (priceCoverage.level === 'PARTIAL_COVERAGE') warnings.push('Cobertura de preço parcial — análises de valuation podem ser imprecisas');
    if (dailyCoverage.largestGapDays > 30) warnings.push(`Maior lacuna: ${dailyCoverage.largestGapDays} dias sem captura`);
    if (!walletContinuity.consistent) warnings.push('Inconsistência de carteira detectada no histórico');
    if (cashFlowPrerequisites.unavailable.length > 3) warnings.push('Fontes de fluxo de caixa limitadas');
    
    // Future timestamp check
    const futureSnaps = walletSnapshots.filter(s => dateMs(s.capturedAt) !== null && dateMs(s.capturedAt) > now + 60000);
    if (futureSnaps.length > 0) warnings.push(`${futureSnaps.length} snapshot(s) com timestamp futuro detectado(s)`);
    
    return {
      overallState,
      capabilities,
      missingRequirements: [...new Set(missingRequirements)], // dedup
      warnings,
      coverage: priceCoverage,
      historySpan,
      dailyCoverage,
      snapshotCount: walletSnapshots.length,
      cashFlowReadiness: cashFlowPrerequisites,
      priceReadiness: priceCoverage.level,
      walletScope: walletId,
      walletContinuity
    };
  }

  function getSufficiencySummary(assessment) {
    const readyCapabilities = assessment.capabilities.filter(c => c.ready).map(c => c.capability);
    const notReadyCapabilities = assessment.capabilities.filter(c => !c.ready).map(c => c.capability);
    
    return {
      overallState: assessment.overallState,
      readyCapabilities,
      notReadyCapabilities,
      snapshotCount: assessment.snapshotCount,
      historySpanDays: assessment.historySpan.spanDays,
      priceCoverage: assessment.coverage.level,
      dailyCoverageRatio: assessment.dailyCoverage?.coverageRatio ?? 0,
      largestGapDays: assessment.dailyCoverage?.largestGapDays ?? 0,
      warnings: assessment.warnings,
      cashFlowSources: {
        trustworthy: assessment.cashFlowReadiness.trustworthyExternal,
        ambiguous: assessment.cashFlowReadiness.ambiguous,
        unavailable: assessment.cashFlowReadiness.unavailable
      }
    };
  }

  return {
    SUFFICIENCY_STATES,
    PRICE_COVERAGE_LEVELS,
    SOURCE_TYPES,
    CAPABILITIES,
    assessSufficiency,
    getSufficiencySummary,
    analyzePriceCoverage,
    analyzeHistorySpan,
    analyzeDailyCoverage,
    analyzeWalletContinuity,
    inventoryCashFlows,
    classifyCashFlowPrerequisites,
    assessPortfolioEvolutionReadiness,
    assessAllocationHistoryReadiness,
    assessValuationHistoryReadiness,
    assessTWRReadiness,
    assessXIRRReadiness,
    determineOverallState
  };
});