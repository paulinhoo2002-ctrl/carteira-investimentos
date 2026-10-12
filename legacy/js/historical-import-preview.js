/* Read-only historical B3 import preview.
 * Reuses ImportFoundation for identity and fingerprints. Never writes data.
 */
(function initHistoricalImportPreview(root, factory){
  const foundation=root?.ImportFoundation || (typeof require==='function' ? require('./import-foundation.js') : null);
  const api=factory(foundation);
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.HistoricalImportPreview=api;
})(typeof globalThis!=='undefined'?globalThis:this, function createHistoricalImportPreview(Foundation){
  if(!Foundation) throw new Error('IMPORT_FOUNDATION_REQUIRED');

  const clean=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const key=value=>clean(value).toLowerCase().replace(/[^a-z0-9]+/g,'');
  const rowValue=(row, aliases)=>{
    for(const alias of aliases){
      const found=Object.keys(row||{}).find(name=>key(name)===key(alias));
      if(found && row[found]!==undefined && row[found]!==null && String(row[found]).trim()!=='') return row[found];
    }
    return '';
  };
  const normalizeMoney=value=>Foundation.normalizeMoneyCents(value);
  const normalizeDate=value=>Foundation.normalizeDate(value);
  const normalizeQty=value=>Foundation.normalizeQuantity(value);
  const identityOf=row=>Foundation.resolveExactIdentity(row);
  const tickerFromProduct=value=>{
    const match=String(value??'').trim().match(/^([A-Z]{4,6}\d{1,2})\s*[-–]/i);
    return match?match[1].toUpperCase():'';
  };
  const exactTicker=row=>{
    const explicit=rowValue(row,['ticker','codigo','codigoNegociacao','symbol']);
    return String(explicit||tickerFromProduct(rowValue(row,['product','produto','ativo','security']))).trim().toUpperCase();
  };

  function detectSourceFormat(source={}){
    const name=key(source.fileName||source.name);
    const headers=(source.headers||[]).map(key);
    if(/pdf$/.test(name) || source.mime==='application/pdf') return 'BROKER_NOTE_PDF';
    if(/provento|rendimento|dividendo/.test(name) || headers.some(h=>/provento|rendimento|dividendo|pagamento/.test(h))) return 'B3_DIVIDENDS_XLSX';
    if(/moviment/.test(name) || headers.some(h=>/moviment|entrada|saida|operacao/.test(h))) return 'B3_MOVEMENTS_XLSX';
    if(/posicao|custodia/.test(name) || headers.some(h=>/posicao|custodia|quantidade/.test(h))) return 'B3_POSITION_XLSX';
    return 'UNKNOWN';
  }

  function canonicalIncomeType(value){
    const text=key(value);
    if(/dividend/.test(text)) return 'DIVIDEND';
    if(/jcp|jurossobrecapital/.test(text)) return 'JCP';
    if(/fiirendimento|rendimentofii/.test(text)) return 'FII_RENDIMENTO';
    if(/outroprovento|otherincome/.test(text)) return 'OTHER_SUPPORTED_CANONICAL_INCOME';
    return '';
  }

  function normalizeDividendEvent(row={}, source={}){
    const eventType=canonicalIncomeType(rowValue(row,['eventType','type','tipo','tipoEvento','natureza','provento']));
    const date=normalizeDate(rowValue(row,['date','data','dataPagamento','paymentDate']));
    const identityRecord={
      assetId:rowValue(row,['assetId','idAtivo']),
      isin:rowValue(row,['isin']),
      ticker:exactTicker(row),
      security:rowValue(row,['security','ativo','nome','nomeAtivo'])
    };
    const event={
      source:source.sourceType||source.source||'B3',
      sourceDocument:source.fileName||source.documentId||'',
      date,
      assetId:identityRecord.assetId,
      isin:identityRecord.isin,
      ticker:identityRecord.ticker,
      security:identityRecord.security,
      eventType,
      quantity:normalizeQty(rowValue(row,['quantity','qty','quantidade'])),
      unitPrice:normalizeMoney(rowValue(row,['unitPrice','valorUnitario','valorPorCota'])),
      grossValue:normalizeMoney(rowValue(row,['grossValue','gross','value','valorBruto','valor'])),
      netValue:normalizeMoney(rowValue(row,['netValue','net','valorLiquido'])),
      institution:rowValue(row,['institution','instituicao','broker','corretora'])
    };
    const identity=identityOf(event);
    const reasons=[];
    if(!eventType) reasons.push('UNSUPPORTED_EVENT_TYPE');
    if(!date) reasons.push('INVALID_DATE');
    if(!identity) reasons.push('UNKNOWN_ASSET');
    if(event.grossValue===null && event.netValue===null) reasons.push('MISSING_VALUE');
    const state=reasons.length ? (reasons.includes('UNSUPPORTED_EVENT_TYPE') ? 'UNSUPPORTED' : 'REVIEW_REQUIRED') : 'NEW';
    return {...event,identity,reasons,state,fingerprint:Foundation.eventFingerprint(event)};
  }

  function classifyDividendDuplicate(event, {batch=[], existing=[], previousFingerprints=[]}={}){
    if(previousFingerprints.includes(event.fingerprint) || existing.some(item=>String(item?.fingerprint||Foundation.eventFingerprint(item))===event.fingerprint)) return 'EXACT_DUPLICATE';
    if(batch.some(item=>item.fingerprint===event.fingerprint)) return 'EXACT_DUPLICATE';
    const result=Foundation.classifyDuplicate(event,existing);
    if(result.state==='IDENTITY_CONFLICT'||result.state==='POSSIBLE_DUPLICATE') return result.state;
    return event.state;
  }

  function sourceIdempotency(source={}, processed=[]){
    const fingerprint=Foundation.sourceFingerprint(source);
    const contentFingerprint=Foundation.sourceFingerprint({...source,fileName:''});
    const known=(Array.isArray(processed)?processed:[]).map(item=>typeof item==='string'?item:String(item?.fingerprint||''));
    const knownContent=(Array.isArray(processed)?processed:[]).map(item=>String(item?.contentFingerprint||''));
    return {fingerprint,contentFingerprint,state:known.includes(fingerprint)||knownContent.includes(contentFingerprint)?'ALREADY_PROCESSED':'NEW'};
  }

  function previewDividendImport({source={},rows=[],existing=[],previousFingerprints=[],processedSources=[]}={}){
    const normalized=[]; const counts={NEW:0,EXACT_DUPLICATE:0,POSSIBLE_DUPLICATE:0,REVIEW_REQUIRED:0,UNSUPPORTED:0};
    const batch=[];
    for(const row of (Array.isArray(rows)?rows:[])){
      const event=normalizeDividendEvent(row,source);
      const duplicate=classifyDividendDuplicate(event,{batch,existing,previousFingerprints});
      const state=duplicate==='EXACT_DUPLICATE'||duplicate==='POSSIBLE_DUPLICATE' ? duplicate : event.state;
      const item={...event,state};
      normalized.push(item);
      counts[state]=(counts[state]||0)+1;
      if(state==='NEW') batch.push(item);
    }
    const months=new Map(); const years=new Map(); const assets=new Map();
    normalized.filter(item=>item.state==='NEW').forEach(item=>{
      const value=item.netValue??item.grossValue;
      if(value===null || !item.date) return;
      const year=item.date.slice(0,4); const month=item.date.slice(0,7);
      months.set(month,(months.get(month)||0)+value); years.set(year,(years.get(year)||0)+value); assets.set(item.identity,(assets.get(item.identity)||0)+value);
    });
    const sourceStatus=sourceIdempotency(source,processedSources);
    return {
      importSource:source.fileName||source.sourceType||'unknown',
      sourceType:source.sourceType||detectSourceFormat(source),
      sourcePeriod:source.period||'', parsed:normalized.length, valid:normalized.filter(i=>i.state!=='UNSUPPORTED'&&i.reasons.indexOf('INVALID_DATE')<0).length,
      counts, newRecords:normalized.filter(i=>i.state==='NEW'), ignoredDuplicates:normalized.filter(i=>i.state==='EXACT_DUPLICATE'), possibleDuplicates:normalized.filter(i=>i.state==='POSSIBLE_DUPLICATE'), conflicts:normalized.filter(i=>i.state==='IDENTITY_CONFLICT'), unsupported:normalized.filter(i=>i.state==='UNSUPPORTED'), reviewRequired:normalized.filter(i=>i.state==='REVIEW_REQUIRED'),
      monthlyTotals:[...months.entries()].sort(), yearlyTotals:[...years.entries()].sort(), assetTotals:[...assets.entries()].sort(), sourceStatus, whatWillChange:0, writeEnabled:false
    };
  }

  function reconcileDividendHistory(preview, existing=[]){
    const sourceRows=Array.isArray(preview?.newRecords)?preview.newRecords:[];
    const appRows=(Array.isArray(existing)?existing:[]).map(row=>normalizeDividendEvent(row,{sourceType:'APP'}));
    const sourceMap=new Map(sourceRows.map(row=>[`${row.date}|${row.identity}|${row.eventType}`,row]));
    const appMap=new Map(appRows.map(row=>[`${row.date}|${row.identity}|${row.eventType}`,row]));
    const keys=[...new Set([...sourceMap.keys(),...appMap.keys()])].sort();
    const rows=keys.map(keyValue=>{
      const source=sourceMap.get(keyValue); const app=appMap.get(keyValue);
      if(!app) return {key:keyValue,status:'APP_MISSING_EVENT',source,app:null};
      if(!source) return {key:keyValue,status:'SOURCE_MISSING_EVENT',source:null,app};
      const sourceValue=source.netValue??source.grossValue; const appValue=app.netValue??app.grossValue;
      return {key:keyValue,status:sourceValue===appValue?'MATCH':'VALUE_DIFFERENCE',source,app};
    });
    return {status:rows.every(row=>row.status==='MATCH')?'MATCH':'REVIEW_REQUIRED',rows,counts:rows.reduce((acc,row)=>{acc[row.status]=(acc[row.status]||0)+1;return acc;},{})};
  }

  function classifyMovement(row={}){
    const text=key(rowValue(row,['movement','movimento','movimentacao','tipo','operation','operacao']));
    if(/transfer|custodia/.test(text)) return {classification:'TRANSFER',state:'REVIEW_REQUIRED',destination:'CUSTODY_HISTORY'};
    if(/emprestimo|aluguel/.test(text)) return {classification:'LENDING',state:'INFORMATIONAL',destination:'CUSTODY_HISTORY'};
    if(/subscricao|direito/.test(text)) return {classification:'SUBSCRIPTION',state:'REVIEW_REQUIRED',destination:'CORPORATE_EVENTS'};
    if(/bonificacao|desdobro|grupamento|cisao|fusa/.test(text)) return {classification:'CORPORATE_EVENT',state:'REVIEW_REQUIRED',destination:'CORPORATE_EVENTS'};
    if(/dividend|jcp|rendimento|provento/.test(text)) return {classification:'INCOME',state:'PREVIEW_ONLY',destination:'INCOME_HISTORY'};
    if(/compra|venda|aplica|resgate/.test(text)) return {classification:'BUY_SELL_CANDIDATE',state:'PREVIEW_ONLY',destination:'TRANSACTION_HISTORY'};
    if(/ajuste|saldo/.test(text)) return {classification:'CUSTODY_ADJUSTMENT',state:'REVIEW_REQUIRED',destination:'CUSTODY_HISTORY'};
    return {classification:'UNKNOWN',state:'REVIEW_REQUIRED',destination:'REVIEW_REQUIRED'};
  }

  function reconcileCurrentPosition({b3=[],app=[]}={}){
    const b3Map=new Map((Array.isArray(b3)?b3:[]).map(row=>[identityOf(row),row]).filter(([id])=>id));
    const appMap=new Map((Array.isArray(app)?app:[]).map(row=>[identityOf(row),row]).filter(([id])=>id));
    const identities=[...new Set([...b3Map.keys(),...appMap.keys()])].sort();
    const rows=identities.map(identity=>{
      const left=b3Map.get(identity); const right=appMap.get(identity);
      if(!right) return {identity,status:'B3_ONLY',b3:left,app:null};
      if(!left) return {identity,status:'APP_ONLY',b3:null,app:right};
      const b3Qty=normalizeQty(left.quantity??left.qty); const appQty=normalizeQty(right.quantity??right.qty);
      const b3Class=clean(left.type||left.class||''); const appClass=clean(right.type||right.class||'');
      if(b3Class && appClass && key(b3Class)!==key(appClass)) return {identity,status:'IDENTITY_CONFLICT',b3:left,app:right};
      if(b3Qty!==appQty) return {identity,status:'QUANTITY_DIFFERENCE',b3:left,app:right};
      return {identity,status:'MATCH',b3:left,app:right};
    });
    const summary={TOTAL_B3_ASSETS:b3Map.size,TOTAL_APP_ASSETS:appMap.size,MATCHED:0,QUANTITY_DIFFERENCES:0,B3_ONLY:0,APP_ONLY:0,IDENTITY_CONFLICTS:0};
    rows.forEach(row=>{ if(row.status==='MATCH') summary.MATCHED++; if(row.status==='QUANTITY_DIFFERENCE') summary.QUANTITY_DIFFERENCES++; if(row.status==='B3_ONLY') summary.B3_ONLY++; if(row.status==='APP_ONLY') summary.APP_ONLY++; if(row.status==='IDENTITY_CONFLICT') summary.IDENTITY_CONFLICTS++; });
    return {status:rows.every(row=>row.status==='MATCH')?'MATCH':'REVIEW_REQUIRED',summary,rows,writeEnabled:false};
  }

  function crossCheckBrokerNote(note={},existing=[]){
    const identity=String(note.noteNumber||note.documentId||'');
    const date=normalizeDate(note.tradeDate||note.date);
    const broker=clean(note.broker||note.institution);
    const duplicate=existing.some(item=>String(item.noteNumber||item.documentId||'')===identity && normalizeDate(item.tradeDate||item.date)===date && key(item.broker||item.institution)===key(broker));
    return {broker,noteNumber:identity,tradeDate:date,operations:Array.isArray(note.operations)?note.operations:[],state:duplicate?'EXACT_DUPLICATE':'NEW',noteIdentitySupported:Boolean(identity&&date&&broker),writeEnabled:false};
  }

  function buildImportReportModel(preview, generatedAt=''){
    return {reportType:'IMPORT_RECONCILIATION',source:preview?.importSource||'',generatedAt,period:preview?.sourcePeriod||'',parsed:preview?.parsed||0,newCount:preview?.counts?.NEW||0,duplicateCount:(preview?.counts?.EXACT_DUPLICATE||0)+(preview?.counts?.POSSIBLE_DUPLICATE||0),reviewCount:preview?.counts?.REVIEW_REQUIRED||0,unsupportedCount:preview?.counts?.UNSUPPORTED||0,monthlyTotals:preview?.monthlyTotals||[],yearlyTotals:preview?.yearlyTotals||[],assetTotals:preview?.assetTotals||[],reconciliationStatus:'READ_ONLY',writeEnabled:false};
  }

  function pdfReportReadinessMatrix(){
    return ['PORTFOLIO_EXECUTIVE','CURRENT_POSITION','DIVIDENDS','PERFORMANCE','PATRIMONY','REBALANCE','IRPF','IMPORT_RECONCILIATION'].map(type=>({type,dataSource:type==='IMPORT_RECONCILIATION'?'read-only import preview':'existing canonical report snapshot',periodSupport:'existing product period support',tables:'existing renderer tables',charts:'existing charts where supported',notes:'PDF export requires existing safe report path',pdfReadiness:'FOUNDATION_READY'}));
  }

  return {detectSourceFormat,canonicalIncomeType,normalizeDividendEvent,previewDividendImport,reconcileDividendHistory,classifyMovement,sourceIdempotency,reconcileCurrentPosition,crossCheckBrokerNote,buildImportReportModel,pdfReportReadinessMatrix};
});
