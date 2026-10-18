'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

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
  const kpis=source.slice(source.indexOf('function executiveKPIs(data){'),source.indexOf('function package2ExecutivePanel(){'));
  const panel=source.slice(source.indexOf('function package2ExecutivePanel(){'),source.indexOf('function dashboardEvolutionPanel(data){'));
  assert.match(kpis,/Resultado sobre capital cadastrado/);
  assert.match(kpis,/Renda recebida no mês/);
  assert.match(kpis,/Resultado total: Em consolidação/);
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
  assert.match(source,/Resultado das posições/);
  assert.match(source,/Rentabilidade das posições/);
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
