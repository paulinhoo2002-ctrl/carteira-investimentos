/* Read-only portfolio intelligence model. It never reads storage or writes data. */
(function(root,factory){
  const readiness=root?.PortfolioReportReadiness || (typeof require==='function' ? require('./portfolio-report-readiness.js') : null);
  const api=factory(readiness);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PortfolioReportModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(readinessApi){
  const finite=value=>value===null||value===undefined||value===''||typeof value==='boolean'?null:Number.isFinite(Number(value))?Number(value):null;
  const array=value=>Array.isArray(value)?value:[];
  const text=(value,fallback='')=>String(value??'').trim()||fallback;
  const clone=value=>JSON.parse(JSON.stringify(value));
  function metric(value,provenance,reason){
    const number=finite(value);
    return {value:number,status:number===null?'UNAVAILABLE':'AVAILABLE',provenance:text(provenance,'legacy-domain'),reason:number===null?text(reason,'Dados não disponíveis na base atual.'):null};
  }
  function section(status,items,meta={}){
    return {status,items:array(items).map(clone),provenance:text(meta.provenance,'legacy-domain'),freshness:meta.freshness??null,reason:meta.reason??null};
  }
  function normalizePerformance(performance={}){
    const status=text(performance.status,'INSUFFICIENT_DATA');
    const allowed=new Set(['AVAILABLE','TRACKING_STARTED','PARTIAL','INSUFFICIENT_DATA','UNAVAILABLE']);
    return {status:allowed.has(status)?status:'UNAVAILABLE',value:finite(performance.value),startDate:performance.startDate??null,scope:text(performance.scope,'Carteira total'),reason:performance.reason??(status==='AVAILABLE'?null:'Coletando histórico suficiente para calcular este retorno.')};
  }
  function buildPortfolioReportModel(input={}){
    const summary=input.summary||{};
    const portfolio=summary.portfolio||input.portfolio||{};
    const income=summary.income||input.income||{};
    const assets=array(input.assets||summary.assets);
    const fixed=array(input.fixedIncome||summary.fixedIncome);
    const proventos=array(input.proventos||summary.proventos);
    const allocation=array(input.allocation||summary.allocation);
    const concentration=array(input.concentration||summary.concentration);
    const quality=input.quality||{};
    const performance=normalizePerformance(input.performance||{});
    const valueCoverage=finite(input.valueCoverage??quality.valueCoverage);
    const freshness=input.freshness??quality.freshness??null;
    const provenance=input.provenance||{};
    const values={
      portfolioValue:metric(portfolio.tC??portfolio.totalValue,input.provenance?.portfolioValue,'Patrimônio atual ainda não possui valor consolidado.'),
      invested:metric(portfolio.tI??portfolio.investedValue,input.provenance?.invested,'Custo aplicado não está disponível para este recorte.'),
      marketResult:metric(portfolio.tG??portfolio.result,input.provenance?.marketResult,'Resultado de mercado não está disponível para este recorte.'),
      returnPercent:metric(portfolio.tGP??portfolio.returnPercent,input.provenance?.returnPercent,'Rentabilidade não está disponível para este recorte.'),
      incomeReceived:metric(income.total12??income.received,input.provenance?.incomeReceived,'Proventos recebidos não estão disponíveis para este recorte.'),
      incomeExpected:metric(income.expected,input.provenance?.incomeExpected,'Não há base suficiente para proventos futuros neste recorte.')
    };
    const performanceItems=[
      {key:'twr',label:'TWR',value:performance.value,status:performance.status,scope:performance.scope,reason:performance.reason},
      {key:'xirr',label:'XIRR',value:finite(input.xirr?.value),status:text(input.xirr?.status,'INSUFFICIENT_DATA'),scope:input.xirr?.scope||performance.scope,reason:input.xirr?.reason||'Fluxos externos insuficientes para este cálculo.'}
    ];
    const alerts=array(input.alerts||quality.alerts);
    const readiness=input.readiness && readinessApi?.buildPortfolioReportReadiness
      ? readinessApi.buildPortfolioReportReadiness(input.readiness)
      : null;
    return Object.freeze({
      version:1,
      generatedAt:text(input.generatedAt,new Date().toISOString()),
      readOnly:true,
      metrics:Object.freeze(values),
      sections:Object.freeze({
        summary:section('AVAILABLE',Object.entries(values).map(([key,value])=>({key,...value})),{provenance:provenance.summary}),
        patrimony:section(values.portfolioValue.status==='AVAILABLE'?'AVAILABLE':'UNAVAILABLE',array(input.patrimony),{provenance:provenance.patrimony,reason:values.portfolioValue.reason}),
        performance:section(performance.status,performanceItems,{provenance:provenance.performance,reason:performance.reason}),
        income:section(values.incomeReceived.status==='AVAILABLE'||values.incomeExpected.status==='AVAILABLE'?'AVAILABLE':'UNAVAILABLE',[{received:values.incomeReceived,expected:values.incomeExpected}],{provenance:provenance.income}),
        allocation:section(allocation.length?'AVAILABLE':'UNAVAILABLE',allocation,{provenance:provenance.allocation,reason:allocation.length?null:'Distribuição indisponível sem valores atuais por classe.'}),
        concentration:section(concentration.length?'AVAILABLE':'UNAVAILABLE',concentration,{provenance:provenance.concentration,reason:concentration.length?null:'Concentração indisponível sem posições valorizadas.'}),
        assets:section(assets.length?'AVAILABLE':'UNAVAILABLE',assets,{provenance:provenance.assets,reason:assets.length?null:'Nenhum ativo disponível para este recorte.'}),
        proventos:section(proventos.length?'AVAILABLE':'EMPTY',proventos,{provenance:provenance.proventos,reason:proventos.length?null:'Nenhum provento registrado neste recorte.'}),
        risk:section(alerts.length?'ATTENTION':'CLEAR',alerts,{provenance:provenance.risk,reason:alerts.length?'Existem itens para conferência.':null})
      }),
      coverage:{value:valueCoverage,status:valueCoverage===null?'UNAVAILABLE':valueCoverage>=99?'FULL':'PARTIAL',freshness,reason:valueCoverage===null?'Cobertura não informada.':valueCoverage>=99?null:'O relatório apresenta somente os dados valorizados disponíveis.'},
      readiness
    });
  }
  return {buildPortfolioReportModel};
});
