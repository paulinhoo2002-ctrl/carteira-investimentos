(() => {
  'use strict';

  const KEY = 'civ5_offline_session_v1';
  const VERSION = 1;

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
    read,
    clear,
    snapshotHasData,
    eligible,
    scopeHash,
    mark,
  };
})();
