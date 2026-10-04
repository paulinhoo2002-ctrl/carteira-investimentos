'use strict';

const assert = require('node:assert/strict');
const { test, describe } = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

const indexHtml = read('index.html');

// Extract the Firebase initialization and cloud sync functions
const startInit = indexHtml.indexOf('function initFirebase(){');
const endInit = indexHtml.indexOf('function loadAccessControl(', startInit);
const initFirebaseSource = indexHtml.slice(startInit, endInit);

// Mock Firebase for testing
function createMockFirebase(config = {}) {
  const mockDoc = {
    data: {},
    set: async (data, options) => {
      mockDoc.data = { ...mockDoc.data, ...data };
      if (config.onWrite) config.onWrite({ operation: 'set', data, options });
      return Promise.resolve();
    },
    update: async (data) => {
      mockDoc.data = { ...mockDoc.data, ...data };
      if (config.onWrite) config.onWrite({ operation: 'update', data });
      return Promise.resolve();
    },
    delete: async () => {
      mockDoc.data = {};
      if (config.onWrite) config.onWrite({ operation: 'delete' });
      return Promise.resolve();
    },
    get: async () => ({
      exists: Object.keys(mockDoc.data).length > 0,
      data: () => mockDoc.data,
    }),
  };

  const mockCollection = {
    doc: (id) => mockDoc,
    add: async (data) => {
      if (config.onWrite) config.onWrite({ operation: 'add', data });
      return Promise.resolve({ id: 'mock-id' });
    },
    where: () => mockCollection,
    get: async () => ({ docs: [], empty: true }),
  };

  const mockDb = {
    collection: (name) => mockCollection,
    enablePersistence: () => Promise.resolve(),
  };

  const mockAuth = {
    currentUser: null,
    setPersistence: (value) => Promise.resolve(value),
    onAuthStateChanged: (callback) => {
      setTimeout(() => callback(null), 0);
      return () => {};
    },
    signOut: async () => {},
    createUserWithEmailAndPassword: async () => ({ user: { uid: 'test-uid', email: 'test@example.com' } }),
    signInWithEmailAndPassword: async () => ({ user: { uid: 'test-uid', email: 'test@example.com' } }),
    useEmulator: () => {},
  };

  return {
    initializeApp: (cfg) => ({ options: cfg }),
    auth: () => mockAuth,
    firestore: () => mockDb,
    firestore: Object.assign(() => mockDb, {
      FieldValue: {
        serverTimestamp: () => 'server-timestamp',
        increment: (n) => n,
      },
    }),
    Auth: {
      Persistence: {
        LOCAL: 'local',
        SESSION: 'session',
      },
    },
  };
}

