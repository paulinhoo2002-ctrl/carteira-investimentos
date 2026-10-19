'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const engine = require('../fixed-income-economic-result.js');
const adapter = require('../fixed-income-economic-result-adapter.js');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function evaluateDisplayHelpers(){
  const start=source.indexOf('function rfEventEvidenceStatus(row,component=');
  const end=source.indexOf('function rfEventSeedActionHtml(row, totals){',start);
  assert.notEqual(start,-1);
  assert.notEqual(end,-1);
  const context={
    assetSignedMoneyText(value){return Number.isFinite(value)?`${value>0?'+ ':value<0?'- ':''}R$ ${Math.abs(value).toFixed(2)}`:'Indisponível';},
    fmt(value){return `R$ ${Number(value).toFixed(2)}`;},
    esc(value){return String(value??'');}
  };
  vm.createContext(context);
  vm.runInContext(`${source.slice(start,end)};({rfEventEvidenceStatus,rfPositionResultText,rfEventReceiptsSummaryHtml})`,context);
  return context;
}

test('missing event evidence stays unavailable instead of becoming zero',()=>{
  const helpers=evaluateDisplayHelpers();
  assert.equal(helpers.rfEventEvidenceStatus({eventCount:0,receivedNet:0,eventEvidenceCounts:{income:0}}),'Indisponível');
  assert.equal(helpers.rfEventEvidenceStatus({receivedNet:0}),'Indisponível');
  assert.match(helpers.rfEventReceiptsSummaryHtml({eventCount:0,receivedNet:0,eventEvidenceCounts:{income:0}}),/Indisponível/);
});

test('some recorded events remain partial and do not expose an unclassified aggregate',()=>{
  const helpers=evaluateDisplayHelpers();
  const row={
    eventCount:4,
    eventEvidenceCounts:{income:1,tax:1,principal:2},
    receivedGross:3581.55,
    receivedIr:612.76,
    receivedNet:2968.79,
    events:[
      {type:'juros',netValue:2968.79},
      {type:'amortizacao',netValue:500},
      {type:'resgate_parcial',netValue:700},
      {type:'ir',netValue:-100}
    ]
  };
  const summary=helpers.rfEventReceiptsSummaryHtml(row);
  assert.equal(helpers.rfEventEvidenceStatus(row,'income'),'Parcial');
  assert.equal(helpers.rfEventEvidenceStatus(row,'tax'),'Parcial');
  assert.equal(helpers.rfEventEvidenceStatus(row,'principal'),'Parcial');
  assert.match(summary,/Parcial/);
  assert.doesNotMatch(summary,/2\.968,79|3\.581,55|612,76|1\.000/);
  assert.doesNotMatch(summary,/Completo|Certificado/);
});

test('position result stays separate from coupons and requires known position bases',()=>{
  const helpers=evaluateDisplayHelpers();
  assert.equal(helpers.rfPositionResultText({explicit:true,appliedKnown:true,profit:150}),'+ R$ 150.00');
  assert.equal(helpers.rfPositionResultText({explicit:true,appliedKnown:false,profit:0}),'Indisponível');
  assert.equal(helpers.rfPositionResultText({explicit:false,appliedKnown:true,profit:0}),'Indisponível');
  assert.match(source,/maskSensitiveRenderedValues\(root\)/);
  const renderer=source.slice(source.indexOf('function rendaFixaTab(){'),source.indexOf('function dashboardMetricIcon(name){'))
  assert.doesNotMatch(renderer,/fmt\(row\.resultWithEvents\)|fmt\(row\.receivedNet\)|fmt\(row\.receivedGross\)/);
  assert.match(renderer,/Resultado econômico total/);
  assert.match(renderer,/Rentabilidade total/);
  assert.match(renderer,/Impostos pagos/);
  assert.match(renderer,/Principal devolvido/);
});

