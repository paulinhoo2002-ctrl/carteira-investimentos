(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BackupPortability = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FORMAT = 'carteira-investimentos-backup';
    const VERSION = '1.1';
    const MAX_SUPPORTED_MAJOR = 1;
    const SENSITIVE_KEY = /(token|secret|password|passwd|credential|cookie|session|storage|authorization|access[_-]?key|refresh[_-]?token|private[_-]?key)/i;
    const DANGEROUS_KEY = new Set(['__proto__', 'prototype', 'constructor']);
    const RECORD_KEYS = ['wallets', 'assets', 'aportes', 'proventos', 'rfEvents', 'manualFixedIncome', 'manualOverrides', 'goals', 'importHistory', 'historical', 'corporateEvents', 'assetLineage', 'settings'];
    const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

    // Schema identifiers for compatibility checking
    const SCHEMA_VERSIONS = {
      'legacy-civ5-compatible': { major: 1, minor: 0, description: 'Legacy civ5 localStorage format' },
      'legacy-civ5-cfg-compatible': { major: 1, minor: 0, description: 'Legacy civ5 config format' },
      'backup-portability-v1.1': { major: 1, minor: 1, description: 'V267 enhanced backup format with manifest' }
    };

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
    return normalizeFinancialDates(normalize(state, { stripSensitive: true }));
  }
  const DATE_ONLY_FIELDS = new Set(['date', 'eventDate', 'effectiveDate']);
  function daysInMonth(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
  function canonicalDate(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || year < 1900 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  function parseLegacyFinancialDate(value) {
    if (value === null || value === undefined || value === '') return { status: 'MISSING', value };
    const s = String(value).trim();
    let match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return { status: canonicalDate(Number(match[1]), Number(match[2]), Number(match[3])) ? 'VALID' : 'INVALID', value: canonicalDate(Number(match[1]), Number(match[2]), Number(match[3])) };
    match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
      const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
      const normalized = canonicalDate(year, Number(match[2]), Number(match[1]));
      return { status: normalized ? 'VALID' : 'INVALID', value: normalized };
    }
    match = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (match && canonicalDate(Number(match[1]), Number(match[2]), Number(match[3])) && Number.isFinite(Date.parse(s))) return { status: 'VALID', value: canonicalDate(Number(match[1]), Number(match[2]), Number(match[3])) };
    return { status: 'INVALID', value };
  }
  function normalizeFinancialDates(state) {
    if (!isRecord(state)) return state;
    const result = clone(state);
    for (const section of Object.keys(result)) {
      if (!Array.isArray(result[section])) continue;
      result[section] = result[section].map(row => {
        if (!isRecord(row)) return row;
        const next = { ...row };
        for (const field of DATE_ONLY_FIELDS) {
          if (next[field] !== undefined && next[field] !== null && next[field] !== '') {
            const parsed = parseLegacyFinancialDate(next[field]);
            if (parsed.status === 'VALID') next[field] = parsed.value;
          }
        }
        return next;
      });
    }
    return result;
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
        for (const field of ['date', 'eventDate', 'effectiveDate']) {
          if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
            const parsed = parseLegacyFinancialDate(row[field]);
            if (parsed.status === 'INVALID') return `INVALID_DATE:${section}:${field}`;
          }
        }
        for (const field of ['createdAt', 'updatedAt']) {
          if (row[field] !== undefined && row[field] !== null && row[field] !== '' && Number.isNaN(new Date(String(row[field])).getTime())) return `INVALID_DATE:${section}:${field}`;
        }
      }
    }
    if (Array.isArray(state.wallets) && state.activeWalletId && !state.wallets.some(wallet => String(wallet.id) === String(state.activeWalletId))) return 'UNKNOWN_ACTIVE_WALLET';
    return null;
  }
  async function createBackup({ state = {}, config = {}, metadata = {}, createdAt = new Date().toISOString(), appVersion = 'unknown', operationId = crypto.randomUUID ? crypto.randomUUID() : 'op-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9) } = {}) {
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
          operationId: String(operationId),
          exportedBy: navigator?.userAgent ? 'browser' : 'node',
          contentInventory: inventory(safeState),
          recordCounts: counts(safeState),
          schemaIdentifiers: {
            state: 'legacy-civ5-compatible',
            config: 'legacy-civ5-cfg-compatible',
            stateSchema: 'backup-portability-v1.1',
            configSchema: 'backup-portability-v1.1'
          },
          checksums: { algorithm: 'SHA-256', payload: payloadHash },
          compatibility: {
            minSupportedMajor: 1,
            currentMajor: 1,
            legacyFormatsRecognized: ['legacy-civ5-compatible']
          }
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

      const version = String(backup.manifest.backupVersion || '');
      const major = Number(version.split('.')[0]);
      const minor = Number(version.split('.')[1] || '0');
      if (!Number.isInteger(major) || major > MAX_SUPPORTED_MAJOR) return { status: 'TOO_NEW', backup };
      if (major < MAX_SUPPORTED_MAJOR) return { status: 'MIGRATABLE', backup };

      try { assertSafeObject(backup); } catch (error) { return { status: 'CORRUPTED', error: error.message }; }
      const expected = String(backup.manifest.checksums?.payload || '');
      if (!/^[a-f0-9]{64}$/.test(expected)) return { status: 'CORRUPTED', error: 'MISSING_CHECKSUM' };
      const actual = await sha256(canonical(backup.payload));
      if (actual !== expected) return { status: 'CORRUPTED', error: 'CHECKSUM_MISMATCH', expected, actual };

      const normalizedBackup = { ...backup, payload: { ...backup.payload, state: normalizeFinancialDates(backup.payload.state) } };
      const stateError = validateState(normalizedBackup.payload.state);
      if (stateError) return { status: 'CORRUPTED', error: stateError };

      // Schema validation
            const stateSchema = backup.manifest.schemaIdentifiers?.stateSchema;
            const configSchema = backup.manifest.schemaIdentifiers?.configSchema;
            const schemaWarnings = [];

            // Check state schema
            if (stateSchema) {
              if (SCHEMA_VERSIONS[stateSchema]) {
                const schemaInfo = SCHEMA_VERSIONS[stateSchema];
                if (schemaInfo.major > MAX_SUPPORTED_MAJOR) {
                  schemaWarnings.push(`STATE_SCHEMA_FUTURE:${stateSchema}`);
                }
              } else {
                // Unknown schema identifier - check if it looks like a future version (major > MAX_SUPPORTED_MAJOR)
                const versionMatch = stateSchema.match(/[-v]?(\d+)\./);
                if (versionMatch) {
                  const major = Number(versionMatch[1]);
                  if (major > MAX_SUPPORTED_MAJOR) {
                    schemaWarnings.push(`STATE_SCHEMA_FUTURE:${stateSchema}`);
                  } else {
                    schemaWarnings.push(`STATE_SCHEMA_UNKNOWN:${stateSchema}`);
                  }
                } else {
                  schemaWarnings.push(`STATE_SCHEMA_UNKNOWN:${stateSchema}`);
                }
              }
            }

            // Check config schema
            if (configSchema) {
              if (SCHEMA_VERSIONS[configSchema]) {
                const schemaInfo = SCHEMA_VERSIONS[configSchema];
                if (schemaInfo.major > MAX_SUPPORTED_MAJOR) {
                  schemaWarnings.push(`CONFIG_SCHEMA_FUTURE:${configSchema}`);
                }
              } else {
                const versionMatch = configSchema.match(/[-v]?(\d+)\./);
                if (versionMatch) {
                  const major = Number(versionMatch[1]);
                  if (major > MAX_SUPPORTED_MAJOR) {
                    schemaWarnings.push(`CONFIG_SCHEMA_FUTURE:${configSchema}`);
                  } else {
                    schemaWarnings.push(`CONFIG_SCHEMA_UNKNOWN:${configSchema}`);
                  }
                } else {
                  schemaWarnings.push(`CONFIG_SCHEMA_UNKNOWN:${configSchema}`);
                }
              }
            }

      const expectedCounts = backup.manifest.recordCounts || {};
      const actualCounts = counts(normalizedBackup.payload.state);
      for (const key of Object.keys(actualCounts)) if (expectedCounts[key] !== actualCounts[key]) return { status: 'CORRUPTED', error: `COUNT_MISMATCH:${key}` };

      return { status: 'SUPPORTED', backup: normalizedBackup, checksum: actual, warnings: schemaWarnings };
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
        else {
          // Distinguish UPDATE (value changes) from CONFLICT (identity/structural changes)
          const identityFields = ['ticker', 'type', 'name', 'eventType'];
          const hasIdentityChange = identityFields.some(f => previous[f] !== undefined && row[f] !== undefined && previous[f] !== row[f]);
          if (hasIdentityChange) {
            rows.push({ kind: 'CONFLICT', section, id, reason: 'IDENTITY_FIELD_CHANGED' });
          } else {
            rows.push({ kind: 'UPDATE', section, id, reason: 'VALUE_CHANGED' });
          }
        }
        oldMap.delete(id);
      }
      for (const id of oldMap.keys()) rows.push({ kind: 'SKIP', section, id, reason: 'CURRENT_ONLY' });
      return rows;
    }
  async function previewRestore(raw, currentState = {}) {
      const integrity = await verifyBackup(raw);
      if (!['SUPPORTED', 'MIGRATABLE'].includes(integrity.status)) return { integrity, diff: [], conflicts: [], writeCount: 0, restoreAllowed: false, warnings: integrity.warnings || [] };
      const incoming = integrity.backup.payload.state;
      const sections = [...new Set([...RECORD_KEYS, ...Object.keys(incoming), ...Object.keys(currentState)])];
      const diff = sections.flatMap(section => {
        if (Array.isArray(incoming?.[section]) || Array.isArray(currentState?.[section])) return diffRecords(section, currentState?.[section], incoming?.[section]);
        if (Object.prototype.hasOwnProperty.call(incoming || {}, section) && comparable(currentState?.[section]) !== comparable(incoming[section])) return [{ kind: 'CONFLICT', section, id: section, reason: 'SCALAR_DIFFERS' }];
        return [];
      });

      // Enhanced conflict detection
      const conflicts = diff.filter(item => item.kind === 'CONFLICT');
      const adds = diff.filter(item => item.kind === 'ADD');
      const updates = diff.filter(item => item.kind === 'UPDATE');
      const skips = diff.filter(item => item.kind === 'SKIP');

      // Compatibility check
      const compat = integrity.backup.manifest.compatibility || {};
      const compatWarnings = [];
      if (compat.minSupportedMajor && compat.minSupportedMajor > 1) {
        compatWarnings.push('BACKUP_REQUIRES_HIGHER_MAJOR_VERSION');
      }

      // Combine all warnings
      const allWarnings = [
        ...(integrity.warnings || []),
        ...compatWarnings
      ];

      // Restore is allowed if no conflicts and supported
      const restoreAllowed = integrity.status === 'SUPPORTED' && conflicts.length === 0;

      return {
        integrity,
        diff,
        conflicts,
        adds,
        updates,
        skips,
        warnings: allWarnings,
        writeCount: adds.length + updates.length,
        restoreAllowed,
        compatibility: compat,
        summary: {
          adds: adds.length,
          updates: updates.length,
          conflicts: conflicts.length,
          skips: skips.length
        }
      };
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
  return { FORMAT, VERSION, canonical, createBackup, parseBackup, verifyBackup, previewRestore, applyToIsolatedStore, normalize, sha256 };
});
