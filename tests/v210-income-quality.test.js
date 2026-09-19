const assert=require('node:assert/strict');
const test=require('node:test');
const Quality=require('../v210-income-quality.js');
const html=require('node:fs').readFileSync('index.html','utf8');

test('V210 integra qualidade factual e fluxo semântico no produto',()=>{
  assert.match(html,/function dividendDataQualityPanel\(rows\)/);
  assert.match(html,/Qualidade da leitura/);
  assert.match(html,/const IMPORT_CENTER_STEPS=\['Arquivo','Detectado','Interpretado','Validado','Prévia','Duplicatas','Confirmação','Resultado'\]/);
  assert.match(html,/v210-income-quality\.js/);
});

test('qualidade de dividendos agrega somente linhas válidas e calcula concentração descritiva',()=>{
  const result=Quality.dividendQuality([
    {date:'2026-01-10',ticker:'AAA3',value:100,source:'B3',type:'Dividendo'},
    {date:'2026-01-20',ticker:'AAA3',value:50,source:'B3',type:'JCP'},
    {date:'2026-02-10',ticker:'BBB3',value:50,source:'Manual',type:'Rendimento'},
    {date:'2026-02-20',value:25,source:'Manual',type:'Outro'},
    {date:'invalida',ticker:'IGN3',value:999}
  ]);
  assert.equal(result.count,4);
  assert.equal(result.assetCount,3);
  assert.equal(result.unknownTickerCount,1);
  assert.equal(result.total,225);
  assert.equal(result.topAssets[0][0],'AAA3');
  assert.equal(result.top3Share,100);
  assert.deepEqual(result.months.map(row=>row[0]),['2026-02','2026-01']);
});

test('contadores do preview mantêm invariantes e não introduzem writes',()=>{
  const counts=Quality.importCounts({records:[{}, {}, {}],counts:{UNIQUE:1,EXACT_DUPLICATE:1,PROBABLE_DUPLICATE:1,IDENTITY_CONFLICT:0,REVIEW_REQUIRED:0}});
  assert.deepEqual(counts,{total:3,newRecords:1,exactDuplicates:1,possibleDuplicates:1,conflicts:0,invalid:0});
});
