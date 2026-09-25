(() => {
  'use strict';

  const KEY = 'civ5_offline_session_v1';
  const VERSION = 1;
  const SNAPSHOT_KEY = 'civ5_readonly_offline_snapshot_v1';
  const SNAPSHOT_VERSION = 1;
  const ROOT_STATE_KEYS = [
    'wallets', 'activeWalletId', 'assets', 'aportes', 'proventos', 'rfEvents',
    'tab', 'divGoal', 'goals', 'hideValues', 'apHistoryOpen', 'dashPeriod',
    'dashType', 'rentPeriod', 'rentType', 'rentBench', 'irpfYear', 'irpfStep', 'learnMeta',
  ];
  const WALLET_STATE_KEYS = [
    'id', 'name', 'assets', 'aportes', 'proventos', 'rfEvents', 'divGoal', 'goals', 'learnMeta',
  ];
  const SENSITIVE_KEY = /(?:token|password|cookie|oauth|credential|secret|api.?key)/i;

  function storageOf(storage) {
    return storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  }

  function read(storage) {
    const target = storageOf(storage);
    if (!target) return null;
    try {
      const value = JSON.parse(target.getItem(KEY) || 'null');
      return value && value.version === VERSION && value.eligible === true ? value : null;
    } catch (_) {
      return null;
    }
  }

  function clear(storage) {
    const target = storageOf(storage);
    try { target?.removeItem(KEY); } catch (_) {}
  }

  function snapshotHasData(storage, stateKey = 'civ5') {
    const target = storageOf(storage);
    if (!target) return false;
    try {
      const state = JSON.parse(target.getItem(stateKey) || 'null');
      if (!state || typeof state !== 'object') return false;
      return ['assets', 'aportes', 'proventos', 'rfEvents', 'wallets']
        .some(key => Array.isArray(state[key]) && state[key].length > 0);
    } catch (_) {
      return false;
    }
  }

  function safeClone(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) throw new TypeError('Offline snapshot must be acyclic');
    seen.add(value);
    const result = Array.isArray(value)
      ? value.map(item => safeClone(item, seen))
      : Object.fromEntries(Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .map(([key, item]) => [key, safeClone(item, seen)]));
    seen.delete(value);
    return result;
  }

  function projectState(state) {
    if (!state || typeof state !== 'object' || !Array.isArray(state.wallets) || !state.wallets.length) return null;
    const activeWalletId = String(state.activeWalletId || '');
    const activeWallet = state.wallets.find(wallet => String(wallet?.id || '') === activeWalletId);
    if (!activeWalletId || !activeWallet) return null;
    const projected = {};
    for (const key of ROOT_STATE_KEYS) {
      if (key === 'wallets') {
        const item = {};
        for (const walletKey of WALLET_STATE_KEYS) {
          if (Object.prototype.hasOwnProperty.call(activeWallet || {}, walletKey)) item[walletKey] = safeClone(activeWallet[walletKey]);
        }
        projected.wallets = [item];
      } else if (Object.prototype.hasOwnProperty.call(state, key)) {
        projected[key] = safeClone(state[key]);
      }
    }
    projected.activeWalletId = activeWalletId;
    return projected;
  }

  async function digestSnapshot(state) {
    if (!globalThis.crypto?.subtle || !globalThis.TextEncoder) return '';
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(state)));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function writeReadOnlySnapshot(storage, { scope, state, asOf = null } = {}) {
    const target = storageOf(storage);
    if (!target || !String(scope || '').trim()) return null;
    try {
      const projected = projectState(state);
      if (!projected) return null;
      const signature = await digestSnapshot(projected);
      if (!signature) return null;
      const savedAt = new Date().toISOString();
      target.setItem(SNAPSHOT_KEY, JSON.stringify({
        version: SNAPSHOT_VERSION,
        scope: String(scope),
        signature,
        savedAt,
        asOf: typeof asOf === 'string' && asOf.trim() ? asOf : null,
        state: projected,
      }));
      return { signature, savedAt, asOf: typeof asOf === 'string' && asOf.trim() ? asOf : null };
    } catch (_) {
      return null;
    }
  }

  async function readReadOnlySnapshot(storage, { scope, signature = '' } = {}) {
    const target = storageOf(storage);
    if (!target || !String(scope || '').trim()) return null;
    try {
      const record = JSON.parse(target.getItem(SNAPSHOT_KEY) || 'null');
      if (!record || record.version !== SNAPSHOT_VERSION || record.scope !== String(scope)) return null;
      if (signature && record.signature !== signature) return null;
      const projected = projectState(record.state);
      if (!projected || JSON.stringify(projected) !== JSON.stringify(record.state)) return null;
      const verifiedSignature = await digestSnapshot(projected);
      if (!verifiedSignature || verifiedSignature !== record.signature) return null;
      return {
        version: record.version,
        scope: record.scope,
        signature: record.signature,
        savedAt: typeof record.savedAt === 'string' ? record.savedAt : null,
        asOf: typeof record.asOf === 'string' ? record.asOf : null,
        state: projected,
      };
    } catch (_) {
      return null;
    }
  }

  function clearReadOnlySnapshot(storage) {
    const target = storageOf(storage);
    try { target?.removeItem(SNAPSHOT_KEY); } catch (_) {}
  }

  function eligible({ online, marker, hasSnapshot }) {
    return online === false && Boolean(marker?.eligible) && hasSnapshot === true;
  }

  async function scopeHash(user) {
    const raw = String(user?.uid || '');
    if (!raw || !globalThis.crypto?.subtle || !globalThis.TextEncoder) return '';
    const digest = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`carteira-investimentos:v250:scope:${raw}`),
    );
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function mark(storage, { scope, snapshotSignature = '' } = {}) {
    const target = storageOf(storage);
    if (!target || !scope) return false;
    try {
      target.setItem(KEY, JSON.stringify({
        version: VERSION,
        eligible: true,
        scope,
        snapshotSignature: String(snapshotSignature || '').slice(0, 128),
        savedAt: new Date().toISOString(),
      }));
      return true;
    } catch (_) {
      return false;
    }
  }

  globalThis.V250OfflineSession = {
    KEY,
    VERSION,
    SNAPSHOT_KEY,
    SNAPSHOT_VERSION,
    read,
    clear,
    snapshotHasData,
    writeReadOnlySnapshot,
    readReadOnlySnapshot,
    clearReadOnlySnapshot,
    eligible,
    scopeHash,
    mark,
  };
})();
