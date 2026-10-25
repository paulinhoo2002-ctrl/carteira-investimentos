/**
 * M1451 — Code Splitting & Lazy Loading Manager
 * Gerencia carregamento preguiçoso de módulos pesados (abas, componentes)
 */
(function (global) {
  'use strict';

  const moduleCache = new Map();
  const loadingPromises = new Map();

  const TAB_MODULES = {
    'dashboard': { name: 'Dashboard', estimatedSize: '~50KB', dependencies: [] },
    'patrimonio': { name: 'Patrimônio', estimatedSize: '~40KB', dependencies: ['charts'] },
    'ativos': { name: 'Ativos', estimatedSize: '~60KB', dependencies: ['charts', 'tables'] },
    'dividendos': { name: 'Dividendos', estimatedSize: '~55KB', dependencies: ['charts', 'calendar'] },
    'metas': { name: 'Metas', estimatedSize: '~45KB', dependencies: ['charts', 'projections'] },
    'renda-fixa': { name: 'Renda Fixa', estimatedSize: '~35KB', dependencies: ['tables'] },
    'rentabilidade': { name: 'Rentabilidade', estimatedSize: '~40KB', dependencies: ['charts'] },
    'irpf': { name: 'IRPF', estimatedSize: '~30KB', dependencies: ['forms'] },
    'ajudar': { name: 'Ajudar', estimatedSize: '~20KB', dependencies: [] }
  };

  const COMPONENT_MODULES = {
    'charts': { name: 'Chart Components', files: ['chart-utils.js', 'chart-renderers.js'] },
    'tables': { name: 'Table Components', files: ['table-utils.js', 'table-sorters.js'] },
    'calendar': { name: 'Calendar Components', files: ['calendar-utils.js', 'calendar-renderers.js'] },
    'projections': { name: 'Projection Engine', files: ['analytics-passive-income-projection.js', 'analytics-wealth-goals.js'] },
    'forms': { name: 'Form Components', files: ['form-validators.js', 'form-renderers.js'] }
  };

  async function loadModule(moduleName) {
    if (moduleCache.has(moduleName)) {
      return moduleCache.get(moduleName);
    }

    if (loadingPromises.has(moduleName)) {
      return loadingPromises.get(moduleName);
    }

    const moduleInfo = TAB_MODULES[moduleName] || COMPONENT_MODULES[moduleName];
    if (!moduleInfo) {
      throw new Error('Módulo desconhecido: ' + moduleName);
    }

    const promise = (async () => {
      try {
        // Simulate loading - in production this would be dynamic import()
        // For now, modules are already loaded globally, so we just mark as loaded
        const startTime = performance.now();
        
        // Check if dependencies are available
        for (const dep of (moduleInfo.dependencies || [])) {
          if (!loadingPromises.has(dep) && !moduleCache.has(dep)) {
            await loadModule(dep);
          }
        }

        const loadTime = performance.now() - startTime;
        const module = { 
          name: moduleName, 
          loaded: true, 
          loadTime: Math.round(loadTime),
          timestamp: Date.now(),
          info: moduleInfo
        };
        
        moduleCache.set(moduleName, module);
        loadingPromises.delete(moduleName);
        
        console.log('[CodeSplit] Módulo carregado:', moduleName, '(' + loadTime.toFixed(1) + 'ms)');
        return module;
      } catch (error) {
        loadingPromises.delete(moduleName);
        throw error;
      }
    })();

    loadingPromises.set(moduleName, promise);
    return promise;
  }

  function preloadModules(moduleNames) {
    return Promise.all(moduleNames.map(name => loadModule(name)));
  }

  function getLoadedModules() {
    return Array.from(moduleCache.keys());
  }

  function getModuleInfo(moduleName) {
    const cached = moduleCache.get(moduleName);
    if (cached) return { ...cached.info, loaded: true, loadTime: cached.loadTime };
    return TAB_MODULES[moduleName] || COMPONENT_MODULES[moduleName] || null;
  }

  function getLoadingStats() {
    const loaded = Array.from(moduleCache.values());
    const totalLoadTime = loaded.reduce((sum, m) => sum + m.loadTime, 0);
    return {
      loadedCount: loaded.length,
      totalModules: Object.keys(TAB_MODULES).length + Object.keys(COMPONENT_MODULES).length,
      totalLoadTime: Math.round(totalLoadTime),
      avgLoadTime: loaded.length > 0 ? Math.round(totalLoadTime / loaded.length) : 0,
      modules: loaded.map(m => ({ name: m.name, loadTime: m.loadTime, timestamp: m.timestamp }))
    };
  }

  function clearCache() {
    moduleCache.clear();
    loadingPromises.clear();
  }

  function isModuleLoaded(moduleName) {
    return moduleCache.has(moduleName);
  }

  // Wrapper para lazy loading de funções pesadas
  function createLazyLoader(loaderFn, moduleName) {
    let loaded = false;
    let moduleInstance = null;
    
    return function(...args) {
      if (!loaded) {
        return loadModule(moduleName).then(() => {
          loaded = true;
          moduleInstance = loaderFn();
          return moduleInstance;
        });
      }
      return Promise.resolve(moduleInstance);
    };
  }

  var api = {
    loadModule: loadModule,
    preloadModules: preloadModules,
    getLoadedModules: getLoadedModules,
    getModuleInfo: getModuleInfo,
    getLoadingStats: getLoadingStats,
    clearCache: clearCache,
    isModuleLoaded: isModuleLoaded,
    createLazyLoader: createLazyLoader,
    TAB_MODULES: TAB_MODULES,
    COMPONENT_MODULES: COMPONENT_MODULES
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.CodeSplitter = api;
})(typeof window !== 'undefined' ? window : globalThis);