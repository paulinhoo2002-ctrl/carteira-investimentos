const assert=require('node:assert/strict');
const test=require('node:test');
const reporting=require('../executive-reporting');

const now=new Date('2026-09-19T12:00:00');

test('períodos têm rótulo e início determinísticos',()=>{
  assert.deepEqual(reporting.PERIODS,['month','3m','6m','year','12m','all']);
  assert.equal(reporting.periodLabel('month'),'Mês atual');
  const month=reporting.periodStart('month',now), three=reporting.periodStart('3m',now), six=reporting.periodStart('6m',now);
  assert.deepEqual([month.getFullYear(),month.getMonth(),month.getDate()],[2026,8,1]);
  assert.deepEqual([three.getFullYear(),three.getMonth(),three.getDate()],[2026,6,1]);
  assert.deepEqual([six.getFullYear(),six.getMonth(),six.getDate()],[2026,3,1]);
  assert.equal(reporting.periodStart('all',now),null);
});

test('filtro de período não inventa datas ausentes',()=>{
  assert.equal(reporting.dateAllowed('2026-09-05','month',now),true);
  assert.equal(reporting.dateAllowed('2026-08-31','month',now),false);
  assert.equal(reporting.dateAllowed('sem data','all',now),true);
  assert.equal(reporting.dateAllowed('sem data','12m',now),false);
});

test('reconciliação separa indisponível de zero e tolera centavos',()=>{
  assert.equal(reporting.reconcile(100,100).status,'PASS');
  assert.equal(reporting.reconcile(0,0).status,'PASS');
  assert.equal(reporting.reconcile(null,0).status,'UNAVAILABLE');
  assert.equal(reporting.reconcile(100.02,100).status,'MISMATCH');
  assert.equal(reporting.reconcile(100.005,100).status,'PASS');
});

test('modelo executivo é read-only e expõe reconciliações',()=>{
  const model=reporting.buildViewModel({
    period:'6m',assetCount:41,portfolioValue:615441.27,reportPortfolioValue:615441.27,
    dashboardPortfolioValue:615441.27,reportFixedIncomeValue:201765.95,authoritativeFixedIncomeValue:201765.95,
    reportDividendsValue:1200,ledgerDividendsValue:1200,reportAllocationValue:615441.27,knownAllocationValue:615441.27,
    topShare:13.6,classCount:4,incomeValue:1200,sectorCoverage:72.4,assetCoverage:100,issuerCoverage:58
  });
  assert.equal(model.readOnly,true);
  assert.equal(model.periodLabel,'Últimos 6 meses');
  assert.equal(model.reconciliations.patrimony.status,'PASS');
  assert.equal(model.reconciliations.fixedIncome.status,'PASS');
  assert.match(model.summary,/posições acompanhadas/);
  assert.doesNotMatch(model.summary,/compre|venda|aumente|reduza|ideal|melhor|pior/i);
  assert.equal(Object.isFrozen(model),true);
});

test('summary omite métricas sem base em vez de renderizar zero',()=>{
  const summary=reporting.buildSummary({assetCount:41,portfolioValue:null,incomeValue:null,sectorCoverage:null});
  assert.match(summary,/41 posições/);
  assert.doesNotMatch(summary,/R\$ 0,00|0,0%/);
});