test('Dashboard separates valuation, received income, and uncertified total result',()=>{
  const kpis=source.slice(source.indexOf('function executiveKPIs(data){'),source.indexOf('function package2ExecutivePanel('));
  const status=source.slice(source.indexOf('function dashboardEconomicResultStatus('),source.indexOf('function dashboardHasEconomicCertification('));
  const panel=source.slice(source.indexOf('function package2ExecutivePanel('),source.indexOf('function dashboardEvolutionPanel(data){'));
  assert.match(kpis,/Resultado/);
  assert.match(kpis,/Sobre capital cadastrado/);
  assert.match(kpis,/Renda no mês/);
  assert.match(kpis,/dashboardEconomicResultStatus\(data\?\.portfolioEconomicResult\)/);
  assert.match(status,/Resultado total: Em consolidação/);
  assert.match(panel,/Resultado total/);
  assert.match(panel,/Em consolidação/);
  assert.match(panel,/Resultado certificado da RV/);
  assert.match(panel,/Renda recebida/);
  assert.doesNotMatch(kpis,/Lucro total|Ganho de capital \+|Valorização dos ativos/);
  assert.doesNotMatch(panel,/Valorização dos ativos/);
});


test('hide-values masks rendered currency, percentages, and holding quantities while explicit exports remain visible',()=>{
  const start=source.indexOf('const fmtRaw =');
  const end=source.indexOf('const noteDisplay =',start);
  assert.notEqual(start,-1);
  assert.notEqual(end,-1);
  const context={S:{hideValues:true},isLocalTestMode:()=>true,location:{search:''},localStorage:{getItem:()=>null}};
  vm.createContext(context);
  const helpers=vm.runInContext(source.slice(start,end)+';({fmtN,fmtP,esc,withVisibleValues})',context);
  assert.equal(helpers.fmtN(12.5),'••••');
  assert.equal(helpers.fmtP(8.5),'••••');
  const note=helpers.esc('Auto Yahoo: 12 cotas x R$ 9,34 (+8,50%)');
  assert.match(note,/•••• cotas x R\$ •••• \(\+••••%\)/);
  assert.doesNotMatch(note,/12|9,34|8,50/);
  assert.equal(helpers.withVisibleValues(()=>helpers.fmtN(12.5)),'12,5');
  assert.equal(helpers.withVisibleValues(()=>helpers.fmtP(8.5)),'+8.50%');
  const cardStart=source.indexOf('function aporteHistoryCard(row){');
  const cardEnd=source.indexOf('function aportesPagination(',cardStart);
  assert.notEqual(cardStart,-1);
  assert.notEqual(cardEnd,-1);
  vm.runInContext(source.slice(cardStart,cardEnd),context);
  const card=vm.runInContext("aporteHistoryCard({id:'privacy-test',ticker:'TEST3',label:'Compra',type:'Ação',sector:'Ações',kind:'compra',qty:12,price:9.34,total:112.08,note:'Auto Yahoo: 12 cotas x R$ 9,34 (+8,50%)',sourceType:'aporte',source:'Teste'})",context);
  assert.doesNotMatch(card,/12|9,34|112,08|8,50/);
});

test('fixed-income detail labels its current result as position-only',()=>{
  const start=source.indexOf('function assetDetailPage(asset){');
  assert.notEqual(start,-1);
  assert.match(source,/Resultado da posição/);
  assert.match(source,/não representa o resultado econômico total/);
});

