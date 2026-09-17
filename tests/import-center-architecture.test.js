const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const contextApi = require('../import-center-context.js');
const events = require('../import-center-events.js');
const bootstrap = require('../import-center-bootstrap.js');
const view = require('../import-center-view.js');
const fileList = require('../import-center-file-list-renderer.js');
const sourceList = require('../import-center-source-list-renderer.js');
const preview = require('../import-center-preview-renderer.js');

const rootPath = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(rootPath, 'index.html'), 'utf8');
const moduleSources = ['import-center-context.js', 'import-center-events.js', 'import-center-bootstrap.js', 'import-center-preview-renderer.js', 'import-center-file-list-renderer.js', 'import-center-source-list-renderer.js', 'import-center-view.js'].map(file => [file, fs.readFileSync(path.join(rootPath, file), 'utf8')]);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const support = value => value === 'FULLY_SUPPORTED' ? 'Suporte completo' : value === 'REVIEW_REQUIRED' ? 'Revisão necessária' : value === 'FIXTURE_REQUIRED' ? 'Fixture necessária' : 'Suporte parcial';
const context = contextApi.create({ readState: () => ({ files: [], step: 1, result: null, history: [] }), escapeText: esc, getSources: () => [{ label: 'Movimentações B3', hint: 'XLSX', support: 'PARTIAL' }], getSteps: () => ['Arquivos', 'Detecção'] });

test('current-main Import Center keeps explicit context and renderer graph', () => {
  assert.match(source, /<script src="import-center-core\.js"><\/script>/);
  assert.match(source, /<script src="import-center-view\.js"><\/script>/);
  assert.match(source, /IMPORT_CENTER_CONTEXT=typeof ImportCenterContext==='undefined' \? null : ImportCenterContext\.create/);
  assert.match(source, /ImportCenterView\.render\(/);
  assert.doesNotMatch(source, /onchange="importCenterFiles/);
  assert.doesNotMatch(source, /onclick="importCenterReset/);
  assert.doesNotMatch(source, /onclick="importCenterRunDryRun/);
});

test('events are root-bound and bootstrap is idempotent', () => {
  const calls = [];
  const listeners = {};
  const fakeRoot = { addEventListener(type, handler) { listeners[type] = handler; }, contains: () => true };
  const handlers = { files: () => calls.push('files'), reset: () => calls.push('reset'), dryRun: () => calls.push('dryRun') };
  assert.equal(bootstrap.mount({ root: fakeRoot, handlers }), true);
  assert.equal(bootstrap.mount({ root: fakeRoot, handlers }), false);
  listeners.change({ target: { files: [], dataset: { importAction: 'files' }, closest: () => ({ files: [], dataset: { importAction: 'files' } }) } });
  assert.deepEqual(calls, ['files']);
  assert.equal(typeof events.bind, 'function');
});

test('pure renderers and view preserve current-main data and escape contract', () => {
  const files = [{ name: '<safe.xlsx>', detected: { label: 'B3', parser: 'ProtectedImportPipeline', support: 'REVIEW_REQUIRED' } }];
  const renderers = { preview, fileList, sourceList };
  const html = view.render({ context: { ...context, readState: () => ({ files, step: 2, result: null, history: [] }) }, renderers });
  assert.match(html, /&lt;safe\.xlsx&gt;/);
  assert.match(html, /import-center-shell/);
  assert.match(html, /data-import-action="files"/);
  for (const [name, moduleSource] of moduleSources) {
    for (const forbidden of [/\bdocument\s*\./, /\bwindow\s*\./, /localStorage/, /sessionStorage/, /Firebase/, /Firestore/, /setDoc/, /updateDoc/, /addDoc/, /queueCloudSave/, /\bsave\s*\(/]) {
      assert.equal(forbidden.test(moduleSource), false, `${name} contém canal proibido ${forbidden}`);
    }
  }
});

test('context fails closed and renderer inputs remain readonly', () => {
  assert.throws(() => contextApi.create({}), /capability ausente/);
  const state = { files: [], step: 1, result: null, history: [] };
  const before = JSON.stringify(state);
  view.render({ context: { ...context, readState: () => state }, renderers: { preview, fileList, sourceList } });
  assert.equal(JSON.stringify(state), before);
});
