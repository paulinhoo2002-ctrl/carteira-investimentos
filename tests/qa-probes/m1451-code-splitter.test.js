/**
 * M1451 — Code Splitter Tests
 */
const CS = require('../../analytics-code-splitter.js');

console.log('=== M1451 Code Splitter Tests ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) { console.log('✓ PASS:', message); passCount++; }
  else { console.log('✗ FAIL:', message); failCount++; }
}

async function runTests() {
  // Clear cache before tests
  CS.clearCache();

  // Test 1: TAB_MODULES definition
  assert(CS.TAB_MODULES.dashboard, 'Dashboard module defined');
  assert(CS.TAB_MODULES.ativos, 'Ativos module defined');
  assert(CS.TAB_MODULES.metas, 'Metas module defined');
  assert(CS.TAB_MODULES.dividendos, 'Dividendos module defined');
  assert(Object.keys(CS.TAB_MODULES).length >= 8, 'At least 8 tab modules');

  // Test 2: COMPONENT_MODULES definition
  assert(CS.COMPONENT_MODULES.charts, 'Charts component defined');
  assert(CS.COMPONENT_MODULES.tables, 'Tables component defined');
  assert(CS.COMPONENT_MODULES.projections, 'Projections component defined');
  assert(Object.keys(CS.COMPONENT_MODULES).length >= 4, 'At least 4 component modules');

  // Test 3: loadModule - basic
  const dashboardModule = await CS.loadModule('dashboard');
  assert(dashboardModule.name === 'dashboard', 'Loaded dashboard module');
  assert(dashboardModule.loaded === true, 'Module marked as loaded');
  assert(typeof dashboardModule.loadTime === 'number', 'Has load time');
  assert(CS.isModuleLoaded('dashboard'), 'isModuleLoaded returns true');

  // Test 4: Module caching
  const dashboardModule2 = await CS.loadModule('dashboard');
  assert(dashboardModule2 === dashboardModule, 'Returns cached module');

  // Test 6: loadModule - component
    const chartsModule = await CS.loadModule('charts');
    assert(chartsModule.name === 'charts', 'Loaded charts component');
    // Component modules have 'files' not 'dependencies'
    assert(chartsModule.info.files || chartsModule.info.dependencies, 'Has files or dependencies info');

  // Test 6: getModuleInfo
  const info = CS.getModuleInfo('ativos');
  assert(info.name === 'Ativos', 'Module info has correct name');
  assert(info.estimatedSize, 'Has estimated size');

  // Test 7: getModuleInfo for unloaded module
  const unloadedInfo = CS.getModuleInfo('irpf');
  assert(unloadedInfo.name === 'IRPF', 'Unloaded module info accessible');
  assert(unloadedInfo.loaded === undefined || unloadedInfo.loaded === false, 'Unloaded module not marked as loaded');

  // Test 8: preloadModules
  await CS.preloadModules(['patrimonio', 'renda-fixa']);
  assert(CS.isModuleLoaded('patrimonio'), 'Preloaded patrimonio');
  assert(CS.isModuleLoaded('renda-fixa'), 'Preloaded renda-fixa');

  // Test 8b: preloadModules with dependencies
  CS.clearCache();
  await CS.preloadModules(['metas']); // metas depends on projections
  assert(CS.isModuleLoaded('metas'), 'Preloaded metas');
  assert(CS.isModuleLoaded('projections'), 'Preloaded dependency projections');

  // Test 9: getLoadedModules
  const loaded = CS.getLoadedModules();
  assert(loaded.includes('metas'), 'getLoadedModules includes metas');
  assert(loaded.includes('projections'), 'getLoadedModules includes projections');

  // Test 10: getLoadingStats
  const stats = CS.getLoadingStats();
  assert(typeof stats.loadedCount === 'number', 'Stats has loadedCount');
  assert(typeof stats.totalLoadTime === 'number', 'Stats has totalLoadTime');
  assert(typeof stats.avgLoadTime === 'number', 'Stats has avgLoadTime');
  assert(stats.modules.length === stats.loadedCount, 'Modules array matches count');

  // Test 11: createLazyLoader
  let callCount = 0;
  const heavyFn = CS.createLazyLoader(() => {
    callCount++;
    return { compute: (x) => x * 2 };
  }, 'dashboard');
  
  const result = await heavyFn();
  assert(callCount === 1, 'Lazy loader called once');
  assert(result.compute(5) === 10, 'Lazy function works');
  
  const result2 = await heavyFn();
  assert(callCount === 1, 'Lazy loader cached (not called again)');
  assert(result2.compute(7) === 14, 'Cached function works');

  // Test 12: clearCache
  CS.clearCache();
  assert(!CS.isModuleLoaded('dashboard'), 'Cache cleared - dashboard not loaded');
  assert(!CS.isModuleLoaded('charts'), 'Cache cleared - charts not loaded');
  assert(CS.getLoadedModules().length === 0, 'Loaded modules empty after clear');

  // Test 13: Error handling - unknown module
  try {
    await CS.loadModule('unknown-module-xyz');
    assert(false, 'Should throw for unknown module');
  } catch (e) {
    assert(e.message.includes('desconhecido'), 'Throws for unknown module');
  }

  // Test 14: getModuleInfo returns correct structure
  const fullInfo = CS.getModuleInfo('dividendos');
  assert(fullInfo.dependencies, 'Has dependencies array');
  assert(fullInfo.estimatedSize, 'Has estimatedSize');

  // Test 15: Concurrent loading
  CS.clearCache();
  const [a, b, c] = await Promise.all([
    CS.loadModule('dashboard'),
    CS.loadModule('patrimonio'),
    CS.loadModule('ativos')
  ]);
  assert(a.name === 'dashboard', 'Concurrent load A');
  assert(b.name === 'patrimonio', 'Concurrent load B');
  assert(c.name === 'ativos', 'Concurrent load C');
  const finalLoaded = CS.getLoadedModules();
  assert(finalLoaded.length >= 3, 'At least 3 loaded concurrently');

  console.log('\n=== SUMMARY ===');
  console.log('Passed:', passCount);
  console.log('Failed:', failCount);
  console.log('Total:', passCount + failCount);

  if (failCount > 0) process.exit(1);
}

runTests().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});