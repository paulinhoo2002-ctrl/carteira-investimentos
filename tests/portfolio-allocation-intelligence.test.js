const assert=require('node:assert/strict');
const test=require('node:test');
const allocation=require('../portfolio-allocation-intelligence');

const rows=[
  {id:'a',ticker:'AAA',className:'Ações',sector:'Financeiro',issuer:'Emissor A',value:600,valueStatus:'AVAILABLE'},
  {id:'b',ticker:'BBB',className:'Ações',sector:'Financeiro',issuer:'Emissor A',value:300,valueStatus:'AVAILABLE'},
  {id:'c',ticker:'CCC',className:'Renda Fixa',sector:'',issuer:'Emissor B',value:100,valueStatus:'AVAILABLE'},
  {id:'d',ticker:'DDD',className:'ETF',sector:'Exterior',issuer:'',value:null,valueStatus:'UNKNOWN'},
  {id:'e',ticker:'EEE',className:'Ações',sector:'',issuer:'Emissor C',value:0,valueStatus:'LEGITIMATE_ZERO'}
];

test('agrega somente valores authoritative e preserva denominadores',()=>{
  const model=allocation.prepare(rows);
  assert.equal(model.totalKnownValue,1000);
  assert.equal(model.totalClassifiedValue,1000);
  assert.equal(model.totalUnclassifiedValue,0);
  assert.equal(model.knownPositionCount,4);
  assert.equal(model.classes.rows[0].label,'Ações');
  assert.equal(model.classes.rows[0].value,900);
});

test('top 1, top 5 e top 10 são estáveis',()=>{
  const model=allocation.prepare(rows);
  assert.equal(allocation.top(model,1)[0].label,'AAA');
  assert.equal(allocation.top(model,5).length,4);
  assert.equal(allocation.top(model,10).length,4);
  assert.equal(allocation.top(model,1)[0].shareOfKnown,60);
});

test('missing class, sector e issuer permanecem não classificados',()=>{
  const model=allocation.prepare([{id:'x',name:'Sem classe',value:50,valueStatus:'AVAILABLE'}]);
  assert.equal(model.classes.rows.length,0);
  assert.equal(model.classes.unclassifiedValue,50);
  assert.equal(model.sectors.unclassifiedValue,50);
  assert.equal(model.issuers.unclassifiedValue,50);
  assert.equal(model.classes.coverageValue,0);
});

test('unknown não vira zero e zero legítimo continua zero',()=>{
  const model=allocation.prepare([{id:'u',value:0},{id:'z',value:0,valueStatus:'LEGITIMATE_ZERO'}]);
  assert.equal(model.totalKnownValue,0);
  assert.equal(model.knownPositionCount,1);
  assert.equal(model.rows[0].value,null);
  assert.equal(model.rows[1].value,0);
});

test('shadow/reference pode ser excluído antes da agregação',()=>{
  const model=allocation.prepare([
    {id:'manual',className:'Renda Fixa',value:100,valueStatus:'AVAILABLE'},
    {id:'shadow',className:'Renda Fixa',value:null,valueStatus:'UNKNOWN',valuationMode:'REFERENCE_SHADOW'}
  ]);
  assert.equal(model.totalKnownValue,100);
  assert.equal(model.classes.rows[0].value,100);
});

test('issuer e setor agregam ativos sem duplicar posições',()=>{
  const model=allocation.prepare(rows);
  assert.equal(model.issuers.rows.find(row=>row.label==='Emissor A').value,900);
  assert.equal(model.sectors.rows.find(row=>row.label==='Financeiro').value,900);
  assert.equal(model.issuers.rows.reduce((sum,row)=>sum+row.value,0),1000);
});

test('filtros, ordenação e resumo são determinísticos',()=>{
  const model=allocation.prepare(rows);
  assert.deepEqual(allocation.filterRows(model,{className:'Ações'}).map(row=>row.label),['AAA','BBB','EEE']);
  assert.deepEqual(allocation.sortRowsBy(model,'value','asc').map(row=>row.label),['EEE','CCC','BBB','AAA','DDD']);
  assert.match(allocation.summary(model),/maior ativo representa 60,0%/);
});

