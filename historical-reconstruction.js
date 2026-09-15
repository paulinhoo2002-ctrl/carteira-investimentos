/* Read-only cross-source historical reconstruction.
 * Reuses HistoricalImportPreview and ImportFoundation. No persistence or writes.
 */
(function initHistoricalReconstruction(root, factory){
  const preview=root?.HistoricalImportPreview || (typeof require==='function' ? require('./historical-import-preview.js') : null);
  const foundation=root?.ImportFoundation || (typeof require==='function' ? require('./import-foundation.js') : null);
  const api=factory(preview,foundation);
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.HistoricalReconstruction=api;
})(typeof globalThis!=='undefined'?globalThis:this, function createHistoricalReconstruction(Preview, Foundation){
  if(!Preview || !Foundation) throw new Error('HISTORICAL_IMPORT_DEPENDENCIES_REQUIRED');
  const clean=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const key=value=>clean(value).toLowerCase().replace(/[^a-z0-9]+/g,'');
  const valueOf=(row, names)=>{
    for(const name of names){
      const found=Object.keys(row||{}).find(item=>key(item)===key(name));
      if(found && row[found]!==undefined && row[found]!==null && String(row[found]).trim()!=='') return row[found];
    }
    return '';
  };
  const identity=row=>Foundation.resolveExactIdentity(row||{});
  const qty=row=>Foundation.normalizeQuantity(valueOf(row,['quantity','qty','quantidade']));
  const num=value=>Number(Foundation.normalizeQuantity(value)||0);
  const money=row=>Foundation.normalizeMoneyCents(valueOf(row,['value','grossValue','gross','netValue','net','valor']));
  const date=row=>Foundation.normalizeDate(valueOf(row,['date','tradeDate','paymentDate','data']));

  function classifyMovement(row={}){
    const text=key(valueOf(row,['movement','movimento','movimentacao','type','tipo','operation','operacao']));
    const entry=key(valueOf(row,['entryExit','entradaSaida','creditDebit','creditoDebito']));
    const incoming=entry==='entrada'||entry==='credito'||/entrada|in\b/.test(text);
    if(/transfer|custodia/.test(text)) return {classification:incoming?'TRANSFER_IN':'TRANSFER_OUT',confidence:'REVIEW_REQUIRED',positionImpact:0,domain:'CUSTODY_HISTORY'};
    if(/emprestimo|aluguel/.test(text)) return {classification:incoming?'LENDING_IN':'LENDING_OUT',confidence:'REVIEW_REQUIRED',positionImpact:0,domain:'CUSTODY_HISTORY'};
    if(/direito.*subscr|subscricao.*direito/.test(text)) return {classification:'SUBSCRIPTION_RIGHT',confidence:'REVIEW_REQUIRED',positionImpact:0,domain:'CORPORATE_EVENT_HISTORY'};
    if(/subscricao|exercicio/.test(text)) return {classification:'SUBSCRIPTION_EXECUTION',confidence:'REVIEW_REQUIRED',positionImpact:0,domain:'CORPORATE_EVENT_HISTORY'};
    if(/bonificacao|desdobro|grupamento|cisao|fusa|incorpor/.test(text)) return {classification:'CORPORATE_EVENT',confidence:'REVIEW_REQUIRED',positionImpact:0,domain:'CORPORATE_EVENT_HISTORY'};
    if(/dividend|jcp|rendimento|provento/.test(text)) return {classification:'INCOME',confidence:'EXACT_SUPPORTED',positionImpact:0,domain:'INCOME_HISTORY'};
    if(/compra|buy/.test(text)) return {classification:'BUY',confidence:'HIGH_CONFIDENCE',positionImpact:1,domain:'TRANSACTION_HISTORY'};
    if(/venda|sell|resgate/.test(text)) return {classification:'SELL',confidence:'HIGH_CONFIDENCE',positionImpact:-1,domain:'TRANSACTION_HISTORY'};
    if(/ajuste|saldo/.test(text)) return {classification:'CUSTODY_ADJUSTMENT',confidence:'REVIEW_REQUIRED',positionImpact:0,domain:'CUSTODY_HISTORY'};
    return {classification:'UNKNOWN',confidence:'UNKNOWN',positionImpact:0,domain:'IMPORT_AUDIT'};
  }

  function normalizeMovement(row={}, source='B3'){
    const classification=classifyMovement(row);
    const event={source,eventType:classification.classification,date:date(row),ticker:valueOf(row,['ticker','symbol','codigo','produto']),isin:valueOf(row,['isin']),assetId:valueOf(row,['assetId','idAtivo']),quantity:qty(row),unitPrice:Foundation.normalizeMoneyCents(valueOf(row,['unitPrice','price','preco','precoUnitario'])),grossValue:money(row),documentId:valueOf(row,['documentId','noteNumber','numeroNota']),institution:valueOf(row,['broker','brokerage','corretora','instituicao'])};
    return {...event,identity:identity(event),classification:classification.classification,confidence:classification.confidence,positionImpact:classification.positionImpact,domain:classification.domain,verified:classification.confidence==='EXACT_SUPPORTED'||classification.confidence==='HIGH_CONFIDENCE',fingerprint:Foundation.eventFingerprint(event)};
  }

  function economicEventFingerprint(event={}){
    return Foundation.eventFingerprint({...event,source:'ECONOMIC_EVENT',institution:'',documentId:'',noteNumber:''});
  }

  function crossSourceMatch(a=[],b=[]){
    const left=(Array.isArray(a)?a:[]).map(event=>({...normalizeMovement(event,event.source||'SOURCE_A'),source:'SOURCE_A'}));
    const right=(Array.isArray(b)?b:[]).map(event=>({...normalizeMovement(event,event.source||'SOURCE_B'),source:'SOURCE_B'}));
    const rightByEconomic=new Map(right.map(event=>[economicEventFingerprint(event),event]));
    const used=new Set(); const rows=[];
    left.forEach(event=>{
      const fp=economicEventFingerprint(event); const match=rightByEconomic.get(fp);
      if(match){ used.add(fp); rows.push({status:'EXACT_CROSS_SOURCE_MATCH',sourceA:event,sourceB:match}); return; }
      const partial=right.find(candidate=>candidate.identity===event.identity && candidate.date===event.date && candidate.classification===event.classification);
      if(partial){ used.add(economicEventFingerprint(partial)); rows.push({status:'PARTIAL_MATCH',sourceA:event,sourceB:partial}); return; }
      rows.push({status:'B3_ONLY',sourceA:event,sourceB:null});
    });
    right.forEach(event=>{ const fp=economicEventFingerprint(event); if(!used.has(fp) && !left.some(item=>economicEventFingerprint(item)===fp)) rows.push({status:'NOTE_ONLY',sourceA:null,sourceB:event}); });
    return {rows,counts:rows.reduce((acc,row)=>{acc[row.status]=(acc[row.status]||0)+1;return acc;},{})};
  }

  function deduplicateEconomicEvents(sources=[]){
    const groups=new Map();
    (Array.isArray(sources)?sources:[]).forEach(source=>{
      (Array.isArray(source.events)?source.events:[]).forEach(raw=>{
        const event=normalizeMovement(raw,source.source||'SOURCE'); const fp=economicEventFingerprint(event);
        if(!groups.has(fp)) groups.set(fp,[]); groups.get(fp).push(event);
      });
    });
    const entries=[...groups.entries()].map(([fingerprint,events])=>({fingerprint,events,state:events.length>1?'POSSIBLE_DUPLICATE':'NEW'}));
    return {groups:entries,doubleCount:entries.reduce((sum,item)=>sum+Math.max(0,item.events.length-1),0),economicEventDoubleCount:0};
  }

  function expectedPositionFromVerifiedHistory(events=[]){
    const positions=new Map(); const excluded=[];
    for(const raw of (Array.isArray(events)?events:[])){
      const event=raw.classification?raw:normalizeMovement(raw,raw.source||'B3');
      if(!event.verified || !['BUY','SELL'].includes(event.classification) || !event.identity || !event.quantity){ excluded.push(event); continue; }
      const current=num(positions.get(event.identity)||0); const next=current+(event.classification==='BUY'?num(event.quantity):-num(event.quantity));
      positions.set(event.identity,Number(next.toFixed(8)));
    }
    return {positions:[...positions.entries()].filter(([,value])=>value!==0).sort(),verifiedEvents:(Array.isArray(events)?events:[]).length-excluded.length,excluded,unverifiedEventPositionImpact:0,writeEnabled:false};
  }

  function reconcilePositions(expected=[], b3=[], app=[]){
    const map=rows=>new Map((Array.isArray(rows)?rows:[]).map(row=>Array.isArray(row)?row:[identity(row),num(qty(row))]).filter(([id])=>id));
    const expectedMap=map(expected); const b3Map=map(b3); const appMap=map(app); const ids=[...new Set([...expectedMap.keys(),...b3Map.keys(),...appMap.keys()])].sort();
    const rows=ids.map(id=>{
      const h=expectedMap.get(id); const b=b3Map.get(id); const a=appMap.get(id); const same=(x,y)=>x!==undefined&&y!==undefined&&x===y;
      let status='REVIEW_REQUIRED';
      if(same(h,b)&&same(b,a)) status='ALL_MATCH';
      else if(same(a,b)&&h!==undefined) status='APP_B3_MATCH_HISTORY_DIFFERS';
      else if(same(h,b)&&a!==undefined) status='HISTORY_B3_MATCH_APP_DIFFERS';
      else if(same(h,a)&&b!==undefined) status='HISTORY_APP_MATCH_B3_DIFFERS';
      else if(h!==undefined&&b!==undefined&&a!==undefined) status='QUANTITY_CONFLICT';
      else if(h===undefined || b===undefined || a===undefined) status='INSUFFICIENT_HISTORY';
      return {identity:id,status,expected:h,b3:b,app:a};
    });
    return {rows,summary:rows.reduce((acc,row)=>{acc[row.status]=(acc[row.status]||0)+1;return acc;},{}),writeEnabled:false};
  }

  function explainDivergence(row, events=[]){
    if(row.status==='ALL_MATCH') return 'Sem divergência.';
    const related=(Array.isArray(events)?events:[]).filter(event=>event.identity===row.identity);
    const classes=new Set(related.map(event=>event.classification));
    if(classes.has('TRANSFER_IN')||classes.has('TRANSFER_OUT')) return 'Transferência/custódia pode explicar a diferença; revisar manualmente.';
    if(classes.has('LENDING_IN')||classes.has('LENDING_OUT')) return 'Empréstimo de ativos é informacional e não foi usado na posição esperada.';
    if(classes.has('CORPORATE_EVENT')||classes.has('SUBSCRIPTION_EXECUTION')) return 'Evento corporativo ou subscrição requer evidência específica.';
    if(!related.length) return 'Possível lacuna de fonte, nota ou registro manual no app.';
    return 'Histórico disponível não explica integralmente a divergência.';
  }

  function coverage(events=[], incomeEvents=[]){
    const all=[...(Array.isArray(events)?events:[]),...(Array.isArray(incomeEvents)?incomeEvents:[])].filter(event=>event.date);
    const dates=all.map(event=>event.date).sort(); const verified=all.filter(event=>event.verified||event.state==='NEW'); const reviews=all.filter(event=>event.confidence==='REVIEW_REQUIRED'||event.state==='REVIEW_REQUIRED'); const unknown=all.filter(event=>event.confidence==='UNKNOWN'||event.state==='UNSUPPORTED');
    return {DATE_RANGE:dates.length?`${dates[0]}..${dates[dates.length-1]}`:'',TOTAL_EVENTS:all.length,VERIFIED_EVENTS:verified.length,REVIEW_EVENTS:reviews.length,UNKNOWN_EVENTS:unknown.length,POSITION_COVERAGE_PERCENT:all.length?Math.round((verified.length/all.length)*100):0,INCOME_COVERAGE_PERCENT:(Array.isArray(incomeEvents)&&incomeEvents.length)?Math.round(incomeEvents.filter(event=>event.state==='NEW'||event.verified).length/incomeEvents.length*100):0};
  }

  function buildConflictReview(items=[]){
    return (Array.isArray(items)?items:[]).map((item,index)=>({CONFLICT_ID:`conflict-${index+1}`,SOURCE_A:item.sourceA?.source||'SOURCE_A',SOURCE_B:item.sourceB?.source||'SOURCE_B',ASSET:item.sourceA?.identity||item.sourceB?.identity||'',DATE:item.sourceA?.date||item.sourceB?.date||'',FIELD:item.field||'event',VALUE_A:item.sourceA?.value??item.sourceA?.quantity??'',VALUE_B:item.sourceB?.value??item.sourceB?.quantity??'',CONFIDENCE:item.status==='EXACT_CROSS_SOURCE_MATCH'?'HIGH':'REVIEW_REQUIRED',SUGGESTED_REVIEW_REASON:item.reason||'Comparar as fontes antes de qualquer gravação.'}));
  }

  function buildImportSession({sessionId='read-only-session',files=[],sourceTypes=[],period='',parsed=0,verified=0,duplicates=0,conflicts=0,unknown=0,positionDiffs=[],incomeDiffs=[]}={}){ return {SESSION_ID:sessionId,FILES:files,SOURCE_TYPES:sourceTypes,PERIOD:period,PARSED:parsed,VERIFIED:verified,DUPLICATES:duplicates,CONFLICTS:conflicts,UNKNOWN:unknown,POSITION_DIFFS:positionDiffs,INCOME_DIFFS:incomeDiffs,persistent:false}; }

  function buildReconciliationReport({period='',sources=[],coverage:coverageData={},eventCounts={},duplicates={},conflicts=[],positionComparison={},incomeComparison={},unsupportedEvents=[],warnings=[]}={}){ return {period,sources,coverage:coverageData,eventCounts,duplicateSummary:duplicates,conflictSummary:conflicts,positionComparison,incomeComparison,unsupportedEvents,warnings,reportType:'IMPORT_RECONCILIATION',writeEnabled:false}; }

  function corporateEventSupportMap(){ return {splits:'UNSUPPORTED',reverseSplits:'UNSUPPORTED',bonifications:'PARTIALLY_SUPPORTED',tickerChanges:'UNSUPPORTED',mergers:'UNSUPPORTED',spinOffs:'UNSUPPORTED',subscription:'REVIEW_REQUIRED',amortization:'REVIEW_REQUIRED',capitalReturn:'REVIEW_REQUIRED'}; }
  function historicalIdentityMappingStatus(){ return {status:'NO_AUTOMATIC_MAPPING',documentedMappings:[],unsupportedMappings:['ticker change','security migration','class migration']}; }

  return {classifyMovement,normalizeMovement,economicEventFingerprint,crossSourceMatch,deduplicateEconomicEvents,expectedPositionFromVerifiedHistory,reconcilePositions,explainDivergence,coverage,buildConflictReview,buildImportSession,buildReconciliationReport,corporateEventSupportMap,historicalIdentityMappingStatus};
});
