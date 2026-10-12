'use strict';

/* Read-only merge helper used when a cloud snapshot omits reference income
 * evidence that is still present in the local authenticated state. */
function normalizeIncomeDate(value) {
  const text = String(value ?? '').trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split('/');
    return `${year}-${month}-${day}`;
  }
  return text.slice(0, 10);
}

function incomeIdentityKey(event = {}) {
  const value = Number(event.value ?? event.netValue ?? event.canonicalAmount);
  const cents = Number.isFinite(value) ? Math.round(value * 100) : '';
  return [
    String(event.ticker || event.symbol || '').trim().toUpperCase(),
    normalizeIncomeDate(event.date || event.paymentDate || event.canonicalPaymentDate),
    String(event.type || event.eventType || event.incomeType || '').trim().toUpperCase(),
    cents,
  ].join('|');
}

function isReferenceIncomeEvent(event = {}) {
  const source = String(event.source || event.origin || event.financialSource || '').toUpperCase();
  const type = String(event.type || event.eventType || event.incomeType || '').toUpperCase();
  const sourceEventKind = String(event.sourceEventKind || '').toUpperCase();
  const evidence = Array.isArray(event.sourceEvidence) ? event.sourceEvidence : [];
  return source.includes('YAHOO') || source.includes('REFERENCE') || type.includes('YAHOO') || sourceEventKind === 'REFERENCE' || evidence.some(item => String(item?.sourceType || '').toUpperCase() === 'YAHOO');
}

function mergeReferenceIncomeEvents(localEvents = [], incomingEvents = []) {
  const incoming = Array.isArray(incomingEvents) ? incomingEvents.slice() : [];
  const keys = new Set(incoming.map(incomeIdentityKey));
  const preserved = (Array.isArray(localEvents) ? localEvents : [])
    .filter(isReferenceIncomeEvent)
    .filter(event => {
      const key = incomeIdentityKey(event);
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    });
  return [...incoming, ...preserved];
}

const linkageApi = Object.freeze({ incomeIdentityKey, isReferenceIncomeEvent, mergeReferenceIncomeEvents });
if (typeof window !== 'undefined') globalThis.ProtectedIncomeLinkage = linkageApi;
if (typeof module !== 'undefined' && module.exports) module.exports = linkageApi;
