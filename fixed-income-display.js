'use strict';

(function attachFixedIncomeDisplay(root, factory) {
  const api = factory();
  if (root) root.FixedIncomeDisplay = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function createFixedIncomeDisplayApi() {
  function describe(meta = {}) {
    const source = String(meta.source || '').trim();
    if (meta.isFallback || meta.authority === 'LEGACY_FALLBACK' || source === 'valor aplicado') {
      return {
        label: 'Fallback do valor aplicado',
        tone: 'warn',
        note: 'Referência preservada por compatibilidade; não representa uma atualização de mercado.'
      };
    }
    if (meta.authority === 'MANUAL_AUTHORITATIVE') {
      return {
        label: 'Valor manual autoritativo',
        tone: 'info',
        note: 'Valor manual da carteira permanece como autoridade para esta posição.'
      };
    }
    if (meta.authority === 'IMPORTED_AUTHORITATIVE') {
      return {
        label: 'Valor importado autoritativo',
        tone: 'info',
        note: 'Valor importado preservado como autoridade da posição.'
      };
    }
    if (source) {
      return {
        label: 'Valor informado',
        tone: 'ok',
        note: `Fonte: ${source}`
      };
    }
    return {
      label: 'Fonte não informada',
      tone: 'muted',
      note: 'Confira a origem do valor antes de interpretar o resultado.'
    };
  }

  return Object.freeze({ describe });
});
