/* Read-only import identity and reconciliation primitives.
 * This module deliberately does not parse files, write data or calculate money.
 */
(function initImportFoundation(root, factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.ImportFoundation=api;
})(typeof globalThis!=='undefined'?globalThis:this, function createImportFoundation(){
  const cleanText=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
  const cleanKey=value=>cleanText(value).replace(/[^A-Z0-9._:-]+/g,'_');

  function normalizeDate(value){
    const raw=String(value??'').trim();
    if(!raw) return '';
    let match=raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if(!match) match=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if(!match) return '';
    const year=Number(match[1].length===4?match[1]:match[3]);
    const month=Number(match[1].length===4?match[2]:match[2]);
    const day=Number(match[1].length===4?match[3]:match[1]);
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()!==year || date.getUTCMonth()!==month-1 || date.getUTCDate()!==day) return '';
    return `${year.toString().padStart(4,'0')}-${month.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
  }

  function normalizeMoneyCents(value){
    if(typeof value==='number') return Number.isFinite(value)?Math.round(value*100):null;
    let raw=String(value??'').trim().replace(/^R\$\s*/i,'').replace(/\s/g,'');
    if(!raw) return null;
    if(raw.includes(',') && raw.includes('.')) raw=raw.lastIndexOf(',')>raw.lastIndexOf('.')?raw.replace(/\./g,'').replace(',','.'):raw.replace(/,/g,'');
    else if(raw.includes(',')) raw=raw.replace(',','.');
    const number=Number(raw);
    return Number.isFinite(number)?Math.round(number*100):null;
  }

  function normalizeQuantity(value){
    const raw=String(value??'').trim().replace(/\s/g,'');
    if(!raw) return '';
    const normalized=raw.includes(',')&&raw.includes('.')?raw.replace(/\./g,'').replace(',','.'):raw.replace(',','.');
    const number=Number(normalized);
    return Number.isFinite(number)?number.toFixed(8).replace(/0+$/,'').replace(/\.$/,''):'';
  }

  function resolveExactIdentity(record={}){
    const candidates=[
      ['assetId',record.assetId],
      ['isin',record.isin],
      ['ticker',record.ticker||record.symbol||record.code],
      ['security',record.security||record.securityName||record.name]
    ];
    for(const [kind,value] of candidates){
      const normalized=cleanKey(value);
      if(normalized) return `${kind}:${normalized}`;
    }
    return '';
  }

  function fnv1a(value){
    let hash=2166136261;
    for(const char of String(value)){
      hash^=char.charCodeAt(0);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(16).padStart(8,'0');
  }

  function eventFingerprint(event={}){
    const fields=[
      cleanKey(event.source||event.sourceType),
      cleanKey(event.eventType||event.type||event.operation),
      normalizeDate(event.date||event.tradeDate||event.paymentDate),
      resolveExactIdentity(event),
      normalizeQuantity(event.quantity??event.qty),
      normalizeMoneyCents(event.unitPrice??event.price),
      normalizeMoneyCents(event.grossValue??event.gross??event.value),
      normalizeMoneyCents(event.netValue??event.net),
      cleanKey(event.institution||event.broker),
      cleanKey(event.documentId||event.noteNumber||event.documentIdentity)
    ];
    return `evt-${fnv1a(fields.join('|'))}`;
  }

  function sourceFingerprint(source={}){
    const rows=(Array.isArray(source.rows)?source.rows:[]).map(eventFingerprint).sort();
    const fields=[cleanKey(source.sourceType||source.source),cleanKey(source.broker),cleanKey(source.documentId||source.noteNumber),normalizeDate(source.tradeDate||source.period),cleanKey(source.fileName),Number(source.fileSize)||0,rows.join(',')];
    return `src-${fnv1a(fields.join('|'))}`;
  }

  function eventValue(event={}){
    return normalizeMoneyCents(event.netValue ?? event.net ?? event.grossValue ?? event.gross ?? event.value);
  }

  function eventType(event={}){
    return cleanKey(event.eventType || event.type || event.operation);
  }

  function classifyDuplicate(candidate, existing=[]){
    const fingerprint=String(candidate?.fingerprint||eventFingerprint(candidate));
    const known=(Array.isArray(existing)?existing:[]).map(item=>typeof item==='string'?item:String(item?.fingerprint||eventFingerprint(item)));
    if(known.includes(fingerprint)) return {state:'EXACT_DUPLICATE',fingerprint};
    const identity=resolveExactIdentity(candidate);
    const sameIdentity=(Array.isArray(existing)?existing:[]).filter(item=>resolveExactIdentity(typeof item==='string'?{}:item)===identity && identity);
    if(!sameIdentity.length) return {state:'NOT_DUPLICATE',fingerprint};
    const candidateDate=normalizeDate(candidate.date||candidate.tradeDate||candidate.paymentDate);
    const candidateType=eventType(candidate);
    const candidateValue=eventValue(candidate);
    for(const item of sameIdentity){
      const existingDate=normalizeDate(item.date||item.tradeDate||item.paymentDate);
      const existingType=eventType(item);
      const existingValue=eventValue(item);
      if(candidateDate && existingDate && candidateDate!==existingDate) continue;
      if(candidateType && existingType && candidateType!==existingType) continue;
      if(candidateDate && existingDate && candidateDate===existingDate && candidateType===existingType && candidateValue!==null && existingValue!==null && candidateValue!==existingValue){
        return {state:'IDENTITY_CONFLICT',fingerprint};
      }
      if(candidateDate && existingDate && candidateDate===existingDate && candidateType===existingType && candidateValue===existingValue){
        return {state:'POSSIBLE_DUPLICATE',fingerprint};
      }
    }
    return {state:'NOT_DUPLICATE',fingerprint};
  }

  function reconcilePositions(before=[], imported=[]){
    const beforeRows=Array.isArray(before)?before:[];
    const importedRows=Array.isArray(imported)?imported:[];
    const beforeMap=new Map(beforeRows.map(row=>[resolveExactIdentity(row),normalizeQuantity(row.quantity??row.qty)]).filter(([key])=>key));
    const importedMap=new Map(importedRows.map(row=>[resolveExactIdentity(row),normalizeQuantity(row.quantity??row.qty)]).filter(([key])=>key));
    const identities=[...new Set([...beforeMap.keys(),...importedMap.keys()])].sort();
    const differences=identities.filter(key=>beforeMap.get(key)!==importedMap.get(key)).map(identity=>({identity,before:beforeMap.get(identity)||'',imported:importedMap.get(identity)||''}));
    return {beforeCount:beforeRows.length,importedCount:importedRows.length,identities,differences,status:differences.length?'QUANTITY_DIFFERENCE':'MATCH'};
  }

  return {normalizeDate,normalizeMoneyCents,normalizeQuantity,resolveExactIdentity,eventFingerprint,sourceFingerprint,classifyDuplicate,reconcilePositions};
});
