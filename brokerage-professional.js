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
  const safeMoney=value=>{if(value===undefined||value===null||String(value).trim()==='') return null;const cents=money(value);return Number.isSafeInteger(cents)?cents:null;};
  const date=value=>Foundation.normalizeDate(value);

  function brokerFormatAudit(){
    return {Inter:'SUPPORTED',B3:'PARTIAL',XP:'UNKNOWN_FORMAT',BTG:'UNKNOWN_FORMAT',GENERIC:'UNKNOWN_FORMAT'};
  }

  function normalizeOperation(row={}, note={}){
    const rawSide=String(valueOf(row,['buySell','side','operation','operacao','tipo']));
    const quantityRaw=valueOf(row,['quantity','qty','quantidade']);
    const sideKey=key(rawSide);
    const side=/^(venda|sell)$/.test(sideKey)?'SELL':/^(compra|buy)$/.test(sideKey)?'BUY':'UNKNOWN';
    const operation={
      broker:note.BROKER||note.broker||'',noteIdentity:note.NOTE_IDENTITY||'',tradeDate:date(valueOf(row,['tradeDate','date','data']))||note.TRADE_DATE||'',
      buySell:side,sideRaw:rawSide,
      assetId:valueOf(row,['assetId','idAtivo']),isin:valueOf(row,['isin']),ticker:valueOf(row,['ticker','symbol','codigo','ativo']),
      security:valueOf(row,['security','nome','nomeAtivo','descricao']),quantityRaw,quantity:Foundation.normalizeQuantity(quantityRaw),
      unitPrice:money(valueOf(row,['unitPrice','price','preco','precoUnitario'])),grossValue:money(valueOf(row,['grossValue','total','value','valor','valorOperacao'])),market:valueOf(row,['market','mercado','segmento']),
      settlementDate:date(valueOf(row,['settlementDate','dataLiquidacao']))||note.SETTLEMENT_DATE||'',
      executionSequence:Number.isInteger(Number(valueOf(row,['executionSequence','sequence','sequencia','linha'])))?Number(valueOf(row,['executionSequence','sequence','sequencia','linha'])):null
    };
    operation.identity=Foundation.resolveExactIdentity(operation);
    operation.fingerprint=Foundation.eventFingerprint({source:`BROKERAGE_NOTE_OPERATION|${rawSide}`,eventType:operation.buySell,date:operation.tradeDate,assetId:operation.assetId,isin:operation.isin,ticker:operation.ticker,quantity:operation.quantity,unitPrice:operation.unitPrice,grossValue:operation.grossValue,documentId:operation.noteIdentity});
    return operation;
  }

  function normalizeNote(raw={}, source={}){
    const broker=String(valueOf(raw,['broker','corretora','instituicao'])||source.broker||'').trim();
    const noteNumber=String(valueOf(raw,['noteNumber','numeroNota','nota','documentId'])||'').trim();
    const tradeDate=date(valueOf(raw,['tradeDate','date','dataPregao','data']))||'';
    const settlementDate=date(valueOf(raw,['settlementDate','dataLiquidacao','liquidacao']))||'';
    const noteIdentity=broker&&noteNumber&&tradeDate?`${key(broker)}|${noteNumber}|${tradeDate}`:'';
    const operations=(Array.isArray(raw.operations)?raw.operations:Array.isArray(raw.linhas)?raw.linhas:[]).map((row,index)=>normalizeOperation(row,{BROKER:broker,NOTE_IDENTITY:noteIdentity,TRADE_DATE:tradeDate,SETTLEMENT_DATE:settlementDate,EXECUTION_SEQUENCE:index+1}));
    const note={BROKER:broker,BROKER_DOCUMENT_ID:String(valueOf(raw,['brokerDocumentId','documentId','sourceFile'])||source.fileName||''),NOTE_NUMBER:noteNumber,TRADE_DATE:tradeDate,SETTLEMENT_DATE:settlementDate,MARKET:String(valueOf(raw,['market','mercado'])||''),OPERATIONS:operations, GROSS_VALUE:safeMoney(valueOf(raw,['grossValue','grossTotal','totalOperacoes'])),FEES_TOTAL:safeMoney(valueOf(raw,['feesTotal','fees','taxas'])),TAXES_TOTAL:safeMoney(valueOf(raw,['taxesTotal','taxes','irrf','impostos'])),NET_VALUE:safeMoney(valueOf(raw,['netValue','netTotal','liquidTotal','totalLiquido'])),SOURCE_FILE_FINGERPRINT:source.fingerprint||''};
    note.NOTE_IDENTITY=noteIdentity;
    note.CONTENT_FINGERPRINT=Foundation.sourceFingerprint({sourceType:'BROKERAGE_NOTE',broker,fileName:'',documentId:noteNumber,tradeDate,rows:operations});
    return note;
  }

  const NORMALIZATION_VERSION='v330.1';
  const feeAliases={settlement:['settlement','settlementFee','taxaLiquidacao'],emoluments:['emoluments','emolumento'],transfer:['transfer','transferFee','taxaTransferencia'],brokerage:['brokerage','brokerageFee','corretagem'],taxes:['taxes','tax','impostos'],other:['other','otherFees','outrasTaxas']};
  const normalizedCents=value=>{if(value===undefined||value===null||String(value).trim()==='') return null;const cents=money(value);return Number.isSafeInteger(cents)?cents:null;};
  function quantityUnits(value){
    const text=String(value||''); if(!/^\d+(?:\.\d{1,8})?$/.test(text)) return null;
    const [whole,fraction='']=text.split('.'); const units=BigInt(whole)*100000000n+BigInt((fraction+'00000000').slice(0,8)); return units>0n?units:null;
  }
  function quantityPrecisionValid(value){const text=String(value??'').trim();if(!text||/[eE]/.test(text)||text.startsWith('-')) return false;const fraction=text.match(/[,.](\d+)$/)?.[1];return !fraction||fraction.length<=8;}
  function unitsQuantity(units){const whole=units/100000000n;const fraction=(units%100000000n).toString().padStart(8,'0').replace(/0+$/,'');return fraction?`${whole}.${fraction}`:String(whole);}
  function executionGrossMatches(quantity,unitPriceCents,grossValueCents){
    if(quantity===null||!Number.isSafeInteger(unitPriceCents)||!Number.isSafeInteger(grossValueCents)) return null;
    if(unitPriceCents<=0||grossValueCents<=0) return false;
    const expected=(BigInt(unitPriceCents)*quantity+50000000n)/100000000n;
    const difference=expected-BigInt(grossValueCents);
    return (difference<0n?-difference:difference)<=1n;
  }
  function normalizeFeeComponents(raw={}){
    const components=Object.fromEntries(Object.entries(feeAliases).map(([name,aliases])=>[name,normalizedCents(valueOf(raw,aliases))]));
    const present=Object.values(components).filter(value=>value!==null).length;
    return {status:present===0?'UNKNOWN':present===Object.keys(components).length?'KNOWN':'PARTIAL',components,allocation:'UNALLOCATED'};
  }
  function buildNotePreview(raw={},source={},existing=[],existingTransactions=[]){
    const sourceId=String(source.sourceId||source.id||'').trim();
    const note=normalizeNote(raw,source);
    const identityKnown=Boolean(note.NOTE_IDENTITY);
    const rawExecutions=note.OPERATIONS.map((operation,index)=>{
      const sequence=Number.isInteger(operation.executionSequence)&&operation.executionSequence>0?operation.executionSequence:index+1;
      const rawRowIdentity=`${note.NOTE_IDENTITY||'unknown'}|row:${sequence}|${operation.fingerprint}`;
      const canonicalIdentity=/^(?:assetId|isin|ticker):/.test(operation.identity)?operation.identity:'';
      return {sourceId:sourceId||note.NOTE_IDENTITY,broker:note.BROKER||'UNKNOWN',noteIdentity:note.NOTE_IDENTITY||'',tradeDate:operation.tradeDate||'',settlementDate:operation.settlementDate||'',market:operation.market||'',assetRawName:operation.ticker||operation.security||'',assetCanonicalId:canonicalIdentity,side:operation.buySell,quantityRaw:operation.quantityRaw,quantity:operation.quantity,unitPriceCents:Number.isSafeInteger(operation.unitPrice)?operation.unitPrice:null,grossValueCents:Number.isSafeInteger(operation.grossValue)?operation.grossValue:null,executionSequence:sequence,rawRowIdentity,sourceAsOf:source.sourceAsOf||'',sourceHash:source.sourceHash||'',normalizationVersion:NORMALIZATION_VERSION};
    });
    const executionIdCounts=new Map(); rawExecutions.forEach(item=>executionIdCounts.set(item.rawRowIdentity,(executionIdCounts.get(item.rawRowIdentity)||0)+1));
    const groups=new Map(); const reviewReasons=[];
    rawExecutions.forEach(execution=>{
      if(!execution.assetCanonicalId) reviewReasons.push('ASSET_IDENTITY_UNRESOLVED');
      if(!['BUY','SELL'].includes(execution.side)) reviewReasons.push('SIDE_UNSUPPORTED');
      if(!execution.tradeDate||!execution.market||!execution.settlementDate||execution.unitPriceCents===null||execution.grossValueCents===null||!execution.quantity) reviewReasons.push('GROUPING_EVIDENCE_INCOMPLETE');
      const quantity=quantityPrecisionValid(execution.quantityRaw)?quantityUnits(execution.quantity):null;
      if(quantity===null) reviewReasons.push('EXECUTION_QUANTITY_INVALID');
      const grossMatches=executionGrossMatches(quantity,execution.unitPriceCents,execution.grossValueCents);
      if(grossMatches===false) reviewReasons.push('EXECUTION_VALUE_MISMATCH');
      const canGroup=Boolean(execution.broker!=='UNKNOWN'&&execution.noteIdentity&&execution.assetCanonicalId&&['BUY','SELL'].includes(execution.side)&&execution.tradeDate&&execution.market&&execution.settlementDate&&execution.unitPriceCents!==null&&execution.grossValueCents!==null&&quantity!==null&&grossMatches===true);
      const keyParts=[execution.broker,execution.noteIdentity,execution.tradeDate,execution.assetCanonicalId,execution.side,execution.market,execution.unitPriceCents,execution.settlementDate];
      const groupKey=canGroup?keyParts.join('|'):`raw:${execution.rawRowIdentity}`;
      if(!groups.has(groupKey)) groups.set(groupKey,[]); groups.get(groupKey).push(execution);
    });
    const normalizedTransactions=[...groups.values()].map(executions=>{
      const units=executions.map(item=>quantityPrecisionValid(item.quantityRaw)?quantityUnits(item.quantity):null);
      const quantity=units.every(value=>value!==null)?unitsQuantity(units.reduce((sum,value)=>sum+value,0n)):'';
      const gross=executions.map(item=>item.grossValueCents);
      const grossTotal=gross.every(value=>Number.isSafeInteger(value))?gross.reduce((sum,value)=>sum+value,0):null;
      return {sourceType:'BROKERAGE_NOTE',sourceId:sourceId||note.NOTE_IDENTITY,sourceReference:note.BROKER_DOCUMENT_ID||note.NOTE_NUMBER,sourceAsOf:source.sourceAsOf||'',importBatchId:source.importBatchId||note.CONTENT_FINGERPRINT,normalizationVersion:NORMALIZATION_VERSION,broker:note.BROKER||'UNKNOWN',noteIdentity:note.NOTE_IDENTITY||'',tradeDate:executions[0].tradeDate,settlementDate:executions[0].settlementDate,assetCanonicalId:executions[0].assetCanonicalId,assetRawName:executions[0].assetRawName,side:executions[0].side,market:executions[0].market,quantity,unitPriceCents:executions[0].unitPriceCents,grossValueCents:Number.isSafeInteger(grossTotal)?grossTotal:null,rawExecutionIds:executions.map(item=>item.rawRowIdentity),realizedPnlStatus:'RESULT_NOT_AVAILABLE'};
    });
    if(rawExecutions.some(item=>(executionIdCounts.get(item.rawRowIdentity)||0)>1)) reviewReasons.push('RAW_EXECUTION_ID_COLLISION');
    if(!identityKnown) reviewReasons.push('NOTE_IDENTITY_UNRESOLVED');
    const irrfRaw=raw.irrf&&typeof raw.irrf==='object'?raw.irrf:{};
    const irrfAmount=normalizedCents(valueOf(irrfRaw,['amount','irrfAmount']))??normalizedCents(valueOf(raw,['irrfAmount']));
    const includedValue=irrfRaw.includedInSettlement??raw.irrfIncludedInSettlement;
    const irrfIncluded=typeof includedValue==='boolean'?includedValue:null;
    const irrf={status:irrfAmount===null?'UNKNOWN':irrfIncluded===null?'REVIEW_REQUIRED':'EXPLICIT',amountCents:irrfAmount,includedInSettlement:irrfIncluded,baseCents:normalizedCents(valueOf(irrfRaw,['base','irrfBase']))??normalizedCents(valueOf(raw,['irrfBase']))};
    const feeData=normalizeFeeComponents(raw.fees&&typeof raw.fees==='object'?raw.fees:raw);
    feeData.totalCents=normalizedCents(valueOf(raw,['feesTotal','totalFees','totalTaxas']));
    const noteFinancials={grossPurchasesCents:normalizedCents(valueOf(raw,['grossPurchases','grossPurchasesTotal'])),grossSalesCents:normalizedCents(valueOf(raw,['grossSales','grossSalesTotal'])),netOperationsCents:normalizedCents(valueOf(raw,['netOperations','netOperationsTotal'])),fees:feeData,irrf,netSettlementCents:normalizedCents(valueOf(raw,['netSettlement','netValue','netTotal','liquidTotal'])),settlementDate:note.SETTLEMENT_DATE||''};
    const operationFingerprintRows=note.OPERATIONS.map(operation=>({...operation,source:`BROKERAGE_NOTE|${operation.market}|${operation.sideRaw}`,eventType:operation.buySell,date:operation.tradeDate,documentId:note.NOTE_NUMBER}));
    const financialFingerprintRows=[...Object.entries(noteFinancials.fees.components).map(([name,value])=>({source:'NOTE_FEE',eventType:name,netValue:value===null?null:value/100,broker:note.BROKER,documentId:note.NOTE_NUMBER,date:note.TRADE_DATE})),{source:'NOTE_TOTAL',eventType:'gross-purchases',grossValue:noteFinancials.grossPurchasesCents===null?null:noteFinancials.grossPurchasesCents/100},{source:'NOTE_TOTAL',eventType:'gross-sales',grossValue:noteFinancials.grossSalesCents===null?null:noteFinancials.grossSalesCents/100},{source:'NOTE_TOTAL',eventType:'net-operations',netValue:noteFinancials.netOperationsCents===null?null:noteFinancials.netOperationsCents/100},{source:'NOTE_TOTAL',eventType:'net-settlement',netValue:noteFinancials.netSettlementCents===null?null:noteFinancials.netSettlementCents/100},{source:'NOTE_IRRF',eventType:`included:${irrf.includedInSettlement}`,netValue:irrf.amountCents===null?null:irrf.amountCents/100,unitPrice:irrf.baseCents===null?null:irrf.baseCents/100},{source:'NOTE_SETTLEMENT',eventType:'settlement-date',date:note.SETTLEMENT_DATE,documentId:note.NOTE_NUMBER},...(source.sourceHash?[{source:'NOTE_SOURCE_HASH',eventType:'source-hash',ticker:String(source.sourceHash)}]:[])];
    note.CONTENT_FINGERPRINT=Foundation.sourceFingerprint({sourceType:'BROKERAGE_NOTE',broker:note.BROKER,documentId:note.NOTE_NUMBER,tradeDate:note.TRADE_DATE,fileName:'',rows:[...operationFingerprintRows,...financialFingerprintRows]});
    note.SOURCE_HASH=String(source.sourceHash||'');
    note.NORMALIZATION_VERSION=NORMALIZATION_VERSION;
    const grossBySide=side=>{const selected=normalizedTransactions.filter(item=>item.side===side);if(!selected.length||!selected.every(item=>Number.isSafeInteger(item.grossValueCents))) return null;const total=selected.reduce((sum,item)=>sum+item.grossValueCents,0);return Number.isSafeInteger(total)?total:null;};
    if(noteFinancials.grossPurchasesCents===null) noteFinancials.grossPurchasesCents=grossBySide('BUY');
    if(noteFinancials.grossSalesCents===null) noteFinancials.grossSalesCents=grossBySide('SELL');
    const duplicateState=classifyNoteDuplicate(note,existing);
    if(duplicateState==='EXACT_DUPLICATE_NOTE') reviewReasons.push('EXACT_DUPLICATE_SOURCE');
    if(duplicateState==='CONFLICTING_NOTE') reviewReasons.push('NOTE_IDENTITY_CONTENT_CONFLICT');
    if(noteFinancials.fees.status!=='KNOWN') reviewReasons.push('NOTE_LEVEL_FEES_INCOMPLETE');
    if(irrf.status==='UNKNOWN') reviewReasons.push('IRRF_AMOUNT_UNKNOWN');
    if(irrf.status==='REVIEW_REQUIRED') reviewReasons.push('IRRF_SETTLEMENT_INCLUSION_UNKNOWN');
    const duplicateGuard=normalizedTransactions.map(candidate=>{
      if(!candidate.assetCanonicalId||!candidate.tradeDate||!candidate.side||!candidate.quantity) return {candidate:candidate.rawExecutionIds[0],state:'UNKNOWN',matchedId:null};
      const [identityKind,identityValue='']=candidate.assetCanonicalId.split(':',2);
      const identityField={assetId:'assetId',isin:'isin',ticker:'ticker',security:'security'}[identityKind];
      const result=Foundation.classifyDuplicate({source:'BROKERAGE_NOTE',eventType:candidate.side,date:candidate.tradeDate,[identityField||'ticker']:identityValue,quantity:candidate.quantity,unitPrice:candidate.unitPriceCents===null?null:candidate.unitPriceCents/100,grossValue:candidate.grossValueCents===null?null:candidate.grossValueCents/100,broker:candidate.broker,noteNumber:candidate.noteIdentity},existingTransactions);
      const states={NOT_DUPLICATE:'NEW',IDENTITY_CONFLICT:'CONFLICT'};
      return {candidate:candidate.rawExecutionIds[0],...result,state:states[result.state]||result.state};
    });
    if(duplicateGuard.some(item=>item.state==='IDENTITY_CONFLICT'||item.state==='POSSIBLE_DUPLICATE')) reviewReasons.push('POSSIBLE_EXISTING_TRANSACTION_MATCH');
    const uniqueReasons=[...new Set(reviewReasons)];
    const status=duplicateState==='CONFLICTING_NOTE'?'SOURCE_CONFLICT':duplicateState==='EXACT_DUPLICATE_NOTE'?'DUPLICATE_CANDIDATE':uniqueReasons.length?'HUMAN_DATA_REQUIRED':rawExecutions.length?'SOURCE_CONFIRMED':'SOURCE_PARTIAL';
    return {status,reasonCodes:uniqueReasons,note:{...note,NOTE_IDENTITY:note.NOTE_IDENTITY||'',NORMALIZATION_VERSION},sourceIdentity:{state:identityKnown?'KNOWN':'UNKNOWN',value:note.NOTE_IDENTITY||'',contentFingerprint:note.CONTENT_FINGERPRINT},rawExecutions,normalizedTransactions,noteFinancials,duplicate:{state:duplicateState==='NEW_NOTE'?'NEW':duplicateState==='EXACT_DUPLICATE_NOTE'?'EXACT_DUPLICATE':duplicateState==='CONFLICTING_NOTE'?'CONFLICT':'UNKNOWN'},duplicateGuard,reconciliation:{state:status,reasonCodes:uniqueReasons,writeEnabled:false},importReadiness:{state:status==='SOURCE_CONFIRMED'?'READY_FOR_REVIEW':'HUMAN_DATA_REQUIRED',reasonCodes:uniqueReasons},validation:{status:uniqueReasons.length?'REVIEW_REQUIRED':'VALID',reasonCodes:uniqueReasons},writeCount:0,financialWrite:false,persistenceEnabled:false,realizedPnlStatus:'RESULT_NOT_AVAILABLE'};
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function renderNotePreview(preview,escape=escapeHtml){
    if(typeof escape!=='function') throw new TypeError('ESCAPER_REQUIRED');
    const note=preview?.note||{},financials=preview?.noteFinancials||{},moneyText=cents=>cents===null||cents===undefined?'Não informado':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
    const states={SOURCE_CONFIRMED:'Fonte identificada',SOURCE_PARTIAL:'Dados parciais',SOURCE_CONFLICT:'Conflito na fonte',DUPLICATE_CANDIDATE:'Possível duplicidade',HUMAN_DATA_REQUIRED:'Necessita revisão humana',READY_FOR_REVIEW:'Pronta para revisão'};
    const reasons={EXACT_DUPLICATE_SOURCE:'Esta nota já foi processada.',NOTE_LEVEL_FEES_INCOMPLETE:'Taxas da nota incompletas; não alocadas.',IRRF_AMOUNT_UNKNOWN:'IRRF não informado.',IRRF_SETTLEMENT_INCLUSION_UNKNOWN:'Não foi possível confirmar se o IRRF está incluído na liquidação.',ASSET_IDENTITY_UNRESOLVED:'Ativo não identificado.',SIDE_UNSUPPORTED:'Tipo de operação não reconhecido.',GROUPING_EVIDENCE_INCOMPLETE:'Faltam dados para consolidar as execuções.',EXECUTION_QUANTITY_INVALID:'Quantidade inválida ou fora da precisão aceita.',EXECUTION_VALUE_MISMATCH:'O valor bruto não confere com quantidade e preço unitário.',NOTE_IDENTITY_CONTENT_CONFLICT:'A nota tem a mesma identidade, mas conteúdo diferente.',POSSIBLE_EXISTING_TRANSACTION_MATCH:'Uma movimentação existente pode ser duplicada.',NOTE_IDENTITY_UNRESOLVED:'Identidade da nota incompleta.',RAW_EXECUTION_ID_COLLISION:'Há linhas repetidas sem identidade única.'};
    const reasonText=(preview?.importReadiness?.reasonCodes||[]).map(code=>reasons[code]||'Há informação que precisa de conferência.');
    const transactions=(preview?.normalizedTransactions||[]).map(item=>`<li><strong>${escape(item.assetRawName||'Ativo não identificado')} — ${item.side==='SELL'?'Venda':item.side==='BUY'?'Compra':'Operação não classificada'} — ${escape(item.quantity||'Não informado')}</strong><span>${escape(item.rawExecutionIds.length)} execuções · bruto ${escape(moneyText(item.grossValueCents))}</span><details><summary>Execuções da nota (${escape(item.rawExecutionIds.length)})</summary><ul>${item.rawExecutionIds.map(id=>{const row=preview.rawExecutions.find(entry=>entry.rawRowIdentity===id);return `<li>${escape(row?.quantity||'Não informado')} × ${escape(moneyText(row?.unitPriceCents))}</li>`;}).join('')}</ul></details></li>`).join('');
    const fee=financials.fees||{};const feeNames={settlement:'Liquidação',emoluments:'Emolumentos',transfer:'Transferência',brokerage:'Corretagem',taxes:'Impostos',other:'Outras taxas'};const feeLines=Object.entries(fee.components||{}).map(([name,value])=>`<li>${escape(feeNames[name]||'Outra taxa')}: ${escape(moneyText(value))}</li>`).join('');
    const feeStatus={UNKNOWN:'Não informadas',PARTIAL:'Parciais',KNOWN:'Informadas'}[fee.status]||'Não confirmadas';const irrfStatus={UNKNOWN:'Não informado',REVIEW_REQUIRED:'Inclusão na liquidação não confirmada',EXPLICIT:'Informado pela fonte'}[financials.irrf?.status]||'Não confirmado';
    const exactDuplicates=(preview?.duplicateGuard||[]).filter(item=>item.state==='EXACT_DUPLICATE').length;const sourceDuplicate=preview?.duplicate?.state==='EXACT_DUPLICATE';const conflicts=(preview?.duplicateGuard||[]).filter(item=>['POSSIBLE_DUPLICATE','CONFLICT','UNKNOWN'].includes(item.state)).length;
    return `<section class="v330-note-preview" aria-label="Prévia da nota de corretagem"><h2>Resumo da nota</h2><p role="status">${escape(states[preview?.importReadiness?.state]||'Necessita revisão humana')}${reasonText.length?`: ${escape([...new Set(reasonText)].join(' '))}`:''}</p><dl><dt>Tipo de fonte</dt><dd>Nota de corretagem</dd><dt>Corretora</dt><dd>${escape(note.BROKER||'Não identificada')}</dd><dt>Nota</dt><dd>${escape(note.NOTE_NUMBER||'Não identificada')}</dd><dt>Pregão</dt><dd>${escape(note.TRADE_DATE||'Não informado')}</dd><dt>Liquidação</dt><dd>${escape(financials.settlementDate||'Não informada')}</dd><dt>Execuções brutas</dt><dd>${escape(preview?.rawExecutions?.length||0)}</dd><dt>Transações consolidadas</dt><dd>${escape(preview?.normalizedTransactions?.length||0)}</dd><dt>Nota já processada</dt><dd>${sourceDuplicate?'Sim':'Não'}</dd><dt>Movimentações idênticas</dt><dd>${escape(exactDuplicates)}</dd><dt>Possíveis duplicatas/conflitos</dt><dd>${escape(conflicts)}</dd><dt>Compras brutas</dt><dd>${escape(moneyText(financials.grossPurchasesCents))}</dd><dt>Vendas brutas</dt><dd>${escape(moneyText(financials.grossSalesCents))}</dd><dt>Taxas</dt><dd>${escape(feeStatus)} · ${escape(moneyText(fee.totalCents))} · não alocadas</dd><dt>IRRF</dt><dd>${escape(irrfStatus)} · ${escape(moneyText(financials.irrf?.amountCents))}</dd><dt>Líquido informado</dt><dd>${escape(moneyText(financials.netSettlementCents))}</dd></dl><ul aria-label="Transações consolidadas">${transactions}</ul><ul aria-label="Componentes de taxas da nota">${feeLines}</ul><p>Resultado realizado: Não calculado. Valor bruto de venda não representa lucro.</p><p>Prévia sem gravação: 0 alterações.</p></section>`;
  }

  function classifyNoteDuplicate(note={}, existing=[]){
    if(!note.NOTE_IDENTITY) return 'UNKNOWN_NOTE_IDENTITY';
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
    if(!Array.isArray(note.OPERATIONS)||note.OPERATIONS.some(item=>!Number.isSafeInteger(item.grossValue))) return {status:'MISSING_COMPONENT',operationGross:null,reportedGross:note.GROSS_VALUE??null,net:note.NET_VALUE??null};
    const operationGross=note.OPERATIONS.reduce((sum,item)=>sum+(item.grossValue??0),0);
    if(!Number.isSafeInteger(operationGross)) return {status:'MISSING_COMPONENT',operationGross:null,reportedGross:note.GROSS_VALUE??null,net:note.NET_VALUE??null};
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

  return {brokerFormatAudit,normalizeOperation,normalizeNote,buildNotePreview,renderNotePreview,classifyNoteDuplicate,operationDuplicates,auditFees,crossCheckNoteFinancials,crossCheckNoteSet,reconcilePositionProfessional,positionProtection,historicalIdentityReview,eventGraph,severity,professionalSummary,readinessMatrix,rollbackDesign,reportingFoundation,exportContract,pdfApproach,brokerNoteReport,reconciliationReport};
});
