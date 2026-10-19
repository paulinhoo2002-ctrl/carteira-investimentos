'use strict';

/**
 * Portfolio data source contract for authorized real accounts.
 */
(function exposeDataSource(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PortfolioDataSource = api;
})(typeof globalThis === 'object' ? globalThis : this, function createDataSource(){

  const SOURCE_TYPES = Object.freeze({
    FIRESTORE_REAL: 'FIRESTORE_REAL',
  });

  /**
   * Firestore REAL data source — reads/writes to Firestore under UID scope.
   * Only used when account mode is REAL.
   */
  function createFirestoreRealDataSource(uid, firestoreDb, options) {
    if (!uid) throw new TypeError('FirestoreRealDataSource requires a UID');
    if (!firestoreDb) throw new TypeError('FirestoreRealDataSource requires a Firestore db');
    // REAL mode is a construction requirement; fail closed for every other state.
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

  return { SOURCE_TYPES, createFirestoreRealDataSource };
});
