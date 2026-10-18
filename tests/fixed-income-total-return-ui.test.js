'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function evaluateDisplayHelpers(){
  const start=source.indexOf('function rfEventEvidenceStatus(row){');
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
  assert.equal(helpers.rfEventEvidenceStatus({eventCount:0,receivedNet:0}),'Indisponível');
  assert.equal(helpers.rfEventEvidenceStatus({receivedNet:0}),'Indisponível');
  assert.match(helpers.rfEventReceiptsSummaryHtml({eventCount:0,receivedNet:0}),/Indisponível/);
});

test('some recorded events remain partial and do not expose an unclassified aggregate',()=>{
  const helpers=evaluateDisplayHelpers();
  const row={
    eventCount:4,
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
  assert.equal(helpers.rfEventEvidenceStatus(row),'Parcial');
  assert.match(summary,/Parcial/);
  assert.doesNotMatch(summary,/2\.968,79|3\.581,55|612,76|1\.000/);
  assert.doesNotMatch(summary,/Completo|Certificado/);
});

test('position result stays separate from coupons and requires known position bases',()=>{
  const helpers=evaluateDisplayHelpers();
  assert.equal(helpers.rfPositionResultText({explicit:true,appliedKnown:true,profit:150}),'+ R$ 150.00');
  assert.equal(helpers.rfPositionResultText({explicit:true,appliedKnown:false,profit:0}),'Indisponível');
  assert.equal(helpers.rfPositionResultText({explicit:false,appliedKnown:true,profit:0}),'Indisponível');
  const renderer=source.slice(source.indexOf('function rendaFixaTab(){'),source.indexOf('function dashboardMetricIcon(name){'));
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