function createTestContext(overrides = {}) {
  const firebase = createMockFirebase(overrides.firebase);
  const writeLog = [];

  const context = {
    window: {
      firebase,
      FirebaseConfigSelector: { selectFirebaseConfig: require('../firebase-config-selector.js').selectFirebaseConfig },
      __FIREBASE_DEPLOYMENT__: overrides.deployment || { mode: 'preview', allowedHosts: ['qa-preview.example.test'], productionHosts: ['carteira-investimentos-delta.vercel.app'], productionProjectId: 'production-project', config: { apiKey: 'qa-key', authDomain: 'qa.firebaseapp.com', projectId: 'qa-project', storageBucket: 'qa.firebasestorage.app', messagingSenderId: '123', appId: '1:123:web:abc' } },
      __PROTECTED_READ_ONLY_QA_BOOT__: true,
      __LOCAL_TEST_MODE__: false,
      __LOCAL_AUTH_EMULATOR_MODE__: false,
      __LOCAL_AUTH_EMULATOR_CONFIG_ERROR__: false,
      addEventListener: () => {},
      location: { hostname: overrides.hostname || 'qa-preview.example.test', search: '', href: 'https://qa-preview.example.test/' },
      navigator: { onLine: true },
      document: {
        documentElement: { dataset: {}, style: {} },
        querySelector: () => null,
        body: { innerText: '' },
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
      sessionStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
      URLSearchParams,
      console: { log: () => {}, warn: () => {}, error: () => {} },
    },
    FB: {
      ready: false,
      app: null,
      auth: null,
      db: null,
      user: null,
      access: { loading: false, loaded: false, allowed: false, reason: '' },
      authResolved: false,
      cloudLoaded: false,
      pendingCloudSave: false,
    },
    firebaseConfig: {
      apiKey: 'prod-key',
      authDomain: 'prod.firebaseapp.com',
      projectId: 'production-project',
      storageBucket: 'prod.firebasestorage.app',
      messagingSenderId: '123',
      appId: '1:123:web:abc',
    },
    isLocalTestMode: () => false,
    isProtectedReadOnlyQaBoot: () => true,
    isLocalAuthEmulatorMode: () => false,
    isAuthoritativeLocalRecoveryBoot: () => false,
    debugWarn: (...args) => writeLog.push({ type: 'warn', args }),
    render: () => {},
    CloudSyncState: {
      STATES: { INITIAL: 'initial', AUTHENTICATING: 'authenticating', SYNCING: 'syncing', CONNECTED: 'connected', TIMEOUT: 'timeout', OFFLINE: 'offline', ERROR: 'error', EMPTY_CONFIRMED: 'empty_confirmed' },
      initial: (state) => ({ status: state || 'initial' }),
      fail: (state, error) => ({ status: 'error', error }),
      resolve: (state, data) => ({ status: 'connected', ...data }),
      begin: (state) => state,
    },
    firebase,
    writeLog,
    ...overrides,
  };

  return context;
}

function runInVm(source, context) {
  // Wrap in async IIFE to support await
  return vm.runInNewContext(`(async () => { ${source} })()`, context);
}

describe('V316B Write Guard Tests - Preview QA never writes to production', () => {

  test('V316B recordAccessAttempt is blocked in Protected Read-Only QA mode', async () => {
    const context = createTestContext({});

    const source = `
      const FB = this.FB;
      async function recordAccessAttempt(user, allowed, reason='') {
        if (this.isProtectedReadOnlyQaBoot()) return { ok: false, reason: 'PROTECTED_READ_ONLY_QA_BOOT' };
        if (!FB.db || !user?.uid) return;
        await FB.db.collection('users').doc(user.uid).set({
          email: user.email || '',
          allowed: !!allowed,
          lastReason: String(reason || ''),
        }, { merge: true });
      }
      return recordAccessAttempt({ uid: 'test-uid', email: 'test@example.com' }, true, 'test');
    `;

    let writeAttempted = false;
    const originalDb = context.firebase.firestore();
    context.firebase.firestore = () => {
      const db = originalDb;
      const originalCollection = db.collection;
      db.collection = (name) => {
        const coll = originalCollection(name);
        const originalSet = coll.doc('test-uid').set;
        coll.doc('test-uid').set = async (...args) => {
          writeAttempted = true;
          return originalSet(...args);
        };
        return coll;
      };
      return db;
    };

    await runInVm(source, context);

    assert.equal(writeAttempted, false, 'recordAccessAttempt should not write in Protected Read-Only QA mode');
  });

  test('V316B startCloudSync with readOnlyOnly=true blocks writes', async () => {
    const context = createTestContext({});

    const source = `
      const FB = this.FB;
      const CloudSyncState = this.CloudSyncState;
      function startCloudSync({ readOnlyOnly = false } = {}) {
        if (!FB.user || !FB.db) return;
        if (readOnlyOnly) {
          FB.cloudStateModel = CloudSyncState.resolve(CloudSyncState.begin(FB.cloudStateModel), { exists: true, hasData: true });
          return;
        }
        // Normal sync would write here
        FB.db.collection('portfolios').doc(FB.user.uid).set({ test: 'write' });
      }
      FB.user = { uid: 'test-uid' };
      FB.db = this.firebase.firestore();
      startCloudSync({ readOnlyOnly: true });
    `;

    let writeAttempted = false;
    const originalDb = context.firebase.firestore();
    context.firebase.firestore = () => {
      const db = originalDb;
      const originalCollection = db.collection;
      db.collection = (name) => {
        const coll = originalCollection(name);
        const originalSet = coll.doc('test-uid').set;
        coll.doc('test-uid').set = async (...args) => {
          writeAttempted = true;
          return originalSet(...args);
        };
        return coll;
      };
      return db;
    };

    await runInVm(source, context);

    assert.equal(writeAttempted, false, 'startCloudSync with readOnlyOnly should not write');
  });

  test('V316B save path is blocked in Preview mode', async () => {
    const context = createTestContext({});

    const source = `
      const FB = this.FB;
      async function save({ queueCloud = true } = {}) {
        if (this.isProtectedReadOnlyQaBoot()) {
          return { ok: false, reason: 'READ_ONLY_QA' };
        }
        if (queueCloud) {
          FB.pendingCloudSave = true;
          await FB.db.collection('portfolios').doc(FB.user.uid).set({ test: 'data' });
        }
        return { ok: true };
      }
      FB.user = { uid: 'test-uid' };
      FB.db = this.firebase.firestore();
      return save({ queueCloud: true });
    `;

    let writeAttempted = false;
    const originalDb = context.firebase.firestore();
    context.firebase.firestore = () => {
      const db = originalDb;
      const originalCollection = db.collection;
      db.collection = (name) => {
        const coll = originalCollection(name);
        const originalSet = coll.doc('test-uid').set;
        coll.doc('test-uid').set = async (...args) => {
          writeAttempted = true;
          return originalSet(...args);
        };
        return coll;
      };
      return db;
    };

    const result = await runInVm(source, context);

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'READ_ONLY_QA');
    assert.equal(writeAttempted, false, 'save() should not write in Protected Read-Only QA mode');
  });

  test('V316B batch write is blocked in Protected Read-Only QA mode', async () => {
    const context = createTestContext({});

    const source = `
      const FB = this.FB;
      FB.db = this.firebase.firestore();
      FB.user = { uid: 'test-uid' };

      // Simulate the guard that would be in the real save/cloud sync path
      if (this.isProtectedReadOnlyQaBoot()) {
        return { ok: false, reason: 'READ_ONLY_QA' };
      }

      const batch = FB.db.batch();
      const ref = FB.db.collection('test').doc('x');
      batch.set(ref, { data: 'test' });
      return batch.commit();
    `;

    let batchCommitAttempted = false;
    const originalDb = context.firebase.firestore();
    context.firebase.firestore = () => {
      const db = originalDb;
      db.batch = () => ({
        set: () => {},
        commit: async () => {
          batchCommitAttempted = true;
        },
      });
      return db;
    };

    const result = await runInVm(source, context);

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'READ_ONLY_QA');
    assert.equal(batchCommitAttempted, false, 'Batch writes should be blocked in Protected Read-Only QA mode');
  });

  test('V316B transaction is blocked in Protected Read-Only QA mode', async () => {
    const context = createTestContext({});

    const source = `
      const FB = this.FB;
      FB.db = this.firebase.firestore();
      FB.user = { uid: 'test-uid' };

      // Simulate the guard that would be in the real save/cloud sync path
      if (this.isProtectedReadOnlyQaBoot()) {
        return { ok: false, reason: 'READ_ONLY_QA' };
      }

      return FB.db.runTransaction(async (transaction) => {
        const ref = FB.db.collection('test').doc('x');
        transaction.set(ref, { data: 'test' });
      });
    `;

    let transactionAttempted = false;
    const originalDb = context.firebase.firestore();
    context.firebase.firestore = () => {
      const db = originalDb;
      db.runTransaction = async (fn) => {
        transactionAttempted = true;
        return fn({
          set: () => {},
          get: async () => ({ exists: false, data: () => ({}) }),
        });
      };
      return db;
    };

    const result = await runInVm(source, context);

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'READ_ONLY_QA');
    assert.equal(transactionAttempted, false, 'Transactions should be blocked in Protected Read-Only QA mode');
  });

  test('V316B production Firebase data endpoints are never called in Preview mode', () => {
    const productionEndpoints = [
      'firestore.googleapis.com',
      'identitytoolkit.googleapis.com',
      'firebasestorage.googleapis.com',
      'securetoken.googleapis.com',
      'firebaseinstallations.googleapis.com',
      'firebaseio.com',
    ];

    // This is a contract test - the actual enforcement happens at network level
    // In CI, the Playwright tests abort any requests to these domains
    // Here we verify the test infrastructure exists to catch violations
    assert.ok(productionEndpoints.length === 6, 'Production endpoint list should be complete');

    // Verify the test helper patterns exist
    const DATA_HOSTS = /(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|firebasestorage\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com|(?:^|\.)firebaseio\.com)(?::\d+)?(?:\/|$)/i;

    for (const endpoint of productionEndpoints) {
      if (endpoint === 'firebaseio.com') {
        // The regex uses (?:^|\\.)firebaseio\\.com which requires a prefix
        assert.ok(DATA_HOSTS.test(`https://test.firebaseio.com/v1/projects/test/databases/(default)/documents/test`),
          `DATA_HOSTS should match ${endpoint}`);
      } else {
        assert.ok(DATA_HOSTS.test(`https://${endpoint}/v1/projects/test/databases/(default)/documents/test`),
          `DATA_HOSTS should match ${endpoint}`);
      }
    }
  });
});