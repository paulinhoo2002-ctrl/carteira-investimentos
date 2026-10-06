(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BackupPortability = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FORMAT = 'carteira-investimentos-backup';
    const VERSION = '2.0';
    const SCHEMA_VERSION = 2;
    const MAX_SUPPORTED_MAJOR = 2;
    const SENSITIVE_KEY = /(token|secret|password|passwd|credential|cookie|session|storage|authorization|access[_-]?key|refresh[_-]?token|private[_-]?key)/i;
    const DANGEROUS_KEY = new Set(['__proto__', 'prototype', 'constructor']);
    const RECORD_KEYS = ['wallets', 'assets', 'aportes', 'proventos', 'rfEvents', 'manualFixedIncome', 'manualOverrides', 'goals', 'importHistory', 'historical', 'corporateEvents', 'assetLineage', 'settings'];
    const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

    // Schema identifiers for compatibility checking
    const SCHEMA_VERSIONS = {
      'legacy-civ5-compatible': { major: 1, minor: 0, description: 'Legacy civ5 localStorage format' },
      'legacy-civ5-cfg-compatible': { major: 1, minor: 0, description: 'Legacy civ5 config format' },
      'backup-portability-v1.1': { major: 1, minor: 1, description: 'V267 enhanced backup format with manifest' },
      'backup-portability-v2.0': { major: 2, minor: 0, description: 'V323C domain manifest and strict restore contract' }
    };
    const PersistenceCore = typeof require === 'function' ? require('./persistence-core.js') : globalThis.PersistenceCore;
    function runtimeStores() { return typeof require === 'function' ? require('./portfolio-runtime-stores.js') : globalThis.PortfolioRuntimeStores; }
    const SETTING_KEYS = ['tab', 'divGoal', 'hideValues', 'apHistoryOpen', 'apSearch', 'dashPeriod', 'dashType', 'rentPeriod', 'rentType', 'rentBench', 'irpfYear', 'irpfStep', 'learnMeta'];
    const DOMAIN_SPECS = [
      { name: 'portfolio', version: '1', required: true, present: ({ state }) => Array.isArray(state?.wallets) && typeof state?.activeWalletId === 'string', count: ({ state }) => state.wallets.length },
      { name: 'assets', version: '1', required: true, present: ({ state }) => Array.isArray(state?.assets), count: ({ state }) => state.assets.length },
      { name: 'transactions', version: '1', required: true, present: ({ state }) => Array.isArray(state?.aportes), count: ({ state }) => state.aportes.length },
      { name: 'income', version: '1', required: true, present: ({ state }) => Array.isArray(state?.proventos), count: ({ state }) => state.proventos.length },
      { name: 'fixedIncome', version: '1', required: true, present: ({ state }) => Array.isArray(state?.rfEvents) && Array.isArray(state?.assets), count: ({ state }) => state.rfEvents.length + state.assets.filter(asset => PersistenceCore?.normalizeKnownAssetType?.(asset?.type ?? asset?.asset_type) === 'Renda Fixa').length },
      { name: 'corporateEvents', version: '1', required: false, present: ({ corporateEvents, state }) => Array.isArray(corporateEvents) || Array.isArray(state?.corporateEvents), count: ({ corporateEvents, state }) => (Array.isArray(corporateEvents) ? corporateEvents : state.corporateEvents).length },
      { name: 'performance', version: '1', required: false, present: ({ runtime }) => isValidPerformanceDomain(runtime), count: ({ runtime }) => runtime.valuationSnapshots.snapshots.length + runtime.externalCashFlows.flows.length },
      { name: 'goals', version: '1', required: true, present: ({ state }) => isRecord(state?.goals), count: ({ state }) => Object.keys(state.goals).length },
      { name: 'settings', version: '1', required: true, present: ({ state, config }) => isRecord(config) && Object.prototype.hasOwnProperty.call(config, 'divGoal') && SETTING_KEYS.every(key => Object.prototype.hasOwnProperty.call(state || {}, key)), count: ({ state, config }) => SETTING_KEYS.length + Object.keys(config).length }
    ];

  function isRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function isValidPerformanceDomain(runtime) {
    return runtimeStores()?.validateBackupSupplement?.(runtime)?.ok === true;
  }
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
  function domainManifest(payload) {
    return DOMAIN_SPECS.map(spec => {
      const present = spec.present(payload);
      return { name: spec.name, version: spec.version, count: present ? spec.count(payload) : null, required: spec.required, present };
    });
  }
  function counts(domains) { return Object.fromEntries(domains.map(domain => [domain.name, domain.count])); }
  function inventory(domains) { return ['state', ...domains.filter(domain => domain.present).map(domain => domain.name)]; }
  function manifestDigest(manifest) {
    const { checksums = {}, ...fields } = manifest;
    return sha256(canonical({ ...fields, checksums: { algorithm: checksums.algorithm, payload: checksums.payload } }));
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
        if (section === 'assets') {
          const rawType = row.type ?? row.asset_type;
          if (rawType === undefined || rawType === null || !PersistenceCore?.normalizeKnownAssetType?.(rawType)) return `UNSUPPORTED_TYPE:assets:${String(rawType ?? 'MISSING').slice(0, 80)}`;
        }
        const id = row.id ?? row.eventId ?? row.eventKey ?? row.fingerprint;
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
  async function createBackup({ state = {}, config, runtime, corporateEvents, metadata = {}, createdAt = new Date().toISOString(), appVersion = 'unknown', operationId = crypto.randomUUID ? crypto.randomUUID() : 'op-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9) } = {}) {
      const stateWithoutCache = { ...state };
      const cache = corporateEvents ?? stateWithoutCache.corporateEvents;
      delete stateWithoutCache.corporateEvents;
      const safeState = sourceState({ state: stateWithoutCache });
      const payload = { state: safeState, metadata: normalize(metadata, { stripSensitive: true }) };
      if (config !== undefined) payload.config = normalize(config, { stripSensitive: true });
      if (runtime !== undefined) payload.runtime = normalize(runtime, { stripSensitive: true });
      if (cache !== undefined) payload.corporateEvents = normalize(cache, { stripSensitive: true });
      const payloadHash = await sha256(canonical(payload));
      const domains = domainManifest(payload);
      const manifest = {
        format: FORMAT,
        backupFormat: FORMAT,
        backupVersion: VERSION,
        schemaVersion: SCHEMA_VERSION,
        appVersion: String(appVersion),
        createdAt: String(createdAt),
        exportMode: 'LOCAL_ONLY',
        operationId: String(operationId),
        exportedBy: (typeof navigator !== 'undefined' && navigator?.userAgent) ? 'browser' : 'node',
        domains,
        contentInventory: inventory(domains),
        recordCounts: counts(domains),
        schemaIdentifiers: {
          state: 'legacy-civ5-compatible',
          config: 'legacy-civ5-cfg-compatible',
          stateSchema: 'backup-portability-v2.0',
          configSchema: 'backup-portability-v2.0'
        },
        checksums: { algorithm: 'SHA-256', payload: payloadHash },
        compatibility: {
          minSupportedMajor: 1,
          currentMajor: 2,
          legacyFormatsRecognized: ['legacy-civ5-compatible']
        }
      };
      manifest.checksums.manifest = await manifestDigest(manifest);
      return { manifest, payload };
    }
  function parseJson(raw) {
    if (typeof raw !== 'string') return raw;
    return JSON.parse(raw, (key, value) => {
      if (DANGEROUS_KEY.has(key)) throw new Error(`UNSAFE_KEY:${key}`);
      return value;
    });
  }
  async function verifyBackup(raw) {
      const fail = (status, error, extra = {}) => ({ status, error, ...extra });
      if (typeof raw === 'string' && new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) return fail('CORRUPT', 'BACKUP_TOO_LARGE');
      let backup;
      try { backup = parseJson(raw); } catch (error) { return fail('CORRUPT', error.message); }
      if (!isRecord(backup) || !isRecord(backup.manifest) || !isRecord(backup.payload)) return fail('INCOMPATIBLE', 'INVALID_CONTAINER');
      if (!Object.prototype.hasOwnProperty.call(backup.payload, 'state')) return fail('PARTIAL', 'MISSING_STATE');
      if (!isRecord(backup.payload.state)) return fail('CORRUPT', 'INVALID_STATE');
      const manifest = backup.manifest;
      if ((manifest.format && manifest.format !== FORMAT) || (manifest.backupFormat && manifest.backupFormat !== FORMAT) || (!manifest.format && !manifest.backupFormat)) return fail('INCOMPATIBLE', 'UNKNOWN_FORMAT');
      if (manifest.format && manifest.backupFormat && manifest.format !== manifest.backupFormat) return fail('CORRUPT', 'FORMAT_MISMATCH');

      const backupVersion = String(manifest.backupVersion || '');
      const versionMatch = backupVersion.match(/^(\d+)\.(\d+)$/);
      if (!versionMatch) return fail('INCOMPATIBLE', 'INVALID_BACKUP_VERSION');
      const backupMajor = Number(versionMatch[1]);
      const backupMinor = Number(versionMatch[2]);
      const schemaVersion = manifest.schemaVersion;
      const parsedSchemaVersion = schemaVersion === undefined ? 1 : Number(schemaVersion);
      if (backupMajor > MAX_SUPPORTED_MAJOR || (backupMajor === MAX_SUPPORTED_MAJOR && backupMinor > 0) || parsedSchemaVersion > SCHEMA_VERSION) return fail('UNSUPPORTED_FUTURE_SCHEMA', 'FUTURE_SCHEMA');
      if (backupMajor < 1 || !Number.isInteger(parsedSchemaVersion) || parsedSchemaVersion < 1) return fail('INCOMPATIBLE', 'UNSUPPORTED_OLD_SCHEMA');
      const legacySchema = backupMajor === 1 && parsedSchemaVersion === 1;
      if ((!legacySchema && backupMajor !== MAX_SUPPORTED_MAJOR) || (legacySchema && backupMinor > 1)) return fail('INCOMPATIBLE', 'VERSION_SCHEMA_MISMATCH');
      if (!legacySchema && parsedSchemaVersion !== SCHEMA_VERSION) return fail('INCOMPATIBLE', 'VERSION_SCHEMA_MISMATCH');

      const stateSchema = manifest.schemaIdentifiers?.stateSchema;
      const configSchema = manifest.schemaIdentifiers?.configSchema;
      for (const value of [stateSchema, configSchema].filter(Boolean)) {
        if (SCHEMA_VERSIONS[value]) continue;
        const match = String(value).match(/(?:^|[-v])(\d+)\.(\d+)/i);
        if (!match) return fail('INCOMPATIBLE', `UNKNOWN_SCHEMA:${value}`);
        const major = Number(match[1]);
        const minor = Number(match[2]);
        if (major > 2 || (major === 2 && minor > 0)) return fail('UNSUPPORTED_FUTURE_SCHEMA', `FUTURE_SCHEMA:${value}`);
        if (!legacySchema) return fail('INCOMPATIBLE', `UNKNOWN_SCHEMA:${value}`);
      }

      try { assertSafeObject(backup); } catch (error) { return fail('CORRUPT', error.message); }
      const expectedPayload = String(manifest.checksums?.payload || '');
      if (!/^[a-f0-9]{64}$/.test(expectedPayload)) return fail('CORRUPT', 'MISSING_PAYLOAD_CHECKSUM');
      const actualPayload = await sha256(canonical(backup.payload));
      if (actualPayload !== expectedPayload) return fail('CORRUPT', 'PAYLOAD_CHECKSUM_MISMATCH');
      if (!Number.isFinite(Date.parse(String(manifest.createdAt || ''))) || !String(manifest.appVersion || '').trim()) return fail('CORRUPT', 'INVALID_MANIFEST_METADATA');

      const stateError = validateState(backup.payload.state);
      if (stateError?.startsWith('UNSUPPORTED_TYPE:')) return fail('UNSUPPORTED_TYPE', stateError);
      if (stateError) return fail('CORRUPT', stateError);
      if (Object.prototype.hasOwnProperty.call(backup.payload, 'config')) {
        const config = backup.payload.config;
        if (!isRecord(config)) return fail('CORRUPT', 'INVALID_CONFIG');
        if (Object.prototype.hasOwnProperty.call(config, 'divGoal') && (typeof config.divGoal !== 'number' || !Number.isFinite(config.divGoal) || config.divGoal < 0)) return fail('CORRUPT', 'INVALID_CONFIG:divGoal');
      }
      if (!legacySchema && Object.prototype.hasOwnProperty.call(backup.payload.state, 'corporateEvents')) return fail('INCOMPATIBLE', 'CORPORATE_EVENTS_IN_WRONG_DOMAIN');
      if (Object.prototype.hasOwnProperty.call(backup.payload, 'corporateEvents')) {
        const corporateError = validateState({ corporateEvents: backup.payload.corporateEvents });
        if (corporateError) return fail('CORRUPT', corporateError);
      }
      if (Object.prototype.hasOwnProperty.call(backup.payload, 'runtime') && !isValidPerformanceDomain(backup.payload.runtime)) return fail('CORRUPT', 'INVALID_PERFORMANCE_DOMAIN');

      const actualDomains = domainManifest(backup.payload);
      const requiredMissing = actualDomains.some(domain => domain.required && !domain.present);
      const actualCounts = counts(actualDomains);
      if (legacySchema) {
        const oldCounts = manifest.recordCounts || {};
        const oldCountMap = {
          wallets: Array.isArray(backup.payload.state.wallets) ? backup.payload.state.wallets.length : null,
          assets: Array.isArray(backup.payload.state.assets) ? backup.payload.state.assets.length : null,
          transactions: Array.isArray(backup.payload.state.aportes) ? backup.payload.state.aportes.length : null,
          income: Array.isArray(backup.payload.state.proventos) ? backup.payload.state.proventos.length : null,
          fixedIncome: Array.isArray(backup.payload.state.manualFixedIncome) && backup.payload.state.manualFixedIncome.length ? backup.payload.state.manualFixedIncome.length : (Array.isArray(backup.payload.state.rfEvents) ? backup.payload.state.rfEvents.length : null),
          corporateEvents: Array.isArray(backup.payload.state.corporateEvents) ? backup.payload.state.corporateEvents.length : null,
          goals: isRecord(backup.payload.state.goals) ? Object.keys(backup.payload.state.goals).length : null
        };
        for (const [key, value] of Object.entries(oldCounts)) {
          if (Object.prototype.hasOwnProperty.call(oldCountMap, key) && oldCountMap[key] !== null && oldCountMap[key] !== value) return fail('CORRUPT', `COUNT_MISMATCH:${key}`);
        }
        if (requiredMissing) return fail('PARTIAL', 'REQUIRED_DOMAIN_MISSING', { domains: actualDomains });
        const legacyEvents = backup.payload.corporateEvents ?? backup.payload.state.corporateEvents;
        const migratedState = normalizeFinancialDates(backup.payload.state);
        delete migratedState.corporateEvents;
        const migratedPayload = { ...backup.payload, state: migratedState };
        if (legacyEvents !== undefined) migratedPayload.corporateEvents = legacyEvents;
        const migrated = { ...backup, payload: migratedPayload, manifest: { ...manifest,
          format: FORMAT, backupFormat: FORMAT, backupVersion: VERSION, schemaVersion: SCHEMA_VERSION,
          domains: actualDomains, contentInventory: inventory(actualDomains), recordCounts: actualCounts,
          schemaIdentifiers: { ...(manifest.schemaIdentifiers || {}), stateSchema: 'backup-portability-v2.0', configSchema: 'backup-portability-v2.0' },
          compatibility: { minSupportedMajor: 1, currentMajor: 2, legacyFormatsRecognized: ['legacy-civ5-compatible'] },
          checksums: { algorithm: 'SHA-256', payload: await sha256(canonical(migratedPayload)) }
        } };
        migrated.manifest.checksums.manifest = await manifestDigest(migrated.manifest);
        return { status: 'VALID', backup: migrated, checksum: actualPayload, migratedFrom: 1, warnings: ['MIGRATED_SCHEMA_V1'] };
      }

      const expectedManifest = String(manifest.checksums?.manifest || '');
      if (!/^[a-f0-9]{64}$/.test(expectedManifest)) return fail('CORRUPT', 'MISSING_MANIFEST_CHECKSUM');
      if (await manifestDigest(manifest) !== expectedManifest) return fail('CORRUPT', 'MANIFEST_CHECKSUM_MISMATCH');
      if (!Array.isArray(manifest.domains)) return fail('PARTIAL', 'MISSING_DOMAIN_MANIFEST', { domains: actualDomains });
      if (requiredMissing) return fail('PARTIAL', 'REQUIRED_DOMAIN_MISSING', { domains: actualDomains });

      const declared = new Map();
      for (const domain of manifest.domains) {
        if (!isRecord(domain) || typeof domain.name !== 'string' || declared.has(domain.name)) return fail('CORRUPT', 'INVALID_DOMAIN_MANIFEST');
        declared.set(domain.name, domain);
      }
      for (const expected of actualDomains) {
        const found = declared.get(expected.name);
        if (!found) {
          if (expected.required) return fail('PARTIAL', `MISSING_DOMAIN:${expected.name}`, { domains: actualDomains });
          continue;
        }
        if (found.version !== expected.version || found.required !== expected.required) return fail('INCOMPATIBLE', `DOMAIN_SCHEMA_MISMATCH:${expected.name}`);
        if (found.present !== expected.present) return fail(expected.required ? 'PARTIAL' : 'CORRUPT', `DOMAIN_PRESENCE_MISMATCH:${expected.name}`);
        if (found.count !== expected.count) return fail('CORRUPT', `DOMAIN_COUNT_MISMATCH:${expected.name}`);
      }
      for (const name of declared.keys()) if (!DOMAIN_SPECS.some(spec => spec.name === name)) return fail('INCOMPATIBLE', `UNKNOWN_DOMAIN:${name}`);
      for (const expected of actualDomains.filter(domain => domain.required || domain.present)) {
        if (!Object.prototype.hasOwnProperty.call(manifest.recordCounts || {}, expected.name)) return fail('PARTIAL', `MISSING_RECORD_COUNT:${expected.name}`);
        if (manifest.recordCounts[expected.name] !== expected.count) return fail('CORRUPT', `COUNT_MISMATCH:${expected.name}`);
      }
      if (canonical(manifest.contentInventory) !== canonical(inventory(actualDomains))) return fail('CORRUPT', 'CONTENT_INVENTORY_MISMATCH');
      return { status: 'VALID', backup, checksum: actualPayload, warnings: [] };
    }
  async function parseBackup(raw) {
    const result = await verifyBackup(raw);
    if (result.status !== 'VALID') throw new Error(result.error || result.status);
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
      if (integrity.status !== 'VALID') return { integrity, diff: [], conflicts: [], writeCount: 0, restoreAllowed: false, warnings: integrity.warnings || [] };
      const incoming = integrity.backup.payload.state;
      const sections = [...new Set([...RECORD_KEYS, ...Object.keys(incoming), ...Object.keys(currentState)])];
      const diff = sections.flatMap(section => {
        if (Array.isArray(incoming?.[section]) || Array.isArray(currentState?.[section])) return diffRecords(section, currentState?.[section], incoming?.[section]);
        if (Object.prototype.hasOwnProperty.call(incoming || {}, section) && !Object.prototype.hasOwnProperty.call(currentState || {}, section)) return [{ kind: 'ADD', section, id: section }];
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
      const restoreAllowed = integrity.status === 'VALID' && conflicts.length === 0;

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
  async function applyToIsolatedStore(store, backup, { failAfter = Infinity } = {}) {
    const before = clone(store);
    const preview = await previewRestore(backup, before?.state || {});
    const result = { ok: false, store: before, rollback: true };
    try {
      if (!preview.restoreAllowed) throw new Error(preview.integrity.status === 'VALID' ? 'RESTORE_PREVIEW_BLOCKED' : (preview.integrity.error || preview.integrity.status || 'RESTORE_PREVIEW_BLOCKED'));
      const validated = preview.integrity.backup;
      const next = clone(store); next.state = clone(validated.payload.state); next.config = clone(validated.payload.config); next.runtime = clone(validated.payload.runtime); next.corporateEvents = clone(validated.payload.corporateEvents);
      if (Object.keys(next.state).length > failAfter) throw new Error('INJECTED_FAILURE');
      result.ok = true; result.store = next; result.rollback = false; return result;
    } catch (error) { return { ...result, error }; }
  }
  return { FORMAT, VERSION, canonical, createBackup, parseBackup, verifyBackup, previewRestore, applyToIsolatedStore, normalize, sha256 };
});
