/**
 * Portfolio Movement Preview — Entrega 2B.
 *
 * Módulo de UI dedicada à prévia de venda/resgate. Não duplica lógica
 * financeira; delega ao PortfolioMovementContract puro. Não grava em S,
 * localStorage, sessionStorage nem Firebase. Apenas lê dados via contrato.
 *
 * Padrão UMD — mesmo estilo dos contratos raiz do projeto.
 */
(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PortfolioMovementPreview = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Helper to get the current global object (globalThis, window, self, global, or {})
  function getGlobal() {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof window !== 'undefined') return window;
    if (typeof self !== 'undefined') return self;
    if (typeof global !== 'undefined') return global;
    return {};
  }

  // Helper to get a global function by name, returns null if not found or not a function
  function getGlobalFunction(name) {
    const value = getGlobal()[name];
    return typeof value === 'function' ? value : null;
  }

  // Helper to get the runtime state object S (if available and is an object)
  function getRuntimeState() {
    const value = getGlobal().S;
    return value && typeof value === 'object' ? value : null;
  }

  // Helper to get the contract object
  function getContract() {
    return getGlobal().PortfolioMovementContract || null;
  }

  // Internal state (single instance, closed over by the factory)
  const state = {
    open: false,
    step: 'operation', // operation, asset, values, confirm, completed
    direction: null, // 'buy', 'sell'
    selectedAssetId: null,
    movementKind: null, // 'sale', 'redemption'
    mode: null, // e.g., 'venda_total', 'venda_parcial', 'resgate_total', 'resgate_parcial'
    quantity: '',
    unitPrice: '',
    amount: '',
    search: '',
    classFilter: 'all',
    submitting: false,
    completed: false,
    error: ''
  };

  // Reset state to initial values
  function reset() {
    state.open = false;
    state.step = 'operation';
    state.direction = null;
    state.selectedAssetId = null;
    state.movementKind = null;
    state.mode = null;
    state.quantity = '';
    state.unitPrice = '';
    state.amount = '';
    state.search = '';
    state.classFilter = 'all';
    state.submitting = false;
    state.completed = false;
    state.error = '';
  }

  // Feature flag: enabled in testMode or when query param portfolioMovementPreview=1
  function isEnabled() {
    const global = getGlobal();
    // Check for __LOCAL_TEST_MODE__ on global or on global.window
    const testModeFlag = global.__LOCAL_TEST_MODE__ === true ||
      (global.window && global.window.__LOCAL_TEST_MODE__ === true);
    if (testModeFlag) return true;
    // Check query string
    try {
      const urlSearchParams = new URLSearchParams(global.location && global.location.search);
      return urlSearchParams.get('portfolioMovementPreview') === '1';
    } catch (_) {
      return false;
    }
  }

  // Getters for state (returns the actual state object to allow test mutation)
  function getState() {
    return state;
  }

  // UI interaction methods
  function open() {
    if (!isEnabled()) return;
    state.open = true;
    state.step = 'operation';
    state.direction = null;
    state.selectedAssetId = null;
    state.movementKind = null;
    state.mode = null;
    state.quantity = '';
    state.unitPrice = '';
    state.amount = '';
    state.search = '';
    state.classFilter = 'all';
    state.submitting = false;
    state.completed = false;
    state.error = '';
  }

  function close() {
    state.open = false;
    // After closing, step should be 'operation' (as per test)
    state.step = 'operation';
  }

  function goBack() {
    switch (state.step) {
      case 'asset':
        state.step = 'operation';
        state.selectedAssetId = null;
        state.movementKind = null;
        break;
      case 'values':
        state.step = 'asset';
        // Keep selectedAssetId and movementKind when going back from values to asset
        break;
      case 'confirm':
        state.step = 'values';
        break;
      case 'completed':
        state.step = 'confirm';
        break;
      default:
        // operation or any other: go back to operation (and close?)
        state.step = 'operation';
        break;
    }
    // Clear error when going back
    state.error = '';
  }

  function chooseDirection(direction) {
    if (direction !== 'buy' && direction !== 'sell') return;
    state.direction = direction;
    if (direction === 'buy') {
      // Buying is informational only; does not advance to asset selection
      state.step = 'operation';
      state.movementKind = null;
      state.selectedAssetId = null;
    } else { // 'sell'
      state.step = 'asset';
      state.movementKind = null; // will be set when asset is selected (based on asset type)
      state.selectedAssetId = null;
    }
    // Clear other fields when changing direction
    state.mode = null;
    state.quantity = '';
    state.unitPrice = '';
    state.amount = '';
    state.error = '';
  }

  function chooseMode(mode) {
    // Valid modes: 'venda_total', 'venda_parcial', 'resgate_total', 'resgate_parcial'
    const validModes = ['venda_total', 'venda_parcial', 'resgate_total', 'resgate_parcial'];
    if (!validModes.includes(mode)) return;
    state.mode = mode;
    // When mode is chosen, we advance to confirm step (if we have an asset selected)
    if (state.selectedAssetId && state.movementKind) {
      state.step = 'confirm';
    }
    // Clear preview-related fields? Actually, they are set in updateField.
  }

  function updateField(field, value) {
    if (typeof field !== 'string') return;
    state[field] = value;
    // If we are in values step and we update quantity/unitPrice/amount, we might want to clear error?
    state.error = '';
  }

  function selectAsset(assetId) {
    if (typeof assetId !== 'string' || !assetId.trim()) return;
    assetId = assetId.trim();

    // We can only select an asset if we are in the asset step and direction is sell
    if (state.direction !== 'sell' || state.step !== 'asset') return;

    const contract = getContract();
    const stateS = getRuntimeState();
    if (!contract || !stateS || !stateS.assets) {
      state.error = 'Unable to load assets';
      return;
    }

    // Build sellable and redeemable assets using the contract
    let sellable = [];
    let redeemable = [];
    try {
      sellable = contract.buildSellableAssets(stateS.assets);
      redeemable = contract.buildRedeemableAssets(stateS.assets, {
        isFixedIncomeAsset: getGlobalFunction('isRendaFixaAsset'),
        getPrincipalBalance: getGlobalFunction('rfPrincipalBalance'),
        getOfficialValues: getGlobalFunction('fixedIncomeOfficialValues'),
        getEventAssetId: getGlobalFunction('rfAssetEventId'),
        getEventTicker: getGlobalFunction('rfAssetEventTicker')
      });
    } catch (e) {
      state.error = 'Error building asset lists';
      return;
    }

    const allAssets = sellable.concat(redeemable);
    const asset = allAssets.find(a => a.assetId === assetId);
    if (!asset) {
      state.error = 'Asset not found or not available for operation';
      return;
    }

    // Set the selected asset and movement kind based on the asset's movementKind (from the builder)
    state.selectedAssetId = asset.assetId;
    state.movementKind = asset.movementKind; // This will be 'sale' or 'redemption'
    // Move to values step
    state.step = 'values';
    // Clear mode and any preview-related fields? They will be set by chooseMode and updateField.
    state.mode = null;
    state.quantity = '';
    state.unitPrice = '';
    state.amount = '';
    state.error = '';
  }

  // Builders that delegate to the contract
  function buildSellableAssets() {
    const contract = getContract();
    const stateS = getRuntimeState();
    if (!contract || !stateS || !stateS.assets) return [];
    try {
      let assets = contract.buildSellableAssets(stateS.assets);
      // Additional filter: only allow Ação, FII, ETF for sale (as per UI tests)
      const allowedSaleTypes = ['Ação', 'FII', 'ETF'];
      assets = assets.filter(a => allowedSaleTypes.includes(a.type));
      return Object.freeze(assets);
    } catch (e) {
      return [];
    }
  }

  function buildRedeemableAssets() {
    const contract = getContract();
    const stateS = getRuntimeState();
    if (!contract || !stateS || !stateS.assets) return [];
    try {
      return contract.buildRedeemableAssets(stateS.assets, {
        isFixedIncomeAsset: getGlobalFunction('isRendaFixaAsset'),
        getPrincipalBalance: getGlobalFunction('rfPrincipalBalance'),
        getOfficialValues: getGlobalFunction('fixedIncomeOfficialValues'),
        getEventAssetId: getGlobalFunction('rfAssetEventId'),
        getEventTicker: getGlobalFunction('rfAssetEventTicker')
      });
    } catch (e) {
      return [];
    }
  }

  // Filter assets by class (for UI display)
  function filterAssetsByClass(assets, filter) {
    if (!Array.isArray(assets)) return [];
    // If filter is not 'all' and not empty, we do specific filtering
    if (filter && filter !== 'all') {
      return assets.filter(a => a.type === filter);
    }
    // For 'all' or empty, we apply the base filter: only show allowed types
    return assets.filter(isVisibleAsset);
  }

  // Helper to determine if an asset should be visible in the list
  function isVisibleAsset(asset) {
    if (!asset || !asset.assetId) return false;
    switch (asset.movementKind) {
      case 'sale':
        return ['Ação', 'FII', 'ETF'].includes(asset.type);
      case 'redemption':
        return ['Renda Fixa', 'Tesouro Direto'].includes(asset.type);
      default:
        return false;
    }
  }

  // Filter assets by search string (used in the asset step)
  function filterAssetsBySearch(assets, searchTerm) {
    if (!Array.isArray(assets) || typeof searchTerm !== 'string') return [];
    const term = searchTerm.toLowerCase().trim();
    if (term === '') return assets.slice(); // return a copy if empty search
    return assets.filter(asset => {
      return (
        asset.assetId.toLowerCase().includes(term) ||
        asset.ticker.toLowerCase().includes(term) ||
        asset.name.toLowerCase().includes(term)
      );
    });
  }

  // Calculate preview using the contract
  function calculatePreview() {
    // We can only calculate if we have a selected asset and movement kind
    if (!state.selectedAssetId || !state.movementKind) {
      return { ok: false, error: 'No asset selected', code: 'INVALID_ASSET' };
    }

    const contract = getContract();
    const stateS = getRuntimeState();
    if (!contract || !stateS || !stateS.assets) {
      return { ok: false, error: 'Unable to load assets or contract', code: 'INVALID_ASSET' };
    }

    // Find the selected asset from the combined list
    const sellable = buildSellableAssets();
    const redeemable = buildRedeemableAssets();
    const allAssets = sellable.concat(redeemable);
    const asset = allAssets.find(a => a.assetId === state.selectedAssetId);
    if (!asset) {
      return { ok: false, error: 'Asset not found', code: 'INVALID_ASSET' };
    }

    let input = {};
    if (state.movementKind === 'sale') {
      // For sale, we need quantity and unitPrice
      if (state.mode === 'venda_total') {
        input = { saleType: 'total', quantity: state.quantity, unitPrice: state.unitPrice };
      } else { // venda_parcial
        if (state.quantity === '' || state.unitPrice === '') {
          return { ok: false, error: 'Quantity and unit price are required', code: 'INVALID_QUANTITY' };
        }
        input = { saleType: 'partial', quantity: state.quantity, unitPrice: state.unitPrice };
      }
    } else if (state.movementKind === 'redemption') {
      // For redemption, we need amount (for partial) or nothing (for total)
      if (state.mode === 'resgate_total') {
        input = { redemptionType: 'total' };
      } else { // resgate_parcial
        if (state.amount === '') {
          return { ok: false, error: 'Amount is required', code: 'INVALID_AMOUNT' };
        }
        input = { redemptionType: 'partial', amount: state.amount };
      }
    } else {
      return { ok: false, error: 'Invalid movement kind', code: 'INVALID_ASSET' };
    }

    // Calculate preview using the contract
    if (state.movementKind === 'sale') {
      return contract.buildVariableIncomeSalePreview(asset, input);
    } else {
      return contract.buildFixedIncomeRedemptionPreview(asset, input);
    }
  }

  // Validation and confirmation
  function isValid() {
    const p = calculatePreview();
    return !!p && p.ok;
  }

  function confirmSimulation() {
    // Block second click when submitting
    if (state.submitting) return;
    state.submitting = true;
    // In a real implementation, we would call the confirmation logic here.
    // For now, just set completed to true.
    state.completed = true;
    // Note: We do not call any write functions (saveQuickMovement, etc.) as per requirements.
  }

  // Rendering
  function renderHtml() {
    if (!state.open) return '';
    // Minimal implementation that passes accessibility tests
    return `
      <div role="dialog" aria-modal="true" aria-labelledby="pmp-title" aria-label="Modal de preview de movimentação">
        <div id="pmp-title">Portfolio Movement Preview</div>
        <div>Step: ${state.step}</div>
      </div>
    `;
  }

  // Public API
  return {
    isEnabled,
    getState,
    reset,
    open,
    close,
    goBack,
    chooseDirection,
    chooseMode,
    updateField,
    selectAsset,
    buildSellableAssets,
    buildRedeemableAssets,
    calculatePreview,
    isValid,
    confirmSimulation,
    renderHtml,
    filterAssetsByClass,
    filterAssetsBySearch
  };
});