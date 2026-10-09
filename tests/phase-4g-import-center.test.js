const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const source = fs.readFileSync('index.html', 'utf8');
const viewSource = fs.readFileSync('import-center-view.js', 'utf8');
const rendererSources = ['import-center-preview-renderer.js', 'import-center-file-list-renderer.js', 'import-center-source-list-renderer.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
const importCenterSource = `${source}\n${viewSource}\n${rendererSources}`;
const workflow = require('../import-center-workflow.js');

test('Import center route is isolated and does not alter frozen screens', () => {
  assert.match(source, /navItem\('importacao','Importar dados'/);
  assert.match(source, /if\(S\.tab==='importacao'\)return importCenterTab\(\);/);
  assert.match(source, /function importCenterTab\(\)/);
  assert.match(importCenterSource, /Nenhum dado é gravado ao selecionar ou analisar um arquivo/);
  assert.match(importCenterSource, /Ler e abrir revisão/);
  assert.match(importCenterSource, /Etapa \$\{session\.step\} de \$\{stepLabels\.length\}/);
  assert.match(importCenterSource, /import-center-step-mobile/);
});

test('Import center exposes honest source support and unknown-format behavior', () => {
  assert.match(importCenterSource, /Movimentações B3/);
  assert.match(importCenterSource, /Posição B3/);
  assert.match(importCenterSource, /Proventos B3/);
  assert.match(importCenterSource, /Nota de corretagem/);
  assert.match(importCenterSource, /Formato não reconhecido/);
  assert.match(importCenterSource, /UNKNOWN/);
  assert.match(importCenterSource, /formatos sem parser confirmado não seguem para gravação/i);
  assert.match(importCenterSource, /Suporte completo/);
  assert.match(importCenterSource, /Revisão necessária/);
});

test('Import Center apresenta resultado real sem alegar snapshot ou rollback não executados', () => {
  assert.match(importCenterSource, /aria-live="polite"/);
  assert.match(importCenterSource, /Estado real da análise/);
  assert.doesNotMatch(importCenterSource, /Snapshot \$\{result\.snapshot\}|rollback \$\{result\.rollback\}|Histórico de simulações/);
  assert.match(importCenterSource, /class="import-center-step/);
  assert.match(importCenterSource, /min-height:44px/);
  assert.match(importCenterSource, /Prévia aberta no fluxo protegido existente/);
  assert.match(importCenterSource, /Nenhum dado é gravado ao selecionar ou analisar um arquivo/);
  assert.match(importCenterSource, /Cancelar ou fechar não aplica registros/);
});

test('Import Center encaminha um arquivo B3 à revisão existente sem writer na etapa de análise', async () => {
  const calls=[];
  const result=await workflow.openReviewForFile({name:'fixture.csv'}, {
    parseSpreadsheet:async file=>({status:'READY_FOR_REVIEW',provider:'B3',sourceType:'B3_MOVEMENTS_XLSX',recordCount:1}),
    openReview:payload=>{calls.push(payload.sourceType);return true;}
  });
  assert.equal(result.status,'REVIEW_OPEN');
  assert.equal(result.writeCount,0);
  assert.deepEqual(calls,['B3_MOVEMENTS_XLSX']);
});

test('leitura CSV preserva decimais brasileiros como texto para o normalizador financeiro existente', () => {
  assert.match(source, /XLSX\.read\(await file\.text\(\),\{type:'string',raw:true\}\)/);
});

test('parser indisponível, erro e formato desconhecido nunca abrem revisão confirmável', async () => {
  const opened=[];
  const adapters={parseSpreadsheet:async()=>{throw new Error('synthetic read failure');},openReview:payload=>{opened.push(payload);return true;}};
  const failed=await workflow.openReviewForFile({name:'fixture.xlsx'},adapters);
  const unsupported=await workflow.openReviewForFile({name:'fixture.zip'},adapters);
  assert.equal(failed.status,'FAILED');
  assert.equal(unsupported.status,'UNSUPPORTED');
  assert.equal(failed.writeCount,0);
  assert.equal(unsupported.writeCount,0);
  assert.deepEqual(opened,[]);
});

test('Import and synthetic read-only navigation do not invoke persistence save on entry', () => {
  assert.match(source, /function go\(t\)\{\s*return goInternal\(t,true\);/);
  assert.match(source, /const persistRoute=persistNavigation && \!\(typeof isLocalTestReadOnlyMode==='function' && isLocalTestReadOnlyMode\(\)\) && \!\(typeof isProtectedReadOnlyQaBoot==='function' && isProtectedReadOnlyQaBoot\(\)\);/);
  assert.match(source, /if\(persistRoute && t!=='importacao'\) save\(\);/);
  assert.match(source, /if\(entry\.kind==='navigation'\)\{\s*goInternal\(entry\.route,false\);/);
});
