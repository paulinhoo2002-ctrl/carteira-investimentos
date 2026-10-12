(function attachV210IncomeQuality(root, factory){
  const api=factory();
  if(root) root.V210IncomeQuality=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:null, function createV210IncomeQuality(){
  const finiteDate=value=>value instanceof Date && !Number.isNaN(value.getTime());
  const clean=value=>String(value??'').trim();
  const validRows=rows=>Array.isArray(rows)?rows.filter(row=>finiteDate(row?.paymentDt)||finiteDate(row?.date instanceof Date?row.date:new Date(row?.date))):[];
  function dividendQuality(rows=[]){
    const items=validRows(rows).map(row=>{ const date=finiteDate(row?.paymentDt)?row.paymentDt:new Date(row.date); return {...row,date,value:Number(row?.value)}; }).filter(row=>Number.isFinite(row.value)&&row.value>=0);
    const byAsset=new Map(); const bySource=new Map(); const byType=new Map(); const byMonth=new Map();
    items.forEach(row=>{ const ticker=clean(row.ticker||row.symbol||row.assetName)||'Não identificado'; const source=clean(row.source||row.origin)||'Origem não informada'; const type=clean(row.type||row.eventType)||'Outro'; const month=`${row.date.getFullYear()}-${String(row.date.getMonth()+1).padStart(2,'0')}`; byAsset.set(ticker,(byAsset.get(ticker)||0)+row.value); bySource.set(source,(bySource.get(source)||0)+row.value); byType.set(type,(byType.get(type)||0)+row.value); byMonth.set(month,(byMonth.get(month)||0)+row.value); });
    const total=items.reduce((sum,row)=>sum+row.value,0); const topAssets=[...byAsset.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3);
    return {total,count:items.length,assetCount:byAsset.size,sourceCount:bySource.size,typeCount:byType.size,unknownTickerCount:items.filter(row=>!clean(row.ticker||row.symbol||row.assetName)).length,months:[...byMonth.entries()].sort((a,b)=>b[0].localeCompare(a[0])),topAssets,top3Share:total?topAssets.reduce((sum,row)=>sum+row[1],0)/total*100:0,bySource:[...bySource.entries()].sort((a,b)=>b[1]-a[1]),byType:[...byType.entries()].sort((a,b)=>b[1]-a[1])};
  }
  function importCounts(preview={}){ const counts=preview.counts||{}; return {total:Array.isArray(preview.records)?preview.records.length:Object.values(counts).reduce((sum,value)=>sum+Number(value||0),0),newRecords:Number(counts.UNIQUE||0),exactDuplicates:Number(counts.EXACT_DUPLICATE||0),possibleDuplicates:Number(counts.PROBABLE_DUPLICATE||0),conflicts:Number(counts.IDENTITY_CONFLICT||0),invalid:Number(counts.REVIEW_REQUIRED||0)}; }
  return Object.freeze({dividendQuality,importCounts});
});
