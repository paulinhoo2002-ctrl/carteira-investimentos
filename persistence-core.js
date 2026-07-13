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

  function parseBackupRaw(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : null;
    const data = raw.data && typeof raw.data === 'object' ? raw.data : raw;
    const storage = raw.storage && typeof raw.storage === 'object' ? raw.storage : null;
    const hasKnown = Array.isArray(data.wallets) || Array.isArray(data.assets) || Array.isArray(data.aportes) || Array.isArray(data.proventos) || Array.isArray(data.rfEvents) || data.goals || data.divGoal !== undefined || data.learnMeta || data.brapiToken !== undefined;
    if (!hasKnown && !(meta && /carteira/i.test(String(meta.app || '')))) return null;
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
    buildStoredState,
    buildBackupState,
    serializeStoredState,
    parseStoredState,
    createBackupPayload,
    parseBackupRaw,
    backupStats
  };
});
