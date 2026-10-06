(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BackupPortability = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FORMAT = 'carteira-investimentos-backup';
    const VERSION = '1.2';
    const MAX_SUPPORTED_MAJOR = 1;
    const MAX_SUPPORTED_MINOR = 2;
    const SENSITIVE_KEY = /(token|secret|password|passwd|credential|cookie|session|storage|authorization|access[_-]?key|refresh[_-]?token|private[_-]?key)/i;
    const DANGEROUS_KEY = new Set(['__proto__', 'prototype', 'constructor']);
    const RECORD_KEYS = ['wallets', 'assets', 'aportes', 'proventos', 'rfEvents', 'manualFixedIncome', 'manualOverrides', 'goals', 'importHistory', 'historical', 'corporateEvents', 'assetLineage', 'settings'];
    const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

    // Schema identifiers for compatibility checking
    const SCHEMA_VERSIONS = {
      'legacy-civ5-compatible': { major: 1, minor: 0, description: 'Legacy civ5 localStorage format' },
      'legacy-civ5-cfg-compatible': { major: 1, minor: 0, description: 'Legacy civ5 config format' },
      'backup-portability-v1.1': { major: 1, minor: 1, description: 'V267 enhanced backup format with manifest' },
      'backup-portability-v1.2': { major: 1, minor: 2, description: 'V324 complete-domain backup format' }
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
  function domainManifest(state, config) {
    const required = ['wallets', 'assets', 'aportes', 'proventos', 'rfEvents', 'goals', 'performance'];
    const missing = required.filter(key => !Object.prototype.hasOwnProperty.call(state || {}, key));
    if (missing.length) throw new Error(`MISSING_REQUIRED_DOMAIN:${missing.join(',')}`);
    if (!isRecord(config)) throw new Error('INVALID_REQUIRED_DOMAIN:settings');
    if (!Array.isArray(state.wallets) || !Array.isArray(state.assets) || !Array.isArray(state.aportes) ||
        !Array.isArray(state.proventos) || !Array.isArray(state.rfEvents) || !isRecord(state.goals) ||
        !isRecord(state.performance)) throw new Error('INVALID_REQUIRED_DOMAIN');
    const performance = state.performance;
    if (performance.schemaVersion !== 1 || !isRecord(performance.valuationSnapshots) || !Array.isArray(performance.valuationSnapshots.snapshots) ||
        !isRecord(performance.externalCashFlows) || !Array.isArray(performance.externalCashFlows.flows)) throw new Error('INVALID_REQUIRED_DOMAIN:performance');
    const performanceCount = (Array.isArray(performance.valuationSnapshots?.snapshots) ? performance.valuationSnapshots.snapshots.length : 0) +
      (Array.isArray(performance.externalCashFlows?.flows) ? performance.externalCashFlows.flows.length : 0);
    const persistedSettings = ['tab', 'divGoal', 'hideValues', 'apHistoryOpen', 'apSearch', 'dashPeriod', 'dashType', 'rentPeriod', 'rentType', 'rentBench', 'irpfYear', 'irpfStep', 'learnMeta'];
    const settingsCount = new Set([...Object.keys(config), ...persistedSettings.filter(key => Object.prototype.hasOwnProperty.call(state, key))]).size;
    return [
      { name: 'portfolio', version: 1, count: state.wallets.length, required: true },
      { name: 'assets', version: 1, count: state.assets.length, required: true },
      { name: 'transactions', version: 1, count: state.aportes.length, required: true },
      { name: 'income', version: 1, count: state.proventos.length, required: true },
      { name: 'fixedIncome', version: 1, count: state.rfEvents.length, required: true },
      { name: 'goals', version: 1, count: Object.keys(state.goals).length, required: true },
      { name: 'settings', version: 1, count: settingsCount, required: true },
      { name: 'performance', version: 1, count: performanceCount, required: true }
    ];
  }
  function planRetention(entries, { monthlyLimit = 12 } = {}) {
    const rows = Array.isArray(entries) ? entries : [];
    const monthly = rows.filter(row => row?.cadence === 'monthly').slice().sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || String(b.id || '').localeCompare(String(a.id || '')));
    const latestValid = monthly.find(row => row.status === 'VALID');
    const protectedIds = new Set(rows.filter(row => row?.recoveryRequired || row?.status !== 'VALID').map(row => String(row.id)));
    if (latestValid) protectedIds.add(String(latestValid.id));
    const keepMonthly = new Set(monthly.slice(0, Math.max(0, monthlyLimit)).map(row => String(row.id)));
    const deleteIds = monthly.filter(row => row.status === 'VALID' && !protectedIds.has(String(row.id)) && !keepMonthly.has(String(row.id))).map(row => String(row.id));
    const deleted = new Set(deleteIds);
    return { deleteIds, keepIds: rows.filter(row => !deleted.has(String(row?.id))).map(row => String(row?.id)) };
  }
  function externalBackupChannels() {
    return {
      storage: { status: 'NOT_CONFIGURED', writesEnabled: false },
      notification: { status: 'NOT_CONFIGURED', sendsEnabled: false }
    };
  }
  function validateAssetTypes(state, supportedAssetTypes) {
    if (!Array.isArray(supportedAssetTypes) || !supportedAssetTypes.length) return null;
    const allowed = new Set(supportedAssetTypes);
    for (const asset of state?.assets || []) {
      if (typeof asset?.type !== 'string' || !asset.type.trim()) return 'REVIEW_REQUIRED:MISSING_ASSET_TYPE';
      if (!allowed.has(asset.type)) return 'UNSUPPORTED_TYPE:ASSET:' + asset.type;
    }
    return null;
  }
  function periodicCadences(createdAt, entries = []) {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return { status: 'INVALID_DATE', cadences: [] };
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const year = month.slice(0, 4);
    const rows = Array.isArray(entries) ? entries : [];
    const cadences = [];
    if (!rows.some(row => row?.integrityValid === true && row?.cadence === 'monthly' && row?.period === month)) cadences.push({ cadence: 'monthly', period: month });
    if (month.endsWith('-12') && !rows.some(row => row?.integrityValid === true && row?.cadence === 'annual' && row?.period === year)) cadences.push({ cadence: 'annual', period: year });
    return { status: 'READY', cadences };
  }
  const ARCHIVE_DB = 'carteira-investimentos-backups-v1';
  const ARCHIVE_STORE = 'snapshots';
  function openArchive(indexedDb = globalThis.indexedDB) {
    if (!indexedDb) return Promise.reject(new Error('LOCAL_ARCHIVE_UNAVAILABLE'));
    return new Promise((resolve, reject) => {
      const request = indexedDb.open(ARCHIVE_DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(ARCHIVE_STORE)) request.result.createObjectStore(ARCHIVE_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onblocked = () => reject(new Error('LOCAL_ARCHIVE_BLOCKED'));
      request.onerror = () => reject(request.error || new Error('LOCAL_ARCHIVE_OPEN_FAILED'));
    });
  }
  async function listLocalBackups({ indexedDB: indexedDb = globalThis.indexedDB, supportedAssetTypes } = {}) {
    const db = await openArchive(indexedDb);
    try {
      const rows = await new Promise((resolve, reject) => {
        const tx = db.transaction(ARCHIVE_STORE, 'readonly');
        const request = tx.objectStore(ARCHIVE_STORE).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error('LOCAL_ARCHIVE_READ_FAILED'));
      });
      const verified = await Promise.all(rows.map(async row => {
        const integrity = await verifyArchivedBackup(row.backup, { supportedAssetTypes });
        const { backup, ...metadata } = row;
        return { ...metadata, status: integrity.valid ? 'VALID' : 'CORRUPTED', integrityValid: integrity.valid };
      }));
      return verified.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    } finally { db.close(); }
  }
  async function verifyArchivedBackup(backup, options) {
    try {
      const checksum = String(backup?.manifest?.checksums?.payload || '');
      if (backup?.manifest?.checksums?.algorithm !== 'SHA-256' || !/^[a-f0-9]{64}$/.test(checksum) || !isRecord(backup?.payload)) return { valid: false, status: 'CORRUPTED' };
      const actual = await sha256(canonical(backup.payload));
      if (actual !== checksum) return { valid: false, status: 'CORRUPTED' };
      const checked = await verifyBackup(backup, options);
      return { valid: checked.status === 'SUPPORTED', status: checked.status };
    } catch (_) { return { valid: false, status: 'CORRUPTED' }; }
  }
  async function saveLocalBackup(backup, { cadence = 'manual', period = '', createdAt = backup?.manifest?.createdAt, indexedDB: indexedDb = globalThis.indexedDB, supportedAssetTypes } = {}) {
    const checked = await verifyBackup(backup, { supportedAssetTypes });
    if (checked.status !== 'SUPPORTED') return { ok: false, status: checked.status, error: checked.error || checked.status };
    if (!['manual', 'monthly', 'annual'].includes(cadence) || !createdAt || (cadence !== 'manual' && !period)) return { ok: false, status: 'INVALID_METADATA' };
    const id = cadence === 'manual' ? `manual:${createdAt}:${backup.manifest.operationId}` : `${cadence}:${period}`;
    const db = await openArchive(indexedDb);
    const entry = { id, cadence, period, createdAt: String(createdAt), status: 'VALID', recoveryRequired: false, backup: checked.backup };
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(ARCHIVE_STORE, 'readwrite');
        tx.objectStore(ARCHIVE_STORE).put(entry);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('LOCAL_ARCHIVE_WRITE_FAILED'));
        tx.onabort = () => reject(tx.error || new Error('LOCAL_ARCHIVE_WRITE_ABORTED'));
      });
      const rows = await new Promise((resolve, reject) => {
        const tx = db.transaction(ARCHIVE_STORE, 'readonly');
        const request = tx.objectStore(ARCHIVE_STORE).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error('LOCAL_ARCHIVE_READ_FAILED'));
      });
      const verifiedRows = await Promise.all(rows.map(async row => ({
        ...row,
        status: (await verifyArchivedBackup(row.backup, { supportedAssetTypes })).valid ? 'VALID' : 'CORRUPTED'
      })));
      const retention = planRetention(verifiedRows, { monthlyLimit: 12 });
      if (retention.deleteIds.length) await new Promise((resolve, reject) => {
        const tx = db.transaction(ARCHIVE_STORE, 'readwrite');
        const store = tx.objectStore(ARCHIVE_STORE);
        retention.deleteIds.forEach(key => store.delete(key));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('LOCAL_ARCHIVE_RETENTION_FAILED'));
        tx.onabort = () => reject(tx.error || new Error('LOCAL_ARCHIVE_RETENTION_ABORTED'));
      });
      return { ok: true, id, deleted: retention.deleteIds };
    } finally { db.close(); }
  }
  async function createPeriodicBackups(backupOrFactory, { now = new Date(), indexedDB: indexedDb = globalThis.indexedDB, supportedAssetTypes, canCreateSnapshot = () => true } = {}) {
    const entries = await listLocalBackups({ indexedDB: indexedDb, supportedAssetTypes });
    const schedule = periodicCadences(now, entries);
    if (schedule.status !== 'READY') return schedule;
    if (!schedule.cadences.length) return { status: 'NOOP', results: [] };
    const results = [];
    for (const item of schedule.cadences) {
      if (!canCreateSnapshot()) return { status: results.length ? 'PARTIAL' : 'BLOCKED', reason: 'RUNTIME_NOT_STABLE', results };
      const backup = typeof backupOrFactory === 'function' ? await backupOrFactory() : backupOrFactory;
      if (!canCreateSnapshot()) return { status: results.length ? 'PARTIAL' : 'BLOCKED', reason: 'RUNTIME_NOT_STABLE', results };
      results.push(await saveLocalBackup(backup, { ...item, createdAt: now.toISOString(), indexedDB: indexedDb, supportedAssetTypes }));
    }
    return { status: results.every(result => result.ok) ? 'SAVED' : 'FAILED', results };
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
  async function createBackup({ state = {}, config = {}, metadata = {}, supportedAssetTypes, createdAt = new Date().toISOString(), appVersion = 'unknown', operationId = crypto.randomUUID ? crypto.randomUUID() : 'op-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9) } = {}) {
      const safeState = sourceState({ state });
      const safeConfig = normalize(config, { stripSensitive: true });
      const typeError = validateAssetTypes(safeState, supportedAssetTypes);
      if (typeError) throw new Error(typeError);
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
          exportedBy: (typeof navigator !== 'undefined' && navigator?.userAgent) ? 'browser' : 'node',
          contentInventory: inventory(safeState),
          recordCounts: counts(safeState),
          schemaIdentifiers: {
            state: 'legacy-civ5-compatible',
            config: 'legacy-civ5-cfg-compatible',
            stateSchema: 'backup-portability-v1.2',
            configSchema: 'backup-portability-v1.2'
          },
          domains: domainManifest(safeState, safeConfig),
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
  async function verifyBackup(raw, { supportedAssetTypes } = {}) {
      let rawText;
      try { rawText = typeof raw === 'string' ? raw : JSON.stringify(raw); }
      catch (_) { return { status: 'CORRUPTED', error: 'NON_SERIALIZABLE_BACKUP' }; }
      if (typeof rawText === 'string' && new TextEncoder().encode(rawText).byteLength > MAX_BACKUP_BYTES) return { status: 'CORRUPTED', error: 'BACKUP_TOO_LARGE' };
      let backup;
      try { backup = parseJson(raw); } catch (error) { return { status: 'CORRUPTED', error: error.message }; }
      if (!isRecord(backup) || !isRecord(backup.manifest) || !isRecord(backup.payload)) return { status: 'UNSUPPORTED', error: 'INVALID_CONTAINER' };
      if (backup.manifest.backupFormat !== FORMAT) return { status: 'UNSUPPORTED', error: 'UNKNOWN_FORMAT' };

      const version = String(backup.manifest.backupVersion || '');
      const major = Number(version.split('.')[0]);
      const minor = Number(version.split('.')[1] || '0');
      if (!Number.isInteger(major) || major > MAX_SUPPORTED_MAJOR) return { status: 'TOO_NEW', backup };
      if (major === MAX_SUPPORTED_MAJOR && minor > MAX_SUPPORTED_MINOR) return { status: 'TOO_NEW', backup };
      if (major < MAX_SUPPORTED_MAJOR) return { status: 'MIGRATABLE', backup };

      try { assertSafeObject(backup); } catch (error) { return { status: 'CORRUPTED', error: error.message }; }
      const expected = String(backup.manifest.checksums?.payload || '');
      if (!/^[a-f0-9]{64}$/.test(expected)) return { status: 'CORRUPTED', error: 'MISSING_CHECKSUM' };
      const actual = await sha256(canonical(backup.payload));
      if (actual !== expected) return { status: 'CORRUPTED', error: 'CHECKSUM_MISMATCH', expected, actual };

      const normalizedBackup = { ...backup, payload: { ...backup.payload, state: normalizeFinancialDates(backup.payload.state) } };
      const stateError = validateState(normalizedBackup.payload.state);
      if (stateError) return { status: 'CORRUPTED', error: stateError };
      const typeError = validateAssetTypes(normalizedBackup.payload.state, supportedAssetTypes);
      if (typeError) return { status: typeError.startsWith('UNSUPPORTED_TYPE:') ? 'UNSUPPORTED_TYPE' : 'REVIEW_REQUIRED', error: typeError };
      if (major === 1 && minor >= 2) {
        let expectedDomains;
        try { expectedDomains = domainManifest(normalizedBackup.payload.state, normalizedBackup.payload.config); }
        catch (error) { return { status: 'PARTIAL', error: error.message }; }
        const declared = backup.manifest.domains;
        if (!Array.isArray(declared)) return { status: 'PARTIAL', error: 'MISSING_DOMAIN_MANIFEST' };
        const declaredByName = new Map(declared.map(domain => [domain?.name, domain]));
        for (const expectedDomain of expectedDomains) {
          const domain = declaredByName.get(expectedDomain.name);
          if (!domain) return { status: 'PARTIAL', error: `MISSING_DOMAIN:${expectedDomain.name}` };
          if (domain.required !== true || domain.version !== expectedDomain.version || domain.count !== expectedDomain.count) {
            return { status: 'CORRUPTED', error: `DOMAIN_MISMATCH:${expectedDomain.name}` };
          }
        }
        if (declared.length !== expectedDomains.length || declared.some(domain => !expectedDomains.some(expectedDomain => expectedDomain.name === domain?.name))) {
          return { status: 'INCOMPATIBLE', error: 'UNKNOWN_OR_DUPLICATE_DOMAIN' };
        }
        const schemaIdentifiers = backup.manifest.schemaIdentifiers || {};
        if (schemaIdentifiers.stateSchema !== 'backup-portability-v1.2' || schemaIdentifiers.configSchema !== 'backup-portability-v1.2') {
          return { status: 'INCOMPATIBLE', error: 'UNSUPPORTED_SCHEMA_IDENTIFIER' };
        }
      }

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

      if (schemaWarnings.some(item => item.includes('_FUTURE:'))) return { status: 'TOO_NEW', error: 'UNSUPPORTED_FUTURE_SCHEMA', warnings: schemaWarnings };
      if (schemaWarnings.length) return { status: 'INCOMPATIBLE', error: 'UNKNOWN_SCHEMA_IDENTIFIER', warnings: schemaWarnings };
      const expectedCounts = backup.manifest.recordCounts || {};
      const actualCounts = counts(normalizedBackup.payload.state);
      for (const key of Object.keys(actualCounts)) if (expectedCounts[key] !== actualCounts[key]) return { status: 'CORRUPTED', error: `COUNT_MISMATCH:${key}` };

      return { status: 'SUPPORTED', backup: normalizedBackup, checksum: actual, warnings: schemaWarnings };
    }
  async function parseBackup(raw, options) {
    const result = await verifyBackup(raw, options);
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
  async function previewRestore(raw, currentState = {}, options) {
      const integrity = await verifyBackup(raw, options);
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
    const before = clone(store); const result = { ok: false, store: before, preApplySnapshot: clone(before), rollback: true };
    try {
      if (!backup?.payload?.state) throw new Error('INVALID_BACKUP');
      const next = clone(store); next.state = clone(backup.payload.state); next.config = clone(backup.payload.config || {});
      if (Object.keys(next.state).length > failAfter) throw new Error('INJECTED_FAILURE');
      result.ok = true; result.store = next; result.rollback = false; return result;
    } catch (error) { return { ...result, error }; }
  }
  return { FORMAT, VERSION, canonical, createBackup, parseBackup, verifyBackup, previewRestore, applyToIsolatedStore, normalize, sha256, planRetention, periodicCadences, listLocalBackups, saveLocalBackup, createPeriodicBackups, externalBackupChannels };
});
