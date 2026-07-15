const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const readonlyReportPageContract = require('../readonly-report-page-contract.js');

const modulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'reports',
  'readonlyReportSessionContext.ts',
);

async function loadModule() {
  return import(pathToFileURL(modulePath).href);
}

test('readonly report session context aceita estado visual valido e rejeita invalido', async () => {
  const {
    buildReadonlyReportSessionSearch,
    buildReadonlyReportSessionUrl,
    readReadonlyReportSessionContext,
  } = await loadModule();

  assert.deepEqual(readonlyReportPageContract.READONLY_REPORT_PAGE_IDS, [
    'overview',
    'assets',
    'fixed-income',
    'provents',
    'contributions',
    'reports',
    'settings',
  ]);
  assert.equal(readonlyReportPageContract.DEFAULT_READONLY_REPORT_PAGE_ID, 'reports');
  assert.equal(readonlyReportPageContract.isReadonlyReportPageId('reports'), true);
  assert.equal(readonlyReportPageContract.isReadonlyReportPageId('invalid'), false);
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId(' assets '), 'assets');
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId('', 'overview'), 'overview');

  assert.deepEqual(readReadonlyReportSessionContext('?readonlyReportPage=assets'), {
    pageId: 'assets',
  });
  assert.deepEqual(readReadonlyReportSessionContext('?readonlyReportPage=invalid'), {
    pageId: 'reports',
  });
  assert.deepEqual(readReadonlyReportSessionContext('', 'overview'), {
    pageId: 'overview',
  });
  assert.equal(buildReadonlyReportSessionSearch('settings', '?activeWalletHost=1&testMode=1').includes('readonlyReportPage=settings'), true);
  const normalizedUrl = new URL(buildReadonlyReportSessionUrl('http://127.0.0.1/index.html?testMode=1', 'provents'));
  assert.equal(normalizedUrl.searchParams.get('testMode'), '1');
  assert.equal(normalizedUrl.searchParams.get('readonlyReportPage'), 'provents');
  assert.equal(normalizedUrl.searchParams.get('activeWalletHost'), '1');

  const legacyOnlyUrl = new URL(
    buildReadonlyReportSessionUrl('http://127.0.0.1/index.html?testMode=1', 'contributions', {
      includeActiveWalletHost: false,
    }),
  );
  assert.equal(legacyOnlyUrl.searchParams.get('testMode'), '1');
  assert.equal(legacyOnlyUrl.searchParams.get('readonlyReportPage'), 'contributions');
  assert.equal(legacyOnlyUrl.searchParams.get('activeWalletHost'), null);
});
