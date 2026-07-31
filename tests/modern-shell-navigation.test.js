const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const readonlyReportPageContract = require('../readonly-report-page-contract.js');

const shellNavigationModulePath = require('node:path').join(
  __dirname,
  '..',
  'modern',
  'src',
  'types',
  'shellNavigation.mjs',
);
const navigationModulePath = require('node:path').join(
  __dirname,
  '..',
  'modern',
  'src',
  'types',
  'navigation.mjs',
);

async function loadShellNavigation(cacheKey = '') {
  const suffix = cacheKey ? `?${cacheKey}` : '';
  return import(`${pathToFileURL(shellNavigationModulePath).href}${suffix}`);
}

async function loadNavigation(cacheKey = '') {
  const suffix = cacheKey ? `?${cacheKey}` : '';
  return import(`${pathToFileURL(navigationModulePath).href}${suffix}`);
}

const PRIMARY = ['overview', 'assets', 'provents', 'returns', 'goals', 'net-worth', 'rebalance'];
const SECONDARY = ['fixed-income', 'contributions', 'reports', 'settings'];
const MOBILE_BOTTOM = ['overview', 'assets', 'provents', 'returns', 'more'];
const MOBILE_MORE = ['goals', 'net-worth', 'rebalance', 'fixed-income', 'contributions', 'reports', 'settings'];

test('shell navigation exposes grouped ids referencing the canonical catalog', async () => {
  const shell = await loadShellNavigation('groups');
  const nav = await loadNavigation('nav-groups');
  const pageIds = nav.MODERN_PAGES.map((page) => page.id);

  assert.deepEqual([...shell.SHELL_NAVIGATION_GROUPS.PRIMARY], PRIMARY);
  assert.deepEqual([...shell.SHELL_NAVIGATION_GROUPS.SECONDARY], SECONDARY);
  assert.deepEqual([...shell.SHELL_NAVIGATION_GROUPS.MOBILE_BOTTOM], MOBILE_BOTTOM);
  assert.deepEqual([...shell.SHELL_NAVIGATION_GROUPS.MOBILE_MORE], MOBILE_MORE);
  assert.equal(shell.SHELL_MORE_ITEM_ID, 'more');

  assert.equal(shell.SHELL_NAVIGATION_GROUPS.MOBILE_BOTTOM.includes('more'), true);
  assert.equal(shell.SHELL_NAVIGATION_GROUPS.MOBILE_MORE.includes('more'), false);
  assert.equal(shell.SHELL_NAVIGATION_GROUPS.PRIMARY.includes('more'), false);
  assert.equal(shell.SHELL_NAVIGATION_GROUPS.SECONDARY.includes('more'), false);

  const errors = shell.validateShellNavigationAgainstPages();
  assert.deepEqual(errors, [], 'shell navigation deve validar contra MODERN_PAGES');

  const shellIds = shell.getShellNavigationPageIds();
  assert.equal(new Set(shellIds).size, pageIds.length, 'shell ids nao podem repetir');
  pageIds.forEach((id) => {
    assert.equal(shellIds.includes(id), true, `shell deve referenciar id canonico: ${id}`);
  });

  assert.equal(shell.isModernPageId('overview'), true);
  assert.equal(shell.isModernPageId('returns'), true);
  assert.equal(shell.isModernPageId('does-not-exist'), false);

  const overview = shell.getModernPageByDisplayId('overview');
  assert.equal(overview?.displayLabel, 'Início');
  const provents = shell.getModernPageByDisplayId('provents');
  assert.equal(provents?.displayLabel, 'Dividendos');
  const fixedIncome = shell.getModernPageByDisplayId('fixed-income');
  assert.equal(fixedIncome?.displayLabel, 'Renda Fixa');
  const reports = shell.getModernPageByDisplayId('reports');
  assert.equal(reports?.displayLabel, 'Relatórios');
  const settings = shell.getModernPageByDisplayId('settings');
  assert.equal(settings?.displayLabel, 'Configurações');
  const goals = shell.getModernPageByDisplayId('goals');
  assert.equal(goals?.displayLabel, 'Metas');
  const netWorth = shell.getModernPageByDisplayId('net-worth');
  assert.equal(netWorth?.displayLabel, 'Patrimônio');
  const returns = shell.getModernPageByDisplayId('returns');
  assert.equal(returns?.displayLabel, 'Rentabilidade');
  const rebalance = shell.getModernPageByDisplayId('rebalance');
  assert.equal(rebalance?.displayLabel, 'Rebalancear');
  const assets = shell.getModernPageByDisplayId('assets');
  assert.equal(assets?.displayLabel, 'Ativos');
});

test('shell navigation contract stays aligned with the readonly report contract', async () => {
  const shell = await loadShellNavigation('contract');
  const nav = await loadNavigation('contract');

  assert.equal(shell.isShellNavigationContract(), true);
  assert.deepEqual(
    readonlyReportPageContract.READONLY_REPORT_PAGE_IDS,
    nav.MODERN_PAGES.map((page) => page.id),
  );
  assert.equal(readonlyReportPageContract.DEFAULT_READONLY_REPORT_PAGE_ID, 'reports');

  const uniqueIds = new Set([
    ...shell.SHELL_NAVIGATION_GROUPS.PRIMARY,
    ...shell.SHELL_NAVIGATION_GROUPS.SECONDARY,
  ]);
  assert.equal(uniqueIds.size, 11, 'shell deve referenciar todos os 11 IDs sem duplicar');

  const moreExcluded = shell.SHELL_NAVIGATION_GROUPS.MOBILE_BOTTOM.filter((id) => id !== 'more');
  assert.deepEqual(
    shell.SHELL_NAVIGATION_GROUPS.MOBILE_MORE,
    shell.SHELL_NAVIGATION_GROUPS.PRIMARY
      .filter((id) => !moreExcluded.includes(id))
      .concat(shell.SHELL_NAVIGATION_GROUPS.SECONDARY),
    'MOBILE_MORE deve complementar MOBILE_BOTTOM com PRIMARY e SECONDARY restantes',
  );
});
