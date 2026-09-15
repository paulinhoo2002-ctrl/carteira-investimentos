/* Read-only brokerage-note and professional reconciliation models.
 * Reuses the Phase 4 identity, preview and reconstruction engines.
 */
(function initBrokerageProfessional(root, factory){
  const reconstruction=root?.HistoricalReconstruction || (typeof require==='function' ? require('./historical-reconstruction.js') : null);
  const foundation=root?.ImportFoundation || (typeof require==='function' ? require('./import-foundation.js') : null);
  const api=factory(reconstruction,foundation);
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.BrokerageProfessional=api;
})(typeof globalThis!=='undefined'?globalThis:this, function createBrokerageProfessional(Reconstruction, Foundation){
  if(!Reconstruction || !Foundation) throw new Error('BROKERAGE_DEPENDENCIES_REQUIRED');
  const clean=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const key=value=>clean(value).toLowerCase().replace(/[^a-z0-9]+/g,'');
  const valueOf=(row,names)=>{
    for(const name of names){
      const found=Object.keys(row||{}).find(item=>key(item)===key(name));
      if(found && row[found]!==undefined && row[found]!==null && String(row[found]).trim()!=='') return row[found];
    }
    return '';
  };
  const money=value=>Foundation.normalizeMoneyCents(value);
  const date=value=>Foundation.normalizeDate(value);

  function brokerFormatAudit(){
    return {Inter:'SUPPORTED',B3:'PARTIAL',XP:'UNKNOWN_FORMAT',BTG:'UNKNOWN_FORMAT',GENERIC:'UNKNOWN_FORMAT'};
  }

  function normalizeOperation(row={}, note={}){
    const operation={
      broker:note.BROKER||note.broker||'',noteIdentity:note.NOTE_IDENTITY||'',tradeDate:date(valueOf(row,['tradeDate','date','data']))||note.TRADE_DATE||'',
      buySell:key(valueOf(row,['buySell','side','operation','operacao','tipo']))==='venda'?'SELL':/venda|sell/.test(key(valueOf(row,['buySell','side','operation','operacao','tipo'])))?'SELL':'BUY',
      assetId:valueOf(row,['assetId','idAtivo']),isin:valueOf(row,['isin']),ticker:valueOf(row,['ticker','symbol','codigo','ativo','security']),
      security:valueOf(row,['security','nome','nomeAtivo','descricao']),quantity:Foundation.normalizeQuantity(valueOf(row,['quantity','qty','quantidade'])),
      unitPrice:money(valueOf(row,['unitPrice','price','preco','precoUnitario'])),grossValue:money(valueOf(row,['grossValue','value','valor','valorOperacao'])),market:valueOf(row,['market','mercado','segmento'])
    };
    operation.identity=Foundation.resolveExactIdentity(operation);
    operation.fingerprint=Foundation.eventFingerprint({source:'BROKERAGE_NOTE_OPERATION',eventType:operation.buySell,date:operation.tradeDate,assetId:operation.assetId,isin:operation.isin,ticker:operation.ticker,quantity:operation.quantity,unitPrice:operation.unitPrice,grossValue:operation.grossValue,documentId:operation.noteIdentity});
    return operation;
  }

  function normalizeNote(raw={}, source={}){
    const broker=String(valueOf(raw,['broker','corretora','instituicao'])||source.broker||'').trim();
    const noteNumber=String(valueOf(raw,['noteNumber','numeroNota','nota','documentId'])||'').trim();
    const tradeDate=date(valueOf(raw,['tradeDate','date','dataPregao','data']))||'';
    const settlementDate=date(valueOf(raw,['settlementDate','dataLiquidacao','liquidacao']))||'';
    const operations=(Array.isArray(raw.operations)?raw.operations:Array.isArray(raw.linhas)?raw.linhas:[]).map(row=>normalizeOperation(row,{BROKER:broker,NOTE_IDENTITY:`${key(broker)}|${noteNumber}|${tradeDate}`,TRADE_DATE:tradeDate}));
    const note={BROKER:broker,BROKER_DOCUMENT_ID:String(valueOf(raw,['brokerDocumentId','documentId','sourceFile'])||source.fileName||''),NOTE_NUMBER:noteNumber,TRADE_DATE:tradeDate,SETTLEMENT_DATE:settlementDate,MARKET:String(valueOf(raw,['market','mercado'])||''),OPERATIONS:operations, GROSS_VALUE:money(valueOf(raw,['grossValue','grossTotal','totalOperacoes'])),FEES_TOTAL:money(valueOf(raw,['feesTotal','fees','taxas'])),TAXES_TOTAL:money(valueOf(raw,['taxesTotal','taxes','irrf','impostos'])),NET_VALUE:money(valueOf(raw,['netValue','netTotal','liquidTotal','totalLiquido'])),SOURCE_FILE_FINGERPRINT:source.fingerprint||''};
    note.NOTE_IDENTITY=`${key(broker)}|${noteNumber}|${tradeDate}`;
    note.CONTENT_FINGERPRINT=Foundation.sourceFingerprint({sourceType:'BROKERAGE_NOTE',broker,fileName:'',documentId:noteNumber,tradeDate,rows:operations});
    return note;
  }

  function classifyNoteDuplicate(note={}, existing=[]){
    const sameIdentity=(Array.isArray(existing)?existing:[]).filter(item=>item.NOTE_IDENTITY===note.NOTE_IDENTITY);
    if(!sameIdentity.length) return 'NEW_NOTE';
    return sameIdentity.some(item=>item.CONTENT_FINGERPRINT===note.CONTENT_FINGERPRINT)?'EXACT_DUPLICATE_NOTE':'CONFLICTING_NOTE';
  }

  function operationDuplicates(operations=[]){
    const seen=new Set(); const duplicates=[];
    (Array.isArray(operations)?operations:[]).forEach(operation=>{ if(seen.has(operation.fingerprint)) duplicates.push(operation); else seen.add(operation.fingerprint); });
    return {uniqueCount:seen.size,duplicateCount:duplicates.length,duplicates,doubleCount:0};
  }

  function auditFees(note={}){
    const feePresent=note.FEES_TOTAL!==null || note.TAXES_TOTAL!==null;
    return {status:feePresent?'NOTE_LEVEL_SUPPORTED':'UNSUPPORTED',feesAtNoteLevel:true,perOperationAllocation:false,allocation:'UNALLOCATED_NOTE_LEVEL',inventedFeeAllocation:0};
  }

  function crossCheckNoteFinancials(note={}){
    const operationGross=note.OPERATIONS.reduce((sum,item)=>sum+(item.grossValue??0),0);
    const reported=note.GROSS_VALUE;
    if(reported===null || note.NET_VALUE===null) return {status:'MISSING_COMPONENT',operationGross,reportedGross:reported,net:note.NET_VALUE};
    const difference=Math.abs(operationGross-reported);
    if(difference>1) return {status:'VALUE_CONFLICT',operationGross,reportedGross:reported,net:note.NET_VALUE,difference};
    if(difference===1) return {status:'ROUNDING_DIFFERENCE',operationGross,reportedGross:reported,net:note.NET_VALUE,difference};
    return {status:'MATCH',operationGross,reportedGross:reported,net:note.NET_VALUE,difference:0};
  }

  function crossCheckNoteSet(note, processed=[]){
    const state=classifyNoteDuplicate(note,processed);
    return {state,NOTE_IDENTITY:note.NOTE_IDENTITY,CONTENT_FINGERPRINT:note.CONTENT_FINGERPRINT,writeEnabled:false};
  }

  function reconcilePositionProfessional({expected=[],b3=[],app=[]}={}){
    const result=Reconstruction.reconcilePositions(expected,b3,app);
    const rows=result.rows.map(row=>({...row,likelyCause:Reconstruction.explainDivergence(row,[]),assetClass:'UNCLASSIFIED'}));
    const summary=rows.reduce((acc,row)=>{acc.TOTAL_ASSETS++; if(row.status==='ALL_MATCH'||row.status==='APP_B3_MATCH'||row.status==='APP_HISTORY_MATCH'||row.status==='B3_HISTORY_MATCH') acc.MATCHED++; if(row.status==='QUANTITY_CONFLICT') acc.QUANTITY_DIFFS++; if(row.status==='IDENTITY_CONFLICT') acc.IDENTITY_DIFFS++; if(row.status==='B3_ONLY') acc.B3_ONLY++; if(row.status==='APP_ONLY') acc.APP_ONLY++; if(row.status==='REVIEW_REQUIRED'||row.status==='INSUFFICIENT_HISTORY') acc.REVIEW_REQUIRED++; return acc;},{TOTAL_ASSETS:0,MATCHED:0,QUANTITY_DIFFS:0,IDENTITY_DIFFS:0,B3_ONLY:0,APP_ONLY:0,REVIEW_REQUIRED:0});
    return {rows,summary,writeEnabled:false};
  }

  function positionProtection(){ return {B3_POSITION_AUTO_OVERWRITE:false,APP_POSITION_AUTO_OVERWRITE:false,AVG_PRICE_AUTO_RECALC:false,CURRENT_POSITION_IS_CANONICAL:true}; }

  function historicalIdentityReview({oldIdentity='',newIdentity='',source='',effectiveDate='',confidence='REVIEW_REQUIRED',reason='No exact canonical mapping supplied'}={}){ return {OLD_IDENTITY:oldIdentity,NEW_IDENTITY:newIdentity,SOURCE:source,EFFECTIVE_DATE:effectiveDate,CONFIDENCE:confidence,REVIEW_REASON:reason,autoMerge:false}; }

  function eventGraph({notes=[],movements=[],appTransactions=[],positions=[],income=[]}={}){
    const records=[['BROKER_NOTE',notes],['B3_MOVEMENT',movements],['APP_TRANSACTION',appTransactions],['CURRENT_POSITION',positions],['INCOME_EVENT',income]];
    const nodes=[]; const groups=new Map();
    records.forEach(([source,items])=>(Array.isArray(items)?items:[]).forEach(raw=>{const event={...raw,source}; const fingerprint=Reconstruction.economicEventFingerprint(event); nodes.push({source,event,fingerprint}); if(!groups.has(fingerprint)) groups.set(fingerprint,[]); groups.get(fingerprint).push({source,event});}));
    return {nodes,links:[...groups.entries()].filter(([,items])=>items.length>1).map(([fingerprint,items])=>({fingerprint,items})),sameEconomicEventCountedOnce:true,persistent:false};
  }

  function severity(conflict={}){
    if(conflict.type==='NOTE_IDENTITY_CONTENT') return 'CRITICAL';
    if(conflict.type==='WRONG_ASSET_IDENTITY') return 'CRITICAL';
    if(conflict.type==='QUANTITY_MISMATCH') return 'HIGH';
    if(conflict.type==='POSSIBLE_DUPLICATE') return 'MEDIUM';
    if(conflict.type==='METADATA_DIFFERENCE') return 'LOW';
    return 'INFO';
  }

  function professionalSummary({sourceFiles=[],period='',parsedRecords=0,verifiedRecords=0,newRecords=0,exactDuplicates=0,possibleDuplicates=0,identityConflicts=0,positionDifferences=0,incomeDifferences=0,unsupportedEvents=0,criticalConflicts=0}={}){ return {SOURCE_FILES:sourceFiles,PERIOD:period,PARSED_RECORDS:parsedRecords,VERIFIED_RECORDS:verifiedRecords,NEW_RECORDS:newRecords,EXACT_DUPLICATES:exactDuplicates,POSSIBLE_DUPLICATES:possibleDuplicates,IDENTITY_CONFLICTS:identityConflicts,POSITION_DIFFERENCES:positionDifferences,INCOME_DIFFERENCES:incomeDifferences,UNSUPPORTED_EVENTS:unsupportedEvents,CRITICAL_CONFLICTS:criticalConflicts,WHAT_WILL_CHANGE:0}; }

  function readinessMatrix(){ return {exactIdentity:'PASS',idempotency:'PASS',duplicateProtection:'PASS',backupSnapshot:'PROTECTED_SCOPE',preview:'PASS',confirmation:'FUTURE_UI_REQUIRED',rollback:'DESIGN_ONLY',auditTrail:'READ_ONLY_MODEL',postWriteReconciliation:'FUTURE_WRITE_REQUIRED',wrongRecordProtection:'PASS',writeEnabled:false}; }
  function rollbackDesign(){ return ['PRE_IMPORT_SNAPSHOT','IMPORT_SESSION','USER_CONFIRMATION','ATOMIC_OR_BATCHED_WRITE','POST_IMPORT_RECONCILIATION','SUCCESS_REPORT','ROLLBACK_CAPABILITY'].map((step,index)=>({step,state:index<3?'DESIGN_READY':'PROTECTED_SCOPE'})); }
  function reportingFoundation(){
    const types=['PORTFOLIO_EXECUTIVE','CURRENT_POSITION','DIVIDENDS','PERFORMANCE','PATRIMONY','REBALANCE','IRPF','IMPORT_RECONCILIATION'];
    return types.map(type=>({type,title:type.replaceAll('_',' '),period:'existing supported periods',kpis:'canonical snapshot KPIs',tables:'existing report tables',charts:'supported charts only',notes:'source and missing-data notes',dataSource:type==='IMPORT_RECONCILIATION'?'read-only reconciliation model':'existing canonical report snapshot',missingDataRules:'explicit missing values; no fabrication',pdfReadyState:type==='IMPORT_RECONCILIATION'?'FOUNDATION_READY':'NEEDS_UI'}));
  }
  function exportContract(){ return {PDF_IS_BACKUP:false,JSON_IS_TECHNICAL_BACKUP:true,PDF:'human-readable report',CSV_XLSX:'analysis/export',JSON:'technical backup'}; }
  function pdfApproach(){ return {recommended:'HTML/CSS print layout + browser-native print/PDF',heavyDependency:false,reason:'existing safe browser capability and report renderers'}; }
  function brokerNoteReport(note,validation={}){ return {broker:note.BROKER,noteNumber:note.NOTE_NUMBER,tradeDate:note.TRADE_DATE,operations:note.OPERATIONS,grossTotal:note.GROSS_VALUE,fees:note.FEES_TOTAL,netTotal:note.NET_VALUE,validationStatus:validation.status||'READ_ONLY',duplicates:validation.duplicates||[],conflicts:validation.conflicts||[],writeEnabled:false}; }
  function reconciliationReport(data={}){ return {appCurrentPosition:data.app||[],b3CurrentPosition:data.b3||[],expectedHistoricalPosition:data.expected||[],differences:data.differences||[],likelyCauses:data.likelyCauses||[],confidence:data.confidence||'REVIEW_REQUIRED',reviewRequired:true,writeEnabled:false}; }

  return {brokerFormatAudit,normalizeOperation,normalizeNote,classifyNoteDuplicate,operationDuplicates,auditFees,crossCheckNoteFinancials,crossCheckNoteSet,reconcilePositionProfessional,positionProtection,historicalIdentityReview,eventGraph,severity,professionalSummary,readinessMatrix,rollbackDesign,reportingFoundation,exportContract,pdfApproach,brokerNoteReport,reconciliationReport};
});
