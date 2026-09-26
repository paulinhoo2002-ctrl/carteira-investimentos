/* V271: Portfolio History Auto-Capture Coordinator — safe bounded daily automatic snapshot capture. */
/* No storage, network or writes. Pure coordination logic. */
(function init(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PortfolioHistoryAutoCapture = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine() {

  const AUTO_CAPTURE_SOURCE = 'AUTO';
  const DAILY_BASELINE_REASON = 'DAILY_BASELINE';
  const MIN_CAPTURE_INTERVAL_MS = 86400000; // 1 day in ms

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function dateMs(dateStr) {
    const ms = Date.parse(dateStr);
    return Number.isFinite(ms) ? ms : null;
  }

  function localDayBoundary(isoTimestamp, timezoneOffsetMinutes = null) {
    // If timezoneOffsetMinutes provided, use it; otherwise assume local time of runtime
    const date = new Date(isoTimestamp);
    if (timezoneOffsetMinutes !== null) {
      // Adjust for explicit timezone
      const localTime = date.getTime() + timezoneOffsetMinutes * 60000;
      return new Date(localTime).toISOString().split('T')[0];
    }
    // Use local timezone of runtime
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().split('T')[0];
  }

  function daysBetween(dateA, dateB, timezoneOffsetMinutes = null) {
    const dayA = localDayBoundary(dateA, timezoneOffsetMinutes);
    const dayB = localDayBoundary(dateB, timezoneOffsetMinutes);
    const msA = Date.parse(dayA + 'T00:00:00.000Z');
    const msB = Date.parse(dayB + 'T00:00:00.000Z');
    if (!Number.isFinite(msA) || !Number.isFinite(msB)) return null;
    return Math.floor((msB - msA) / 86400000);
  }

  function isFutureTimestamp(capturedAt, now = Date.now()) {
    const ms = dateMs(capturedAt);
    return ms !== null && ms > now + 60000; // Allow 60s clock skew
  }

  function hasValidPriceCoverage(snapshot) {
    return snapshot && ['FULL_COVERAGE', 'PARTIAL_COVERAGE'].includes(snapshot.priceCoverage);
  }

  function hasMeaningfulValuations(snapshot) {
    return snapshot &&
      typeof snapshot.valuations?.totalValue === 'number' &&
      snapshot.valuations.totalValue >= 0 &&
      Array.isArray(snapshot.valuations.byAsset) &&
      snapshot.valuations.byAsset.length > 0;
  }

  function canCreateHonestSnapshot(fullState) {
    // Check if we have a valid portfolio state with assets
    if (!fullState || !Array.isArray(fullState.assets)) return false;
    if (fullState.assets.length === 0) return false;
    
    // Check if we have at least some priced assets
    const pricedAssets = fullState.assets.filter(a => 
      typeof a.current_price === 'number' && a.current_price > 0 && 
      typeof a.qty === 'number' && a.qty > 0
    );
    return pricedAssets.length > 0;
  }

  function shouldAutoCapture(historyState, config, options = {}) {
    const { now = Date.now(), walletId = 'default', timezoneOffsetMinutes = null } = options;

    // Check if auto-capture is enabled
    if (!config?.autoCaptureEnabled) return { eligible: false, reason: 'DISABLED' };

    // Check if we have any snapshots for this wallet
    const snapshots = historyState?.snapshots || [];
    const walletSnapshots = snapshots.filter(s => s.provenance?.walletId === walletId);

    // First capture ever for this wallet
    if (walletSnapshots.length === 0) {
      return { eligible: true, reason: 'FIRST_CAPTURE' };
    }

    // Get the latest snapshot for this wallet
    const latest = walletSnapshots[walletSnapshots.length - 1]; // Oldest-first storage, so last is newest
    if (!latest || !latest.capturedAt) {
      return { eligible: true, reason: 'NO_VALID_LAST_CAPTURE' };
    }

    // Check for future timestamp anomaly
    if (isFutureTimestamp(latest.capturedAt, now)) {
      return { eligible: false, reason: 'FUTURE_TIMESTAMP_DETECTED', warning: 'Latest snapshot has future timestamp' };
    }

    // Check calendar day boundary (local day)
    const lastDay = localDayBoundary(latest.capturedAt, timezoneOffsetMinutes);
    const currentDay = localDayBoundary(new Date(now).toISOString(), timezoneOffsetMinutes);
    
    if (lastDay === currentDay) {
      return { eligible: false, reason: 'SAME_DAY_ALREADY_CAPTURED' };
    }

    // Check if enough calendar days have passed
    const daysSinceLast = daysBetween(latest.capturedAt, new Date(now).toISOString(), timezoneOffsetMinutes);
    const interval = config.captureIntervalDays || 1;
    
    if (daysSinceLast !== null && daysSinceLast >= interval) {
      return { eligible: true, reason: 'INTERVAL_ELAPSED', daysSinceLast };
    }

    return { eligible: false, reason: 'INTERVAL_NOT_ELAPSED', daysSinceLast };
  }

  // Concurrency protection: in-flight flag per wallet
  const inFlightByWallet = new Map();

  async function attemptAutoCapture(fullState, historyState, config, captureSnapshotFn, addSnapshotToHistoryFn, options = {}) {
    const { 
      walletId = 'default', 
      userId = 'auto',
      now = Date.now(),
      timezoneOffsetMinutes = null,
      provenanceExtra = {}
    } = options;

    // Concurrency check
    if (inFlightByWallet.get(walletId)) {
      return { 
        status: 'SKIPPED', 
        reason: 'CONCURRENT_CAPTURE_IN_PROGRESS',
        walletId 
      };
    }

    // Eligibility check
    const eligibility = shouldAutoCapture(historyState, config, { now, walletId, timezoneOffsetMinutes });
    if (!eligibility.eligible) {
      return { 
        status: 'SKIPPED', 
        reason: eligibility.reason,
        walletId,
        details: eligibility
      };
    }

    // Validate we can create an honest snapshot
    if (!canCreateHonestSnapshot(fullState)) {
      return { 
        status: 'SKIPPED', 
        reason: 'STATE_INSUFFICIENT_FOR_HONEST_SNAPSHOT',
        walletId
      };
    }

    // Mark in-flight
    inFlightByWallet.set(walletId, true);

    try {
      const capturedAt = new Date(now).toISOString();
      
      // Create snapshot with AUTO source
      const snapshot = await captureSnapshotFn(fullState, {
        source: AUTO_CAPTURE_SOURCE,
        captureReason: DAILY_BASELINE_REASON,
        capturedAt,
        walletId,
        userId,
        extra: { ...provenanceExtra, autoCapture: true }
      });

      // Validate snapshot quality
      if (!hasValidPriceCoverage(snapshot)) {
        console.warn('[PortfolioHistoryAutoCapture] Snapshot has UNKNOWN price coverage, proceeding anyway');
      }
      if (!hasMeaningfulValuations(snapshot)) {
        console.warn('[PortfolioHistoryAutoCapture] Snapshot has no meaningful valuations');
      }

      // Add to history
      const newHistoryState = addSnapshotToHistoryFn(historyState, snapshot, config);

      // Check if it was actually added (not deduped)
      const walletSnapshots = newHistoryState.snapshots.filter(s => s.provenance?.walletId === walletId);
      const wasAdded = walletSnapshots.length > (historyState.snapshots?.filter(s => s.provenance?.walletId === walletId).length || 0);

      return {
        status: wasAdded ? 'CREATED' : 'DUPLICATE',
        snapshot: {
          id: snapshot.id,
          capturedAt: snapshot.capturedAt,
          contentHash: snapshot.contentHash,
          priceCoverage: snapshot.priceCoverage,
          totalValue: snapshot.valuations.totalValue,
          assetCount: snapshot.valuations.byAsset.length,
          source: snapshot.source
        },
        reason: wasAdded ? 'AUTO_CAPTURE_CREATED' : 'AUTO_CAPTURE_DUPLICATE',
        walletId,
        eligibility
      };
    } catch (error) {
      return {
        status: 'FAILED',
        reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        walletId,
        eligibility
      };
    } finally {
      inFlightByWallet.delete(walletId);
    }
  }

  function resetConcurrencyLock(walletId = 'default') {
    inFlightByWallet.delete(walletId);
  }

  function getConcurrencyStatus() {
    const status = {};
    for (const [walletId, inFlight] of inFlightByWallet.entries()) {
      status[walletId] = inFlight;
    }
    return status;
  }

  return {
    AUTO_CAPTURE_SOURCE,
    DAILY_BASELINE_REASON,
    shouldAutoCapture,
    attemptAutoCapture,
    resetConcurrencyLock,
    getConcurrencyStatus,
    isFutureTimestamp,
    canCreateHonestSnapshot,
    localDayBoundary,
    daysBetween,
    MIN_CAPTURE_INTERVAL_MS
  };
});