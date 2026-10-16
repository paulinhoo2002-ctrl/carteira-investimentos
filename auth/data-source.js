'use strict';

/**
 * Portfolio data source contracts — REAL vs DEMO isolation.
 *
 * The UI works with either source through the same interface.
 * DEMO sources NEVER touch Firestore.
 */
(function exposeDataSource(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PortfolioDataSource = api;
})(typeof globalThis === 'object' ? globalThis : this, function createDataSource(){

  const SOURCE_TYPES = Object.freeze({
    FIRESTORE_REAL: 'FIRESTORE_REAL',
    LOCAL_DEMO: 'LOCAL_DEMO',
  });

  /**
   * Firestore REAL data source — reads/writes to Firestore under UID scope.
   * Only used when account mode is REAL.
   */
  function createFirestoreRealDataSource(uid, firestoreDb, options) {
    if (!uid) throw new TypeError('FirestoreRealDataSource requires a UID');
    if (!firestoreDb) throw new TypeError('FirestoreRealDataSource requires a Firestore db');
    // P18 hard guard: REAL mode is a CONSTRUCTION requirement — fail closed in
    // DEMO/BLOCKED/LOGIN_REQUIRED before any Firestore handle exists.
    if (!options || options.accountMode !== 'REAL') {
      throw new TypeError('FirestoreRealDataSource requires ACCOUNT_MODE=REAL (fail closed)');
    }
    return Object.freeze({
      type: SOURCE_TYPES.FIRESTORE_REAL,
      uid,
      async load() {
        const snap = await firestoreDb.collection('portfolios').doc(uid).get();
        return snap.exists ? snap.data() : null;
      },
      async save(data) {
        if (!data || typeof data !== 'object') throw new TypeError('save requires data object');
        await firestoreDb.collection('portfolios').doc(uid).set(data, { merge: true });
      },
      subscribe(callback) {
        return firestoreDb.collection('portfolios').doc(uid).onSnapshot(
          snap => callback(snap.exists ? snap.data() : null),
          error => callback(null, error)
        );
      },
    });
  }

  /**
   * Local DEMO data source — entirely local (localStorage/IndexedDB/adapter).
   * NEVER reads/writes Firestore. All data is synthetic.
   * Falls back to in-memory Map if localStorage is unavailable (tests).
   */
  function createLocalDemoDataSource(storageKey, storageAdapter) {
    const key = storageKey || 'demo_portfolio_v1';
    const storage = storageAdapter
      || (typeof localStorage !== 'undefined' ? localStorage : null)
      || createMemoryStorage();
    return Object.freeze({
      type: SOURCE_TYPES.LOCAL_DEMO,
      uid: null, // demo has no UID-scoped Firestore identity
      async load() {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      },
      async save(data) {
        if (!data || typeof data !== 'object') throw new TypeError('save requires data object');
        storage.setItem(key, JSON.stringify(data));
      },
      subscribe(callback) {
        // Demo doesn't have realtime sync; fire immediately with current state
        const raw = storage.getItem(key);
        setTimeout(() => callback(raw ? JSON.parse(raw) : null), 0);
        return () => {}; // unsubscribe is a no-op
      },
      reset() {
        storage.removeItem(key);
      },
    });
  }

  /** In-memory storage fallback for Node/tests (no localStorage available). */
  function createMemoryStorage() {
    const store = new Map();
    return {
      getItem: k => store.has(k) ? store.get(k) : null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    };
  }

  return { SOURCE_TYPES, createFirestoreRealDataSource, createLocalDemoDataSource, createMemoryStorage };
});
