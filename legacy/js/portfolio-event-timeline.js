(function(root,factory){
  const api=factory();
  if(root) root.PortfolioEventTimeline=api;
  if(typeof module==='object'&&module.exports) module.exports=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this), function(){
  const finite=v=>typeof v==='number'&&Number.isFinite(v)?v:(typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v))?Number(v):null);
  const text=v=>String(v??'').trim();
  const upper=v=>text(v).toUpperCase();
  const arr=v=>Array.isArray(v)?v:[];
  const dateParts=/^(\d{4})-(\d{2})-(\d{2})$/;
  function normalizeDate(value){
    const raw=text(value);
    if(!raw) return {state:'missing',key:null,sort:Infinity,display:'—'};
    const m=raw.match(dateParts);
    if(m){ const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]); const dt=new Date(Date.UTC(y,mo-1,d)); if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return {state:'invalid',key:null,sort:Infinity,display:'—'}; return {state:'value',key:raw,sort:dt.getTime(),display:dt.toLocaleDateString('pt-BR',{timeZone:'UTC'})}; }
    const parsed=Date.parse(raw);
    if(!Number.isFinite(parsed)) return {state:'invalid',key:null,sort:Infinity,display:'—'};
    const dt=new Date(parsed), key=dt.toISOString().slice(0,10);
    return {state:'value',key,sort:Date.parse(`${key}T00:00:00Z`),display:new Date(`${key}T00:00:00Z`).toLocaleDateString('pt-BR',{timeZone:'UTC'})};
  }
  function valueOf(row){ for(const key of ['value','amount','netValue','expectedNet','grossValue','totalValue']){const v=finite(row?.[key]);if(v!==null)return v;} return null; }
  function assetOf(row){ return {ticker:upper(row?.ticker||row?.symbol),name:text(row?.assetName||row?.name||row?.title),assetId:text(row?.assetId||row?.asset_id||row?.assetID)}; }
  function statusOf(row, fallback){ const raw=upper(row?.status||row?.eventStatus||''); if(['REALIZED','REFERENCE','SHADOW','UNAVAILABLE','EXPECTED','DISCOVERED','CANCELLED'].includes(raw)) return raw==='EXPECTED'||raw==='DISCOVERED'?'REFERENCE':raw; if(row?.shadowOnly||row?.referenceOnly||row?.sourceEventKind==='reference'||row?.excludedFromIncomeTotals)return 'REFERENCE'; return fallback; }
  function typeOf(row){ const raw=upper(row?.eventType||row?.type||row?.category||row?.operation||row?.op); if(raw.includes('JCP'))return 'JCP'; if(raw.includes('DIVID')||raw.includes('PROVENT'))return 'DIVIDEND'; if(raw.includes('RENDIMENTO')||raw.includes('INCOME')||raw.includes('JUROS'))return 'RENDIMENTO'; if(raw.includes('AMORT'))return 'AMORTIZATION'; if(raw.includes('VENDA')||raw.includes('SELL'))return 'SALE'; if(raw.includes('COMPRA')||raw.includes('BUY'))return 'PURCHASE'; if(raw.includes('APORTE')||raw.includes('CONTRIB'))return 'CONTRIBUTION'; if(raw.includes('RETIR')||raw.includes('WITHDRAW'))return 'WITHDRAWAL'; if(raw.includes('TRANSFER'))return 'TRANSFER'; if(raw.includes('CORPORATE')||raw.includes('SPLIT')||raw.includes('BONIF')||raw.includes('SUBSCR'))return 'CORPORATE_EVENT'; return raw||'EVENT'; }
  function makeEvent(row,{source,index,defaultStatus='REALIZED',dateKeys=['date','paymentDate']}){
    const asset=assetOf(row), type=typeOf(row), dateKey=dateKeys.map(k=>row?.[k]).find(Boolean), date=normalizeDate(dateKey), payment=normalizeDate(row?.paymentDate||row?.payDate), ex=normalizeDate(row?.exDate), base=normalizeDate(row?.baseDate||row?.recordDate||row?.comDate);
    const id=text(row?.id||row?.eventId||row?.sourceEventId||row?.financialEventId||`${source}:${index}:${asset.ticker}:${type}:${date.key||'unknown'}`);
    return {id,type,date:date.key,dateState:date.state,dateLabel:date.display,paymentDate:payment.key,paymentDateState:payment.state,exDate:ex.key,exDateState:ex.state,baseDate:base.key,asset,description:text(row?.description||row?.label||row?.note||row?.observation||type),value:valueOf(row),valueState:valueOf(row)===null?'unknown':'known',source:text(row?.source||row?.sourceProvider||row?.provider||source)||'Fonte não informada',authority:text(row?.authority||row?.sourceAuthority),status:statusOf(row,defaultStatus),provenance:{observedAt:text(row?.observedAt||row?.sourceFetchedAt||row?.lastSeenAt),sourceAsOf:text(row?.sourceAsOf||row?.valuationAsOf),reason:text(row?.reason||row?.confidence)},raw:row};
  }
  function normalizeInputs({proventos=[],aportes=[],rfEvents=[],corporateEvents=[]}={}){
    const out=[];
    arr(proventos).forEach((r,i)=>out.push(makeEvent(r,{source:'DIVIDENDS',index:i,dateKeys:['paymentDate','date']})));
    arr(aportes).forEach((r,i)=>out.push(makeEvent(r,{source:'TRANSACTIONS',index:i,dateKeys:['date','tradeDate','paymentDate']})));
    arr(rfEvents).forEach((r,i)=>out.push(makeEvent(r,{source:'FIXED_INCOME',index:i,defaultStatus:'REFERENCE',dateKeys:['date','paymentDate']})));
    arr(corporateEvents).forEach((r,i)=>out.push(makeEvent(r,{source:'CORPORATE_EVENTS',index:i,defaultStatus:'REFERENCE',dateKeys:['paymentDate','exDate','baseDate','date']})));
    const seen=new Set(); return out.filter(e=>{ if(seen.has(e.id))return false; seen.add(e.id); return true; });
  }
  function periodStart(period,now){ const d=now instanceof Date?new Date(now):new Date(); const key=text(period)||'all'; if(key==='all')return null; if(key==='month')return new Date(d.getFullYear(),d.getMonth(),1); if(key==='year')return new Date(d.getFullYear(),0,1); const months=key==='3m'?3:key==='6m'?6:key==='12m'?12:null; if(months)return new Date(d.getFullYear(),d.getMonth()-months+1,1); return null; }
  function filterPeriod(events,{period='all',now=new Date()}={}){ const start=periodStart(period,now); if(!start)return events.slice(); const current=now instanceof Date?new Date(now):new Date(); const min=Date.UTC(start.getFullYear(),start.getMonth(),start.getDate()); const max=period==='month'||period==='year'?Date.UTC(current.getFullYear(),current.getMonth(),current.getDate(),23,59,59,999):null; return events.filter(e=>{ if(e.dateState!=='value')return true; const stamp=Date.parse(`${e.date}T00:00:00Z`); return stamp>=min&&(!max||stamp<=max); }); }
  function buildTimeline(input={},options={}){ const all=normalizeInputs(input); const filtered=filterPeriod(all,options); return filtered.sort((a,b)=>(b.date?Date.parse(`${b.date}T00:00:00Z`):-Infinity)-(a.date?Date.parse(`${a.date}T00:00:00Z`):-Infinity)||String(a.id).localeCompare(String(b.id),'pt-BR')); }
  function groupBy(events,unit='month'){ const map=new Map(); events.forEach(e=>{const key=e.date?unit==='year'?e.date.slice(0,4):e.date.slice(0,7):'unknown'; if(!map.has(key))map.set(key,[]);map.get(key).push(e);}); return [...map.entries()].map(([key,items])=>({key,items,total:items.filter(e=>['DIVIDEND','JCP','RENDIMENTO'].includes(e.type)&&e.status==='REALIZED'&&e.value!==null).reduce((s,e)=>s+e.value,0)})); }
  function applyFilters(events,{type='all',status='all',source='all',asset='',search=''}={}){ const q=upper(search), a=upper(asset); return events.filter(e=>(type==='all'||e.type===type)&&(status==='all'||e.status===status)&&(source==='all'||e.source===source)&&(!a||e.asset.ticker===a||upper(e.asset.name).includes(a))&&(!q||e.asset.ticker.includes(q)||upper(e.asset.name).includes(q)||upper(e.description).includes(q))); }
  function incomeTotal(events){return events.filter(e=>e.status==='REALIZED'&&['DIVIDEND','JCP','RENDIMENTO'].includes(e.type)&&e.value!==null).reduce((s,e)=>s+e.value,0);}
  function summary(events){ const count=events.length, realized=events.filter(e=>e.status==='REALIZED').length, refs=events.filter(e=>['REFERENCE','SHADOW'].includes(e.status)).length, assets=new Set(events.map(e=>e.asset.ticker||e.asset.name).filter(Boolean)).size; return {count,realized,reference:refs,assets,incomeTotal:incomeTotal(events),text:`${count} evento${count===1?'':'s'} registrado${count===1?'':'s'}; ${realized} realizado${realized===1?'':'s'}, ${refs} referência${refs===1?'':'s'}, abrangendo ${assets} ativo${assets===1?'':'s'}.`}; }
  return {normalizeDate,normalizeEvent:makeEvent,normalizeInputs,buildTimeline,filterPeriod,applyFilters,groupBy,summary,incomeTotal};
});
