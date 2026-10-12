(function(root, factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports={V213TransactionTrust:api};
  root.V213TransactionTrust=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const text=value=>String(value??'').trim();
  const lower=value=>text(value).toLocaleLowerCase('pt-BR');
  const normalizeDate=value=>{
    const raw=text(value);
    if(!raw) return {state:'missing',key:'',timestamp:null};
    const timestamp=Date.parse(raw);
    if(!Number.isFinite(timestamp)) return {state:'invalid',key:raw,timestamp:null};
    return {state:'value',key:new Date(timestamp).toISOString().slice(0,10),timestamp};
  };
  const typeOf=row=>lower(row?.type||row?.operation||row?.op||row?.transactionType);
  const tickerOf=row=>text(row?.ticker||row?.symbol||row?.asset||row?.assetTicker);
  const sourceOf=row=>text(row?.source||row?.broker||row?.brokerage||row?.origin);
  const matchesPeriod=(row,options={})=>{
    const date=normalizeDate(row?.date||row?.tradeDate||row?.paymentDate||row?.importDate);
    if(options.from){ const from=normalizeDate(options.from); if(from.state==='value' && (date.state!=='value'||date.timestamp<from.timestamp)) return false; }
    if(options.to){ const to=normalizeDate(options.to); if(to.state==='value' && (date.state!=='value'||date.timestamp>to.timestamp+86399999)) return false; }
    return true;
  };
  const filterTransactions=(rows,options={})=>{
    const type=lower(options.type||'todos');
    const ticker=lower(options.ticker||'');
    return (Array.isArray(rows)?rows:[]).filter(row=>{
      if(type && type!=='todos' && typeOf(row)!==type) return false;
      if(ticker && lower(tickerOf(row))!==ticker) return false;
      return matchesPeriod(row,options);
    });
  };
  const searchTransactions=(rows,query)=>{
    const needle=lower(query);
    if(!needle) return Array.isArray(rows)?rows.slice():[];
    return (Array.isArray(rows)?rows:[]).filter(row=>[
      tickerOf(row),row?.name,row?.assetName,row?.description,typeOf(row),sourceOf(row)
    ].some(value=>lower(value).includes(needle)));
  };
  const sortTransactions=(rows,sortKey='date',direction='desc')=>{
    const multiplier=direction==='asc'?1:-1;
    const list=(Array.isArray(rows)?rows:[]).map((row,index)=>({row,index}));
    const valueFor=item=>{
      const row=item.row;
      if(sortKey==='ticker'||sortKey==='asset') return lower(tickerOf(row));
      if(sortKey==='value') return Number(row?.value??row?.total??row?.amount??NaN);
      return normalizeDate(row?.date||row?.tradeDate||row?.paymentDate||row?.importDate).timestamp;
    };
    return list.sort((a,b)=>{
      const av=valueFor(a),bv=valueFor(b);
      const am=av===null||av===undefined||av===''||(typeof av==='number'&&!Number.isFinite(av));
      const bm=bv===null||bv===undefined||bv===''||(typeof bv==='number'&&!Number.isFinite(bv));
      if(am!==bm) return am?1:-1;
      if(av< bv) return -1*multiplier;
      if(av> bv) return 1*multiplier;
      return a.index-b.index;
    }).map(item=>item.row);
  };
  const summarizeTransactions=rows=>(Array.isArray(rows)?rows:[]).reduce((out,row)=>{
    const type=typeOf(row); out.total+=1;
    if(type.includes('compra')) out.buys+=1;
    else if(type.includes('venda')) out.sells+=1;
    else if(type.includes('aporte')||type.includes('entrada')) out.contributions+=1;
    else out.others+=1;
    return out;
  },{total:0,buys:0,sells:0,contributions:0,others:0});
  const assetTransactions=(rows,identity={})=>{
    const id=text(identity.id), ticker=lower(identity.ticker), name=lower(identity.name||identity.assetName);
    return (Array.isArray(rows)?rows:[]).filter(row=>{
      if(id && text(row?.assetId||row?.idAsset||row?.asset_id)===id) return true;
      if(ticker && lower(tickerOf(row))===ticker) return true;
      return !!name && lower(row?.name||row?.assetName)===name;
    });
  };
  const provenanceFacts=value=>{
    const facts=[];
    const add=(key,label,val)=>{if(val!==undefined&&val!==null&&text(val))facts.push({key,label,value:text(val)});};
    add('source','Fonte',value?.source||value?.origin);
    add('authority','Autoridade',value?.authority);
    add('valuationMode','Modo de valuation',value?.valuationMode);
    add('valuationAsOf','Data-base',value?.valuationAsOf);
    add('sourceAsOf','Data da fonte',value?.sourceAsOf);
    add('observedAt','Observado em',value?.observedAt);
    if(value?.manual===true) add('manual','Status','Manual');
    if(value?.estimated===true) add('estimated','Status','Estimado');
    if(value?.fallback===true) add('fallback','Status','Fallback');
    if(value?.stale===true) add('stale','Status','Desatualizado');
    if(value?.unsupported===true) add('unsupported','Status','Sem suporte');
    add('reason','Motivo',value?.reason);
    return facts;
  };
  return {normalizeDate,filterTransactions,searchTransactions,sortTransactions,summarizeTransactions,assetTransactions,provenanceFacts};
});
