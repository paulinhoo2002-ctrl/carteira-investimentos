'use strict';

(function attachFixedIncomeTrust(root, factory) {
  const api = factory();
  if (root) root.FixedIncomeTrust = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createFixedIncomeTrust() {
  const STATUS = Object.freeze({
    MANUAL_AUTHORITATIVE: 'MANUAL_AUTHORITATIVE',
    REFERENCE_SHADOW: 'REFERENCE_SHADOW',
    UNSUPPORTED: 'UNSUPPORTED',
    UNAVAILABLE: 'UNAVAILABLE',
    STALE: 'STALE',
    UNKNOWN: 'UNKNOWN',
  });

  const text = value => String(value ?? '').trim();
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;

  function classify(meta = {}) {
    const rawStatus = text(meta.status).toUpperCase();
    const classification = text(meta.classification || meta.benchmarkStatus).toUpperCase();
    const shadow = rawStatus === 'SHADOW_ONLY'
      || rawStatus === 'REFERENCE_SHADOW'
      || classification === 'CDI_BENCHMARK_SHADOW'
      || text(meta.authority).toUpperCase() === 'REFERENCE_SHADOW'
      || /SHADOW|REFERENCE/i.test(text(meta.provenance?.source));
    if (shadow) return { status: STATUS.REFERENCE_SHADOW, label: 'Referência shadow', source: describeSource(meta), authoritative: false };
    if (meta.isFallback === true || rawStatus === 'REVIEW_REQUIRED' || rawStatus === 'UNAVAILABLE') {
      return { status: STATUS.UNAVAILABLE, label: 'Valor indisponível', source: describeSource(meta), authoritative: false };
    }
    if (rawStatus === 'UNSUPPORTED' || rawStatus === 'UNSUPPORTED_IPCA_EXACT' || classification === 'UNSUPPORTED_IPCA_EXACT' || meta.isSupported === false) {
      return { status: STATUS.UNSUPPORTED, label: 'Sem cálculo automático', source: describeSource(meta), authoritative: false };
    }
    if (meta.value === null || meta.manualValueCents === null && meta.current === null) {
      return { status: STATUS.UNAVAILABLE, label: 'Valor indisponível', source: describeSource(meta), authoritative: false };
    }
    if (meta.stale === true || meta.isStale === true) return { status: STATUS.STALE, label: 'Atualização desatualizada', source: describeSource(meta), authoritative: true };
    if (text(meta.authority).toUpperCase().includes('MANUAL') || meta.manual === true || meta.manualValueCents !== undefined) {
      return { status: STATUS.MANUAL_AUTHORITATIVE, label: 'Valor manual', source: describeSource(meta), authoritative: true };
    }
    if (text(meta.authority).toUpperCase().includes('AUTHORITATIVE') || meta.isAuthoritative === true) {
      return { status: STATUS.MANUAL_AUTHORITATIVE, label: 'Valor autoritativo', source: describeSource(meta), authoritative: true };
    }
    if (meta.value === undefined && meta.current === undefined && meta.manualValueCents === undefined && !text(meta.source || meta.origin || meta.provenance?.source)) {
      return { status: STATUS.UNKNOWN, label: 'Origem não informada', source: '—', authoritative: false };
    }
    return { status: STATUS.MANUAL_AUTHORITATIVE, label: 'Valor informado', source: describeSource(meta), authoritative: true };
  }

  function describeAuthority(meta = {}) {
    return classify(meta).label;
  }

  function describeSource(meta = {}) {
    const source = text(meta.source || meta.origin || meta.provenance?.source);
    return source || '—';
  }

  function describeIndexer(asset = {}) {
    const raw = text(asset.indexer || asset.fixed_indexer || asset.rf_yield_type || asset.rf_contract_rate || asset.fixed_rate);
    if (/IPCA/i.test(raw)) return 'IPCA';
    if (/CDI/i.test(raw)) return 'CDI';
    if (/SELIC/i.test(raw)) return 'Selic';
    if (/PREFIX|PRE-FIX|PRÉ/i.test(raw)) return 'Prefixado';
    return '—';
  }

  function filterRows(rows, query = '', status = 'all') {
    const needle = text(query).toLocaleLowerCase('pt-BR');
    const wanted = text(status).toUpperCase();
    return (Array.isArray(rows) ? rows : []).filter(row => {
      const trustStatus = text(row.trustStatus || classify(row.currentMeta || row).status).toUpperCase();
      const haystack = [row.ticker, row.name, row.indexer, row.rate, row.issuer, row.source].map(text).join(' ').toLocaleLowerCase('pt-BR');
      return (!needle || haystack.includes(needle)) && (!wanted || wanted === 'ALL' || trustStatus === wanted);
    });
  }

  function sortRows(rows, key = 'name', direction = 'asc') {
    const multiplier = direction === 'desc' ? -1 : 1;
    return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
      let left;
      let right;
      if (key === 'value') { left = finite(a.current); right = finite(b.current); }
      else if (key === 'maturity') { left = Date.parse(text(a.due) || '') || Number.POSITIVE_INFINITY; right = Date.parse(text(b.due) || '') || Number.POSITIVE_INFINITY; }
      else { left = text(a[key] || a.ticker).toLocaleLowerCase('pt-BR'); right = text(b[key] || b.ticker).toLocaleLowerCase('pt-BR'); }
      if (left === null && right !== null) return 1;
      if (right === null && left !== null) return -1;
      if (left < right) return -1 * multiplier;
      if (left > right) return 1 * multiplier;
      return text(a.ticker).localeCompare(text(b.ticker), 'pt-BR') * multiplier;
    });
  }

  function summarize(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const statuses = list.map(row => text(row.trustStatus || classify(row.currentMeta || row).status).toUpperCase());
    const values = list.map(row => finite(row.current)).filter(value => value !== null);
    return {
      positionCount: list.length,
      confirmedCurrent: values.reduce((sum, value) => sum + value, 0),
      manualCount: statuses.filter(value => value === STATUS.MANUAL_AUTHORITATIVE || value === STATUS.STALE).length,
      shadowCount: statuses.filter(value => value === STATUS.REFERENCE_SHADOW).length,
      unsupportedCount: statuses.filter(value => value === STATUS.UNSUPPORTED).length,
      unavailableCount: statuses.filter(value => value === STATUS.UNAVAILABLE).length,
      staleCount: statuses.filter(value => value === STATUS.STALE).length,
      unknownCount: statuses.filter(value => value === STATUS.UNKNOWN).length,
    };
  }

  return Object.freeze({ STATUS, classify, describeAuthority, describeSource, describeIndexer, filterRows, sortRows, summarize });
});
