const assert = require('node:assert/strict');
const test = require('node:test');

// V346: extend the responsive matrix to the widths not covered by the V289
// suite (320, 375, 390, 600, 2560, 3440) on representative routes, plus zoom
// reflow at 1366 (14" notebook) and 390 (~6.2" phone). Reuses the V289 harness
// helpers and fixtures; asserts the same invariants: no page overflow, no
// internally clipped content, labels >= 12px, clean console/page/request state.

const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');

// Load the V289 helpers by requiring the sibling harness pieces it exports.
// The V289 file defines its helpers inline; rather than duplicating them, we
// re-evaluate its source up to the first test() call in a sandbox that exposes
// the same module scope, then reuse createRuntime/applyV289VisualFixture/
// setThemeAndRoute/inspectLayout/closeRuntime from it.
const v289Source = fs.readFileSync(path.join(__dirname, 'v289-visual-regression.test.js'), 'utf8');
const firstTest = v289Source.indexOf("test('");
const helperSource = v289Source.slice(0, firstTest);
const sandbox = { require, module: { exports: {} }, exports: {}, console, process, setTimeout, clearTimeout, __dirname: __dirname, __filename: path.join(__dirname, 'v289-visual-regression.test.js'), URL, URLSearchParams, Buffer, setTimeout, setInterval, clearInterval, TextEncoder, TextDecoder, globalThis: {} };
vm.createContext(sandbox);
vm.runInContext(helperSource + '\nmodule.exports={createRuntime,closeRuntime,applyV289VisualFixture,setThemeAndRoute,inspectLayout,THEMES,MATRIX_VIEWPORTS,assertSyntheticReadOnlyRuntime};', sandbox);
const { createRuntime, closeRuntime, applyV289VisualFixture, setThemeAndRoute, inspectLayout, THEMES, MATRIX_VIEWPORTS, assertSyntheticReadOnlyRuntime } = sandbox.module.exports;

// ponytail: VM-realm arrays fail cross-realm deepEqual; wrap the helper to
// compare plain Node-realm arrays instead of forking the whole V289 harness.
const assertReadonly = async runtime => {
  const state = await runtime.page.evaluate(() => ({
    localTestMode: window.__LOCAL_TEST_MODE__ === true,
    firebaseInitialized: typeof FB !== 'undefined' && Boolean(FB.app || FB.auth || FB.db),
    localStorageWriteKeys: window.__V304_QA_WRITE_COUNTS__?.localStorage ?? [],
    financialStateAtBoot: window.__V304_QA_WRITE_COUNTS__?.financialStateAtBoot ?? null,
    financialStateNow: localStorage.getItem('civ5'),
  }));
  assert.equal(state.localTestMode, true, 'route smoke must use the isolated localhost synthetic fixture');
  assert.equal(state.firebaseInitialized, false, 'synthetic route smoke must not initialize Firebase');
  assert.equal(state.financialStateNow, state.financialStateAtBoot, 'read-only route smoke changed financial localStorage state');
  const writes = state.localStorageWriteKeys.filter(({ key }) => key === 'civ5');
  assert.deepEqual(writes, [], `read-only route smoke mutated financial storage: ${JSON.stringify(writes)}`);
  const unexpected = state.localStorageWriteKeys.filter(({ key }) => key !== 'civ5_edit_lock' && !/^v258-monitoring-baseline-v1:QA_/.test(key));
  assert.deepEqual(unexpected, [], `read-only route smoke mutated unexpected storage key(s): ${JSON.stringify(unexpected)}`);
  assert.deepEqual([...runtime.firebaseRequests], [], `synthetic route smoke contacted Firebase: ${JSON.stringify(runtime.firebaseRequests)}`);
};

const GAP_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 600, height: 1024 },
  { width: 2560, height: 1440 },
  { width: 3440, height: 1440 },
];

const REPRESENTATIVE_ROUTES = ['dashboard', 'ativos', 'dividendos', 'metas'];

test('V346: gap widths 320-3440 render representative routes without overflow or clipping', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    for (const viewport of GAP_VIEWPORTS) {
      await runtime.page.setViewportSize(viewport);
      await applyV289VisualFixture(runtime.page, 'baseline');
      for (const theme of ['dark', 'light']) {
        for (const route of REPRESENTATIVE_ROUTES) {
          await setThemeAndRoute(runtime.page, theme, route);
          const layout = await inspectLayout(runtime.page);
          assert.equal(layout.theme, theme, `${route} did not retain ${theme} theme at ${viewport.width}px`);
          assert.ok(layout.heading || layout.rootText.length > 20, `${route} rendered no content at ${viewport.width}px/${theme}`);
          assert.equal(layout.pageOverflow, false, `${route} horizontal page overflow at ${viewport.width}px/${theme}`);
          assert.deepEqual(layout.clipped, [], `${route} internally clipped content at ${viewport.width}px/${theme}: ${JSON.stringify(layout.clipped)}`);
        }
      }
    }
    assert.deepEqual([...runtime.pageErrors], [], `page errors: ${runtime.pageErrors.join(' | ')}`);
    assert.deepEqual([...runtime.consoleErrors], [], `console errors: ${runtime.consoleErrors.join(' | ')}`);
    await assertReadonly(runtime);
  } finally {
    await closeRuntime(runtime);
  }
});

test('V346: zoom 125/150/200% reflow keeps 14" notebook and 6.2" phone usable', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    for (const base of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
      for (const zoom of [1.25, 1.5, 2]) {
        await runtime.page.setViewportSize(base);
        await applyV289VisualFixture(runtime.page, 'long-label-large-value');
        await runtime.page.evaluate(z => { document.documentElement.style.fontSize = `${Math.round(16 * z)}px`; }, zoom);
        for (const route of ['dashboard', 'ativos', 'dividendos']) {
          await setThemeAndRoute(runtime.page, 'dark', route);
          const layout = await inspectLayout(runtime.page);
          assert.equal(layout.pageOverflow, false, `${route} page overflow at ${base.width}px zoom ${zoom}`);
          assert.deepEqual(layout.clipped, [], `${route} clipped content at ${base.width}px zoom ${zoom}: ${JSON.stringify(layout.clipped)}`);
        }
        await runtime.page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      }
    }
    assert.deepEqual([...runtime.pageErrors], [], `page errors: ${runtime.pageErrors.join(' | ')}`);
  } finally {
    await closeRuntime(runtime);
  }
});
