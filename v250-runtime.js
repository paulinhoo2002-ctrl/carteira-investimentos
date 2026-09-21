(() => {
  'use strict';

  const APP_BUILD_ID = 'phase4i-runtime-v2';
  const SW_CACHE = 'carteira-investimentos-v250.1';
  const STATUS_ID = 'v250-runtime-status';
  const WRITE_HANDLER_PATTERN = /(?:^|[.(])(?:save|saveConfig|uploadLocalToCloud|confirmBackupImport|applyBackupData|add[A-Z]|delete[A-Z]|remove[A-Z]|sync[A-Z])/;
  const WRITE_TEXT_PATTERN = /\b(?:salvar|registrar|comprar|vender|excluir|remover|aplicar|confirmar restauração|sincronizar)\b/i;

  function isOffline() {
    return navigator.onLine === false;
  }

  function getStatusElement() {
    let element = document.getElementById(STATUS_ID);
    if (element || !document.body) return element;
    element = document.createElement('div');
    element.id = STATUS_ID;
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483000;display:none;max-width:min(420px,calc(100vw - 24px));padding:9px 12px;border:1px solid #7c5b13;border-radius:10px;background:#241b08;color:#fde68a;font:700 12px/1.35 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)';
    document.body.appendChild(element);
    return element;
  }

  function updateStatus() {
    const element = getStatusElement();
    if (!element) return;
    if (isOffline()) {
      element.textContent = 'Offline — dados em cache; última atualização conhecida. Operações financeiras estão bloqueadas.';
      element.style.display = 'block';
    } else {
      element.textContent = '';
      element.style.display = 'none';
    }
    document.documentElement.dataset.v250Offline = String(isOffline());
  }

  function isWriteAction(element) {
    if (!(element instanceof HTMLElement)) return false;
    const handler = element.getAttribute('onclick') || '';
    const text = element.textContent || '';
    if (/importar backup|selecionar arquivo|abrir|prévia|preview/i.test(text)) return false;
    return WRITE_HANDLER_PATTERN.test(handler) || WRITE_TEXT_PATTERN.test(text);
  }

  function handleOfflineWrite(event) {
    if (!isOffline()) return;
    const action = event.target instanceof Element ? event.target.closest('button,[role="button"],input[type="submit"]') : null;
    if (!isWriteAction(action)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    action.setAttribute('aria-disabled', 'true');
    action.title = 'Disponível somente quando houver conexão.';
    updateStatus();
  }

  function collectPerformanceSnapshot() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const counts = new Map();
    resources.forEach(entry => counts.set(entry.name, (counts.get(entry.name) || 0) + 1));
    return {
      appBuildId: APP_BUILD_ID,
      expectedServiceWorkerCache: SW_CACHE,
      navigation: navigation ? {
        responseEnd: navigation.responseEnd,
        domInteractive: navigation.domInteractive,
        domContentLoaded: navigation.domContentLoadedEventEnd,
        load: navigation.loadEventEnd,
      } : null,
      resourceCount: resources.length,
      duplicateRequestCount: [...counts.values()].filter(count => count > 1).reduce((sum, count) => sum + count - 1, 0),
      longTaskCount: performance.getEntriesByType('longtask').length,
      offline: isOffline(),
    };
  }

  async function checkVersionCoherence() {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    const worker = registration?.active || navigator.serviceWorker?.controller;
    if (!worker || !window.MessageChannel) return { status: 'UNAVAILABLE', appBuildId: APP_BUILD_ID, expectedCache: SW_CACHE };
    const channel = new MessageChannel();
    const response = await new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 800);
      channel.port1.onmessage = event => { clearTimeout(timer); resolve(event.data || null); };
      worker.postMessage({ type: 'GET_V250_VERSION' }, [channel.port2]);
    });
    const pass = response?.cacheName === SW_CACHE;
    document.documentElement.dataset.v250VersionSkew = String(!pass);
    return { status: response ? (pass ? 'PASS' : 'MISMATCH') : 'UNAVAILABLE', appBuildId: APP_BUILD_ID, expectedCache: SW_CACHE, serviceWorker: response };
  }

  function boot() {
    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    document.addEventListener('click', handleOfflineWrite, true);
    window.__V250_PERF__ = { snapshot: collectPerformanceSnapshot };
    checkVersionCoherence().catch(() => {});
    requestAnimationFrame(() => {
      performance.mark('v250-first-useful-ui');
      document.documentElement.dataset.v250FirstUsefulUi = 'ready';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.V250Runtime = { APP_BUILD_ID, SW_CACHE, isOffline, updateStatus, collectPerformanceSnapshot, checkVersionCoherence };
})();
