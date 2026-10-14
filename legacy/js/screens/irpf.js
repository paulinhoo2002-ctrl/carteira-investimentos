'use strict';

// IRPF reports screen (helper engines + renderers)
// Extracted from inline index.html for lazy loading and modularity
// Uses globals: S, esc, fmt, normalizeType, parseAnyDate, toast

function irpfSelectedYear(){
  const current=new Date().getFullYear();
  return Math.max(2010, Number(S.irpfYear)||current);
}
function setIrpfYear(year){
  S.irpfYear=Math.max(2010, Number(year)||new Date().getFullYear());
  S.irpfStep=1;
  save();
  render();
}
function setIrpfStep(step){
  S.irpfStep=Math.min(4, Math.max(1, Number(step)||1));
  save();
  render();
}
function toggleIrpfFinalSummary(){
  S.irpfFinalOpen=!S.irpfFinalOpen;
  save();
  render();
}
function irpfStepLabel(step){
  return {
    1:'Revisar posições',
    2:'Revisar proventos',
    3:'Revisar DARF',
    4:'Resumo final',
  }[step] || 'IRPF';
}
function irpfYears(){
  const years=new Set([new Date().getFullYear()]);
  S.aportes.forEach(a=>{ const d=parseAnyDate(a.date); if(d) years.add(d.getFullYear()); });
  S.proventos.forEach(p=>{ const d=parseAnyDate(p.date); if(d) years.add(d.getFullYear()); });
  return [...years].sort((a,b)=>b-a);
}
function irpfIsEquityType(type){
  const t=normalizeType(type||'Ação','Ação');
  return ['Ação','Stock','Reit','BDR'].includes(t);
}
function irpfSaleRate(type){
  const t=normalizeType(type||'Ação','Ação');
  if(t==='FII') return 20;
  if(t==='ETF') return 15;
  if(t==='Renda Fixa' || t==='Tesouro Direto') return 15;
  return 15;
}
function irpfDividendBucketLabel(kind){
  const k=String(kind||'').toLowerCase();
  if(k.includes('jcp') || k.includes('juros')) return 'Tributação exclusiva';
  return 'Isento / não tributável';
}
function irpfTaxBucket(type){
  const t=normalizeType(type||'Ação','Ação');
  if(t==='FII') return 'FII';
  if(t==='ETF') return 'ETF';
  if(t==='BDR') return 'BDR';
  if(t==='Renda Fixa' || t==='Tesouro Direto') return 'Renda Fixa';
  return 'Ações';
}
function irpfTaxRate(bucket){
  if(bucket==='FII') return 20;
  if(bucket==='ETF' || bucket==='BDR' || bucket==='Renda Fixa') return 15;
  return 15;
}
function irpfCsvEscape(v){
  const s=String(v??'');
  return `"${s.replace(/"/g,'""')}"`;
}
function irpfDownloadText(name, content, mime='text/plain;charset=utf-8'){
  const blob=new Blob([content],{type:mime});
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:name});
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function irpfCopyFinalSummary(text){
  try{
    await navigator.clipboard.writeText(text);
    toast('✅ Resumo final copiado.');
  }catch(e){
    window.prompt('Copie o resumo final abaixo:', text);
  }
}
function irpfMonthLabel(monthIndex){
  return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][monthIndex] || '';
}
function irpfBuildYearReport(year){
  const y=Number(year)||new Date().getFullYear();
  const bucketOrder=['Ações','FII','ETF','BDR','Renda Fixa'];
  const months=Array.from({length:12},(_,idx)=>({
    key:`${y}-${String(idx+1).padStart(2,'0')}`,
    label:irpfMonthLabel(idx),
    buys:0,
    sells:0,
    salesByBucket:Object.fromEntries(bucketOrder.map(b=>[b,0])),
    realizedByBucket:Object.fromEntries(bucketOrder.map(b=>[b,0])),
    taxByBucket:Object.fromEntries(bucketOrder.map(b=>[b,0])),
    exemptByBucket:Object.fromEntries(bucketOrder.map(b=>[b,0])),
    carryByBucket:Object.fromEntries(bucketOrder.map(b=>[b,0])),
    lossUsedByBucket:Object.fromEntries(bucketOrder.map(b=>[b,0])),
    events:[]
  }));
  const holdings=new Map();
  const carryByBucket=Object.fromEntries(bucketOrder.map(b=>[b,0]));
  const txs=[...S.aportes]
    .map(a=>({...a,_dt:parseAnyDate(a.date)}))
    .filter(a=>a._dt && a._dt.getFullYear()===y)
    .sort((a,b)=>a._dt-b._dt||((Number(a.id)||0)-(Number(b.id)||0)));
  const provs=[...S.proventos]
    .map(p=>({...p,_dt:parseAnyDate(p.date)}))
    .filter(p=>p._dt && p._dt.getFullYear()===y && Number(p.value)>0)
    .sort((a,b)=>a._dt-b._dt||String(a.ticker||'').localeCompare(String(b.ticker||'')));

  const ensurePos=(ticker)=>{
    const tk=String(ticker||'').toUpperCase();
    if(!holdings.has(tk)){
      const meta=metaTicker(tk);
      holdings.set(tk,{ticker:tk,qty:0,cost:0,type:meta.type||'Ação',sector:meta.sector||''});
    }
    return holdings.get(tk);
  };

  txs.forEach(tx=>{
    const rawTicker=cleanAssetCode(tx.ticker||'')||String(tx.ticker||'').trim().toUpperCase();
    if(!rawTicker) return;
    const type=normalizeType(tx.type||tx.asset_type||metaTicker(rawTicker).type||'Ação','Ação');
    const isReserve=type==='Reserva de emergência' || String(tx.operation||tx.op||'').toLowerCase().startsWith('reserva');
    if(isReserve) return;

    const month=months[tx._dt.getMonth()];
    const qty=Math.abs(Number(tx.qty)||0);
    const price=Math.abs(Number(tx.price)||0);
    const op=String(tx.operation||tx.op||'compra').toLowerCase();
    const bucket=irpfTaxBucket(type);
    const pos=ensurePos(rawTicker);
    pos.type=type;
    pos.sector=tx.sector||tx.asset_sector||pos.sector||metaTicker(rawTicker).sector||'';

    if(op==='venda'){
      const avgBefore=pos.qty>0 ? (pos.cost/pos.qty) : 0;
      const saleValue=qty*price;
      const costBasis=avgBefore*qty;
      const realized=saleValue-costBasis;
      pos.qty=Math.max(0,pos.qty-qty);
      pos.cost=Math.max(0,pos.cost-costBasis);
      month.sells+=saleValue;
      month.salesByBucket[bucket]+=saleValue;
      month.events.push({bucket, realized, saleValue, type});
      return;
    }

    pos.qty+=qty;
    pos.cost+=qty*price;
    month.buys+=qty*price;
  });

  months.forEach(month=>{
    const equitySalesTotal=month.salesByBucket['Ações'];
    month.events.forEach(evt=>{
      const rate=irpfTaxRate(evt.bucket);
      const canUseExemption = evt.bucket==='Ações' && equitySalesTotal<=20000;
      if(canUseExemption){
        if(evt.realized>0) month.exemptByBucket[evt.bucket]+=evt.realized;
        else month.lossUsedByBucket[evt.bucket]+=evt.realized;
        month.realizedByBucket[evt.bucket]+=evt.realized;
        return;
      }

      const priorCarry=Number(carryByBucket[evt.bucket]||0);
      const net=evt.realized + priorCarry;
      month.realizedByBucket[evt.bucket]+=evt.realized;
      if(net>0){
        month.taxByBucket[evt.bucket]+=net*(rate/100);
        carryByBucket[evt.bucket]=0;
      }else{
        carryByBucket[evt.bucket]=net;
        month.lossUsedByBucket[evt.bucket]+=net;
      }
    });
    bucketOrder.forEach(bucket=>{
      month.carryByBucket[bucket]=carryByBucket[bucket];
    });
    delete month.events;
  });

  const finalPositions=[...holdings.values()]
    .filter(p=>p.qty>0.000001)
    .map(p=>{
      const avg=p.qty>0 ? p.cost/p.qty : 0;
      const current=Number((S.assets.find(a=>String(a.ticker||'').toUpperCase()===p.ticker)?.current_price)||0);
      const bucket=irpfTaxBucket(p.type);
      return {
        ticker:p.ticker,
        type:p.type,
        bucket,
        sector:p.sector||metaTicker(p.ticker).sector||'',
        qty:p.qty,
        cost:p.cost,
        avg,
        current,
        marketValue: current>0 ? p.qty*current : p.cost,
        note: bucket==='FII'
          ? 'Ficha Bens e Direitos'
          : bucket==='ETF'
            ? 'ETF: conferir enquadramento'
            : bucket==='BDR'
              ? 'BDR: verificar custo em reais'
              : bucket==='Renda Fixa'
                ? 'Renda fixa: apurar IR do resgate/vencimento'
                : 'Ações: posição em 31/12'
      };
    })
    .sort((a,b)=>a.bucket.localeCompare(b.bucket)||a.ticker.localeCompare(b.ticker));

  const yearProvents=provs.map(p=>{
    const type=String(p.type||'').trim();
    const bucket=irpfDividendBucketLabel(type);
    const value=Number(p.value)||0;
    return { ...p, bucket, value };
  });

  const positionsByBucket=finalPositions.reduce((acc,p)=>{
    if(!acc[p.bucket]) acc[p.bucket]=[];
    acc[p.bucket].push(p);
    return acc;
  },{});

  const totalsByBucket=months.reduce((acc,month)=>{
    bucketOrder.forEach(bucket=>{
      if(!acc[bucket]) acc[bucket]={sales:0, realized:0, exempt:0, tax:0, carry:0};
      acc[bucket].sales+=Number(month.salesByBucket[bucket]||0);
      acc[bucket].realized+=Number(month.realizedByBucket[bucket]||0);
      acc[bucket].exempt+=Number(month.exemptByBucket[bucket]||0);
      acc[bucket].tax+=Number(month.taxByBucket[bucket]||0);
      acc[bucket].carry=Number(month.carryByBucket[bucket]||0);
    });
    return acc;
  },{});

  const totalBuys=months.reduce((s,m)=>s+m.buys,0);
  const totalSells=months.reduce((s,m)=>s+m.sells,0);
  const totalTax=months.reduce((s,m)=>s+bucketOrder.reduce((x,b)=>x+Number(m.taxByBucket[b]||0),0),0);
  const totalTaxableGain=months.reduce((s,m)=>s+bucketOrder.reduce((x,b)=>x+Math.max(0, Number(m.realizedByBucket[b]||0)+Math.max(0,Number(m.carryByBucket[b]||0))),0),0);
  const totalExemptGain=months.reduce((s,m)=>s+Number(m.exemptByBucket['Ações']||0),0);
  const totalLossCarry=months.reduce((s,m)=>s+bucketOrder.reduce((x,b)=>x+Math.min(0, Number(m.carryByBucket[b]||0)),0),0);
  const liquidationYearEnd=finalPositions.reduce((s,p)=>s+p.cost,0);
  const totalProvents=yearProvents.reduce((s,p)=>s+(Number(p.value)||0),0);
  const taxableProvents=yearProvents.filter(p=>String(p.bucket).includes('Tributação')).reduce((s,p)=>s+(Number(p.value)||0),0);
  const exemptProvents=totalProvents-taxableProvents;

  return {
    year:y,
    months,
    positions:finalPositions,
    positionsByBucket,
    provents:yearProvents,
    bucketOrder,
    totalsByBucket,
    totals:{
      buys:totalBuys,
      sells:totalSells,
      taxableGain:totalTaxableGain,
      exemptGain:totalExemptGain,
      tax:totalTax,
      lossCarry:totalLossCarry,
      proventsTotal:totalProvents,
      proventsExempt:exemptProvents,
      proventsTaxable:taxableProvents,
      yearEndCost:liquidationYearEnd,
    }
  };
}
function irpfIsRfPosition(row){
  return normalizeType(row?.type||'Ação','Ação')==='Renda Fixa' || row?.bucket==='Renda Fixa';
}
function irpfProventoCategory(p){
  const meta=proventoAssetMeta(p);
  const event=proventoTipoCanonical(p?.eventType||p?.type);
  const assetType=normalizeType(meta?.asset?.type||meta?.type||'Ação','Ação');
  const text=rfPosNorm(`${p?.assetName||''} ${p?.ticker||''} ${p?.eventType||''} ${p?.type||''}`);
  if(event==='JCP') return {bucket:'JCP', group:'Tributação exclusiva', label:'JCP'};
  if(event==='Rendimento' && assetType==='FII') return {bucket:'Rendimentos de FIIs', group:'Isento / não tributável', label:'Rendimento de FII'};
  if(event==='Dividendo') return {bucket:'Dividendos', group:'Isento / não tributável', label:'Dividendo'};
  if(event==='Juros de Renda Fixa') return {bucket:'Juros de Renda Fixa', group:'Tributação exclusiva', label:'Juros de Renda Fixa'};
  if(event==='Reembolso') return {bucket:'Reembolso', group:'Outros', label:'Reembolso'};
  if(event==='Rendimento' && /FII|FUNDO IMOBILIARIO|FUNDOS IMOBILIARIOS|IMOBILIARIO/.test(text)) return {bucket:'Rendimentos de FIIs', group:'Isento / não tributável', label:'Rendimento de FII'};
  if(assetType==='FII' && event!=='JCP') return {bucket:'Rendimentos de FIIs', group:'Isento / não tributável', label:'Rendimento de FII'};
  if(assetType==='Renda Fixa') return {bucket:'Juros de Renda Fixa', group:'Tributação exclusiva', label:event || 'Juros de Renda Fixa'};
  return {bucket:'Outros', group:'Outros', label:event || 'Outro'};
}
function irpfAlertItems(report){
  const items=[];
  const assets=(S.assets||[]);
  const rfAssets=assets.filter(isRendaFixaAsset);
  const noType=assets.filter(a=>!String(a.type||metaTicker(a.ticker).type||'').trim()).slice(0,12);
  const noQty=assets.filter(a=>Number(a.qty)<=0).slice(0,12);
  const noAvg=assets.filter(a=>Number(a.avg_price)<=0 && !isRendaFixaAsset(a)).slice(0,12);
  const noProventoCat=(S.proventos||[])
    .map(p=>({p, cat:irpfProventoCategory(p)}))
    .filter(row=>!row.cat.bucket || row.cat.bucket==='Outros')
    .slice(0,12);
  const rfNoDue=rfAssets.filter(a=>!assetRfMaturityDate(a)).slice(0,12);
  const rfNoCurrent=rfAssets.filter(a=>!assetRfCurrentValueMeta(a).source || assetRfCurrentValueMeta(a).source==='valor aplicado').slice(0,12);
  noType.forEach(a=>items.push({tone:'warn',label:'Ativo sem tipo',value:String(a.ticker||a.name||'—'),hint:'Verifique o tipo antes de fechar a declaração.'}));
  noQty.forEach(a=>items.push({tone:'warn',label:'Ativo sem quantidade',value:String(a.ticker||a.name||'—'),hint:'A posição precisa ter quantidade para compor Bens e Direitos.'}));
  noAvg.forEach(a=>items.push({tone:'warn',label:'Ativo sem preço médio',value:String(a.ticker||a.name||'—'),hint:'O IRPF usa custo de aquisição como referência principal.'}));
  noProventoCat.forEach(row=>items.push({tone:'info',label:'Provento sem categoria',value:String(row.p.ticker||row.p.assetName||'—'),hint:'Classifique dividendos, JCP, FIIs ou outros antes de declarar.'}));
  rfNoDue.forEach(a=>items.push({tone:'warn',label:'Renda fixa sem vencimento',value:String(a.ticker||assetRfName(a)||'—'),hint:'Falta a data de vencimento para conferir o título.'}));
  rfNoCurrent.forEach(a=>items.push({tone:'warn',label:'Renda fixa sem valor atual',value:String(a.ticker||assetRfName(a)||'—'),hint:'Informe valor bruto ou líquido para melhorar a conferência.'}));
  if(!assets.length) items.push({tone:'muted',label:'Sem ativos cadastrados',value:'—',hint:'Cadastre posições para gerar o relatório.'});
  return items;
}
function irpfSummaryMetrics(report, year){
  const byCat=report.provents.reduce((acc,p)=>{
    const cat=irpfProventoCategory(p).bucket;
    acc[cat]=(acc[cat]||0)+(Number(p.value)||0);
    return acc;
  },{});
  const rfValue=report.positions.filter(irpfIsRfPosition).reduce((s,p)=>s+Number(p.cost||0),0);
  const incomplete=irpfAlertItems(report).length;
  return {
    applied: report.totals.yearEndCost,
    provents: report.totals.proventsTotal,
    dividends: byCat['Dividendos']||0,
    jcp: byCat['JCP']||0,
    fii: byCat['Rendimentos de FIIs']||0,
    rf: rfValue,
    positions: report.positions.length,
    alerts: incomplete,
    year
  };
}
function irpfAssetsByCategory(report){
  const rows=report.positions.map(p=>({
    ...p,
    referenceValue:Number(p.marketValue)||0,
    acquisitionValue:Number(p.cost)||0,
    note:p.note || (irpfIsRfPosition(p) ? 'IRPF usa custo de aquisição como base principal.' : 'IRPF normalmente usa custo de aquisição, não valor de mercado.')
  }));
  const buckets=rows.reduce((acc,p)=>{
    if(!acc[p.bucket]) acc[p.bucket]=[];
    acc[p.bucket].push(p);
    return acc;
  },{});
  return {rows,buckets};
}
function irpfProventoSummary(report){
  const rows=report.provents.map(p=>{
    const cat=irpfProventoCategory(p);
    const meta=proventoAssetMeta(p);
    return {
      date:p.date,
      ticker:String(p.ticker||meta.asset?.ticker||'—').trim()||'—',
      assetName:meta.title||p.assetName||p.ticker||'—',
      eventType:proventoTipoCanonical(p.eventType||p.type),
      category:cat.bucket,
      group:cat.group,
      value:Number(p.value)||0,
      source:String(p.source||'').trim()||'—',
      bucket:cat.bucket
    };
  });
  const byAsset=rows.reduce((acc,row)=>{
    const key=row.ticker || row.assetName;
    if(!acc[key]) acc[key]={ticker:row.ticker, assetName:row.assetName, total:0, count:0, dividendos:0, jcp:0, fii:0, outros:0};
    const item=acc[key];
    item.total+=row.value;
    item.count++;
    if(row.bucket==='Dividendos') item.dividendos+=row.value;
    else if(row.bucket==='JCP') item.jcp+=row.value;
    else if(row.bucket==='Rendimentos de FIIs') item.fii+=row.value;
    else item.outros+=row.value;
    return acc;
  },{});
  const byCategory=rows.reduce((acc,row)=>{
    acc[row.bucket]=(acc[row.bucket]||0)+row.value;
    return acc;
  },{});
  return {
    rows:rows.sort((a,b)=>new Date(b.date)-new Date(a.date)||b.value-a.value||a.ticker.localeCompare(b.ticker)),
    byAsset:Object.values(byAsset).sort((a,b)=>b.total-a.total),
    byCategory
  };
}
function irpfRendaFixaRows(report){
  return report.positions
    .filter(irpfIsRfPosition)
    .map(p=>{
      const currentMeta=assetRfCurrentValueMeta(p);
      const due=assetRfMaturityDate(p);
      const app=assetRfApplicationDate(p);
      const alerts=[];
      if(!assetRfContractRate(p)) alerts.push('Sem taxa');
      if(!due) alerts.push('Sem vencimento');
      if(!currentMeta.source || currentMeta.source==='valor aplicado') alerts.push('Sem valor atual');
      return {
        ticker:p.ticker,
        name:assetRfName(p)||p.sector||p.type||p.ticker||'Renda Fixa',
        type:assetRfSubtype(p),
        issuer:String(p.fixed_issuer||p.issuer||'').trim()||'—',
        applied:Number(p.cost)||0,
        current:Number(p.marketValue)||0,
        average:Number(p.avg)||0,
        app,
        due,
        note:p.note || 'IRPF usa custo de aquisição como base principal.',
        alerts,
        source:currentMeta.source || 'valor aplicado'
      };
    })
    .sort((a,b)=>{
      const ad=a.due?new Date(a.due).getTime():9999999999999;
      const bd=b.due?new Date(b.due).getTime():9999999999999;
      return ad-bd || b.applied-a.applied || a.ticker.localeCompare(b.ticker);
    });
}
function irpfCsvBuild(report, year){
  const lines=[];
  const nowLabel=new Date().toLocaleString('pt-BR');
  const summary=irpfSummaryMetrics(report, year);
  const proventos=irpfProventoSummary(report);
  const rfRows=irpfRendaFixaRows(report);
  const alerts=irpfAlertItems(report);
  lines.push(`IRPF;Ano-base;${year}`);
  lines.push(`Gerado em;${nowLabel}`);
  lines.push('ORIGEM;carteira-investimentos');
  lines.push('');
  lines.push('RESUMO');
  lines.push(['Indicador','Valor'].map(irpfCsvEscape).join(';'));
  [
    ['Total aplicado em ativos', summary.applied],
    ['Total de proventos no ano', summary.provents],
    ['Total de dividendos', summary.dividends],
    ['Total de JCP', summary.jcp],
    ['Total de rendimentos de FIIs', summary.fii],
    ['Total de renda fixa', summary.rf],
    ['Quantidade de ativos com posição', summary.positions],
    ['Alertas de dados incompletos', summary.alerts],
  ].forEach(([k,v])=>lines.push([k, fmt(Number(v)||0)].map(irpfCsvEscape).join(';')));
  lines.push('');
  lines.push('BENS_E_DIREITOS');
  lines.push(['Ticker','Classe','Quantidade','Preco medio','Custo de aquisicao','Valor atual referencia','Observacao'].map(irpfCsvEscape).join(';'));
  report.positions.forEach(p=>{
    lines.push([
      p.ticker,
      p.bucket,
      p.qty,
      p.avg,
      p.cost,
      p.marketValue,
      p.note
    ].map(v=>typeof v==='number'?fmt(v):String(v||'')).map(irpfCsvEscape).join(';'));
  });
  lines.push('');
  lines.push('PROVENTOS_DO_ANO');
  lines.push(['Data','Ticker','Ativo','Evento','Categoria','Grupo','Valor','Fonte'].map(irpfCsvEscape).join(';'));
  proventos.rows.forEach(p=>{
    lines.push([p.date,p.ticker,p.assetName,p.eventType,p.category,p.group,p.value,p.source].map(v=>typeof v==='number'?fmt(v):String(v||'')).map(irpfCsvEscape).join(';'));
  });
  lines.push('');
  lines.push('PROVENTOS_POR_CATEGORIA');
  lines.push(['Categoria','Total'].map(irpfCsvEscape).join(';'));
  Object.entries(proventos.byCategory).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
    lines.push([k, fmt(v)].map(irpfCsvEscape).join(';'));
  });
  lines.push('');
  lines.push('PROVENTOS_POR_ATIVO');
  lines.push(['Ticker','Ativo','Total','Qtd lançamentos','Dividendos','JCP','FIIs','Outros'].map(irpfCsvEscape).join(';'));
  proventos.byAsset.forEach(r=>{
    lines.push([r.ticker,r.assetName,r.total,r.count,r.dividendos,r.jcp,r.fii,r.outros].map(v=>typeof v==='number'?fmt(v):String(v||'')).map(irpfCsvEscape).join(';'));
  });
  lines.push('');
  lines.push('RENDA_FIXA');
  lines.push(['Ticker','Tipo','Emissor','Valor aplicado','Valor atual referencia','Data aplicacao','Data vencimento','Fonte','Alertas'].map(irpfCsvEscape).join(';'));
  rfRows.forEach(r=>{
    lines.push([r.ticker,r.type,r.issuer,r.applied,r.current,r.app||'',r.due||'',r.source,r.alerts.join(' | ')||'—'].map(v=>typeof v==='number'?fmt(v):String(v||'')).map(irpfCsvEscape).join(';'));
  });
  lines.push('');
  lines.push('ALERTAS');
  lines.push(['Tipo','Elemento','Observacao'].map(irpfCsvEscape).join(';'));
  alerts.forEach(a=>{
    lines.push([a.label,a.value,a.hint].map(v=>String(v||'')).map(irpfCsvEscape).join(';'));
  });
  return lines.join('\r\n');
}
function irpfExportCSV(){
  return withVisibleValues(()=>{
  const year=irpfSelectedYear();
  const report=irpfBuildYearReport(year);
  const today=new Date();
  const name=`carteira-irpf-${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}-ano-base-${year}.csv`;
  irpfDownloadText(name, irpfCsvBuild(report, year), 'text/csv;charset=utf-8');
  toast(`✅ CSV do IRPF ${year} exportado.`);
  });
}
function irpfExportPdf(){
  return withVisibleValues(()=>{
  const year=irpfSelectedYear();
  const report=irpfBuildYearReport(year);
  const now=new Date().toLocaleString('pt-BR');
  const taxDue=Math.max(0, Number(report.totals.tax)||0);
  const bucketOrder=report.bucketOrder;
  const bucketLabels={Ações:'Ações',FII:'FIIs',ETF:'ETFs',BDR:'BDRs','Renda Fixa':'Renda Fixa'};
  const monthTable=report.months.map(m=>`
    <tr>
      <td>${m.label}</td>
      <td>${fmt(m.salesByBucket['Ações'])}</td>
      <td>${fmt(m.taxByBucket['Ações'])}</td>
      <td>${fmt(m.salesByBucket['FII'])}</td>
      <td>${fmt(m.taxByBucket['FII'])}</td>
      <td>${fmt(m.salesByBucket['ETF'])}</td>
      <td>${fmt(m.taxByBucket['ETF'])}</td>
      <td>${fmt(m.salesByBucket['BDR'])}</td>
      <td>${fmt(m.taxByBucket['BDR'])}</td>
      <td>${fmt(m.salesByBucket['Renda Fixa'])}</td>
      <td>${fmt(m.taxByBucket['Renda Fixa'])}</td>
      <td>${fmt(bucketOrder.reduce((s,b)=>s+Number(m.taxByBucket[b]||0),0))}</td>
    </tr>`).join('');
  const positionGroups=report.bucketOrder.map(bucket=>{
    const rows=(report.positionsByBucket[bucket]||[]).map(p=>`
      <tr>
        <td>${esc(p.ticker)}</td>
        <td>${esc(p.type)}</td>
        <td>${esc(p.sector||'—')}</td>
        <td>${p.qty.toLocaleString('pt-BR',{maximumFractionDigits:8})}</td>
        <td>${fmt(p.cost)}</td>
        <td>${fmt(p.avg)}</td>
        <td>${p.current>0?fmt(p.current):'—'}</td>
        <td>${fmt(p.marketValue)}</td>
      </tr>`).join('');
    return `
        <h3>${esc(bucketLabels[bucket] || bucket)}</h3>
        <table>
          <thead><tr><th>Ticker</th><th>Tipo</th><th>Setor</th><th>Qtd</th><th>Custo</th><th>PM</th><th>Preço atual</th><th>Valor</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="8">Sem posições</td></tr>`}</tbody>
        </table>`;
    }).join('');
  const guideRows=[
    ['Bens e Direitos','Posição em 31/12, custo de aquisição, quantidade e tipo do ativo.','Use para conferir o patrimônio final e os valores da carteira.'],
    ['Renda Variável','Resultado mensal de vendas, lucros, prejuízos e impostos por tipo.','Olhe a apuração mensal antes de preencher GCAP/DARF.'],
    ['Isentos / não tributáveis','Dividendos isentos e operações com isenção mensal aplicável.','Cruze com o informe da corretora e com os proventos lançados.'],
    ['Tributação exclusiva/definitiva','JCP, renda fixa com IR retido e rendimentos na fonte.','Confirme a classificação dos proventos tributáveis.'],
    ['GCAP / DARF','Meses com imposto devido, saldo e prejuízo acumulado.','Veja se existe DARF a recolher antes de transmitir a declaração.'],
  ];
  const guideTableRows=guideRows.map(r=>`<tr><td style="font-weight:700">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
  const executiveCards=[
    {k:'Compras no ano', v:fmt(report.totals.buys), h:'Volume aportado em compras'},
    {k:'Vendas no ano', v:fmt(report.totals.sells), h:'Base para apuração mensal'},
    {k:'DARF estimado', v:fmt(report.totals.tax), h:taxDue>0?'há imposto a revisar':'sem imposto mensal estimado'},
    {k:'Ganhos tributáveis', v:fmt(report.totals.taxableGain), h:'Resultado sujeito à apuração'},
    {k:'Ganhos isentos', v:fmt(report.totals.exemptGain), h:'Parte isenta da renda variável'},
    {k:'Proventos totais', v:fmt(report.totals.proventsTotal), h:'Dividendos/JCP recebidos'},
  ];
  const execCardsHtml=executiveCards.map(c=>`<div class="kpi"><div class="k">${esc(c.k)}</div><div class="v">${esc(c.v)}</div><div class="small">${esc(c.h)}</div></div>`).join('');
  const learningCards=[
    {title:'Bens e Direitos', tag:'Patrimônio', body:'Posição em 31/12, custo de aquisição, quantidade e tipo do ativo. Use esta ficha para conferir o patrimônio final e a base da declaração.'},
    {title:'Renda Variável', tag:'Ganhos e perdas', body:'Resultado mensal de vendas, lucros e prejuízos por tipo. Esta seção ajuda a conferir o que entra em GCAP/DARF.'},
    {title:'Isentos / não tributáveis', tag:'Dividendos', body:'Dividendos isentos e eventos sem incidência. Compare com o informe da corretora e com os proventos lançados aqui.'},
    {title:'Tributação exclusiva/definitiva', tag:'JCP e similares', body:'JCP, renda fixa com IR retido e rendimentos na fonte. Use para validar a classificação dos proventos.'},
    {title:'GCAP / DARF', tag:'Imposto devido', body:'Meses com imposto estimado e saldo a recolher. Aqui você confere o que precisa pagar antes de transmitir a declaração.'},
  ];
  const learningCardsHtml=learningCards.map(c=>`<div class="map-card"><div class="tag">${esc(c.tag)}</div><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></div>`).join('');
  const proventosCount=report.provents.length;
  const html = [
      '<html>',
      '<head>',
      `<title>IRPF ${year}</title>`,
      '<style>',
      '@page{size:A4;margin:12mm}',
      'body{font-family:Arial,sans-serif;margin:0;background:#f3f4f6;color:#111827}',
      '.page{padding:20px 22px}',
      '.sheet{background:#fff;border:1px solid #d6dbe3;border-radius:16px;padding:22px;box-shadow:0 8px 30px rgba(15,23,42,.06)}',
      '.hero{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:16px}',
      '.badge{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:5px 10px;display:inline-block}',
      '.title{font-size:24px;font-weight:800;line-height:1.05;margin-top:8px}',
      '.subtitle{color:#4b5563;font-size:13px;margin-top:6px;max-width:820px;line-height:1.55}',
      '.meta{color:#6b7280;font-size:12px}',
      '.kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0 10px}',
      '.kpi{border:1px solid #d9e1ea;border-radius:14px;padding:12px 12px 11px;background:#fff}',
      '.k{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.08em}',
      '.v{font-size:20px;font-weight:800;margin-top:5px}',
      '.small{font-size:11px;color:#64748b;margin-top:3px;line-height:1.35}',
      '.section{margin-top:20px}',
      '.section h2{font-size:16px;margin:0 0 8px}',
      '.section-note{font-size:12px;color:#64748b;margin-bottom:10px;line-height:1.45}',
      'table{width:100%;border-collapse:collapse;font-size:11px}',
      'th,td{border:1px solid #d1d5db;padding:6px 7px;text-align:left;vertical-align:top}',
      'th{background:#f8fafc}',
      'h3{font-size:13px;margin:14px 0 8px}',
      '.map-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
      '.map-card{border:1px solid #dbe3ee;border-radius:14px;padding:12px;background:#fff}',
      '.map-card .tag{display:inline-block;font-size:10px;color:#0f766e;background:#ecfeff;border:1px solid #a5f3fc;border-radius:999px;padding:4px 8px;margin-bottom:8px}',
      '.map-card h3{font-size:13px;margin:0 0 6px}',
      '.map-card p{font-size:11px;color:#4b5563;line-height:1.5;margin:0}',
      '.page-break{page-break-after:always}',
      '.note{font-size:11px;color:#64748b;line-height:1.45}',
      '@media print {.no-print{display:none}.page{padding:0}.sheet{box-shadow:none;border:none;padding:0}.page-break{break-after:page;page-break-after:always}}',
      '</style>',
      '</head>',
      '<body>',
      '<div class="no-print" style="margin:18px 22px 0;font-size:12px;color:#6b7280">Use imprimir/salvar como PDF no navegador.</div>',
      '<div class="page">',
      '<div class="sheet">',
      '<div class="hero">',
      '<div>',
      '<div class="badge">Relatório IRPF</div>',
      `<div class="title">Declaração IRPF ${year}</div>`,
      `<div class="subtitle">Resumo profissional para conferência da declaração. Este PDF organiza os números da carteira em uma leitura mais clara para apoiar o preenchimento no programa oficial da Receita.</div>`,
      `<div class="meta" style="margin-top:8px">Gerado em ${now}</div>`,
      '</div>',
      `<div style="text-align:right;min-width:180px"><div class="meta">Carteira analisada</div><div style="font-size:28px;font-weight:800;line-height:1.05;margin-top:4px">${fmt(report.totals.yearEndCost)}</div><div class="note" style="margin-top:6px">custo estimado em 31/12</div></div>`,
      '</div>',
      '<div class="kpi-grid">',
      execCardsHtml,
      '</div>',
      '<div class="section">',
      '<h2>Resumo executivo</h2>',
      '<div class="section-note">Leia primeiro esta página para entender a fotografia geral do ano antes de abrir as seções detalhadas.</div>',
      '<div class="note">- Patrimônio em 31/12: valor de custo da carteira<br>- DARF estimado: imposto a revisar antes de enviar<br>- Proventos: entradas de dividendos/JCP acumuladas no ano</div>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="page-break"></div>',
      '<div class="page">',
      '<div class="sheet">',
      '<div class="section">',
      '<h2>Mapa de fichas</h2>',
      '<div class="section-note">Onde lançar cada parte da declaração e como usar este PDF como guia rápido.</div>',
      `<div class="map-grid">${learningCardsHtml}</div>`,
      '<table style="margin-top:14px">',
      '<thead><tr><th>Ficha</th><th>O que entra</th><th>Como usar este app</th></tr></thead>',
      `<tbody>${guideTableRows}</tbody>`,
      '</table>',
      '<div class="note" style="margin-top:10px">Dica: use esta seção como mapa rápido antes de abrir o programa oficial da Receita.</div>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="page-break"></div>',
      '<div class="page">',
      '<div class="sheet">',
      '<div class="section">',
      '<h2>Apuração mensal</h2>',
      '<div class="section-note">Leitura aproximada do que pode virar GCAP/DARF mês a mês.</div>',
      '<table>',
      '<thead><tr><th>Mês</th><th>Ações vendas</th><th>Ações IR</th><th>FII vendas</th><th>FII IR</th><th>ETF vendas</th><th>ETF IR</th><th>BDR vendas</th><th>BDR IR</th><th>Renda Fixa vendas</th><th>Renda Fixa IR</th><th>DARF total</th></tr></thead>',
      `<tbody>${monthTable}</tbody>`,
      '</table>',
      '<div class="note" style="margin-top:10px">Ações comuns podem ter isenção mensal até R$ 20 mil em vendas. FIIs, ETFs, BDRs e Renda Fixa seguem o resultado tributável para conferência.</div>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="page-break"></div>',
      '<div class="page">',
      '<div class="sheet">',
      '<div class="section">',
      '<h2>Posições em 31/12</h2>',
      '<div class="section-note">Separação por bucket para conferir o patrimônio final e a ficha patrimonial.</div>',
      positionGroups,
      '</div>',
      '</div>',
      '</div>',
      '<div class="page-break"></div>',
      '<div class="page">',
      '<div class="sheet">',
      '<div class="section">',
      '<h2>Proventos e checklist final</h2>',
      '<div class="section-note">Conferência de rendimentos recebidos e última revisão antes de transmitir a declaração.</div>',
      '<table>',
      '<thead><tr><th>Ticker</th><th>Data</th><th>Classificação</th><th>Valor</th><th>Tipo</th></tr></thead>',
      `<tbody>${report.provents.map(p=>`<tr><td>${esc(p.ticker)}</td><td>${esc(p.date)}</td><td>${esc(p.bucket)}</td><td>${fmt(p.value)}</td><td>${esc(p.type||'—')}</td></tr>`).join('') || '<tr><td colspan="5">Sem proventos</td></tr>'}</tbody>`,
      '</table>',
      '<div class="section" style="margin-top:16px">',
      '<h2>Checklist final</h2>',
      '<div class="note">1. Conferir posição em 31/12.<br>2. Conferir proventos recebidos no ano.<br>3. Conferir meses com vendas tributáveis e DARF.<br>4. Exportar CSV ou imprimir PDF para revisar antes de entregar.</div>',
      '</div>',
      '</div>',
      '</div>',
      '</div>',
      '</body>',
      '</html>'
    ].join('');
    const w=window.open('about:blank', '_blank', 'noopener,noreferrer,width=1280,height=900');
    if(!w){ alert('O navegador bloqueou a janela de PDF. Permita pop-ups e tente novamente.'); return; }
    try{ w.opener=null; }catch(_e){}
    w.document.open();
    w.document.write(html);
    w.document.close();
    const waitPrint = ()=>{
      try{
        if(!w || w.closed) return;
        if(w.document && w.document.readyState !== 'complete'){
          setTimeout(waitPrint, 200);
          return;
        }
        w.focus();
        w.print();
      }catch(e){}
    };
    setTimeout(waitPrint, 300);
  toast(`🖨️ Janela de impressão aberta para o IRPF ${year}.`);
  });
}
function irpfConferenceMarkup(report){
  const taxDue=Math.max(0, Number(report.totals.tax)||0);
  const bucketPositions=report.bucketOrder.map(bucket=>({
    bucket,
    count:(report.positionsByBucket[bucket]||[]).length,
    value:(report.positionsByBucket[bucket]||[]).reduce((s,p)=>s+Number(p.marketValue||0),0),
  }));
  const items=[
    {label:'Bens e Direitos', value:`${report.positions.length} posições · ${fmt(report.totals.yearEndCost)}`, hint:'use os saldos em 31/12 para conferir a ficha patrimonial'},
    {label:'Rendimentos isentos', value:fmt(report.totals.exemptGain + report.totals.proventsExempt), hint:'ações isentas + proventos isentos'},
    {label:'Rendimentos tributáveis', value:fmt(report.totals.taxableGain + report.totals.proventsTaxable), hint:'ganhos tributáveis e JCP/RF tributados'},
    {label:'DARF estimado', value:taxDue>0 ? fmt(taxDue) : 'Sem DARF', hint:taxDue>0 ? 'emitir e revisar o pagamento' : 'sem imposto mensal estimado'},
    {label:'Prejuízo acumulado', value:report.totals.lossCarry<0 ? fmt(Math.abs(report.totals.lossCarry)) : 'Nenhum', hint:'guarde para compensação futura, se houver'},
  ];
  const bucketRows=bucketPositions.map(b=>`
    <tr>
      <td style="font-weight:700;color:#e2eaf6">${esc(b.bucket)}</td>
      <td>${b.count}</td>
      <td>${fmt(b.value)}</td>
    </tr>`).join('');
  const checklist=[
    taxDue>0 ? 'Gerar DARF do mês/ano apurado antes de declarar.' : 'Conferir se houve mês com imposto devido e sem pagamento.',
    report.positions.length ? 'Revisar posição em 31/12 e conferir se todas as compras/vendas bateram.' : 'Sem posição apurada para revisar.',
    report.provents.length ? 'Conferir rendimentos isentos e tributáveis com informes das corretoras.' : 'Sem proventos no ano selecionado.',
    'Validar os lançamentos na declaração oficial antes do envio.',
  ];
  const fichaCards=[
    {title:'Bens e Direitos', tag:'Patrimônio', body:'Posição em 31/12, custo de aquisição, tipo do ativo e quantidade. Aqui entram ações, FIIs, ETFs, BDRs e outros ativos ainda em carteira.'},
    {title:'Renda Variável', tag:'Ganhos e perdas', body:'Resultado mensal de vendas tributáveis, prejuízo acumulado para compensação e operação por tipo. Ações podem ter faixa isenta mensal; FIIs, ETFs e BDRs seguem regra própria.'},
    {title:'Rendimentos isentos e não tributáveis', tag:'Dividendos', body:'Dividendos isentos, parte isenta de operações e eventos que não entram como imposto pago. Use como apoio para cruzar com o informe da corretora.'},
    {title:'Rendimentos sujeitos à tributação exclusiva/definitiva', tag:'JCP e similares', body:'Juros sobre capital próprio, renda fixa com IR retido e outros rendimentos com tributação na fonte. Servem para conferir com o informe anual.'},
    {title:'GCAP / DARF', tag:'Imposto devido', body:'Meses com lucro tributável e imposto estimado. Se houver DARF, revise o valor e a data de pagamento antes de enviar a declaração.'},
  ];
  return `
  <details class="sec" style="margin-bottom:12px">
    <summary>
      <div>
        <div class="sec-title">Conferência final antes do envio</div>
        <div class="sec-meta">o que revisar para declarar com mais segurança</div>
      </div>
      <div class="sec-meta">${taxDue>0 ? `DARF estimado ${fmt(taxDue)}` : 'sem DARF estimado'}</div>
    </summary>
    <div class="sec-body">
      <div class="cards" style="margin-bottom:14px">
        ${items.map(item=>`
          <div class="card al" style="border-left-color:#60a5fa">
            <div class="cl">${esc(item.label)}</div>
            <div class="cv bl" style="font-size:18px">${esc(item.value)}</div>
            <div class="cs">${esc(item.hint)}</div>
          </div>`).join('')}
      </div>
      <div class="tw" style="margin-bottom:12px"><div class="ts"><table>
        <thead><tr><th>Bucket</th><th>Posições</th><th>Valor de mercado</th></tr></thead>
        <tbody>${bucketRows}</tbody>
      </table></div></div>
      <div class="aic">
        <div style="font-size:13px;line-height:1.8;color:#b8c8de">
          <strong style="color:#f8fafc">Checklist prático</strong><br>
          ${checklist.map((t,i)=>`${i+1}. ${esc(t)}`).join('<br>')}
        </div>
      </div>
    </div>
  </details>`;
}
function irpfFinalSummaryText(report){
  const y=report.year;
  const taxDue=Math.max(0, Number(report.totals.tax)||0);
  const posCount=report.positions.length;
  const provCount=report.provents.length;
  const totalMarket=report.positions.reduce((s,p)=>s+Number(p.marketValue||0),0);
  const buckets=report.bucketOrder.map(bucket=>{
    const data=report.totalsByBucket[bucket]||{};
    const label={ 'Ações':'Ações', 'FII':'FIIs', 'ETF':'ETFs', 'BDR':'BDRs', 'Renda Fixa':'Renda Fixa' }[bucket] || bucket;
    return `${label}: ${fmt(data.realized||0)} realizado, ${fmt(data.tax||0)} IR estimado`;
  }).join('\n');
  return `IRPF ${y}
Resumo para conferência da declaração

1) Posições em 31/12
- ${posCount} posições apuradas
- Valor de mercado estimado: ${fmt(totalMarket)}
- Custo de aquisição em 31/12: ${fmt(report.totals.yearEndCost)}

2) Proventos do ano
- ${provCount} lançamentos
- Total de proventos: ${fmt(report.totals.proventsTotal)}
- Isentos: ${fmt(report.totals.proventsExempt)}
- Tributáveis: ${fmt(report.totals.proventsTaxable)}

3) Apuração e DARF
- Ganhos tributáveis: ${fmt(report.totals.taxableGain)}
- Ganhos isentos: ${fmt(report.totals.exemptGain)}
- DARF estimado: ${fmt(taxDue)}
- Prejuízo acumulado: ${report.totals.lossCarry<0 ? fmt(Math.abs(report.totals.lossCarry)) : 'Nenhum'}

4) Quebra por tipo
${buckets}

Checklist final
- Conferir posição em 31/12 na ficha de Bens e Direitos.
- Conferir rendimentos isentos e tributáveis com os informes.
- Conferir meses com vendas tributáveis e eventual DARF.
- Validar tudo no programa oficial antes de enviar.
`;
}
function irpfTabLegacy(){
  if(Number(S.irpfSeqSeen)!==Number(S.tabSeq||0)){
    S.irpfStep=1;
    S.irpfSeqSeen=Number(S.tabSeq||0);
  }
  const year=irpfSelectedYear();
  const report=irpfBuildYearReport(year);
  const years=irpfYears();
  const step=Math.min(4, Math.max(1, Number(S.irpfStep)||1));
  const safeTax=Math.max(0, report.totals.tax);
  const irpfYear=year;
  const irpfTax=safeTax;
  const irpfPreview=report;
  const bucketOrder=report.bucketOrder;
  const bucketCards=bucketOrder.map(bucket=>{
    const data=report.totalsByBucket[bucket]||{sales:0,realized:0,exempt:0,tax:0,carry:0};
    const title={ 'Ações':'Ações', 'FII':'FIIs', 'ETF':'ETFs', 'BDR':'BDRs', 'Renda Fixa':'Renda Fixa' }[bucket] || bucket;
    return `<div class="card al" style="border-left-color:${bucket==='Ações'?'#818cf8':bucket==='FII'?'#34d399':bucket==='ETF'?'#60a5fa':bucket==='BDR'?'#fbbf24':'#a78bfa'}">
      <div class="cl">${title}</div>
      <div class="cv">${fmt(data.realized||0)}</div>
      <div class="cs">Vendas ${fmt(data.sales||0)} · Imposto ${fmt(data.tax||0)}</div>
    </div>`;
  }).join('');
  const stepLabels={1:'Revisar posições',2:'Revisar proventos',3:'Revisar DARF',4:'Resumo final'};
  const stepButtons=[1,2,3,4].map(n=>`<button class="dash-chip ${step===n?'on':''}" onclick="setIrpfStep(${n})">${n}. ${stepLabels[n]}</button>`).join('');
  const finalSummaryText=irpfFinalSummaryText(report);
  const monthRows=report.months.map(m=>{
    const monthTax=bucketOrder.reduce((s,b)=>s+Number(m.taxByBucket[b]||0),0);
    return `<tr>
      <td style="font-weight:700;color:#e2eaf6">${m.label}</td>
      <td>${fmt(m.salesByBucket['Ações'])}</td>
      <td class="${m.taxByBucket['Ações']>=0?'rd':'mu'}">${fmt(m.taxByBucket['Ações'])}</td>
      <td>${fmt(m.salesByBucket['FII'])}</td>
      <td class="${m.taxByBucket['FII']>=0?'rd':'mu'}">${fmt(m.taxByBucket['FII'])}</td>
      <td>${fmt(m.salesByBucket['ETF'])}</td>
      <td class="${m.taxByBucket['ETF']>=0?'rd':'mu'}">${fmt(m.taxByBucket['ETF'])}</td>
      <td>${fmt(m.salesByBucket['BDR'])}</td>
      <td class="${m.taxByBucket['BDR']>=0?'rd':'mu'}">${fmt(m.taxByBucket['BDR'])}</td>
      <td>${fmt(m.salesByBucket['Renda Fixa'])}</td>
      <td class="${m.taxByBucket['Renda Fixa']>=0?'rd':'mu'}">${fmt(m.taxByBucket['Renda Fixa'])}</td>
      <td class="${monthTax>=0?'rd':'mu'}">${fmt(monthTax)}</td>
    </tr>`;
  }).join('');
  const proventosRows=report.provents.length ? report.provents.map(p=>`
    <tr>
      <td style="font-weight:700;color:#e2eaf6">${esc(p.ticker)}</td>
      <td>${esc(p.date)}</td>
      <td><span class="bdg ${String(p.bucket).includes('Tributação')?'bet':'bfi'}">${esc(p.bucket)}</span></td>
      <td class="gn" style="font-weight:700">${fmt(p.value)}</td>
      <td class="mu">${esc(p.type||'—')}</td>
    </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;color:#2e3f58">Sem proventos lançados para esse ano.</td></tr>';
  const guidedPanel=step===1 ? `
    <details class="sec" open style="margin-top:12px">
      <summary>
        <div>
          <div class="sec-title">Passo 1 - Revisar posições</div>
          <div class="sec-meta">o que vai em Bens e Direitos</div>
        </div>
        <div class="sec-meta">${report.positions.length} posições</div>
      </summary>
      <div class="sec-body">
        <div class="aic" style="margin-bottom:12px;padding:14px 16px">
          <div class="sec-title" style="margin-bottom:4px">Confira agora</div>
          <div class="air" style="white-space:normal">Veja se a quantidade, o custo total e a posição em 31/12 estão coerentes antes de avançar. Se algo parecer fora do lugar, corrija o lançamento de origem.</div>
        </div>
        <div class="cards" style="margin-bottom:14px">${bucketCards}</div>
        <div class="tw"><div class="ts"><table>
          <thead><tr><th>Ticker</th><th>Tipo</th><th>Setor</th><th>Qtd.</th><th>Custo</th><th>PM</th><th>Preço atual</th><th>Valor</th><th>Obs.</th></tr></thead>
          <tbody>${report.positions.map(p=>`
            <tr>
              <td style="font-weight:700;color:#e2eaf6">${esc(p.ticker)}</td>
              <td><span class="bdg ${bdg(p.type)}">${esc(p.type)}</span></td>
              <td class="mu">${esc(p.sector||'—')}</td>
              <td>${p.qty.toLocaleString('pt-BR',{maximumFractionDigits:8})}</td>
              <td>${fmt(p.cost)}</td>
              <td>${fmt(p.avg)}</td>
              <td>${p.current>0?fmt(p.current):'—'}</td>
              <td>${fmt(p.marketValue)}</td>
              <td class="mu">${noteDisplay(p.note)}</td>
            </tr>`).join('')}
          </tbody>
        </table></div></div>
      </div>
    </details>`
  : step===2 ? `
    <details class="sec" open style="margin-top:12px">
      <summary>
        <div>
          <div class="sec-title">Passo 2 - Revisar proventos</div>
          <div class="sec-meta">o que pode ir em isentos ou tributação exclusiva</div>
        </div>
        <div class="sec-meta">${report.provents.length} lançamentos</div>
      </summary>
      <div class="sec-body">
        <div class="aic" style="margin-bottom:12px;padding:14px 16px">
          <div class="sec-title" style="margin-bottom:4px">Conferência rápida</div>
          <div class="air" style="white-space:normal">Confira se dividendos ficaram como isentos, se JCP e rendimentos com IR retido estão classificados como tributação exclusiva e se nada entrou no bucket errado.</div>
        </div>
        <div class="tw"><div class="ts"><table>
          <thead><tr><th>Ticker</th><th>Data</th><th>Tipo</th><th>Valor</th><th>Classificação</th></tr></thead>
          <tbody>${proventosRows}</tbody>
        </table></div></div>
      </div>
    </details>`
  : step===3 ? `
    <details class="sec" open style="margin-top:12px">
      <summary>
        <div>
          <div class="sec-title">Passo 3 - Revisar DARF</div>
          <div class="sec-meta">apuração mensal do que pode gerar imposto</div>
        </div>
        <div class="sec-meta">${year} · ${report.months.length} meses</div>
      </summary>
      <div class="sec-body">
        <div class="aic" style="margin-bottom:12px;padding:14px 16px">
          <div class="sec-title" style="margin-bottom:4px">Olhe estes meses primeiro</div>
          <div class="air" style="white-space:normal">Os meses com IR positivo merecem revisão antes do envio. Ações podem ter isenção até R$ 20 mil no mês, enquanto FIIs, ETFs, BDRs e Renda Fixa seguem a apuração do ganho tributável.</div>
        </div>
        <div class="tw"><div class="ts"><table style="min-width:1600px">
          <thead><tr><th>Mês</th><th>Ações vendas</th><th>Ações IR</th><th>FII vendas</th><th>FII IR</th><th>ETF vendas</th><th>ETF IR</th><th>BDR vendas</th><th>BDR IR</th><th>Renda Fixa vendas</th><th>Renda Fixa IR</th><th>DARF total</th></tr></thead>
          <tbody>${monthRows}</tbody>
        </table></div></div>
      </div>
    </details>`
  : `
    <details class="sec" style="margin-top:12px">
      <summary>
        <div>
          <div class="sec-title">Passo 4 - Resumo final</div>
          <div class="sec-meta">texto pronto para copiar para a declaração</div>
        </div>
        <div class="sec-meta">${safeTax>0 ? `DARF ${fmt(safeTax)}` : 'sem DARF estimado'}</div>
      </summary>
      <div class="sec-body">
        <button class="btn bp" style="width:100%;justify-content:center;margin-bottom:10px" onclick="toggleIrpfFinalSummary()">${S.irpfFinalOpen?'Ocultar resumo final':'Abrir resumo final'}</button>
        ${S.irpfFinalOpen ? `
        <div class="aic" style="padding:14px 14px 12px">
          <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
            <div style="font-size:13px;font-weight:700;color:#c4b5fd">Resumo final pronto para copiar</div>
            <button class="btn bgh" onclick="irpfExportCSV()">Baixar CSV</button>
          </div>
          <div class="air" style="background:#090c15;border:1px solid #161e2e;border-radius:12px;padding:14px">${finalSummaryText.replace(/\n/g,'<br>')}</div>
        </div>` : `
        <div class="es" style="background:#090c15;border:1px dashed #161e2e;border-radius:12px;padding:18px 16px">Resumo final oculto. Clique em <strong style="color:#a5b4fc">Abrir resumo final</strong> para conferir o texto pronto para copiar.</div>`}
      </div>
    </details>`;
  const posSections=bucketOrder.map(bucket=>{
    const rows=(report.positionsByBucket[bucket]||[]).map(p=>`
      <tr>
        <td style="font-weight:700;color:#e2eaf6">${esc(p.ticker)}</td>
        <td><span class="bdg ${bdg(p.type)}">${esc(p.type)}</span></td>
        <td class="mu">${esc(p.sector||'—')}</td>
        <td>${p.qty.toLocaleString('pt-BR',{maximumFractionDigits:8})}</td>
        <td>${fmt(p.cost)}</td>
        <td>${fmt(p.avg)}</td>
        <td>${p.current>0?fmt(p.current):'—'}</td>
        <td>${fmt(p.marketValue)}</td>
        <td class="mu">${noteDisplay(p.note)}</td>
      </tr>`).join('');
    return `<details class="sec" style="margin-top:12px">
      <summary>
        <div>
          <div class="sec-title">${bucket==='Ações'?'Ações':bucket==='FII'?'FIIs':bucket==='ETF'?'ETFs':bucket==='BDR'?'BDRs':'Renda Fixa'}</div>
          <div class="sec-meta">${(report.positionsByBucket[bucket]||[]).length} posições</div>
        </div>
        <div class="sec-meta">${fmt((report.totalsByBucket[bucket]||{}).realized||0)} realizado</div>
      </summary>
      <div class="sec-body">
        <div class="tw"><div class="ts"><table>
          <thead><tr><th>Ticker</th><th>Tipo</th><th>Setor</th><th>Qtd.</th><th>Custo</th><th>PM</th><th>Preço atual</th><th>Valor</th><th>Obs.</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:20px;color:#2e3f58">Sem posições apuradas.</td></tr>'}</tbody>
        </table></div></div>
      </div>
    </details>`;
  }).join('');
  return `<div style="font-size:13px;font-weight:800;margin-bottom:3px;letter-spacing:.01em">🧾 IRPF</div>
  <div class="mu" style="font-size:11px;line-height:1.45;margin-bottom:12px">Apuração anual para declaração, DARF e exportação. A leitura abaixo separa Ações, FIIs, ETFs, BDRs e Renda Fixa.</div>

  <div class="card al" style="margin-bottom:2px;border-left-color:#a78bfa;padding:12px 14px 10px;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div>
        <div class="sec-title" style="font-size:14px;line-height:1.15">Prévia fiscal do ano</div>
        <div class="sec-meta" style="font-size:11px;line-height:1.35;margin-top:3px">Resumo rápido: patrimônio, renda e DARF.</div>
      </div>
      <div class="sec-meta" style="padding-top:2px">${irpfYear}</div>
    </div>
    <div class="cards" style="margin-bottom:0;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">
      <div class="card al" style="margin:0;border-left-color:#34d399;padding:7px 10px;min-height:50px"><div class="cl" style="font-size:10px">Vendas no ano</div><div class="cv gn" style="font-size:15px;line-height:1.05">${fmt(report.totals.sells)}</div><div class="cs" style="font-size:10px">Base da apuração mensal</div></div>
      <div class="card al" style="margin:0;border-left-color:#60a5fa;padding:7px 10px;min-height:50px"><div class="cl" style="font-size:10px">Posições</div><div class="cv bl" style="font-size:15px;line-height:1.05">${irpfPreview.positions.length}</div><div class="cs" style="font-size:10px">Bens e Direitos</div></div>
      <div class="card al" style="margin:0;border-left-color:#fbbf24;padding:7px 10px;min-height:50px"><div class="cl" style="font-size:10px">Proventos</div><div class="cv am" style="font-size:15px;line-height:1.05">${fmt(irpfPreview.totals.proventsTotal)}</div><div class="cs" style="font-size:10px">${irpfPreview.provents.length} lançamentos</div></div>
      <div class="card al" style="margin:0;border-left-color:#f472b6;padding:7px 10px;min-height:50px"><div class="cl" style="font-size:10px">DARF estimado</div><div class="cv" style="color:${irpfTax>0?'#f87171':'#34d399'};font-size:15px;line-height:1.05">${fmt(irpfTax)}</div><div class="cs" style="font-size:10px">Ano-calendário ${irpfYear}</div></div>
    </div>
  </div>

  <div class="cg" style="margin-bottom:6px;gap:6px">
      <div class="card al" style="border-left-color:#818cf8;padding:11px 12px;display:flex;flex-direction:column;gap:7px;min-height:0">
        <div class="fl">Ano-calendário</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <select id="irpf-year" onchange="setIrpfYear(this.value)" style="flex:1 1 160px;min-width:160px" aria-label="Ano-calendário para declaração IRPF">
          ${years.map(y=>`<option value="${y}" ${Number(y)===Number(year)?'selected':''}>${y}</option>`).join('')}
        </select>
        <button class="btn bp" onclick="irpfExportCSV()">⬇️ CSV</button>
        <button class="btn bgh" onclick="irpfExportPdf()">🖨️ PDF</button>
      </div>
      <div class="mu" style="font-size:11px">Escolha o ano para revisar e exportar a declaração.</div>
    </div>
    <div class="card al" style="border-left-color:#34d399;padding:11px 12px;display:flex;flex-direction:column;gap:7px;min-height:0">
      <div class="sh" style="margin-bottom:2px">
        <div>
          <div class="sec-title">Fluxo guiado</div>
          <div class="sec-meta">4 etapas para revisar antes de declarar</div>
        </div>
        <div class="sec-meta">${step}/4 · ${stepLabels[step]}</div>
      </div>
      <div class="dash-filters" style="justify-content:flex-start">${stepButtons}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn bgh" onclick="setIrpfStep(${Math.max(1, step-1)})" ${step===1?'disabled':''}>← Anterior</button>
        <button class="btn bp" onclick="setIrpfStep(${Math.min(4, step+1)})" ${step===4?'disabled':''}>Próximo →</button>
        <button class="btn bgh" onclick="setIrpfStep(1)">Reiniciar</button>
      </div>
    </div>
  </div>

  <details class="sec" style="margin-bottom:10px">
    <summary>
      <div>
        <div class="sec-title">Fluxo guiado em 4 passos</div>
        <div class="sec-meta">toque para abrir e revisar por etapas</div>
      </div>
      <div class="sec-meta">${step}/4 · ${stepLabels[step]}</div>
    </summary>
    <div class="sec-body">
      ${guidedPanel}
    </div>
  </details>

  <details class="sec" style="margin-bottom:10px">
    <summary>
      <div>
        <div class="sec-title">Onde lançar na declaração</div>
        <div class="sec-meta">guia rápido para conferir a ficha certa</div>
      </div>
      <div class="sec-meta">5 fichas principais</div>
    </summary>
    <div class="sec-body">
      <div class="cards" style="margin-bottom:10px;gap:8px">
        ${[
          {title:'Bens e Direitos', kicker:'Patrimônio', color:'#60a5fa'},
          {title:'Renda Variável', kicker:'Ganhos e perdas', color:'#34d399'},
          {title:'Isentos', kicker:'Dividendos e isenções', color:'#fbbf24'},
          {title:'Tributação exclusiva', kicker:'JCP e renda retida', color:'#a78bfa'},
          {title:'GCAP / DARF', kicker:'Imposto devido', color:'#f472b6'},
        ].map(item=>`
          <div class="card al" style="border-left-color:${item.color}">
            <div class="cl">${esc(item.kicker)}</div>
            <div class="cv" style="font-size:18px;color:${item.color}">${esc(item.title)}</div>
          </div>`).join('')}
      </div>
      <div class="tw" style="margin-top:12px"><div class="ts"><table>
        <thead><tr><th>Ficha</th><th>O que entra</th><th>Como o app ajuda</th></tr></thead>
        <tbody>
          <tr><td style="font-weight:700;color:#e2eaf6">Bens e Direitos</td><td>Posição em 31/12, custo de aquisição, quantidade e tipo do ativo.</td><td>Mostra posições por bucket e o valor de mercado/custo.</td></tr>
          <tr><td style="font-weight:700;color:#e2eaf6">Renda Variável</td><td>Lucros e prejuízos de vendas, por mês e por tipo de ativo.</td><td>Exibe apuração mensal e separa Ações, FIIs, ETFs e BDRs.</td></tr>
          <tr><td style="font-weight:700;color:#e2eaf6">Isentos</td><td>Dividendos isentos e operações com isenção mensal aplicável.</td><td>Resume proventos isentos e ganhos isentos estimados.</td></tr>
          <tr><td style="font-weight:700;color:#e2eaf6">Tributação exclusiva</td><td>JCP, renda fixa com IR retido e outros rendimentos retidos na fonte.</td><td>Lista proventos com classificação e valor para conferência.</td></tr>
          <tr><td style="font-weight:700;color:#e2eaf6">GCAP / DARF</td><td>Meses com lucro tributável e imposto a pagar.</td><td>Mostra o DARF estimado e destaca meses que precisam revisão.</td></tr>
        </tbody>
      </table></div></div>
      <div class="mu" style="font-size:12px;margin-top:8px">Dica: a aba não substitui o programa oficial da Receita, mas reduz bastante o trabalho de procurar cada número na hora de preencher.</div>
    </div>
  </details>

  <details class="sec">
    <summary>
      <div>
        <div class="sec-title">Apuração mensal</div>
        <div class="sec-meta">mais próximo do que entra em GCAP/DARF</div>
      </div>
      <div class="sec-meta">${year} · ${report.months.length} meses</div>
    </summary>
    <div class="sec-body">
      <div class="tw"><div class="ts"><table style="min-width:1600px">
        <thead><tr><th>Mês</th><th>Ações vendas</th><th>Ações IR</th><th>FII vendas</th><th>FII IR</th><th>ETF vendas</th><th>ETF IR</th><th>BDR vendas</th><th>BDR IR</th><th>Renda Fixa vendas</th><th>Renda Fixa IR</th><th>DARF total</th></tr></thead>
        <tbody>${monthRows}</tbody>
      </table></div></div>
      <div class="mu" style="font-size:12px;margin-top:8px">Ações comuns ficam isentas quando o total vendido no mês fica até R$ 20 mil. FIIs tendem a tributar em 20%, enquanto ETFs, BDRs e Renda Fixa seguem regra própria. Esta aba não substitui GCAP/contador, mas organiza o que você precisa conferir.</div>
    </div>
  </details>

  <details class="sec" style="margin-top:12px">
    <summary>
      <div>
        <div class="sec-title">Posição em 31/12</div>
        <div class="sec-meta">separação por tipo para a declaração</div>
      </div>
      <div class="sec-meta">${report.positions.length} posições</div>
    </summary>
    <div class="sec-body">
      ${posSections}
    </div>
  </details>

  <details class="sec" style="margin-top:12px">
    <summary>
      <div>
        <div class="sec-title">Proventos do ano</div>
        <div class="sec-meta">base para informar rendimentos</div>
      </div>
      <div class="sec-meta">${report.provents.length} lançamentos</div>
    </summary>
    <div class="sec-body">
      <div class="tw"><div class="ts"><table>
        <thead><tr><th>Ticker</th><th>Data</th><th>Tipo</th><th>Valor</th><th>Classificação</th></tr></thead>
        <tbody>${proventosRows}</tbody>
      </table></div></div>
    </div>
  </details>

  <details class="sec" style="margin-top:12px">
    <summary>
      <div>
        <div class="sec-title">Checklist final</div>
        <div class="sec-meta">revisão antes de entregar</div>
      </div>
      <div class="sec-meta">4 itens</div>
    </summary>
    <div class="sec-body">
      <div class="air" style="white-space:normal">1. Conferir posição em 31/12.<br>2. Conferir proventos recebidos no ano.<br>3. Conferir meses com vendas tributáveis e DARF.<br>4. Exportar CSV ou imprimir PDF para revisar antes de entregar.</div>
    </div>
  </details>`;
}
function irpfTabPremium(){
  const year=irpfSelectedYear();
  const years=irpfYears();
  const report=irpfBuildYearReport(year);
  const summary=irpfSummaryMetrics(report, year);
  const assets=irpfAssetsByCategory(report);
  const proventos=irpfProventoSummary(report);
  const rfRows=irpfRendaFixaRows(report);
  const alerts=irpfAlertItems(report);
  const totalCurrent=report.positions.reduce((sum,p)=>sum+Number(p.marketValue||0),0);
  const gain=totalCurrent-Number(summary.applied||0);
  const gainPct=summary.applied>0 ? (gain/summary.applied*100) : 0;
  const proventoOthers=Math.max(0, Number(summary.provents||0)-Number(summary.dividends||0)-Number(summary.jcp||0)-Number(summary.fii||0));
  const rfAlertRows=rfRows.filter(r=>Array.isArray(r.alerts)&&r.alerts.length).length;
  const rfMissingCurrent=rfRows.filter(r=>Array.isArray(r.alerts)&&r.alerts.includes('Sem valor atual')).length;
  const rfMissingMaturity=rfRows.filter(r=>Array.isArray(r.alerts)&&r.alerts.includes('Sem vencimento')).length;
  const bucketLabels={Ações:'Ações',FII:'FIIs',ETF:'ETFs',BDR:'BDRs','Renda Fixa':'Renda Fixa'};
  const section=(title, sub, badge, body, open=false)=>`
    <details class="sec irpf-section ds-panel ds-panel--readonly" ${open?'open':''} style="margin-top:12px">
      <summary>
        <div>
          <h1 class="irpf-section-title">${esc(title)}</h1>
          <div class="irpf-section-sub">${esc(sub)}</div>
        </div>
        <div class="irpf-section-badge ds-badge">${esc(badge)}</div>
      </summary>
      <div class="irpf-section-body">${body}</div>
    </details>`;
  const summaryCards=[
    {tone:'info', label:'Total aplicado em ativos', value:fmt(summary.applied||0), note:'Custo de aquisição consolidado'},
    {tone:gain>=0?'ok':'warn', label:'Patrimônio estimado', value:fmt(totalCurrent), note:`Diferença de ${gain>=0?'+':''}${fmt(gain)} (${fmtP(gainPct)})`},
    {tone:'info', label:'Total de proventos', value:fmt(summary.provents||0), note:'Dividendos, JCP e FIIs recebidos no ano'},
    {tone:'ok', label:'Dividendos', value:fmt(summary.dividends||0), note:'Rendimentos isentos tradicionais'},
    {tone:'warn', label:'JCP', value:fmt(summary.jcp||0), note:'Tributação exclusiva na fonte'},
    {tone:'info', label:'Rendimentos de FIIs', value:fmt(summary.fii||0), note:'Rendimentos isentos de FIIs'},
    {tone:'warn', label:'Renda fixa', value:fmt(summary.rf||0), note:'Valor aplicado em títulos informados'},
    {tone:summary.positions>0?'info':'muted', label:'Ativos com posição', value:String(summary.positions||0), note:`${summary.positions||0} ativos na carteira`},
  ].map(card=>`
    <div class="irpf-summary-card ds-kpi ${card.tone}">
      <div class="analysis-summary-kicker ds-kpi__label">${esc(card.label)}</div>
      <div class="analysis-summary-value ds-kpi__value">${esc(card.value)}</div>
      <div class="analysis-summary-sub ds-kpi__context">${esc(card.note)}</div>
    </div>`).join('');
  const bucketCards=report.bucketOrder.map(bucket=>{
    const rows=(assets.buckets[bucket]||[]);
    const applied=rows.reduce((sum,p)=>sum+Number(p.cost||0),0);
    const market=rows.reduce((sum,p)=>sum+Number(p.marketValue||0),0);
    const label=bucketLabels[bucket]||bucket;
    return `
      <div class="irpf-summary-card muted ds-kpi">
        <div class="analysis-summary-kicker ds-kpi__label">${esc(label)}</div>
        <div class="analysis-summary-value ds-kpi__value">${rows.length}</div>
        <div class="analysis-summary-sub ds-kpi__context">Custo ${fmt(applied)} · ref. ${fmt(market)}</div>
      </div>`;
  }).join('');
  const positionRows=report.positions.map(p=>`
    <tr>
      <td class="irpf-strong">${esc(p.ticker||'—')}</td>
      <td>${esc(bucketLabels[p.bucket]||p.bucket||'—')}</td>
      <td>${esc(p.type||'—')}</td>
      <td class="irpf-right">${Number(p.qty||0).toLocaleString('pt-BR',{maximumFractionDigits:8})}</td>
      <td class="irpf-right">${fmt(Number(p.avg)||0)}</td>
      <td class="irpf-right">${fmt(Number(p.cost)||0)}</td>
      <td class="irpf-right">${Number(p.marketValue)>0?fmt(Number(p.marketValue)||0):'—'}</td>
      <td class="irpf-muted">${esc(p.note||'IRPF usa custo de aquisição como referência principal.')}</td>
    </tr>`).join('');
  const positionMobile=report.positions.map(p=>`
    <div class="irpf-mobile-row">
      <div>
        <h2 class="premium-row-title">${esc(p.ticker||'—')}</h2>
        <div class="premium-row-sub">${esc(bucketLabels[p.bucket]||p.bucket||'—')} · ${esc(p.type||'—')}</div>
        <div class="premium-row-sub">Qtd. ${Number(p.qty||0).toLocaleString('pt-BR',{maximumFractionDigits:8})} · PM ${fmt(Number(p.avg)||0)}</div>
        <div class="premium-row-sub">${esc(p.note||'IRPF usa custo de aquisição como referência principal.')}</div>
      </div>
      <div class="irpf-mobile-value">
        Custo ${fmt(Number(p.cost)||0)}
        <div class="premium-row-sub">${Number(p.marketValue)>0?`Ref. ${fmt(Number(p.marketValue)||0)}`:'Sem valor de referência'}</div>
      </div>
    </div>`).join('');
  const proventoCategoryCards=[
    {label:'Dividendos', value:summary.dividends||0, tone:'ok', note:'Rendimentos isentos tradicionais'},
    {label:'JCP', value:summary.jcp||0, tone:'warn', note:'Tributação exclusiva'},
    {label:'FIIs', value:summary.fii||0, tone:'info', note:'Rendimentos de FIIs'},
    {label:'Outros', value:proventoOthers, tone:'muted', note:'Eventos fora das categorias principais'},
  ].map(card=>`
    <div class="irpf-summary-card ds-kpi ${card.tone}">
      <div class="analysis-summary-kicker ds-kpi__label">${esc(card.label)}</div>
      <div class="analysis-summary-value ds-kpi__value">${fmt(card.value)}</div>
      <div class="analysis-summary-sub ds-kpi__context">${esc(card.note)}</div>
    </div>`).join('');
  const proventoRows=proventos.byAsset.length ? proventos.byAsset.map(r=>`
    <tr>
      <td class="irpf-strong">${esc(r.ticker||'—')}</td>
      <td>${esc(r.assetName||'—')}</td>
      <td class="irpf-right">${fmt(Number(r.total)||0)}</td>
      <td class="irpf-right">${Number(r.count||0)}</td>
      <td class="irpf-right">${fmt(Number(r.dividendos)||0)}</td>
      <td class="irpf-right">${fmt(Number(r.jcp)||0)}</td>
      <td class="irpf-right">${fmt(Number(r.fii)||0)}</td>
      <td class="irpf-right">${fmt(Number(r.outros)||0)}</td>
    </tr>`).join('') : '<tr><td colspan="8" class="irpf-muted" style="text-align:center;padding:18px">Sem proventos lançados no ano selecionado.</td></tr>';
  const proventoMobile=proventos.byAsset.length ? proventos.byAsset.map(r=>`
    <div class="irpf-mobile-row">
      <div>
        <h2 class="premium-row-title">${esc(r.ticker||'—')}</h2>
        <div class="premium-row-sub">${esc(r.assetName||'—')}</div>
        <div class="premium-row-sub">${Number(r.count||0)} lançamentos · Dividendos ${fmt(Number(r.dividendos)||0)} · JCP ${fmt(Number(r.jcp)||0)}</div>
      </div>
      <div class="irpf-mobile-value">
        ${fmt(Number(r.total)||0)}
        <div class="premium-row-sub">FIIs ${fmt(Number(r.fii)||0)} · Outros ${fmt(Number(r.outros)||0)}</div>
      </div>
    </div>`).join('') : '<div class="premium-empty ds-empty-state">Sem proventos lançados no ano selecionado.</div>';
  const rfSummaryCards=[
    {label:'Total aplicado em RF', value:fmt(summary.rf||0), tone:'warn', note:'Base declarada em títulos de renda fixa'},
    {label:'Títulos de RF', value:String(rfRows.length), tone:'info', note:'Itens com leitura auxiliar para IRPF'},
    {label:'Com alertas', value:String(rfAlertRows), tone:rfAlertRows?'warn':'ok', note:'Sem vencimento, taxa ou valor atual'},
    {label:'Sem valor atual', value:String(rfMissingCurrent), tone:rfMissingCurrent?'warn':'ok', note:'Informe o valor bruto ou líquido da corretora'},
  ].map(card=>`
    <div class="irpf-summary-card ds-kpi ${card.tone}">
      <div class="analysis-summary-kicker ds-kpi__label">${esc(card.label)}</div>
      <div class="analysis-summary-value ds-kpi__value">${esc(card.value)}</div>
      <div class="analysis-summary-sub ds-kpi__context">${esc(card.note)}</div>
    </div>`).join('');
  const rfRowsHtml=rfRows.length ? rfRows.map(r=>`
    <tr>
      <td class="irpf-strong">${esc(r.ticker||'—')}</td>
      <td>${esc(r.name||'—')}</td>
      <td>${esc(r.type||'—')}</td>
      <td>${esc(r.issuer||'—')}</td>
      <td class="irpf-right">${fmt(Number(r.applied)||0)}</td>
      <td class="irpf-right">${fmt(Number(r.current)||0)}</td>
      <td class="irpf-right">${esc(r.app||'—')}</td>
      <td class="irpf-right">${esc(r.due||'—')}</td>
      <td>${esc((r.alerts||[]).join(' · ')||'—')}</td>
    </tr>`).join('') : '<tr><td colspan="9" class="irpf-muted" style="text-align:center;padding:18px">Sem títulos de renda fixa classificados para o ano selecionado.</td></tr>';
  const rfMobile=rfRows.length ? rfRows.map(r=>`
    <div class="irpf-mobile-row">
      <div>
        <h2 class="premium-row-title">${esc(r.ticker||'—')}</h2>
        <div class="premium-row-sub">${esc(r.name||'—')}</div>
        <div class="premium-row-sub">${esc(r.type||'—')} · ${esc(r.issuer||'—')}</div>
        <div class="premium-row-sub">${esc(r.app||'—')} · ${esc(r.due||'—')}</div>
      </div>
      <div class="irpf-mobile-value">
        ${fmt(Number(r.applied)||0)}
        <div class="premium-row-sub">${fmt(Number(r.current)||0)} · ${(r.alerts||[]).join(' · ')||'sem alertas'}</div>
      </div>
    </div>`).join('') : '<div class="premium-empty ds-empty-state">Sem títulos de renda fixa classificados para o ano selecionado.</div>';
  const alertCards=alerts.length ? alerts.map(a=>`
    <div class="irpf-summary-card ds-kpi ${a.tone==='danger'?'danger':a.tone==='warn'?'warn':a.tone==='ok'?'ok':'muted'}">
      <div class="analysis-summary-kicker ds-kpi__label">${esc(a.label)}</div>
      <div class="analysis-summary-value ds-kpi__value">${esc(a.value)}</div>
      <div class="analysis-summary-sub ds-kpi__context">${esc(a.hint)}</div>
    </div>`).join('') : `
      <div class="irpf-summary-card ok ds-kpi ds-kpi--positive">
        <div class="analysis-summary-kicker ds-kpi__label">Conferência limpa</div>
        <div class="analysis-summary-value ds-kpi__value">Sem alertas</div>
        <div class="analysis-summary-sub ds-kpi__context">Os dados principais estão completos para revisão.</div>
      </div>`;
  const cgTotals=report.totals||{};
  const cgKpis=[
    {label:'Vendas no ano', value:fmt(cgTotals.sells||0), tone:'info', note:'Total vendido em operações'},
    {label:'Ganho tributável', value:fmt(Math.max(0,cgTotals.taxableGain||0)), tone:'warn', note:'Base para cálculo do imposto'},
    {label:'Imposto estimado', value:fmt(cgTotals.tax||0), tone:Number(cgTotals.tax||0)>0?'warn':'ok', note:'Estimativa com alíquotas padrão'},
    {label:'Ganho isento', value:fmt(Math.max(0,cgTotals.exemptGain||0)), tone:'ok', note:'Ações com vendas até R$ 20 mil no mês'},
    {label:'Prejuízo a compensar', value:fmt(Math.abs(cgTotals.lossCarry||0)), tone:Number(cgTotals.lossCarry||0)<0?'danger':'ok', note:'Saldo de prejuízo acumulado'}
  ].map(card=>`
    <div class="irpf-summary-card ${card.tone}">
      <div class="analysis-summary-kicker">${esc(card.label)}</div>
      <div class="analysis-summary-value">${esc(card.value)}</div>
      <div class="analysis-summary-sub">${esc(card.note)}</div>
    </div>`).join('');
  const cgBucketRows=report.bucketOrder.map(bucket=>{
    const t=report.totalsByBucket[bucket]||{sales:0,realized:0,exempt:0,tax:0,carry:0};
    return `
    <tr>
      <td class="irpf-strong">${esc(bucketLabels[bucket]||bucket)}</td>
      <td class="irpf-right">${fmt(Number(t.sales)||0)}</td>
      <td class="irpf-right">${fmt(Number(t.realized)||0)}</td>
      <td class="irpf-right">${fmt(Number(t.exempt)||0)}</td>
      <td class="irpf-right">${fmt(Number(t.tax)||0)}</td>
      <td class="irpf-right">${Number(t.carry)<0?fmt(Math.abs(Number(t.carry))):'—'}</td>
    </tr>`;
  }).join('');
  const cgMonthRows=report.months
    .filter(m=>Number(m.sells||0)>0 || Number(m.buys||0)>0)
    .map(m=>{
      const sells=report.bucketOrder.reduce((s,b)=>s+Number(m.salesByBucket[b]||0),0);
      const realized=report.bucketOrder.reduce((s,b)=>s+Number(m.realizedByBucket[b]||0),0);
      const exempt=Number(m.exemptByBucket['Ações']||0);
      const tax=report.bucketOrder.reduce((s,b)=>s+Number(m.taxByBucket[b]||0),0);
      const carry=report.bucketOrder.reduce((s,b)=>s+Number(m.carryByBucket[b]||0),0);
      return `
      <tr>
        <td class="irpf-strong">${esc(m.label)}</td>
        <td class="irpf-right">${fmt(sells)}</td>
        <td class="irpf-right">${fmt(realized)}</td>
        <td class="irpf-right">${fmt(exempt)}</td>
        <td class="irpf-right">${fmt(tax)}</td>
        <td class="irpf-right">${carry<0?fmt(Math.abs(carry)):'—'}</td>
      </tr>`;
    }).join('');
  const cgBucketMobile=report.bucketOrder.map(bucket=>{
    const t=report.totalsByBucket[bucket]||{sales:0,realized:0,exempt:0,tax:0,carry:0};
    return `
    <div class="irpf-mobile-row">
      <div>
        <h2 class="premium-row-title">${esc(bucketLabels[bucket]||bucket)}</h2>
        <div class="premium-row-sub">Resultado ${fmt(Number(t.realized)||0)} · Isento ${fmt(Number(t.exempt)||0)}</div>
        <div class="premium-row-sub">Prejuízo a compensar ${Number(t.carry)<0?fmt(Math.abs(Number(t.carry))):'—'}</div>
      </div>
      <div class="irpf-mobile-value">
        ${fmt(Number(t.sales)||0)}
        <div class="premium-row-sub">Imposto ${fmt(Number(t.tax)||0)}</div>
      </div>
    </div>`;
  }).join('');
  const cgMonthMobile=report.months
    .filter(m=>Number(m.sells||0)>0 || Number(m.buys||0)>0)
    .map(m=>{
      const sells=report.bucketOrder.reduce((s,b)=>s+Number(m.salesByBucket[b]||0),0);
      const realized=report.bucketOrder.reduce((s,b)=>s+Number(m.realizedByBucket[b]||0),0);
      const exempt=Number(m.exemptByBucket['Ações']||0);
      const tax=report.bucketOrder.reduce((s,b)=>s+Number(m.taxByBucket[b]||0),0);
      const carry=report.bucketOrder.reduce((s,b)=>s+Number(m.carryByBucket[b]||0),0);
      return `
      <div class="irpf-mobile-row">
        <div>
          <h2 class="premium-row-title">${esc(m.label)}</h2>
          <div class="premium-row-sub">Resultado ${fmt(realized)} · Isento ${fmt(exempt)}</div>
          <div class="premium-row-sub">Prejuízo a compensar ${carry<0?fmt(Math.abs(carry)):'—'}</div>
        </div>
        <div class="irpf-mobile-value">
          ${fmt(sells)}
          <div class="premium-row-sub">Imposto ${fmt(tax)}</div>
        </div>
      </div>`;
    }).join('');
  const cgEmpty=Number(cgTotals.sells||0)<=0 && Number(cgTotals.buys||0)<=0;
  const documentCards=[
    {label:'Resumo em CSV', icon:'⬇️', sub:'Exporta operações, bens e proventos do ano para conferência externa em planilha.', action:'irpfExportCSV()'},
    {label:'Relatório em PDF', icon:'🖨️', sub:'Gera o relatório auxiliar de IRPF para arquivo ou impressão.', action:'irpfExportPdf()'}
  ].map(d=>`
      <div class="irpf-summary-card info ds-kpi">
      <div class="analysis-summary-kicker ds-kpi__label">${esc(d.label)}</div>
      <div class="analysis-summary-value ds-kpi__value">${esc(d.icon)}</div>
      <div class="analysis-summary-sub ds-kpi__context">${esc(d.sub)}</div>
      <button class="btn bgh ds-button ds-button--secondary" onclick="${d.action}" style="margin-top:8px;min-height:44px">Baixar</button>
    </div>`).join('');
  return `
    <div class="irpf-shell">
      <div class="irpf-head">
        <div style="min-width:0">
          <div class="irpf-badge ds-badge ds-badge--info">Relatório auxiliar de IRPF</div>
          <div class="irpf-title" style="margin-top:7px">Relatório IRPF ${year}</div>
          <div class="irpf-sub">Ferramenta de conferência para bens, proventos e renda fixa. Use como apoio e valide sempre com os informes oficiais da corretora e documentos fiscais.</div>
          <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">
            <span class="irpf-badge ds-badge ${summary.alerts ? 'warn ds-badge--warning':'ok ds-badge--positive'}">${summary.alerts} alerta${summary.alerts===1?'':'s'}</span>
            <span class="irpf-badge ds-badge">${summary.positions} ativo${summary.positions===1?'':'s'} com posição</span>
            <span class="irpf-badge ds-badge">Base: custo de aquisição</span>
          </div>
        </div>
        <div class="irpf-yearbox">
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
            <select id="irpf-year-report" aria-label="Ano-calendário do relatório" onchange="setIrpfYear(this.value)" style="min-width:160px">
              ${years.map(y=>`<option value="${y}" ${Number(y)===Number(year)?'selected':''}>${y}</option>`).join('')}
            </select>
            <button class="btn bp ds-button ds-button--primary" onclick="irpfExportCSV()">⬇️ CSV</button>
            <button class="btn bgh ds-button ds-button--secondary" onclick="irpfExportPdf()">🖨️ PDF</button>
          </div>
          <div class="irpf-sub" style="text-align:right">Ano-base ${year} · ${proventos.rows.length} proventos · ${rfRows.length} títulos RF</div>
        </div>
      </div>

      <div class="irpf-summary">${summaryCards}</div>

      <details class="sec irpf-section ds-panel ds-panel--readonly" style="margin-top:12px">
        <summary>
          <div>
            <h2 class="irpf-section-title">Bens e Direitos</h2>
            <div class="irpf-section-sub">Custo de aquisição, quantidade e valor atual apenas como referência.</div>
          </div>
          <div class="irpf-section-badge ds-badge">${summary.positions} posições · clique para exibir</div>
        </summary>
        <div class="irpf-section-body">
          <div class="irpf-section-grid">${bucketCards}</div>
          <div class="irpf-table-wrap">
            <table class="irpf-table">
              <thead>
                <tr>
                  <th>Ticker</th><th>Classe</th><th>Tipo</th><th class="irpf-right">Qtd.</th><th class="irpf-right">PM</th><th class="irpf-right">Custo</th><th class="irpf-right">Ref.</th><th>Observação</th>
                </tr>
              </thead>
              <tbody>${positionRows || '<tr><td colspan="8" class="irpf-muted" style="text-align:center;padding:18px">Sem posições para o ano selecionado.</td></tr>'}</tbody>
            </table>
          </div>
          <div class="irpf-mobile-list">${positionMobile || '<div class="premium-empty ds-empty-state">Sem posições para o ano selecionado.</div>'}</div>
          <div class="irpf-sub">IRPF normalmente usa custo de aquisição. O valor de mercado serve apenas como referência visual para a conferência.</div>
        </div>
      </details>

      <details class="sec irpf-section ds-panel ds-panel--readonly" style="margin-top:12px">
        <summary>
          <div>
            <h2 class="irpf-section-title">Proventos do ano</h2>
            <div class="irpf-section-sub">Dividendos, JCP, FIIs e outros eventos com total por ativo e por categoria.</div>
          </div>
          <div class="irpf-section-badge ds-badge">${proventos.rows.length} lançamentos · clique para abrir</div>
        </summary>
        <div class="irpf-section-body">
          <div class="irpf-section-grid">${proventoCategoryCards}</div>
          <div class="irpf-table-wrap">
            <table class="irpf-table">
              <thead>
                <tr>
                  <th>Ticker</th><th>Ativo</th><th class="irpf-right">Total</th><th class="irpf-right">Lanç.</th><th class="irpf-right">Dividendos</th><th class="irpf-right">JCP</th><th class="irpf-right">FIIs</th><th class="irpf-right">Outros</th>
                </tr>
              </thead>
              <tbody>${proventoRows}</tbody>
            </table>
          </div>
          <div class="irpf-mobile-list">${proventoMobile}</div>
          <div class="irpf-sub">Esta visão ajuda a conferir o que entra em rendimentos isentos, tributação exclusiva e eventos classificados como outros.</div>
        </div>
      </details>

      <details class="sec irpf-section ds-panel ds-panel--readonly" style="margin-top:12px">
        <summary>
          <div>
            <h2 class="irpf-section-title">Ganhos de capital</h2>
            <div class="irpf-section-sub">Vendas, resultado, isenção, imposto estimado e prejuízo a compensar por classe e por mês.</div>
          </div>
          <div class="irpf-section-badge ds-badge">${cgEmpty?'sem operações':`${fmt(cgTotals.sells||0)} em vendas · clique para abrir`}</div>
        </summary>
        <div class="irpf-section-body">
          <div class="irpf-section-grid">${cgKpis}</div>
          ${cgEmpty
            ? `<div class="premium-empty ds-empty-state">Sem operações de compra ou venda no ano selecionado.</div>`
            : `<div class="irpf-table-wrap">
              <table class="irpf-table">
                <thead>
                  <tr>
                    <th>Classe</th><th class="irpf-right">Vendas</th><th class="irpf-right">Resultado</th><th class="irpf-right">Isento</th><th class="irpf-right">Imposto est.</th><th class="irpf-right">Prejuízo</th>
                  </tr>
                </thead>
                <tbody>${cgBucketRows}</tbody>
              </table>
            </div>
            <div class="irpf-mobile-list">${cgBucketMobile}</div>
            <div class="irpf-sub">Totais por classe a partir do custo médio das posições. Imposto é estimativa; consulte o DARF emitido pela corretora.</div>
            <div class="irpf-table-wrap">
              <table class="irpf-table">
                <thead>
                  <tr>
                    <th>Mês</th><th class="irpf-right">Vendas</th><th class="irpf-right">Resultado</th><th class="irpf-right">Isento</th><th class="irpf-right">Imposto est.</th><th class="irpf-right">Prejuízo</th>
                  </tr>
                </thead>
                <tbody>${cgMonthRows}</tbody>
              </table>
            </div>
            <div class="irpf-mobile-list">${cgMonthMobile}</div>
            <div class="irpf-sub">Evolução mensal de vendas e resultado. Isenção vale para ações com vendas totais de até R$ 20 mil no mês.</div>`}
        </div>
      </details>

      <details class="sec irpf-section ds-panel ds-panel--readonly" style="margin-top:12px">
        <summary>
          <div>
            <h2 class="irpf-section-title">Renda Fixa para IRPF</h2>
            <div class="irpf-section-sub">Títulos com valor aplicado, valor atual/líquido e alertas de conferência.</div>
          </div>
          <div class="irpf-section-badge ds-badge">${rfRows.length} títulos · ${rfAlertRows} com alerta</div>
        </summary>
        <div class="irpf-section-body">
          <div class="irpf-section-grid">${rfSummaryCards}</div>
          <div class="irpf-table-wrap">
            <table class="irpf-table">
              <thead>
                <tr>
                  <th>Ticker</th><th>Nome</th><th>Tipo</th><th>Instituição</th><th class="irpf-right">Aplicado</th><th class="irpf-right">Atual</th><th class="irpf-right">Aplicação</th><th class="irpf-right">Vencimento</th><th>Alertas</th>
                </tr>
              </thead>
              <tbody>${rfRowsHtml}</tbody>
            </table>
          </div>
          <div class="irpf-mobile-list">${rfMobile}</div>
          <div class="irpf-sub">${rfMissingMaturity || rfMissingCurrent ? `Há ${rfMissingMaturity} título${rfMissingMaturity===1?'':'s'} sem vencimento e ${rfMissingCurrent} sem valor atual informado.` : 'Títulos de renda fixa com dados suficientes para conferência visual.'}</div>
        </div>
      </details>

      <details class="sec irpf-section ds-panel ds-panel--readonly" style="margin-top:12px">
        <summary>
          <div>
            <h2 class="irpf-section-title">Documentos disponíveis</h2>
            <div class="irpf-section-sub">Arquivos gerados com os dados do ano selecionado para conferência externa.</div>
          </div>
          <div class="irpf-section-badge ds-badge">2 documentos · clique para abrir</div>
        </summary>
        <div class="irpf-section-body">
          <div class="irpf-section-grid">${documentCards}</div>
          <div class="irpf-sub">O sistema gera somente estes dois documentos auxiliares. DARF, informes de rendimentos e outros documentos oficiais devem vir da corretora ou da Receita Federal.</div>
        </div>
      </details>

      <details class="sec irpf-section ds-panel ds-panel--readonly" style="margin-top:12px">
        <summary>
          <div>
            <h2 class="irpf-section-title">Alertas para conferência</h2>
            <div class="irpf-section-sub">Itens que merecem revisão antes de usar os dados na declaração.</div>
          </div>
          <div class="irpf-section-badge ds-badge">${alerts.length} alerta${alerts.length===1?'':'s'} · clique para abrir</div>
        </summary>
        <div class="irpf-section-body">
          <div class="irpf-section-grid">${alertCards}</div>
          <div class="irpf-sub">A ferramenta aponta pendências, mas a conferência final deve ser feita com informes oficiais da corretora e documentos fiscais.</div>
        </div>
      </details>
    </div>`;
}

function irpfTab(){
  return irpfTabPremium();
}
