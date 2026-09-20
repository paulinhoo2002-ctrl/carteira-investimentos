(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BackupPortability = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FORMAT = 'carteira-investimentos-backup';
  const VERSION = '1.0';
  const MAX_SUPPORTED_MAJOR = 1;
  const SENSITIVE_KEY = /(token|secret|password|passwd|credential|cookie|session|storage|authorization|access[_-]?key|refresh[_-]?token|private[_-]?key)/i;
  const DANGEROUS_KEY = new Set(['__proto__', 'prototype', 'constructor']);
  const RECORD_KEYS = ['wallets', 'assets', 'aportes', 'proventos', 'rfEvents', 'manualFixedIncome', 'manualOverrides', 'goals', 'importHistory', 'historical', 'corporateEvents', 'assetLineage', 'settings'];
  const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

  function isRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function keyOrder(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function recordSort(a, b) {
    const ak = String(a?.id ?? a?.eventId ?? a?.fingerprint ?? a?.ticker ?? a?.date ?? '');
    const bk = String(b?.id ?? b?.eventId ?? b?.fingerprint ?? b?.ticker ?? b?.date ?? '');
    return keyOrder(ak, bk);
  }
  function normalize(value, { stripSensitive = false } = {}) {
    if (Array.isArray(value)) {
      const items = value.map(item => normalize(item, { stripSensitive }));
      return items.every(item => isRecord(item) && (item.id || item.eventId || item.fingerprint)) ? items.sort(recordSort) : items;
    }
    if (!isRecord(value)) return value;
    const out = {};
    for (const key of Object.keys(value).sort(keyOrder)) {
      if (DANGEROUS_KEY.has(key)) throw new Error(`UNSAFE_KEY:${key}`);
      if (stripSensitive && SENSITIVE_KEY.test(key)) continue;
      out[key] = normalize(value[key], { stripSensitive });
    }
    return out;
  }
  function canonical(value) { return JSON.stringify(normalize(value)); }
  function assertSafeObject(value) {
    if (Array.isArray(value)) return value.forEach(assertSafeObject);
    if (!isRecord(value)) return;
    for (const key of Object.keys(value)) {
      if (DANGEROUS_KEY.has(key)) throw new Error(`UNSAFE_KEY:${key}`);
      assertSafeObject(value[key]);
    }
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
  function sourceState(input) {
    const state = input?.state ?? input ?? {};
    return normalize(state, { stripSensitive: true });
  }
  function counts(state) {
    const count = key => Array.isArray(state?.[key]) ? state[key].length : 0;
    return {
      wallets: count('wallets'), assets: count('assets'), transactions: count('aportes'),
      income: count('proventos'), fixedIncome: count('manualFixedIncome') || count('rfEvents'),
      corporateEvents: count('corporateEvents'), goals: isRecord(state?.goals) ? Object.keys(state.goals).length : 0
    };
  }
  function inventory(state) {
    return ['state', 'assets', 'transactions', 'income', 'fixedIncome', 'goals'].concat(
      ['historical', 'corporateEvents', 'assetLineage', 'manualOverrides', 'settings', 'importHistory']
        .filter(key => state && Object.prototype.hasOwnProperty.call(state, key))
    );
  }
  function validateState(state) {
    if (!isRecord(state)) return 'MISSING_STATE';
    for (const section of RECORD_KEYS) {
      if (state[section] !== undefined && section !== 'goals' && !Array.isArray(state[section])) return `INVALID_SECTION:${section}`;
    }
    for (const section of RECORD_KEYS.filter(key => Array.isArray(state?.[key]))) {
      const seen = new Set();
      for (const row of state[section]) {
        if (!isRecord(row)) return `INVALID_RECORD:${section}`;
        const id = row.id ?? row.eventId ?? row.fingerprint;
        if (id !== undefined) {
          const key = String(id);
          if (seen.has(key)) return `DUPLICATE_ID:${section}:${key}`;
          seen.add(key);
        }
        for (const field of ['qty', 'quantity', 'amount', 'value', 'valueCents']) {
          if (row[field] !== undefined && row[field] !== null && (typeof row[field] === 'boolean' || (typeof row[field] === 'number' && !Number.isFinite(row[field])))) return `INVALID_NUMBER:${section}:${field}`;
        }
        for (const field of ['date', 'eventDate', 'effectiveDate', 'createdAt', 'updatedAt']) {
          if (row[field] !== undefined && row[field] !== null && row[field] !== '' && Number.isNaN(new Date(String(row[field])).getTime())) return `INVALID_DATE:${section}:${field}`;
        }
      }
    }
    if (Array.isArray(state.wallets) && state.activeWalletId && !state.wallets.some(wallet => String(wallet.id) === String(state.activeWalletId))) return 'UNKNOWN_ACTIVE_WALLET';
    return null;
  }
  async function createBackup({ state = {}, config = {}, metadata = {}, createdAt = new Date().toISOString(), appVersion = 'unknown' } = {}) {
    const safeState = sourceState({ state });
    const safeConfig = normalize(config, { stripSensitive: true });
    const payload = { state: safeState, config: safeConfig, metadata: normalize(metadata, { stripSensitive: true }) };
    const payloadHash = await sha256(canonical(payload));
    return {
      manifest: {
        backupFormat: FORMAT,
        backupVersion: VERSION,
        appVersion: String(appVersion),
        createdAt: String(createdAt),
        exportMode: 'LOCAL_ONLY',
        contentInventory: inventory(safeState),
        recordCounts: counts(safeState),
        schemaIdentifiers: { state: 'legacy-civ5-compatible', config: 'legacy-civ5-cfg-compatible' },
        checksums: { algorithm: 'SHA-256', payload: payloadHash }
      },
      payload
    };
  }
  function parseJson(raw) {
    if (typeof raw !== 'string') return raw;
    return JSON.parse(raw, (key, value) => {
      if (DANGEROUS_KEY.has(key)) throw new Error(`UNSAFE_KEY:${key}`);
      return value;
    });
  }
  async function verifyBackup(raw) {
    if (typeof raw === 'string' && new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) return { status: 'CORRUPTED', error: 'BACKUP_TOO_LARGE' };
    let backup;
    try { backup = parseJson(raw); } catch (error) { return { status: 'CORRUPTED', error: error.message }; }
    if (!isRecord(backup) || !isRecord(backup.manifest) || !isRecord(backup.payload)) return { status: 'UNSUPPORTED', error: 'INVALID_CONTAINER' };
    if (backup.manifest.backupFormat !== FORMAT) return { status: 'UNSUPPORTED', error: 'UNKNOWN_FORMAT' };
    const major = Number(String(backup.manifest.backupVersion || '').split('.')[0]);
    if (!Number.isInteger(major) || major > MAX_SUPPORTED_MAJOR) return { status: 'TOO_NEW', backup };
    if (major < MAX_SUPPORTED_MAJOR) return { status: 'MIGRATABLE', backup };
    try { assertSafeObject(backup); } catch (error) { return { status: 'CORRUPTED', error: error.message }; }
    const expected = String(backup.manifest.checksums?.payload || '');
    if (!/^[a-f0-9]{64}$/.test(expected)) return { status: 'CORRUPTED', error: 'MISSING_CHECKSUM' };
    const actual = await sha256(canonical(backup.payload));
    if (actual !== expected) return { status: 'CORRUPTED', error: 'CHECKSUM_MISMATCH', expected, actual };
    const stateError = validateState(backup.payload.state);
    if (stateError) return { status: 'CORRUPTED', error: stateError };
    const expectedCounts = backup.manifest.recordCounts || {};
    const actualCounts = counts(backup.payload.state);
    for (const key of Object.keys(actualCounts)) if (expectedCounts[key] !== actualCounts[key]) return { status: 'CORRUPTED', error: `COUNT_MISMATCH:${key}` };
    return { status: 'SUPPORTED', backup, checksum: actual };
  }
  async function parseBackup(raw) {
    const result = await verifyBackup(raw);
    if (result.status !== 'SUPPORTED' && result.status !== 'MIGRATABLE') throw new Error(result.error || result.status);
    return result.backup;
  }
  function identity(record) { return String(record?.id ?? record?.eventId ?? record?.fingerprint ?? `${record?.ticker || ''}|${record?.date || ''}`); }
  function comparable(value) { return canonical(value); }
  function diffRecords(section, current, incoming) {
    const oldRows = Array.isArray(current) ? current : [];
    const newRows = Array.isArray(incoming) ? incoming : [];
    const oldMap = new Map(oldRows.map(row => [identity(row), row]));
    const rows = [];
    for (const row of newRows) {
      const id = identity(row); const previous = oldMap.get(id);
      if (!previous) rows.push({ kind: 'ADD', section, id });
      else if (comparable(previous) === comparable(row)) rows.push({ kind: 'UNCHANGED', section, id });
      else rows.push({ kind: 'CONFLICT', section, id, reason: 'CURRENT_STATE_DIFFERS' });
      oldMap.delete(id);
    }
    for (const id of oldMap.keys()) rows.push({ kind: 'SKIP', section, id, reason: 'CURRENT_ONLY' });
    return rows;
  }
  async function previewRestore(raw, currentState = {}) {
    const integrity = await verifyBackup(raw);
    if (!['SUPPORTED', 'MIGRATABLE'].includes(integrity.status)) return { integrity, diff: [], conflicts: [], writeCount: 0, restoreAllowed: false };
    const incoming = integrity.backup.payload.state;
    const sections = [...new Set([...RECORD_KEYS, ...Object.keys(incoming), ...Object.keys(currentState)])];
    const diff = sections.flatMap(section => {
      if (Array.isArray(incoming?.[section]) || Array.isArray(currentState?.[section])) return diffRecords(section, currentState?.[section], incoming?.[section]);
      if (Object.prototype.hasOwnProperty.call(incoming || {}, section) && comparable(currentState?.[section]) !== comparable(incoming[section])) return [{ kind: 'CONFLICT', section, id: section, reason: 'SCALAR_DIFFERS' }];
      return [];
    });
    return { integrity, diff, conflicts: diff.filter(item => item.kind === 'CONFLICT'), warnings: [], writeCount: 0, restoreAllowed: false };
  }
  function applyToIsolatedStore(store, backup, { failAfter = Infinity } = {}) {
    const before = clone(store); const result = { ok: false, store: before, rollback: true };
    try {
      if (!backup?.payload?.state) throw new Error('INVALID_BACKUP');
      const next = clone(store); next.state = clone(backup.payload.state); next.config = clone(backup.payload.config || {});
      if (Object.keys(next.state).length > failAfter) throw new Error('INJECTED_FAILURE');
      result.ok = true; result.store = next; result.rollback = false; return result;
    } catch (error) { return { ...result, error }; }
  }
  return { FORMAT, VERSION, canonical, createBackup, parseBackup, verifyBackup, previewRestore, applyToIsolatedStore, normalize };
});
