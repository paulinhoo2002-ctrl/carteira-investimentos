/* V76 derived runtime stores. No access to the realized ledger, network or cloud. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PortfolioRuntimeStores=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const SNAPSHOT_SCHEMA_VERSION=1;
  const FLOW_SCHEMA_VERSION=1;
  const CALCULATION_VERSION='v76.1';
  const FLOW_TYPES=new Set(['CONTRIBUTION','WITHDRAWAL','TRANSFER_IN_EXTERNAL','TRANSFER_OUT_EXTERNAL','ADJUSTMENT']);
  const finite=v=>Number.isFinite(Number(v))?Number(v):null;
  const nonNegativeCents=v=>Number.isInteger(Number(v))&&Number(v)>=0?Number(v):null;
  const positiveCents=v=>Number.isInteger(Number(v))&&Number(v)>0?Number(v):null;
  const isoDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):null;
  const nowIso=clock=>new Date(clock?.()).toISOString();
  const clone=v=>JSON.parse(JSON.stringify(v));

  function emptySnapshotStore(clock=Date.now){const now=nowIso(clock);return {schemaVersion:SNAPSHOT_SCHEMA_VERSION,snapshots:[],lastUpdatedAt:now,calculationVersion:CALCULATION_VERSION,trackingStartDate:null};}
  function emptyFlowStore(clock=Date.now){const now=nowIso(clock);return {schemaVersion:FLOW_SCHEMA_VERSION,flows:[],lastUpdatedAt:now};}
  function loadStore(raw,kind,clock=Date.now){
    const empty=kind==='snapshots'?emptySnapshotStore(clock):emptyFlowStore(clock);
    if(raw==null||raw==='')return {ok:true,value:empty,diagnostic:'EMPTY_DEFAULT'};
    try{
      const value=typeof raw==='string'?JSON.parse(raw):clone(raw);
      if(!value||value.schemaVersion!==empty.schemaVersion||!Array.isArray(kind==='snapshots'?value.snapshots:value.flows))return {ok:false,value:empty,diagnostic:'CORRUPT_SCHEMA'};
      if(kind==='snapshots'&&!Object.prototype.hasOwnProperty.call(value,'trackingStartDate'))value.trackingStartDate=null;
      return {ok:true,value,diagnostic:'LOADED'};
    }catch(error){return {ok:false,value:empty,diagnostic:'CORRUPT_JSON'};}
  }
  function snapshotQuality(s){
    const freshness={LIVE:4,RECENT_SNAPSHOT:3,STALE_SNAPSHOT:2,UNKNOWN:0}[s?.freshness]??0;
    return (finite(s?.totalCoveragePercent)||0)*10+freshness*100+(finite(s?.listedCoveragePercent)||0)+(finite(s?.fixedIncomeCoveragePercent)||0);
  }
  function snapshotEvidenceChanged(a,b){return ['listedAssetsValue','fixedIncomeValue','otherAssetsValue','totalPortfolioValue','listedCoveragePercent','fixedIncomeCoveragePercent','totalCoveragePercent','listedPriceAsOf','fixedIncomeAsOf','freshness','sourceQuality'].some(k=>String(a?.[k]??'')!==String(b?.[k]??''));}
  function normalizeSnapshot(input,clock=Date.now){
    const localDate=isoDate(input?.localDate); if(!localDate)throw new Error('SNAPSHOT_DATE_REQUIRED');
    const values=['listedAssetsValue','fixedIncomeValue','otherAssetsValue','totalPortfolioValue'].map(k=>nonNegativeCents(input?.[k]));
    if(values.some(v=>v===null))throw new Error('SNAPSHOT_VALUES_MUST_BE_POSITIVE_CENTS_OR_ZERO');
    const capturedAt=input.capturedAt||nowIso(clock);
    return {id:`valuation-${localDate}`,localDate,capturedAt,lastUpdatedAt:input.lastUpdatedAt||capturedAt,
      listedAssetsValue:values[0],fixedIncomeValue:values[1],otherAssetsValue:values[2],totalPortfolioValue:values[3],
      listedCoveragePercent:finite(input.listedCoveragePercent)||0,fixedIncomeCoveragePercent:finite(input.fixedIncomeCoveragePercent)||0,totalCoveragePercent:finite(input.totalCoveragePercent)||0,
      listedPriceAsOf:input.listedPriceAsOf||null,fixedIncomeAsOf:input.fixedIncomeAsOf||null,
      freshness:String(input.freshness||'UNKNOWN'),sourceQuality:String(input.sourceQuality||'DERIVED'),calculationVersion:input.calculationVersion||CALCULATION_VERSION};
  }
  function upsertDailySnapshot(store,input,clock=Date.now){
    const base=loadStore(store,'snapshots',clock).value; const snapshot=normalizeSnapshot(input,clock);
    const index=base.snapshots.findIndex(x=>x.localDate===snapshot.localDate);
    if(index<0){base.snapshots.push(snapshot);base.snapshots.sort((a,b)=>a.localDate.localeCompare(b.localDate));base.lastUpdatedAt=nowIso(clock);if(!base.trackingStartDate&&snapshot.totalCoveragePercent>=95)base.trackingStartDate=snapshot.localDate;return {store:base,action:'CREATED',snapshot};}
    const current=base.snapshots[index];
    if(snapshotQuality(snapshot)>snapshotQuality(current)||snapshotEvidenceChanged(snapshot,current)){
      snapshot.capturedAt=current.capturedAt; snapshot.lastUpdatedAt=nowIso(clock); base.snapshots[index]=snapshot;base.lastUpdatedAt=snapshot.lastUpdatedAt;if(!base.trackingStartDate&&snapshot.totalCoveragePercent>=95)base.trackingStartDate=snapshot.localDate;
      return {store:base,action:'UPDATED',snapshot};
    }
    return {store:base,action:'UNCHANGED',snapshot:current};
  }
  function normalizeFlow(input,clock=Date.now){
    const date=isoDate(input?.date),type=String(input?.type||''); if(!date)throw new Error('FLOW_DATE_REQUIRED');
    if(!FLOW_TYPES.has(type))throw new Error('FLOW_TYPE_INVALID');
    const amountCents=positiveCents(input?.amountCents); if(amountCents===null)throw new Error('FLOW_AMOUNT_MUST_BE_POSITIVE_CENTS');
    const source=String(input?.source||'MANUAL'); const sourceId=input?.sourceId?String(input.sourceId):null;
    const id=String(input?.id||`${source}:${sourceId||`${date}:${type}:${amountCents}`}`);
    const createdAt=input.createdAt||nowIso(clock);
    return {id,date,type,amountCents,currency:String(input.currency||'BRL'),source,sourceId,confidence:String(input.confidence||'DETERMINISTIC'),notes:String(input.notes||''),createdAt,updatedAt:input.updatedAt||createdAt};
  }
  function flowDuplicate(existing,candidate){return existing.some(x=>x.id===candidate.id||(candidate.sourceId&&x.source===candidate.source&&x.sourceId===candidate.sourceId));}
  function addExternalFlow(store,input,clock=Date.now){
    const base=loadStore(store,'flows',clock).value; const flow=normalizeFlow(input,clock);
    if(flowDuplicate(base.flows,flow))return {store:base,action:'DUPLICATE',flow};
    base.flows.push(flow);base.flows.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));base.lastUpdatedAt=nowIso(clock);return {store:base,action:'CREATED',flow};
  }
  function selectors({listedValue=0,fixedIncomeValue=0,otherValue=0,listedCoveragePercent=0,fixedIncomeCoveragePercent=0,otherCoveragePercent=100,listedAsOf=null,fixedIncomeAsOf=null,priceProvider=null}={}){
    const listed=positiveCents(listedValue)||0,fixed=positiveCents(fixedIncomeValue)||0,other=positiveCents(otherValue)||0;
    const total=listed+fixed+other; const components=[{value:listed,coverage:finite(listedCoveragePercent)||0},{value:fixed,coverage:finite(fixedIncomeCoveragePercent)||0},{value:other,coverage:finite(otherCoveragePercent)||0}];
    const known=components.reduce((s,x)=>s+x.value,0); const coverage=total?components.reduce((s,x)=>s+x.value*x.coverage,0)/total:0;
    const fresh=coverage>=99&&(!fixedIncomeAsOf||String(fixedIncomeAsOf)>=new Date().toISOString().slice(0,10))?'LIVE':'KNOWN_WITH_COVERAGE';
    return {getListedAssetsValue:()=>listed,getFixedIncomeValue:()=>fixed,getOtherInvestmentValue:()=>other,getKnownPortfolioValue:()=>known,getLivePortfolioValue:()=>fresh==='LIVE'?known:null,getPortfolioCoverage:()=>coverage,totalValue:known,totalCoveragePercent:coverage,freshness:fresh,listedAsOf,fixedIncomeAsOf,priceProvider};
  }
  function trackingStartDate(store,{minimumCoverage=95}={}){return store?.trackingStartDate||((store?.snapshots||[]).filter(s=>(finite(s.totalCoveragePercent)||0)>=minimumCoverage).sort((a,b)=>a.localDate.localeCompare(b.localDate))[0]?.localDate||null);}
  function prospectiveStatus(store){const count=store?.snapshots?.length||0;return count?{status:'TRACKING_STARTED',snapshotCount:count,trackingStartDate:trackingStartDate(store)}:{status:'NOT_STARTED',snapshotCount:0,trackingStartDate:null};}
  function backupSupplement({snapshots,flows}={}){return {schemaVersion:1,derived:true,valuationSnapshots:clone(snapshots||emptySnapshotStore()),externalCashFlows:clone(flows||emptyFlowStore())};}
  function restoreSupplement(payload,clock=Date.now){if(payload==null)return {ok:true,snapshots:emptySnapshotStore(clock),flows:emptyFlowStore(clock),diagnostic:'LEGACY_BACKUP_DEFAULTS'};if(payload.schemaVersion!==1||!payload.valuationSnapshots||!payload.externalCashFlows)return {ok:false,diagnostic:'INVALID_DERIVED_BACKUP'};const s=loadStore(payload.valuationSnapshots,'snapshots',clock),f=loadStore(payload.externalCashFlows,'flows',clock);if(!s.ok||!f.ok)return {ok:false,diagnostic:'INVALID_DERIVED_STORE'};return {ok:true,snapshots:s.value,flows:f.value,diagnostic:'RESTORED'};}
  return {SNAPSHOT_SCHEMA_VERSION,FLOW_SCHEMA_VERSION,CALCULATION_VERSION,FLOW_TYPES:[...FLOW_TYPES],emptySnapshotStore,emptyFlowStore,loadStore,normalizeSnapshot,upsertDailySnapshot,normalizeFlow,addExternalFlow,flowDuplicate,selectors,trackingStartDate,prospectiveStatus,backupSupplement,restoreSupplement};
});
