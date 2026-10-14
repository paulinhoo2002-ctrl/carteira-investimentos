(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PersistenceCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
  function defaultNormalizeType(value, fallback = 'Ação') {
    const raw = String(value || '').trim();
    if (!raw) return fallback || 'Ação';
    const key = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
    const aliases = {
      'ACAO': 'Ação',
      'ACOES': 'Ação',
      'FUNDO DE INVESTIMENTO': 'Fundos de Investimento',
      'FUNDOS DE INVESTIMENTO': 'Fundos de Investimento',
      'RENDA FIXA': 'Renda Fixa',
      'TESOURO DIRETO': 'Tesouro Direto',
      'RESERVA DE EMERGENCIA': 'Reserva de emergência',
      'STOCK': 'Stock',
      'STOCKS': 'Stock',
      'REIT': 'Reit',
      'REITS': 'Reit'
    };
    return aliases[key] || fallback || raw || 'Ação';
  }

  function defaultNormalizeGoals(goals) {
    const base = {
      patrimonio: { target: 0, aporte: 0, annualVar: 0 },
      ativos: { type: 'Ação', ticker: '', aporte: 0, annualVar: 10, finalValue: 0 },
      proventos: { types: ['Ação', 'FII', 'ETF', 'BDR', 'Stock'], monthly: 0 },
      allocation: {
        items: [
          { type: 'FII', pct: 40 },
          { type: 'ETF', pct: 20 },
          { type: 'Ação', pct: 25 },
          { type: 'BDR', pct: 5 },
          { type: 'Renda Fixa', pct: 10 }
        ]
      }
    };
    const g = (goals && typeof goals === 'object') ? JSON.parse(JSON.stringify(goals)) : {};
    g.patrimonio = { ...base.patrimonio, ...(g.patrimonio || {}) };
    g.ativos = { ...base.ativos, ...(g.ativos || {}), type: defaultNormalizeType((g.ativos || {}).type || 'Ação', 'Ação') };
    const rawTypes = Array.isArray(g.proventos?.types) ? g.proventos.types : base.proventos.types;
    g.proventos = { ...base.proventos, ...(g.proventos || {}), types: [...new Set(rawTypes.map(t => defaultNormalizeType(t, '')).filter(Boolean))] };
    if (!g.proventos.types.length) g.proventos.types = [...base.proventos.types];
    const allocSrc = Array.isArray(g.allocation?.items)
      ? g.allocation.items
      : (g.allocation && typeof g.allocation === 'object' ? Object.entries(g.allocation).map(([type, pct]) => ({ type, pct })) : base.allocation.items);
    const seen = new Set();
    g.allocation = {
      items: allocSrc.map(it => ({
        type: defaultNormalizeType(it?.type || it?.label || '', ''),
        pct: Math.max(0, Number(it?.pct ?? it?.value ?? it?.percent ?? it?.weight) || 0)
      })).filter(it => {
        if (!it.type || seen.has(it.type)) return false;
        seen.add(it.type);
        return true;
      })
    };
    if (!g.allocation.items.length) g.allocation.items = [...base.allocation.items];
    return g;
  }

  function normalizeGoalsWithHelper(goals, normalizeGoalsFn) {
    return typeof normalizeGoalsFn === 'function' ? normalizeGoalsFn(goals) : defaultNormalizeGoals(goals);
  }

  function cloneBackupState(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function sanitizeBackupValue(value, seen = new WeakMap()) {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeBackupValue(item, seen));
    }
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    const clean = {};
    seen.set(value, clean);
    Object.keys(value).forEach((key) => {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') return;
      clean[key] = sanitizeBackupValue(value[key], seen);
    });
    return clean;
  }

  function buildStoredState(state = {}, normalizeGoalsFn) {
    const s = state && typeof state === 'object' ? state : {};
    return {
      wallets: Array.isArray(s.wallets) ? s.wallets : [],
      activeWalletId: String(s.activeWalletId || ''),
      assets: Array.isArray(s.assets) ? s.assets : [],
      aportes: Array.isArray(s.aportes) ? s.aportes : [],
      proventos: Array.isArray(s.proventos) ? s.proventos : [],
      rfEvents: Array.isArray(s.rfEvents) ? s.rfEvents : [],
      tab: String(s.tab || 'dashboard'),
      divGoal: Number(s.divGoal) || 0,
      goals: normalizeGoalsWithHelper(s.goals, normalizeGoalsFn),
      hideValues: !!s.hideValues,
      apHistoryOpen: !!s.apHistoryOpen,
      apSearch: String(s.apSearch || ''),
      dashPeriod: Number(s.dashPeriod) || 12,
      dashType: String(s.dashType || 'all'),
      rentPeriod: String(s.rentPeriod || 'all'),
      rentType: String(s.rentType || 'all'),
      rentBench: String(s.rentBench || 'CDI'),
      irpfYear: Number(s.irpfYear) || new Date().getFullYear(),
      irpfStep: Number(s.irpfStep) || 1,
      learnMeta: s.learnMeta && typeof s.learnMeta === 'object' ? s.learnMeta : {}
    };
  }

  function buildBackupState(state = {}, normalizeGoalsFn) {
    return cloneBackupState(buildStoredState(state, normalizeGoalsFn));
  }

  function serializeStoredState(state, normalizeGoalsFn) {
    return JSON.stringify(buildStoredState(state, normalizeGoalsFn));
  }

  function parseStoredState(raw) {
    return JSON.parse(raw || '{}');
  }

  // Opt-in Package 1 boundary. No V2 document is added to legacy storage.
  function package1Cents(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
        !Number.isSafeInteger(Math.round(value * 100)) ||
        Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) return null;
    return Math.round(value * 100);
  }

  function normalizePositionV2(position) {
    if (!isRecord(position) || position.schema_version !== 2 ||
        !String(position.document_id || '').trim() || !String(position.custodian_id || '').trim() ||
        !String(position.asset_id || '').trim() || !String(position.asset_type || '').trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(position.as_of || '') ||
        typeof position.quantity !== 'number' || !Number.isFinite(position.quantity) || position.quantity < 0 ||
        package1Cents(position.current_value) === null ||
        !isRecord(position.provenance) || !String(position.provenance.source_id || '').trim() ||
        !Array.isArray(position.source_ids) || !position.source_ids.length ||
        position.source_ids.some(id => !String(id || '').trim()) ||
        !String(position.import_batch_id || '').trim() ||
        !String(position.created_at || '').trim() || !String(position.updated_at || '').trim() ||
        position.reconciliation_status !== 'PARTIAL') throw new Error('POSITION_V2_INVALID');
    if (position.average_cost_status !== 'UNKNOWN' || position.average_cost !== null) {
      throw new Error('AVERAGE_COST_UNCERTIFIED');
    }
    if (position.cost_basis_status === 'UNKNOWN') {
      if (position.cost_basis_value !== null || position.cost_method !== null) throw new Error('COST_BASIS_INVALID');
    } else if (position.cost_basis_status === 'DERIVED') {
      if (package1Cents(position.cost_basis_value) === null || position.cost_method !== 'FIFO') {
        throw new Error('COST_BASIS_INVALID');
      }
    } else throw new Error('COST_BASIS_INVALID');
    return sanitizeBackupValue(position);
  }

  function normalizeAccountSnapshotV1(snapshot) {
    if (!isRecord(snapshot) || snapshot.schema_version !== 1 ||
        !String(snapshot.snapshot_id || '').trim() || snapshot.snapshot_id !== snapshot.document_id ||
        !String(snapshot.custodian_id || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.as_of || '') ||
        !String(snapshot.import_batch_id || '').trim() ||
        !isRecord(snapshot.provenance) || !String(snapshot.provenance.source_id || '').trim() ||
        snapshot.reconciliation_status !== 'PARTIAL') throw new Error('SNAPSHOT_INVALID');
    const fields = ['rv_official', 'rf_official', 'total_official', 'rv_detail_sum', 'rf_detail_sum',
      'detail_total', 'rv_gap', 'rf_gap', 'total_gap'];
    const cents = {};
    for (const field of fields) {
      cents[field] = package1Cents(snapshot[field]);
      if (cents[field] === null) throw new Error('SNAPSHOT_INVALID');
    }
    if (cents.rv_official + cents.rf_official !== cents.total_official ||
        cents.rv_detail_sum + cents.rf_detail_sum !== cents.detail_total ||
        cents.rv_official - cents.rv_detail_sum !== cents.rv_gap ||
        cents.rf_official - cents.rf_detail_sum !== cents.rf_gap ||
        cents.total_official - cents.detail_total !== cents.total_gap) {
      throw new Error('SNAPSHOT_TOTAL_MISMATCH');
    }
    return sanitizeBackupValue(snapshot);
  }

  function buildPackage1ReadOnlyView(positions, snapshot) {
    if (!Array.isArray(positions)) throw new Error('PACKAGE1_POSITIONS_INVALID');
    const safeSnapshot = normalizeAccountSnapshotV1(snapshot);
    const safePositions = positions.map(normalizePositionV2);
    const ids = new Set();
    let rv = 0;
    let rf = 0;
    for (const position of safePositions) {
      if (position.custodian_id !== safeSnapshot.custodian_id || position.as_of !== safeSnapshot.as_of ||
          position.import_batch_id !== safeSnapshot.import_batch_id) throw new Error('PACKAGE1_SCOPE_MISMATCH');
      if (ids.has(position.document_id)) throw new Error('PACKAGE1_DUPLICATE_ID');
      ids.add(position.document_id);
      if (position.asset_type.startsWith('RV')) rv += package1Cents(position.current_value);
      else if (position.asset_type === 'RF') rf += package1Cents(position.current_value);
      else throw new Error('PACKAGE1_ASSET_TYPE_INVALID');
    }
    if (rv !== package1Cents(safeSnapshot.rv_detail_sum) ||
        rf !== package1Cents(safeSnapshot.rf_detail_sum)) throw new Error('PACKAGE1_DETAIL_MISMATCH');
    return { positions: safePositions, snapshot: safeSnapshot, mode: 'READ_ONLY' };
  }

  function applyStorageTransaction(storage, stateKey, configKey, nextStateRaw, nextConfigRaw) {
    const required = ['getItem', 'setItem', 'removeItem'];
    const invalid = !storage || required.some(name => typeof storage[name] !== 'function');
    if (invalid) {
      return {
        ok: false,
        error: new TypeError('Invalid storage interface'),
        rollbackErrors: [],
        previousStateRaw: null,
        previousConfigRaw: null
      };
    }
    let previousStateRaw = null;
    let previousConfigRaw = null;
    try {
      previousStateRaw = storage.getItem(stateKey);
      previousConfigRaw = storage.getItem(configKey);
    } catch (error) {
      return { ok: false, error, rollbackErrors: [], previousStateRaw, previousConfigRaw };
    }
    try {
          storage.setItem(stateKey, nextStateRaw);
          storage.setItem(configKey, nextConfigRaw);
          return { ok: true, previousStateRaw, previousConfigRaw };
        } catch (error) {
          // Explicit QuotaExceededError handling - localStorage quota exceeded
          // Preserve original QuotaExceededError; wrap other quota-like errors
          if (error && error.name === 'QuotaExceededError') {
            // Already a proper QuotaExceededError, keep as-is
          } else if (error && (error.code === 22 || /quota|storage/i.test(error.message))) {
            error = new Error(`QUOTA_EXCEEDED: localStorage quota exceeded. Cannot save state. Current state size: ${nextStateRaw.length} chars.`);
            error.name = 'QuotaExceededError';
          }
          const rollbackErrors = [];
          const restore = (key, value) => {
            try {
              if (value === null) storage.removeItem(key);
              else storage.setItem(key, value);
            } catch (rollbackError) {
              rollbackErrors.push(rollbackError);
            }
          };
          restore(stateKey, previousStateRaw);
          restore(configKey, previousConfigRaw);
          return { ok: false, error, rollbackErrors, previousStateRaw, previousConfigRaw };
        }
  }

  function createBackupPayload(state, config, options = {}) {
    const data = cloneBackupState(state);
    const storageState = cloneBackupState(state);
    const storageKeys = Array.isArray(options.storageKeys) && options.storageKeys.length
      ? options.storageKeys.map(String)
      : ['civ5', 'civ5_cfg'];
    const stateKey = storageKeys[0] || 'civ5';
    const configKey = storageKeys[1] || `${stateKey}_cfg`;
    const safeConfig = {
      divGoal: Number(config?.divGoal) || 0
    };
    return {
      meta: {
        app: String(options.appName || 'Carteira de Investimentos'),
        backupVersion: Number(options.backupVersion) || 1,
        exportedAt: String(options.exportedAt || new Date().toISOString()),
        origin: String(options.origin || 'localStorage'),
        storageKeys: [stateKey, configKey]
      },
      data,
      storage: {
        [stateKey]: storageState,
        [configKey]: safeConfig
      }
    };
  }

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function hasValidBackupDataShape(data) {
    if (!isRecord(data)) return false;
    const arrayFields = ['wallets', 'assets', 'aportes', 'proventos', 'rfEvents'];
    if (arrayFields.some(field => Object.prototype.hasOwnProperty.call(data, field) && !Array.isArray(data[field]))) return false;
    if (Object.prototype.hasOwnProperty.call(data, 'goals') && !isRecord(data.goals)) return false;
    if (Object.prototype.hasOwnProperty.call(data, 'learnMeta') && !isRecord(data.learnMeta)) return false;
    if (Object.prototype.hasOwnProperty.call(data, 'divGoal') && (!Number.isFinite(Number(data.divGoal)) || typeof data.divGoal === 'boolean')) return false;
    if (Object.prototype.hasOwnProperty.call(data, 'brapiToken') && typeof data.brapiToken !== 'string') return false;
    return true;
  }

  function hasValidBackupStorageShape(storage) {
    if (storage === null || storage === undefined) return true;
    if (!isRecord(storage)) return false;
    const knownKeys = ['civ5', 'civ5_cfg'];
    return knownKeys.some(key => Object.prototype.hasOwnProperty.call(storage, key) && isRecord(storage[key]));
  }

  function parseBackupRaw(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const hasMetaEnvelope = Object.prototype.hasOwnProperty.call(raw, 'meta');
    const hasDataEnvelope = Object.prototype.hasOwnProperty.call(raw, 'data');
    const hasStorageEnvelope = Object.prototype.hasOwnProperty.call(raw, 'storage');
    if (hasMetaEnvelope && !isRecord(raw.meta)) return null;
    if (hasDataEnvelope && !isRecord(raw.data)) return null;
    if (hasStorageEnvelope && !isRecord(raw.storage)) return null;
    const meta = hasMetaEnvelope ? sanitizeBackupValue(raw.meta) : null;
    const data = hasDataEnvelope ? sanitizeBackupValue(raw.data) : sanitizeBackupValue(raw);
    const storage = hasStorageEnvelope ? sanitizeBackupValue(raw.storage) : null;
    const app = String(meta?.app || '').trim();
    const hasRecognizedApp = /carteira/i.test(app);
    if (meta && meta.app !== undefined && !hasRecognizedApp) return null;
    if (meta && meta.backupVersion !== undefined) {
      const version = Number(meta.backupVersion);
      if (!Number.isInteger(version) || version !== 1) return null;
    }
    if (!hasValidBackupDataShape(data) || !hasValidBackupStorageShape(storage)) return null;
    const hasKnown = Array.isArray(data.wallets) || Array.isArray(data.assets) || Array.isArray(data.aportes) || Array.isArray(data.proventos) || Array.isArray(data.rfEvents) || data.goals || data.divGoal !== undefined || data.learnMeta || data.brapiToken !== undefined;
    if (!hasKnown && !hasRecognizedApp) return null;
    return { meta, data, storage };
  }

  function backupStats(data, normalizeGoalsFn, isFixedAssetFn) {
    const wallets = Array.isArray(data?.wallets) ? data.wallets : [];
    const assets = Array.isArray(data?.assets) ? data.assets : [];
    const aportes = Array.isArray(data?.aportes) ? data.aportes : [];
    const proventos = Array.isArray(data?.proventos) ? data.proventos : [];
    const goals = data?.goals && typeof data.goals === 'object' ? data.goals : {};
    const defaultGoals = normalizeGoalsWithHelper(undefined, normalizeGoalsFn);
    const goalsChanged = Object.keys(goals).filter(k => JSON.stringify(goals[k] ?? null) !== JSON.stringify(defaultGoals[k] ?? null)).length;
    return {
      wallets: wallets.length,
      assets: assets.length,
      aportes: aportes.length,
      proventos: proventos.length,
      fixed: assets.filter(a => (typeof isFixedAssetFn === 'function' ? isFixedAssetFn(a) : defaultNormalizeType(a?.type || '', '') === 'Renda Fixa')).length,
      goals: goalsChanged,
      hasToken: !!String(data?.brapiToken || '').trim()
    };
  }

  return {
    applyStorageTransaction,
    buildStoredState,
    buildBackupState,
    serializeStoredState,
    parseStoredState,
    normalizePositionV2,
    normalizeAccountSnapshotV1,
    buildPackage1ReadOnlyView,
    createBackupPayload,
    parseBackupRaw,
    backupStats
  };
});
