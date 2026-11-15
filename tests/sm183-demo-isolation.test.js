'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const server = fs.readFileSync(path.join(__dirname, 'local-http-server.js'), 'utf8');
const demoTestRunner = fs.readFileSync(path.join(__dirname, 'run-sm183-demo-tests.js'), 'utf8');
const vercelIgnore = fs.readFileSync(path.join(root, '.vercelignore'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const ciWorkflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8').replace(/\r\n/g, '\n');

test('SM183 DEMO exige marcador criado pelo servidor e host loopback', () => {
  for (const fragment of [
    "const trustedQaRuntime=window.__LOCAL_QA_RUNTIME__==='local-synthetic-v1'",
    "const testMode=trustedQaRuntime && loopbackHost && params.get('testMode')==='1'",
  ]) assert.ok(html.includes(fragment), `missing activation guard: ${fragment}`);
  assert.ok(server.includes("const query = demo ? '?testMode=1&demoMode=1' : syntheticQa ? '?testMode=1' : ''"));
  assert.ok(server.includes("${demo ? \"Object.defineProperty(window,'__LOCAL_DEMO_RUNTIME__'"));
  assert.ok(server.includes("if (demo) {"));
  assert.ok(server.includes("demo = process.env.SM183_DEMO_TEST === '1'"));
  assert.ok(server.includes("const enabled=window.__LOCAL_QA_RUNTIME__==='local-synthetic-v1'&&window.__LOCAL_DEMO_RUNTIME__==='local-demo-v1'"));
  assert.doesNotMatch(html, /LOCAL_DEMO|__LOCAL_DEMO_RUNTIME__|demoMode=1/, 'production HTML must not contain the local DEMO adapter');
  assert.equal(packageJson.scripts['test:demo'], 'node tests/run-sm183-demo-tests.js');
  assert.match(demoTestRunner, /SM183_DEMO_TEST: '1'/, 'the browser regressions must run with the DEMO adapter enabled');
});

test('parâmetros de URL sozinhos não ativam DEMO nem o modo de teste no host publicado', () => {
  const boot = html.match(/<title>[\s\S]*?<\/title>\s*<script>([\s\S]*?__EXPECTED_SERVICE_WORKER_CACHE__[^<]*)<\/script>/)?.[1];
  assert.ok(boot, 'production bootstrap script should be discoverable');
  const root = { dataset: {}, style: {} };
  const context = {
    window: {},
    location: { hostname: 'carteira-homolog-c5785e6.vercel.app', search: '?testMode=1&demoMode=1' },
    URLSearchParams,
    document: { documentElement: root, querySelector: () => null },
    localStorage: { getItem: () => null },
  };
  vm.runInNewContext(boot, context);
  assert.equal(context.window.__LOCAL_TEST_MODE__, false);
  assert.equal(context.window.__LOCAL_DEMO_RUNTIME__, undefined);
});

test('DEMO usa storage fictício separado e nunca grava a chave financeira civ5', () => {
  assert.ok(server.includes("const key='carteira_demo_local_v1'"));
  assert.ok(server.includes('localStorage.setItem(key,JSON.stringify({version:1,wallet}))'));
  assert.ok(server.includes("if(typeof window.save==='function'){const save=window.save;window.save=function(...args){const result=save.apply(this,args);return result===true?persist():result;};}"));
  assert.match(html, /if\(isLocalTestMode\(\)\)\{\s*FB\.authResolved = true;[\s\S]*?return;\s*\}/);
  assert.match(html, /function initFirebase\(\)\{\s*if\(isLocalTestMode\(\)\)/);
});

test('adaptador DEMO hidrata, salva e restaura somente a carteira sintética', () => {
  const script = server.match(/const adapter = `<script>([\s\S]*?)<\/script>`;/)?.[1];
  assert.ok(script, 'the isolated local server must define its runtime adapter');
  const storage = new Map([['carteira_demo_local_v1', JSON.stringify({ version: 1, wallet: { id: 'wallet-demo', assets: [], aportes: [{ id: 'seed-demo' }], proventos: [], rfEvents: [] } })]]);
  const ui = { title: { textContent: '' }, status: { textContent: '' } };
  const state = { wallets: [{ id: 'default', aportes: [] }], activeWalletId: 'default' };
  const calls = { saves: 0, renders: 0, restores: 0, syncs: 0 };
  const context = {
    window: { __LOCAL_QA_RUNTIME__: 'local-synthetic-v1', __LOCAL_DEMO_RUNTIME__: 'local-demo-v1', __LOCAL_TEST_MODE__: true },
    location: { hostname: '127.0.0.1', search: '?testMode=1&demoMode=1' },
    URLSearchParams,
    document: { querySelector: selector => selector === '.test-mode-banner-title' ? ui.title : ui.status },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    S: state,
    activeWallet: () => state.wallets.find(wallet => wallet.id === state.activeWalletId),
    normalizeWalletEntry: wallet => wallet,
    syncStateFromWallet: () => { calls.syncs += 1; },
    render: () => { calls.renders += 1; },
    save: () => { calls.saves += 1; return true; },
    restoreLocalTestData: () => { calls.restores += 1; state.wallets = [{ id: 'restored-demo', aportes: [{ id: 'fixture' }] }]; state.activeWalletId = 'restored-demo'; },
    console: { warn() {}, error() {} },
  };
  context.window.save = context.save;
  context.window.restoreLocalTestData = context.restoreLocalTestData;
  context.window.render = context.render;
  vm.runInNewContext(script, context);
  assert.equal(context.window.__LOCAL_DEMO_ADAPTER__.enabled, true);
  assert.equal(state.activeWalletId, 'wallet-demo');
  assert.equal(calls.syncs, 1);
  assert.equal(ui.title.textContent, 'DEMO LOCAL');
  state.wallets[0].aportes.push({ id: 'saved-demo' });
  assert.equal(context.window.save(), true);
  assert.equal(calls.saves, 1);
  assert.equal(JSON.parse(storage.get('carteira_demo_local_v1')).wallet.aportes.some(item => item.id === 'saved-demo'), true);
  context.window.restoreLocalTestData();
  assert.equal(calls.restores, 1);
  assert.deepEqual(JSON.parse(storage.get('carteira_demo_local_v1')).wallet.aportes, [{ id: 'fixture' }]);
  assert.equal(storage.has('civ5'), false);
});

test('adaptador DEMO fica inativo fora do loopback', () => {
  const script = server.match(/const adapter = `<script>([\s\S]*?)<\/script>`;/)?.[1];
  const context = { window: { __LOCAL_QA_RUNTIME__: 'local-synthetic-v1', __LOCAL_DEMO_RUNTIME__: 'local-demo-v1', __LOCAL_TEST_MODE__: false }, location: { hostname: 'preview.example', search: '?testMode=1&demoMode=1' }, URLSearchParams, console: { warn() {}, error() {} } };
  vm.runInNewContext(script, context);
  assert.equal(context.window.__LOCAL_DEMO_ADAPTER__.enabled, false);
});

test('SM183 entrega comandos dedicados sem alterar o pipeline de release', () => {
  assert.equal(packageJson.scripts['dev:demo'], 'node tests/local-http-server.js --port 4173 --demo');
  assert.equal(packageJson.scripts['test:demo'], 'node tests/run-sm183-demo-tests.js');
  assert.doesNotMatch(packageJson.scripts.build, /demo/i);
  assert.match(vercelIgnore, /^tests\/local-http-server\.js$/m);
  assert.match(vercelIgnore, /^tests\/sm183-demo-isolation\.test\.js$/m);
  assert.match(vercelIgnore, /^tests\/sm183-demo\.browser\.test\.js$/m);
  assert.match(vercelIgnore, /^tests\/run-sm183-demo-tests\.js$/m);
  assert.match(ciWorkflow, /Resolve Chromium[\s\S]*?Local DEMO CRUD and persistence QA\n\s+run: npm run test:demo/);
});