test('percentual usa patrimonio conhecido explicitamente',()=>{
  const model=allocation.prepare([{className:'Ações',value:80,valueStatus:'AVAILABLE'},{className:'Renda Fixa',value:null,valueStatus:'UNAVAILABLE'}]);
  assert.equal(model.classes.rows[0].shareOfKnown,100);
  assert.equal(model.totalKnownValue,80);
  assert.equal(model.knownPositionCount,1);
});

test('top 10 não cria linhas para posições desconhecidas',()=>{
  const model=allocation.prepare([{ticker:'A',value:10,valueStatus:'AVAILABLE'},{ticker:'B',value:null,valueStatus:'UNAVAILABLE'}]);
  assert.deepEqual(allocation.top(model,10).map(row=>row.label),['A']);
});

test('cobertura de posições e valor é factual',()=>{
  const model=allocation.prepare([{className:'Ações',value:75,valueStatus:'AVAILABLE'},{className:'Ações',value:null,valueStatus:'UNKNOWN'},{className:'ETF',value:25,valueStatus:'AVAILABLE'}]);
  assert.equal(model.coverage.value,2/3*100);
  assert.equal(model.coverage.class.coverageValue,100);
  assert.equal(model.coverage.sector.coverageCount,0);
});

test('valor manual de renda fixa é aceito como authoritative',()=>{
  const model=allocation.prepare([{className:'Renda Fixa',value:125,valueStatus:'AVAILABLE',authority:'MANUAL_AUTHORITATIVE'}]);
  assert.equal(model.totalKnownValue,125);
  assert.equal(model.knownRows[0].authority,'MANUAL_AUTHORITATIVE');
});

test('reference shadow sem valor não soma no patrimônio',()=>{
  const model=allocation.prepare([{className:'Renda Fixa',value:125,valueStatus:'AVAILABLE'},{className:'Renda Fixa',value:400,valueStatus:'UNKNOWN',valuationMode:'REFERENCE_SHADOW'}]);
  assert.equal(model.totalKnownValue,125);
  assert.equal(model.classes.rows[0].value,125);
});

test('unsupported permanece fora da base quando valor é unavailable',()=>{
  const model=allocation.prepare([{className:'Renda Fixa',value:null,valueStatus:'UNSUPPORTED'}]);
  assert.equal(model.totalKnownValue,0);
  assert.equal(model.unknownPositionCount,1);
});

test('filtro setorial retorna somente a exposição solicitada',()=>{
  const model=allocation.prepare(rows);
  assert.deepEqual(allocation.filterRows(model,{sector:'Financeiro'}).map(row=>row.label),['AAA','BBB']);
});

test('filtro por emissor não infere emissores ausentes',()=>{
  const model=allocation.prepare(rows);
  assert.deepEqual(allocation.filterRows(model,{issuer:'Emissor C'}).map(row=>row.label),['EEE']);
  assert.equal(allocation.filterRows(model,{issuer:'Banco'}).length,0);
});

test('ordenação por nome é estável e independente do valor',()=>{
  const model=allocation.prepare([{name:'Beta',value:10,valueStatus:'AVAILABLE'},{name:'Alfa',value:100,valueStatus:'AVAILABLE'}]);
  assert.deepEqual(allocation.sortRowsBy(model,'label','asc').map(row=>row.label),['Alfa','Beta']);
});

test('empates ordenam por nome em pt-BR',()=>{
  const model=allocation.prepare([{ticker:'ZZZ',value:10,valueStatus:'AVAILABLE'},{ticker:'AAA',value:10,valueStatus:'AVAILABLE'}]);
  assert.deepEqual(allocation.top(model,2).map(row=>row.label),['AAA','ZZZ']);
});

test('agregação não muta a fonte',()=>{
  const input=[{className:'Ações',value:10,valueStatus:'AVAILABLE'}];
  const before=JSON.stringify(input);
  allocation.prepare(input);
  assert.equal(JSON.stringify(input),before);
});

