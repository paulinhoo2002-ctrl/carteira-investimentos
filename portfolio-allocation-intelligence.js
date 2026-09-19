(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PortfolioAllocationIntelligence=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const finite=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
  const text=value=>String(value??'').trim();
  const knownStatuses=new Set(['AVAILABLE','LEGITIMATE_ZERO','KNOWN']);

  function valueOf(row){
    const value=finite(row?.value ?? row?.currentValue ?? row?.marketValue);
    if(value===null || value<0) return null;
    const status=text(row?.valueStatus||row?.status).toUpperCase();
    if(['UNKNOWN','UNAVAILABLE','UNSUPPORTED','REFERENCE_SHADOW','SHADOW'].includes(status)) return null;
    if(value===0 && !knownStatuses.has(status)) return null;
    return value;
  }

  function labelOf(row,field){
    const value=text(row?.[field]);
    return value && value!=='—' ? value : 'Não classificado';
  }

  function stableName(row){
    return text(row?.ticker||row?.name||row?.id)||'Ativo sem identificação';
  }

  function sortRows(rows){
    return [...rows].sort((a,b)=>b.value-a.value || a.label.localeCompare(b.label,'pt-BR'));
  }

  function aggregate(rows,field,totalKnown){
    const map=new Map();
    let classifiedValue=0;
    rows.forEach(row=>{
      const value=valueOf(row);
      if(value===null) return;
      const label=labelOf(row,field);
      if(label==='Não classificado') return;
      const current=map.get(label)||{label,count:0,value:0};
      current.count++;
      current.value+=value;
      map.set(label,current);
      classifiedValue+=value;
    });
    const groups=sortRows([...map.values()]).map(group=>({
      ...group,
      shareOfKnown:totalKnown>0?group.value/totalKnown*100:null,
      shareOfClassified:classifiedValue>0?group.value/classifiedValue*100:null
    }));
    const classifiedCount=rows.filter(row=>valueOf(row)!==null && labelOf(row,field)!=='Não classificado').length;
    return {
      rows:groups,
      classifiedValue,
      unclassifiedValue:Math.max(0,totalKnown-classifiedValue),
      classifiedCount,
      coverageCount:rows.length?classifiedCount/rows.length*100:null,
      coverageValue:totalKnown>0?classifiedValue/totalKnown*100:null
    };
  }

  function prepare(input=[]){
    const source=Array.isArray(input)?input:[];
    const rows=source.map((row,index)=>{
      const value=valueOf(row);
      return {
        ...row,
        id:text(row?.id)||`allocation-${index+1}`,
        label:stableName(row),
        value,
        valueStatus:value===null?'UNKNOWN':text(row?.valueStatus||row?.status).toUpperCase()||'AVAILABLE',
        className:text(row?.className||row?.assetClass||row?.type),
        sector:text(row?.sector),
        issuer:text(row?.issuer||row?.emitter)
      };
    });
    const knownRows=rows.filter(row=>row.value!==null);
    const totalKnownValue=knownRows.reduce((sum,row)=>sum+row.value,0);
    const topRows=sortRows(knownRows).map(row=>({...row,shareOfKnown:totalKnownValue>0?row.value/totalKnownValue*100:null}));
    const classes=aggregate(rows,'className',totalKnownValue);
    const sectors=aggregate(rows,'sector',totalKnownValue);
    const issuers=aggregate(rows,'issuer',totalKnownValue);
    const unknownPositionCount=rows.filter(row=>row.value===null).length;
    return {
      rows,
      knownRows:topRows,
      totalKnownValue,
      totalClassifiedValue:classes.classifiedValue,
      totalUnclassifiedValue:Math.max(0,totalKnownValue-classes.classifiedValue),
      unknownValue:null,
      unknownPositionCount,
      positionCount:rows.length,
      knownPositionCount:knownRows.length,
      classes,
      sectors,
      issuers,
      coverage:{
        value:rows.length?knownRows.length/rows.length*100:null,
        valueKnown:totalKnownValue>0?totalKnownValue/totalKnownValue*100:null,
        class:classes,
        sector:sectors,
        issuer:issuers
      }
    };
  }

  function top(input,n=5){
    const rows=Array.isArray(input?.knownRows)?input.knownRows:prepare(input).knownRows;
    return rows.slice(0,Math.max(0,Number(n)||0));
  }

  function filterRows(input,filters={}){
    const rows=Array.isArray(input?.rows)?input.rows:prepare(input).rows;
    const matches=(row,field)=>!filters[field]||filters[field]==='all'||text(row[field])===text(filters[field]);
    return rows.filter(row=>matches(row,'className')&&matches(row,'sector')&&matches(row,'issuer'));
  }

  function sortRowsBy(input,field='value',direction='desc'){
    const rows=Array.isArray(input?.rows)?input.rows:prepare(input).rows;
    const sign=direction==='asc'?1:-1;
    return [...rows].sort((a,b)=>{
      const av=field==='label'?a.label:finite(a[field]);
      const bv=field==='label'?b.label:finite(b[field]);
      if(typeof av==='string'||typeof bv==='string') return sign*String(av??'').localeCompare(String(bv??''),'pt-BR');
      if(av===null&&bv===null)return a.label.localeCompare(b.label,'pt-BR');
      if(av===null)return 1;
      if(bv===null)return -1;
      return sign*(av-bv)||a.label.localeCompare(b.label,'pt-BR');
    });
  }

  function formatPercent(value){
    return finite(value)===null?'—':`${Number(value).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}%`;
  }

  function summary(data){
    const model=data||prepare([]);
    const parts=[];
    const first=top(model,1)[0];
    if(first && first.shareOfKnown!==null) parts.push(`O maior ativo representa ${formatPercent(first.shareOfKnown)} do patrimônio conhecido.`);
    if(model.classes.rows.length) parts.push(`A carteira possui ${model.classes.rows.length} classes identificadas.`);
    if(model.totalUnclassifiedValue>0 && model.totalKnownValue>0) parts.push(`${formatPercent(model.totalUnclassifiedValue/model.totalKnownValue*100)} do patrimônio conhecido não possui classe informada.`);
    return parts.join(' ');
  }

  return {prepare,aggregate,top,filterRows,sortRowsBy,formatPercent,summary,valueOf};
});
