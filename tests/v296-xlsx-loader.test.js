const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const loaderStart = html.indexOf('window.ensureXLSX=');
const loaderEnd = html.indexOf('\n</script>', loaderStart);
assert.ok(loaderStart >= 0 && loaderEnd > loaderStart, 'production ensureXLSX loader must exist');
const loaderSource = html.slice(loaderStart, loaderEnd);

function harness(onAppend) {
  const state = { appended: 0 };
  const sandbox = {
    document: {
      createElement: tag => ({ tag }),
      head: { appendChild: script => { state.appended += 1; queueMicrotask(() => onAppend(sandbox, script)); } },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(loaderSource, sandbox);
  return { sandbox, state };
}

test('ensureXLSX resolves only after the dynamically loaded library is available and reuses its promise', async () => {
  const { sandbox, state } = harness((root, script) => {
    root.XLSX = { version: '0.18.5' };
    script.onload();
  });
  const first = sandbox.ensureXLSX();
  const second = sandbox.ensureXLSX();
  assert.equal(first, second);
  assert.equal((await first).version, '0.18.5');
  assert.equal(state.appended, 1);
});

test('ensureXLSX rejects a failed network load, clears its promise and allows retry', async () => {
  let fail = true;
  const { sandbox, state } = harness((root, script) => {
    if (fail) script.onerror();
    else { root.XLSX = { version: '0.18.5' }; script.onload(); }
  });
  await assert.rejects(sandbox.ensureXLSX(), { message: 'XLSX_LOAD_FAILED' });
  assert.equal(sandbox.__XLSX_PROMISE__, null);
  fail = false;
  assert.equal((await sandbox.ensureXLSX()).version, '0.18.5');
  assert.equal(state.appended, 2);
});

test('ensureXLSX rejects a successful script response that did not define XLSX', async () => {
  const { sandbox, state } = harness((_root, script) => script.onload());
  await assert.rejects(sandbox.ensureXLSX(), { message: 'XLSX_UNAVAILABLE' });
  assert.equal(sandbox.__XLSX_PROMISE__, null);
  assert.equal(state.appended, 1);
});
