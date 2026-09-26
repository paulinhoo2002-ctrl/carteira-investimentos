/* V268: Portfolio History Foundation — deterministic snapshot capture with provenance. No storage, network or writes. */
(function init(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PortfolioHistory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine() {
  const FORMAT = 'carteira-portfolio-history';
  const VERSION = '1.0';
  const MAX_SNAPSHOTS = 3650;
  const MAX_AGE_DAYS = 3650;
  const DAY_MS = 86400000;

  const DANGEROUS_KEY = new Set(['__proto__', 'prototype', 'constructor']);

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function keyOrder(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function normalize(value, { stripSensitive = false } = {}) {
    if (Array.isArray(value)) {
      return value.map(item => normalize(item, { stripSensitive }));
    }
    if (!isRecord(value)) return value;
    const out = {};
    for (const key of Object.keys(value).sort(keyOrder)) {
      if (DANGEROUS_KEY.has(key)) throw new Error(`UNSAFE_KEY:${key}`);
      if (stripSensitive && /password|token|secret|credential/i.test(key)) continue;
      out[key] = normalize(value[key], { stripSensitive });
    }
    return out;
  }

  function canonical(value) {
    return JSON.stringify(normalize(value));
  }

  async function sha256(text) {
    if (typeof require === 'function') {
      try { return require('node:crypto').createHash('sha256').update(text, 'utf8').digest('hex'); } catch (_) { /* browser */ }
    }
    if (globalThis.crypto?.subtle) {
      const bytes = new TextEncoder().encode(text);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    throw new Error('SHA256_UNAVAILABLE');
  }

  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function dateMs(dateStr) {
    const ms = Date.parse(dateStr);
    return Number.isFinite(ms) ? ms : null;
  }

  function daysSince(dateStr) {
    const ms = dateMs(dateStr);
    return ms === null ? null : Math.floor((Date.now() - ms) / DAY_MS);
  }

  function computeValuations(state) {
    // Derive total value and per-asset breakdown from state
    // This reads from the current state without mutating
    const assets = Array.isArray(state?.assets) ? state.assets : [];
    const byAsset = assets.map(asset => ({
      id: asset.id,
      ticker: asset.ticker,
      quantity: typeof asset.qty === 'number' ? asset.qty : 0,
      currentPrice: typeof asset.current_price === 'number' ? asset.current_price : null,
      value: (typeof asset.qty === 'number' && typeof asset.current_price === 'number')
        ? asset.qty * asset.current_price
        : null
    }));
    const totalValue = byAsset
      .filter(a => a.value !== null)
      .reduce((sum, a) => sum + a.value, 0);
    return { totalValue, byAsset };
  }

  function computePriceCoverage(state) {
    const assets = Array.isArray(state?.assets) ? state.assets : [];
    if (assets.length === 0) return 'UNKNOWN';
    const priced = assets.filter(a => typeof a.current_price === 'number' && a.current_price > 0);
    return priced.length === assets.length ? 'FULL_COVERAGE' : 'PARTIAL_COVERAGE';
  }

  function historyPayloadForHash(valuations, priceCoverage, capturedAt) {
    return {
      valuations,
      priceCoverage,
      capturedAt,
      schemaVersion: 'portfolio-history-v1.0'
    };
  }

  function validateSnapshot(snapshot) {
    if (!isRecord(snapshot)) return 'INVALID_SNAPSHOT: not an object';
    if (snapshot.format !== FORMAT) return `INVALID_FORMAT: expected ${FORMAT}`;
    if (snapshot.version !== VERSION) return `INVALID_VERSION: expected ${VERSION}`;
    if (!snapshot.id || typeof snapshot.id !== 'string') return 'MISSING_ID';
    if (!snapshot.capturedAt || typeof snapshot.capturedAt !== 'string') return 'MISSING_CAPTURED_AT';
    if (!isRecord(snapshot.valuations)) return 'MISSING_VALUATIONS';
    if (!['FULL_COVERAGE', 'PARTIAL_COVERAGE', 'UNKNOWN'].includes(snapshot.priceCoverage)) return 'INVALID_PRICE_COVERAGE';
    if (!snapshot.contentHash || typeof snapshot.contentHash !== 'string') return 'MISSING_CONTENT_HASH';
    if (!isRecord(snapshot.provenance)) return 'MISSING_PROVENANCE';
    return null;
  }

  async function captureSnapshot(state, context = {}) {
    // context: { source: 'MANUAL|AUTO|IMPORT|RECOVERY', userId, walletId, captureReason, extra, capturedAt }
    const source = context?.source || 'MANUAL';
    const validSources = ['MANUAL', 'AUTO', 'IMPORT', 'RECOVERY'];
    if (!validSources.includes(source)) throw new Error(`INVALID_SOURCE:${source}`);

    const capturedAt = context?.capturedAt || nowIso();
    const valuations = computeValuations(state);
    const priceCoverage = computePriceCoverage(state);
    const historyPayload = historyPayloadForHash(valuations, priceCoverage, capturedAt);
    const contentHash = await sha256(canonical(historyPayload));

    const snapshot = {
      format: FORMAT,
      version: VERSION,
      id: uuid(),
      capturedAt,
      source,
      provenance: {
        userId: context?.userId || 'unknown',
        walletId: context?.walletId || 'unknown',
        captureReason: context?.captureReason || 'manual',
        extra: context?.extra || {}
      },
      valuations,
      priceCoverage,
      contentHash,
      schemaVersion: 'portfolio-history-v1.0'
    };

    const validationError = validateSnapshot(snapshot);
    if (validationError) throw new Error(`SNAPSHOT_VALIDATION_FAILED:${validationError}`);

    return snapshot;
  }

  function getSnapshots(historyState, filter = {}) {
    if (!historyState?.snapshots || !Array.isArray(historyState.snapshots)) return [];

    let result = [...historyState.snapshots].sort((a, b) =>
      dateMs(b.capturedAt) - dateMs(a.capturedAt)
    );

    if (filter.since) {
      const sinceMs = dateMs(filter.since);
      if (sinceMs !== null) {
        result = result.filter(s => dateMs(s.capturedAt) >= sinceMs);
      }
    }
    if (filter.until) {
      const untilMs = dateMs(filter.until);
      if (untilMs !== null) {
        result = result.filter(s => dateMs(s.capturedAt) <= untilMs);
      }
    }
    if (filter.source) {
      result = result.filter(s => s.source === filter.source);
    }
    if (filter.limit && Number.isInteger(filter.limit) && filter.limit > 0) {
      result = result.slice(0, filter.limit);
    }
    return result;
  }

  function deduplicateSnapshots(snapshots) {
    if (!Array.isArray(snapshots)) return [];
    const seen = new Map();
    const unique = [];
    for (const snap of snapshots) {
      if (!isRecord(snap) || !snap.contentHash) continue;
      if (!seen.has(snap.contentHash)) {
        seen.set(snap.contentHash, true);
        unique.push(snap);
      }
    }
    return unique;
  }

  function pruneSnapshots(snapshots, config = {}) {
    if (!Array.isArray(snapshots)) return [];
    const maxSnapshots = config.maxSnapshots ?? MAX_SNAPSHOTS;
    const maxAgeDays = config.maxAgeDays ?? MAX_AGE_DAYS;

    // Sort by capturedAt descending (newest first) for filtering
    const sorted = [...snapshots].sort((a, b) =>
      dateMs(b.capturedAt) - dateMs(a.capturedAt)
    );

    // Apply age filter
    const cutoffMs = Date.now() - maxAgeDays * DAY_MS;
    const withinAge = sorted.filter(s => dateMs(s.capturedAt) > cutoffMs);

    // Apply count limit (keep newest maxSnapshots)
    const newest = withinAge.slice(0, maxSnapshots);

    // Return in chronological order (oldest first) for consistency with history storage
    return newest.reverse();
  }

  function getDefaultConfig() {
    return {
      autoCaptureEnabled: true,
      captureIntervalDays: 1,
      maxSnapshots: MAX_SNAPSHOTS,
      maxAgeDays: MAX_AGE_DAYS,
      dedupEnabled: true
    };
  }

  function validateConfig(config) {
    if (!isRecord(config)) return false;
    const c = config;
    return (
      typeof c.autoCaptureEnabled === 'boolean' &&
      Number.isInteger(c.captureIntervalDays) && c.captureIntervalDays >= 1 &&
      Number.isInteger(c.maxSnapshots) && c.maxSnapshots >= 1 &&
      Number.isInteger(c.maxAgeDays) && c.maxAgeDays >= 1 &&
      typeof c.dedupEnabled === 'boolean'
    );
  }

  async function shouldAutoCapture(historyState, config) {
    if (!config?.autoCaptureEnabled) return false;
    const snapshots = historyState?.snapshots || [];
    if (!snapshots.length) return true; // First capture
    const latest = snapshots[snapshots.length - 1]; // Oldest first? Let's check
    // snapshots are stored oldest-first in historyState, newest at end
    const lastCapture = snapshots[snapshots.length - 1];
    if (!lastCapture) return true;
    const daysSinceLast = daysSince(lastCapture.capturedAt);
    return daysSinceLast !== null && daysSinceLast >= (config.captureIntervalDays || 1);
  }

  function getHistoryState(state) {
    return state?.portfolioHistory || { snapshots: [], config: getDefaultConfig() };
  }

  function setHistoryState(state, historyState) {
    const next = clone(state);
    next.portfolioHistory = historyState;
    return next;
  }

  function addSnapshotToHistory(historyState, snapshot, config) {
    const snapshots = Array.isArray(historyState?.snapshots) ? [...historyState.snapshots] : [];
    const nextConfig = { ...getDefaultConfig(), ...historyState?.config, ...config };

    // Add new snapshot (newest at end)
    const withNew = [...snapshots, snapshot];

    // Deduplicate if enabled
    const deduped = nextConfig.dedupEnabled ? deduplicateSnapshots(withNew) : withNew;

    // Prune
    const pruned = pruneSnapshots(deduped, nextConfig);

    return {
      snapshots: pruned,
      config: nextConfig
    };
  }

  return {
    FORMAT,
    VERSION,
    captureSnapshot,
    getSnapshots,
    deduplicateSnapshots,
    pruneSnapshots,
    validateSnapshot,
    getDefaultConfig,
    validateConfig,
    shouldAutoCapture,
    getHistoryState,
    setHistoryState,
    addSnapshotToHistory,
    computeValuations,
    computePriceCoverage,
    canonical,
    sha256
  };
});