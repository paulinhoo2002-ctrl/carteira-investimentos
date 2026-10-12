/* Read-only reporting helpers. No persistence, financial formulas or side effects. */
(function(root, factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.ExecutiveReportingModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const PERIODS=['month','3m','6m','year','12m','all'];
  const finite=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
  const text=value=>String(value??'').trim();

  function normalizePeriod(value){
    return PERIODS.includes(String(value||''))?String(value):'12m';
  }

  function periodLabel(value){
    const labels={month:'Mês atual','3m':'Últimos 3 meses','6m':'Últimos 6 meses',year:'Ano atual','12m':'Últimos 12 meses',all:'Todos os dados'};
    return labels[normalizePeriod(value)];
  }

  function periodStart(value, now=new Date()){
    const period=normalizePeriod(value);
    const date=new Date(now);
    if(Number.isNaN(date.getTime())||period==='all') return null;
    if(period==='year') return new Date(date.getFullYear(),0,1);
    if(period==='month') return new Date(date.getFullYear(),date.getMonth(),1);
    const months={ '3m':2, '6m':5, '12m':11 };
    return new Date(date.getFullYear(),date.getMonth()-(months[period]??11),1);
  }

  function dateAllowed(value,period='12m',now=new Date(),parseDate=value=>new Date(value)){
    if(normalizePeriod(period)==='all') return true;
    const date=parseDate(value);
    if(!(date instanceof Date)||Number.isNaN(date.getTime())) return false;
    const start=periodStart(period,now);
    return !start||date>=start;
  }

  function reconcile(reportValue,sourceValue,{label='valor',tolerance=0.01}={}){
    const report=finite(reportValue);
    const source=finite(sourceValue);
    if(report===null||source===null) return {label,status:'UNAVAILABLE',report,source,difference:null};
    const difference=report-source;
    return {label,status:Math.abs(difference)<=tolerance?'PASS':'MISMATCH',report,source,difference};
  }

  function buildSummary({assetCount,portfolioValue,topShare,classCount,incomeValue,sectorCoverage}={}){
    const parts=[];
    if(Number.isFinite(Number(assetCount))) parts.push(`A carteira possui ${Number(assetCount)} posições acompanhadas.`);
    const top=finite(topShare);
    if(top!==null) parts.push(`Os maiores ativos representam ${top.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}% do patrimônio conhecido.`);
    if(Number.isFinite(Number(classCount))) parts.push(`${Number(classCount)} classes identificadas.`);
    const income=finite(incomeValue);
    if(income!==null) parts.push(`Proventos no recorte: R$ ${income.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}.`);
    const coverage=finite(sectorCoverage);
    if(coverage!==null) parts.push(`${coverage.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}% do patrimônio conhecido possui setor informado.`);
    return parts.join(' ');
  }

  function buildViewModel(input={}){
    const reconciliations={
      patrimony:reconcile(input.reportPortfolioValue,input.dashboardPortfolioValue,{label:'Patrimônio'}),
      fixedIncome:reconcile(input.reportFixedIncomeValue,input.authoritativeFixedIncomeValue,{label:'Renda Fixa'}),
      dividends:reconcile(input.reportDividendsValue,input.ledgerDividendsValue,{label:'Proventos'}),
      allocation:reconcile(input.reportAllocationValue,input.knownAllocationValue,{label:'Alocação'})
    };
    return Object.freeze({
      readOnly:true,
      period:normalizePeriod(input.period),
      periodLabel:periodLabel(input.period),
      reconciliations:Object.freeze(reconciliations),
      summary:buildSummary(input),
      coverage:{
        assets:finite(input.assetCoverage),
        sector:finite(input.sectorCoverage),
        issuer:finite(input.issuerCoverage)
      }
    });
  }

  return {PERIODS,normalizePeriod,periodLabel,periodStart,dateAllowed,reconcile,buildSummary,buildViewModel};
});
