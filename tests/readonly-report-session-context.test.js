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
const navigationModulePath = path.join(__dirname, '..', 'modern', 'src', 'types', 'navigation.ts');

async function loadModule() {
  return import(pathToFileURL(modulePath).href);
}

async function loadNavigationModule() {
  return import(pathToFileURL(navigationModulePath).href);
}

test('readonly report session context aceita estado visual valido e rejeita invalido', async () => {
  const {
    buildReadonlyReportSessionSearch,
    buildReadonlyReportSessionUrl,
    readReadonlyReportSessionContext,
  } = await loadModule();
  const { MODERN_PAGES } = await loadNavigationModule();

  assert.deepEqual(
    readonlyReportPageContract.READONLY_REPORT_PAGE_IDS,
    MODERN_PAGES.map((page) => page.id),
  );
  assert.equal(typeof readonlyReportPageContract.resolveReadonlyReportPageContract, 'function');
  assert.equal(readonlyReportPageContract.DEFAULT_READONLY_REPORT_PAGE_ID, 'reports');
  assert.equal(readonlyReportPageContract.isReadonlyReportPageId('reports'), true);
  assert.equal(readonlyReportPageContract.isReadonlyReportPageId('invalid'), false);
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId(' assets '), 'assets');
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId('', 'overview'), 'overview');
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId('invalid', 'assets'), 'assets');
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId('invalid', 'invalid'), 'reports');
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId('invalid', ''), 'reports');
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId('invalid', null), 'reports');
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId('invalid', undefined), 'reports');
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId('assets', 'invalid'), 'assets');
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId(' assets ', ' reports '), 'assets');
  assert.equal(readonlyReportPageContract.normalizeReadonlyReportPageId('REPORTS', 'assets'), 'assets');

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

test('readonly report session contract resolver usa fallback seguro quando contrato invalido ou ausente', () => {
  const resolveReadonlyReportPageContract = readonlyReportPageContract.resolveReadonlyReportPageContract;
  const originalGlobalContract = globalThis.ReadonlyReportPageContract;

  try {
    delete globalThis.ReadonlyReportPageContract;

    const absentContract = resolveReadonlyReportPageContract(undefined);
    assert.equal(absentContract.DEFAULT_READONLY_REPORT_PAGE_ID, 'reports');
    assert.equal(absentContract.normalizeReadonlyReportPageId('invalid', 'assets'), 'reports');
    assert.equal(absentContract.normalizeReadonlyReportPageId('invalid', ''), 'reports');
    assert.equal(absentContract.normalizeReadonlyReportPageId('invalid', null), 'reports');
    assert.equal(absentContract.normalizeReadonlyReportPageId('invalid', undefined), 'reports');

    const partialContract = resolveReadonlyReportPageContract({
      READONLY_REPORT_PAGE_IDS: ['reports'],
      DEFAULT_READONLY_REPORT_PAGE_ID: 'reports',
      isReadonlyReportPageId: null,
      normalizeReadonlyReportPageId: null,
    });

    assert.equal(partialContract.DEFAULT_READONLY_REPORT_PAGE_ID, 'reports');
    assert.equal(partialContract.normalizeReadonlyReportPageId('assets', 'overview'), 'reports');

    const invalidNormalizerContract = resolveReadonlyReportPageContract({
      READONLY_REPORT_PAGE_IDS: ['overview', 'assets', 'fixed-income', 'provents', 'contributions', 'reports', 'settings'],
      DEFAULT_READONLY_REPORT_PAGE_ID: 'reports',
      isReadonlyReportPageId(value) {
        return value === 'reports';
      },
      normalizeReadonlyReportPageId() {
        throw new Error('boom');
      },
    });

    assert.equal(invalidNormalizerContract.normalizeReadonlyReportPageId('assets', 'overview'), 'reports');

    const invalidFallbackContract = resolveReadonlyReportPageContract({
      READONLY_REPORT_PAGE_IDS: ['overview', 'assets', 'fixed-income', 'provents', 'contributions', 'reports', 'settings'],
      DEFAULT_READONLY_REPORT_PAGE_ID: 'reports',
      isReadonlyReportPageId(value) {
        return value === 'reports';
      },
      normalizeReadonlyReportPageId(value, fallback) {
        return String(value ?? '').trim() === 'reports' ? 'reports' : String(fallback ?? '').trim();
      },
    });

    assert.equal(invalidFallbackContract.normalizeReadonlyReportPageId('invalid', 'invalid'), 'reports');

    const adulteratedContract = resolveReadonlyReportPageContract({
      READONLY_REPORT_PAGE_IDS: ['overview', 'assets', 'fixed-income', 'provents', 'contributions', 'reports', 'settings'],
      DEFAULT_READONLY_REPORT_PAGE_ID: 'reports',
      isReadonlyReportPageId(value) {
        return value === 'reports' || value === 'invalid';
      },
      normalizeReadonlyReportPageId(value, fallback) {
        return String(value ?? '').trim() === 'invalid' ? 'invalid' : String(fallback ?? '').trim();
      },
    });

    assert.equal(adulteratedContract.normalizeReadonlyReportPageId('invalid', 'reports'), 'reports');
  } finally {
    if (originalGlobalContract === undefined) {
      delete globalThis.ReadonlyReportPageContract;
    } else {
      globalThis.ReadonlyReportPageContract = originalGlobalContract;
    }
  }
});
