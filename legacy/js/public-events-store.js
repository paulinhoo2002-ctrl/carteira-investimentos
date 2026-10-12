/* Separate local cache for public events; never shares the realized ledger key. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.PublicEventsStore=api;})(typeof window!=='undefined'?window:globalThis,function(){
  const VERSION=1,KEY='carteira_public_corporate_events_v1';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const text=v=>String(v??'').trim();
  const eventIdentity=e=>text(e?.eventKey||e?.id)||[text(e?.symbol||e?.ticker).toUpperCase(),text(e?.eventType||e?.type).toUpperCase(),text(e?.baseDate||e?.recordDate),text(e?.paymentDate||e?.payDate),Number.isFinite(Number(e?.valuePerUnitGross))?Math.round(Number(e.valuePerUnitGross)*100):'',text(e?.sourceDocumentId||e?.officialId)].join('|');
  function createMemoryStorage(){const map=new Map();return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
  function read(storage=globalThis.localStorage){try{const raw=storage?.getItem(KEY);if(!raw)return {version:VERSION,updatedAt:null,events:[],quotes:{}};const v=JSON.parse(raw);if(!Array.isArray(v.events))return {version:VERSION,updatedAt:null,events:[],quotes:{}};return {version:VERSION,updatedAt:v.updatedAt||null,events:clone(v.events),quotes:v.quotes&&typeof v.quotes==='object'?clone(v.quotes):{}};}catch{return {version:VERSION,updatedAt:null,events:[],quotes:{}};}}
  function mergeEvents(existing=[],incoming=[]){
    const map=new Map(); let duplicates=0,updated=0,corrections=0,cancellations=0;
    for(const event of [...(Array.isArray(existing)?existing:[])]) map.set(eventIdentity(event),clone(event));
    for(const raw of Array.isArray(incoming)?incoming:[]){
      const key=eventIdentity(raw); const previous=map.get(key);
      if(previous){ duplicates++; const next={...previous,...clone(raw),sources:[...new Map([...(previous.sources||[]),...(raw.sources||[]),{provider:raw.sourceProvider,url:raw.sourceUrl,documentId:raw.sourceDocumentId}].map(s=>[JSON.stringify(s),s])).values()]}; if(JSON.stringify(next)!==JSON.stringify(previous)) updated++; map.set(key,next); }
      else { const next=clone(raw); map.set(key,next); if(next.status==='CORRECTED') corrections++; if(next.status==='CANCELLED') cancellations++; }
    }
    return {events:[...map.values()],added:Math.max(0,map.size-(Array.isArray(existing)?existing.length:0)),updated,duplicates,corrections,cancellations};
  }
  function write(storage,payload){const next={version:VERSION,updatedAt:payload.updatedAt||new Date().toISOString(),events:Array.isArray(payload.events)?clone(payload.events):[],quotes:payload.quotes&&typeof payload.quotes==='object'?clone(payload.quotes):{}};storage.setItem(KEY,JSON.stringify(next));return next;}
  function upsert(storage,incoming,{now=new Date().toISOString()}={}){const current=read(storage);const merged=mergeEvents(current.events,incoming);const snapshot=write(storage,{updatedAt:now,events:merged.events,quotes:current.quotes});return {...merged,snapshot};}
  function isFresh(updatedAt,ttlMs,now=Date.now()){const t=Date.parse(updatedAt||'');return Number.isFinite(t)&&now-t<ttlMs;}
  return {VERSION,KEY,createMemoryStorage,eventIdentity,mergeEvents,read,write,upsert,isFresh};
});
