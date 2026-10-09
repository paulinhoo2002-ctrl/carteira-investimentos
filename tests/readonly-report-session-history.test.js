const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const modulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'reports',
  'readonlyReportSessionHistory.ts',
);

async function loadModule() {
  return import(pathToFileURL(modulePath).href);
}

function createHistoryWindow(initialUrl) {
  const entries = [initialUrl];
  let index = 0;
  const listeners = new Set();
  const location = {
    get href() { return entries[index]; },
    get search() { return new URL(entries[index]).search; },
  };
  const history = {
    state: { marker: 'preserve' },
    pushState(_state, _title, url) {
      entries.splice(index + 1);
      entries.push(String(url));
      index += 1;
    },
    back() {
      index = Math.max(0, index - 1);
      listeners.forEach((listener) => listener({ type: 'popstate' }));
    },
    forward() {
      index = Math.min(entries.length - 1, index + 1);
      listeners.forEach((listener) => listener({ type: 'popstate' }));
    },
  };

  return {
    location,
    history,
    addEventListener(type, listener) {
      if (type === 'popstate') listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === 'popstate') listeners.delete(listener);
    },
  };
}

test('modern route history preserves host query/hash and responds to back/forward', async () => {
  const { createReadonlyReportSessionHistory } = await loadModule();
  const host = createHistoryWindow('https://example.test/host.html?activeWalletHost=1&testMode=1&keep=qa#section');
  const navigation = createReadonlyReportSessionHistory(host);
  const observedPages = [];
  const unsubscribe = navigation.subscribe((pageId) => observedPages.push(pageId));

  assert.equal(navigation.getCurrentPageId(), 'reports');
  navigation.navigate('assets');
  assert.equal(new URL(host.location.href).searchParams.get('readonlyReportPage'), 'assets');
  assert.equal(new URL(host.location.href).searchParams.get('activeWalletHost'), '1');
  assert.equal(new URL(host.location.href).searchParams.get('testMode'), '1');
  assert.equal(new URL(host.location.href).searchParams.get('keep'), 'qa');
  assert.equal(new URL(host.location.href).hash, '#section');
  assert.equal(createReadonlyReportSessionHistory(host).getCurrentPageId(), 'assets');

  host.history.back();
  host.history.forward();
  assert.deepEqual(observedPages, ['reports', 'assets']);

  unsubscribe();
  host.history.back();
  assert.deepEqual(observedPages, ['reports', 'assets']);
});