test('fixed-income cards, category summary, and table identify position-scope results',()=>{
  assert.match(source,/const resultLabel = isRF \? 'Resultado da posição' : 'Resultado'/);
  assert.match(source,/const returnLabel = isRF \? 'Rentabilidade da posição' : 'Rentabilidade'/);
  assert.match(source,/\['Resultado da posição',count&&data\.missingCurrent===0/);
  assert.match(source,/Rentabilidade da posição \$\{display\.rentabilityText\}/);
  assert.match(source,/Resultado da posição R\$/);
  assert.match(source,/Rentabilidade da posição/);
});

test('hide-values sanitizes raw rendered labels, rates, and holding quantities',()=>{
  const start=source.indexOf('function maskSensitiveRenderedValues(root){');
  const end=source.indexOf('const noteDisplay =',start);
  assert.notEqual(start,-1);
  assert.notEqual(end,-1);
  assert.match(source.slice(start,end),/aria-label/);
  assert.match(source.slice(start,end),/data-chart-tooltip/);
  assert.match(source,/maskSensitiveRenderedValues\(root\)/);
});

test('economic-result presentation requires component coverage and masks values',()=>{
  const start=source.indexOf('function rfEconomicMoneyText(result,metric,row){');
  const end=source.indexOf('function rfPositionResultText(',start);
  assert.notEqual(start,-1);
  assert.notEqual(end,-1);
  const context={
    S:{hideValues:false},
    fmt:value=>`R$ ${Number(value).toFixed(2)}`,
    fmtP:value=>`${Number(value).toFixed(2)}%`,
    FixedIncomeEconomicResultAdapter:{
      canExposeTotal:result=>result?.status==='DERIVED_WITH_COMPLETE_HISTORY'&&result.coverage?.totalResult==='DERIVED'&&Number.isFinite(result.totalEconomicResult),
      canExposeReturnPercent:result=>result?.status==='DERIVED_WITH_COMPLETE_HISTORY'&&result.coverage?.totalResult==='DERIVED'&&result.coverage?.totalReturnPercent==='DERIVED'&&Number.isFinite(result.totalReturnPercent),
    },
  };
  vm.createContext(context);
  vm.runInContext(`${source.slice(start,end)};({rfEconomicMoneyText,rfEconomicTotalText,rfEconomicReturnText})`,context);
  const partial={status:'PARTIAL',coverage:{incomeNet:'PARTIAL',totalResult:'PARTIAL',totalReturnPercent:'PARTIAL'},incomeNet:null,totalEconomicResult:null,totalReturnPercent:null};
  assert.equal(context.rfEconomicMoneyText(partial,'incomeNet'),'Parcial');
  assert.equal(context.rfEconomicTotalText(partial),'Em consolidação');
  assert.equal(context.rfEconomicReturnText(partial),'Em consolidação');
  const complete={status:'DERIVED_WITH_COMPLETE_HISTORY',coverage:{incomeNet:'AVAILABLE',totalResult:'DERIVED',totalReturnPercent:'DERIVED'},incomeNet:125.5,totalEconomicResult:250.75,totalReturnPercent:12.5};
  assert.equal(context.rfEconomicMoneyText(complete,'incomeNet'),'R$ 125.50');
  assert.equal(context.rfEconomicTotalText(complete),'R$ 250.75');
  assert.equal(context.rfEconomicReturnText(complete),'12.50%');
  context.S.hideValues=true;
  context.fmt=value=>context.S.hideValues?'R$ ••••':`R$ ${Number(value).toFixed(2)}`;
  context.fmtP=value=>context.S.hideValues?'••••':`${Number(value).toFixed(2)}%`;
  assert.equal(context.rfEconomicMoneyText(complete,'incomeNet'),'R$ ••••');
  assert.equal(context.rfEconomicTotalText(complete),'R$ ••••');
  assert.equal(context.rfEconomicReturnText(complete),'••••');
});

test('Trend DI II UI can show a derived total without inventing open-position result',()=>{
  const start=source.indexOf('function rfEconomicMoneyText(result,metric,row){');
  const end=source.indexOf('function rfPositionResultText(',start);
  const history={status:'COMPLETE',periodStart:'2024-06-01',periodEnd:'2026-10-18',openingPosition:'NONE',allEventsRepresented:true,duplicatesResolved:true,sourceOverlapResolved:true};
  const result=adapter.calculate({
    currentMarketValue:28024.01,
    currentPositionKnown:true,
    currentPositionCoverage:'COMPLETE',
    evidence:{remainingCostBasis:null,contributions:[{id:'application-1',type:'APPLICATION',amount:73157.60,status:'CONFIRMED',occurredOn:'2024-06-01'}],events:[
      {id:'redemption-1',type:'PARTIAL_REDEMPTION',amount:49237.86,amountBasis:'GROSS',status:'RECEIVED',occurredOn:'2025-06-01'},
      {id:'tax-1',type:'IR',amount:272.43,status:'PAID',relatedEventId:'redemption-1',occurredOn:'2025-06-02'},
    ],coverage:{currentPosition:'COMPLETE',costBasis:'UNKNOWN',contributions:'COMPLETE',income:'COMPLETE',taxes:'COMPLETE',capitalReturns:'COMPLETE',principal:'COMPLETE',history},returnPercentBasis:'CUMULATIVE_CONTRIBUTIONS_SIMPLE'},
    engine:engine.calculateFixedIncomeEconomicResult,
  });
  const context={S:{hideValues:false},fmt:value=>`R$ ${Number(value).toFixed(2)}`,fmtP:value=>`${Number(value).toFixed(2)}%`,FixedIncomeEconomicResultAdapter:adapter};
  vm.createContext(context);
  vm.runInContext(`${source.slice(start,end)};({rfEconomicMoneyText,rfEconomicTotalText,rfEconomicReturnText})`,context);
  assert.equal(result.totalEconomicResult,3831.84);
  assert.equal(result.openPositionResult,null);
  assert.equal(context.rfEconomicTotalText(result),'R$ 3831.84');
  assert.equal(context.rfEconomicReturnText(result),'5.24%');
  assert.equal(context.rfEconomicMoneyText(result,'openPositionResult'),'Indisponível');
});

test('economic evidence is limited to REAL Trend products and synthetic local fixtures',()=>{
  const start=source.indexOf('function rfEconomicEvidenceForAsset(asset){');
  const end=source.indexOf('function rfIntelligenceSnapshot(){',start);
  assert.notEqual(start,-1);
  assert.notEqual(end,-1);
  const trendAsset={id:'synthetic-id',name:'Trend DI FIC RF Simples RL'};
  const movidaAsset={id:'synthetic-id',name:'DEB MOVIDA - JUN/2029'};
  const context={
    isLocalTestMode:()=>true,
    FB:{accountMode:'LOCAL'},
    rfPosNorm:value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim(),
    assetRfName:asset=>asset.name,
    rfAssetEventId:item=>item.id,
    FixedIncomeEconomicResultTestEvidence:{'synthetic-id':{events:[{id:'synthetic'}]}},
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start,end),context);
  context.trendAsset=trendAsset;
  context.movidaAsset=movidaAsset;
  assert.equal(vm.runInContext('rfEconomicEvidenceForAsset(trendAsset).events[0].id',context),'synthetic');
  assert.equal(vm.runInContext('rfEconomicEvidenceForAsset(movidaAsset)',context),null);
  context.FB.accountMode='BLOCKED';
  assert.equal(vm.runInContext('rfEconomicEvidenceForAsset(trendAsset)',context),null);
  context.FB.accountMode='REAL';
  context.FB.user={uid:'owner'};
  context.FB.access={allowed:true};
  context.FB.cloudLoaded=true;
  context.S={assets:[trendAsset],rfEvents:[],aportes:[],proventos:[]};
  context.rfValues=()=>({hasExplicitCurrent:true,current:100,currentState:{state:'valid'}});
  context.assetRfCurrentValueMeta=()=>({authority:'MANUAL_AUTHORITATIVE'});
  context.FixedIncomeEconomicEvidenceProvider={buildEvidence:()=>({events:[{id:'runtime'}]})};
  assert.equal(vm.runInContext('rfEconomicEvidenceForAsset(trendAsset).events[0].id',context),'runtime');
  assert.equal(vm.runInContext('rfEconomicEvidenceForAsset(movidaAsset)',context),null);
});
