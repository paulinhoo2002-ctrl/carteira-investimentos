/* Pure semantic reconciliation for read-only income/event projections. */
(function(root, factory){
  const api = factory();
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(root) root.CorporateEventsParity = api;
})(typeof window !== 'undefined' ? window : globalThis, function(){
  const REASONS = Object.freeze([
    'REFERENCE_EXCLUDED', 'CANCELLED', 'CORRECTION_SUPERSEDED', 'SHADOW_ONLY',
    'MANUAL_ONLY', 'B3_ONLY', 'OFFICIAL_ONLY', 'DATE_WINDOW',
    'PAYMENT_DATE_VS_COMPETENCE_DATE', 'ROUNDING', 'SOURCE_VARIANT',
    'UNSUPPORTED_TYPE', 'REALIZATION_PENDING', 'UNKNOWN'
  ]);
  const text = value => String(value == null ? '' : value).trim();
  const cents = value => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) : null;
  };
  const dateOf = row => text(row?.paymentDate || row?.date || row?.paymentDt || row?.competenceDate);
  const tickerOf = row => text(row?.ticker || row?.symbol).toUpperCase();
  const typeOf = row => text(row?.eventType || row?.canonical || row?.type || 'OTHER').toUpperCase();
  const reasonFor = (row, side) => {
    if(row?.sourceEventKind === 'reference' || row?.excludedFromIncomeTotals === true) return 'REFERENCE_EXCLUDED';
    if(row?.status === 'CANCELLED' || row?.cancelled === true) return 'CANCELLED';
    if(row?.status === 'CORRECTED' || row?.supersedesEventId) return 'CORRECTION_SUPERSEDED';
    if(row?.shadowOnly === true || row?.source === 'official-shadow') return 'SHADOW_ONLY';
    return side === 'left' ? 'OFFICIAL_ONLY' : 'MANUAL_ONLY';
  };
  function normalizeRow(row={}, side='left'){
    const value = row.value ?? row.valuePerUnitGross ?? row.amount;
    return {
      original: row,
      ticker: tickerOf(row),
      eventType: typeOf(row),
      date: dateOf(row),
      valueCents: cents(value),
      reason: reasonFor(row, side)
    };
  }
  function identity(row){
    return [row.ticker, row.eventType, row.date, row.valueCents == null ? '' : row.valueCents].join('|');
  }
  function reconcileRows(leftRows=[], rightRows=[]){
    const left = (Array.isArray(leftRows) ? leftRows : []).map(row => normalizeRow(row, 'left'));
    const right = (Array.isArray(rightRows) ? rightRows : []).map(row => normalizeRow(row, 'right'));
    const used = new Set();
    const result = {matches:[], leftOnly:[], rightOnly:[], valueMismatch:[], dateMismatch:[], classification:[], reasonCounts:{}};
    const addReason = reason => { result.reasonCounts[reason] = (result.reasonCounts[reason] || 0) + 1; };
    left.forEach(item => {
      let index = right.findIndex((candidate, i) => !used.has(i) && identity(candidate) === identity(item));
      if(index >= 0){
        used.add(index); result.matches.push({left:item.original,right:right[index].original}); addReason('SOURCE_VARIANT'); return;
      }
      index = right.findIndex((candidate, i) => !used.has(i) && candidate.ticker === item.ticker && candidate.eventType === item.eventType);
      if(index >= 0 && item.valueCents !== right[index].valueCents){
        used.add(index); result.valueMismatch.push({left:item.original,right:right[index].original,reason:'UNKNOWN'}); addReason('UNKNOWN'); return;
      }
      index = right.findIndex((candidate, i) => !used.has(i) && candidate.ticker === item.ticker && candidate.eventType === item.eventType && candidate.valueCents === item.valueCents);
      if(index >= 0){
        used.add(index); result.dateMismatch.push({left:item.original,right:right[index].original,reason:'PAYMENT_DATE_VS_COMPETENCE_DATE'}); addReason('PAYMENT_DATE_VS_COMPETENCE_DATE'); return;
      }
      result.leftOnly.push({row:item.original,reason:item.reason}); addReason(item.reason);
    });
    right.forEach((item,index)=>{ if(!used.has(index)){ result.rightOnly.push({row:item.original,reason:item.reason}); addReason(item.reason); } });
    result.classification = [...result.leftOnly,...result.rightOnly,...result.valueMismatch,...result.dateMismatch].map(entry => entry.reason);
    return result;
  }
  return {REASONS,normalizeRow,identity,reconcileRows};
});
