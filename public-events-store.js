/* Separate local cache for public events; never shares the realized ledger key. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.PublicEventsStore=api;})(typeof window!=='undefined'?window:globalThis,function(){
  const VERSION=1,KEY='carteira_public_corporate_events_v1';
  const clone=v=>JSON.parse(JSON.stringify(v));
  function createMemoryStorage(){const map=new Map();return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
  function read(storage=globalThis.localStorage){try{const raw=storage?.getItem(KEY);if(!raw)return {version:VERSION,updatedAt:null,events:[],quotes:{}};const v=JSON.parse(raw);if(v.version!==VERSION||!Array.isArray(v.events))return {version:VERSION,updatedAt:null,events:[],quotes:{}};return {version:VERSION,updatedAt:v.updatedAt||null,events:clone(v.events),quotes:v.quotes&&typeof v.quotes==='object'?clone(v.quotes):{}};}catch{return {version:VERSION,updatedAt:null,events:[],quotes:{}};}}
  function write(storage,payload){const next={version:VERSION,updatedAt:payload.updatedAt||new Date().toISOString(),events:Array.isArray(payload.events)?clone(payload.events):[],quotes:payload.quotes&&typeof payload.quotes==='object'?clone(payload.quotes):{}};storage.setItem(KEY,JSON.stringify(next));return next;}
  function isFresh(updatedAt,ttlMs,now=Date.now()){const t=Date.parse(updatedAt||'');return Number.isFinite(t)&&now-t<ttlMs;}
  return {VERSION,KEY,createMemoryStorage,read,write,isFresh};
});