test('valores negativos e NaN não entram como patrimônio conhecido',()=>{
  const model=allocation.prepare([{value:-1,valueStatus:'AVAILABLE'},{value:'NaN',valueStatus:'AVAILABLE'},{value:5,valueStatus:'AVAILABLE'}]);
  assert.equal(model.totalKnownValue,5);
  assert.equal(model.unknownPositionCount,2);
});

test('classes conhecidas mantêm ordem por exposição',()=>{
  const model=allocation.prepare([{className:'ETF',value:20,valueStatus:'AVAILABLE'},{className:'Ações',value:80,valueStatus:'AVAILABLE'}]);
  assert.deepEqual(model.classes.rows.map(row=>row.label),['Ações','ETF']);
});

test('setores sem metadata não são convertidos em Outros',()=>{
  const model=allocation.prepare([{sector:'',value:20,valueStatus:'AVAILABLE'},{sector:'Outros',value:10,valueStatus:'AVAILABLE'}]);
  assert.deepEqual(model.sectors.rows.map(row=>row.label),['Outros']);
  assert.equal(model.sectors.unclassifiedValue,20);
});

test('emissores repetidos são consolidados sem duplicar valor',()=>{
  const model=allocation.prepare([{issuer:'Banco',value:20,valueStatus:'AVAILABLE'},{issuer:'Banco',value:30,valueStatus:'AVAILABLE'}]);
  assert.equal(model.issuers.rows.length,1);
  assert.equal(model.issuers.rows[0].value,50);
});

test('resumo é descritivo e não contém linguagem de recomendação',()=>{
  const summary=allocation.summary(allocation.prepare([{className:'ETF',value:100,valueStatus:'AVAILABLE'}]));
  assert.match(summary,/representa/);
  assert.doesNotMatch(summary,/compre|venda|aumente|reduza|ideal|melhor|pior/i);
});

test('formatação percentual usa pt-BR e mantém indisponível',()=>{
  assert.equal(allocation.formatPercent(12.34),'12,3%');
  assert.equal(allocation.formatPercent(null),'—');
});

test('denominador por setor explicita patrimônio classificado',()=>{
  const model=allocation.prepare([{sector:'Financeiro',value:30,valueStatus:'AVAILABLE'},{sector:'',value:70,valueStatus:'AVAILABLE'}]);
  assert.equal(model.sectors.rows[0].shareOfKnown,30);
  assert.equal(model.sectors.rows[0].shareOfClassified,100);
});

test('classe desconhecida fica fora da classe classificada mas permanece na linha',()=>{
  const model=allocation.prepare([{className:'',value:40,valueStatus:'AVAILABLE'}]);
  assert.equal(model.rows[0].className,'');
  assert.equal(model.classes.rows.length,0);
  assert.equal(model.totalUnclassifiedValue,40);
});

test('source metadata é preservada para apresentação posterior',()=>{
  const model=allocation.prepare([{className:'Renda Fixa',value:50,valueStatus:'AVAILABLE',source:'Manual',observedAt:'2026-09-19'}]);
  assert.equal(model.rows[0].source,'Manual');
  assert.equal(model.rows[0].observedAt,'2026-09-19');
});

test('filter all retorna as mesmas linhas e não cria cópias financeiras',()=>{
  const model=allocation.prepare(rows);
  assert.equal(allocation.filterRows(model,{className:'all'}).length,model.rows.length);
  assert.equal(allocation.filterRows(model).reduce((sum,row)=>sum+(row.value||0),0),model.totalKnownValue);
});

test('status stale não promove valor para patrimônio sem regra authoritative',()=>{
  const model=allocation.prepare([{className:'Ações',value:10,valueStatus:'STALE'}]);
  assert.equal(model.totalKnownValue,10);
});

test('status unavailable mantém peso indisponível mesmo com valor auxiliar',()=>{
  const model=allocation.prepare([{className:'ETF',value:90,valueStatus:'UNAVAILABLE'}]);
  assert.equal(model.totalKnownValue,0);
  assert.equal(model.classes.rows.length,0);
});
