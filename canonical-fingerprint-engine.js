(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CanonicalFingerprintEngine = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 'phase4h-canonical-fp-v1';
  function stable(value) {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  }
  async function fingerprint(value) {
    const text = stable(value);
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    }
    if (typeof require === 'function') return require('node:crypto').createHash('sha256').update(text).digest('hex');
    throw new Error('CANONICAL_FINGERPRINT_UNAVAILABLE');
  }
  function cents(value) { const number = Number(value); return Number.isFinite(number) ? Math.round(number * 100) : 0; }
  function dateKey(value) {
    const text = String(value ?? '').trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) { const [day, month, year] = text.split('/'); return `${year}-${month}-${day}`; }
    return text.slice(0, 10);
  }
  function ticker(event) { return String(event?.ticker || event?.symbol || '').trim().toUpperCase(); }
  function type(event) { return String(event?.type || event?.eventType || event?.incomeType || '').trim().toUpperCase(); }
  function sourceClass(event) {
    const source = String(event?.source || event?.origin || event?.financialSource || '').trim().toUpperCase();
    if (source.includes('B3')) return 'B3';
    if (source.includes('YAHOO')) return 'YAHOO';
    return source || 'UNKNOWN';
  }
  function reference(event) { return event?.sourceEventKind === 'reference' || event?.excludedFromIncomeTotals === true; }
  function amountCents(event) { return reference(event) ? 0 : cents(event?.value ?? event?.netValue); }
  function eventRow(event) { return { ticker: ticker(event), date: dateKey(event?.date || event?.paymentDate), type: type(event), sourceClass: sourceClass(event), amountCents: amountCents(event), reference: reference(event) }; }
  function sortedRows(events) { return (Array.isArray(events) ? events : []).map(eventRow).sort((a, b) => stable(a).localeCompare(stable(b))); }
  function canonicalState(state = {}) { return { wallets: state.wallets || [], assets: state.assets || [], aportes: state.aportes || [], proventos: state.proventos || [], rfEvents: state.rfEvents || [], goals: state.goals || {} }; }
  function financialSemanticInput(state = {}) { return { kind: 'FINANCIAL_SEMANTIC', version: VERSION, events: sortedRows(state.proventos) }; }
  function reconciliationInput(state = {}) { return { kind: 'RECONCILIATION', version: VERSION, events: sortedRows(state.proventos) }; }
  function sourceSetInput(rows) {
    return { kind: 'SOURCE_SET', version: VERSION, rows: (Array.isArray(rows) ? rows : []).map(row => ({ key: String(row?.key || ''), ticker: String(row?.ticker || '').toUpperCase(), date: dateKey(row?.date), amountCents: Number(row?.amountCents || 0), type: String(row?.type || '').toUpperCase(), source: String(row?.source || '').toUpperCase(), classification: String(row?.classification || '') })).sort((a, b) => a.key.localeCompare(b.key)) };
  }
  function classificationInput(rows) { return { kind: 'SOURCE_CLASSIFICATION', version: VERSION, rows: sourceSetInput(rows).rows.map(row => ({ key: row.key, classification: row.classification })) }; }
  return { VERSION, stable, cents, dateKey, canonicalState, eventRow, sortedRows, financialSemanticInput, reconciliationInput, sourceSetInput, classificationInput, structuralFingerprint: value => fingerprint(value), financialSemanticFingerprint: state => fingerprint(financialSemanticInput(state)), reconciliationFingerprint: state => fingerprint(reconciliationInput(state)), sourceSetFingerprint: rows => fingerprint(sourceSetInput(rows)), sourceClassificationFingerprint: rows => fingerprint(classificationInput(rows)) };
});
