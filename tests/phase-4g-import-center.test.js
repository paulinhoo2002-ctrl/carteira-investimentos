const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const source = fs.readFileSync('index.html', 'utf8');
const viewSource = fs.readFileSync('import-center-view.js', 'utf8');
const rendererSources = ['import-center-preview-renderer.js', 'import-center-file-list-renderer.js', 'import-center-source-list-renderer.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
const importCenterSource = `${source}\n${viewSource}\n${rendererSources}`;

test('Import center route is isolated and does not alter frozen screens', () => {
  assert.match(source, /navItem\('importacao','Importar dados'/);
  assert.match(source, /if\(S\.tab==='importacao'\)return importCenterTab\(\);/);
  assert.match(source, /function importCenterTab\(\)/);
  assert.match(importCenterSource, /esta simulação não altera sua carteira/);
  assert.match(importCenterSource, /Executar simulação/);
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
  assert.match(importCenterSource, /formatos desconhecidos sempre ficam em revisão/);
  assert.match(importCenterSource, /Suporte completo/);
  assert.match(importCenterSource, /Revisão necessária/);
});

test('Import center exposes review, reconciliation and rollback states accessibly', () => {
  assert.match(importCenterSource, /aria-live="polite"/);
  assert.match(importCenterSource, /Snapshot \$\{result\.snapshot\}/);
  assert.match(importCenterSource, /rollback \$\{result\.rollback\}/);
  assert.match(importCenterSource, /Histórico de simulações/);
  assert.match(importCenterSource, /class="import-center-step/);
  assert.match(importCenterSource, /min-height:44px/);
  assert.match(importCenterSource, /Dados insuficientes para classificar automaticamente/);
  assert.match(importCenterSource, /Relatório de reconciliação/);
  assert.match(importCenterSource, /Possíveis duplicados/);
  assert.match(importCenterSource, /Reconciliação de posição/);
  assert.match(importCenterSource, /Fonte A/);
  assert.match(importCenterSource, /Histórico verificado/);
  assert.match(importCenterSource, /import-reconciliation-mobile/);
  assert.match(importCenterSource, /Posição<\/b> preservada/);
  assert.match(importCenterSource, /Escritas<\/b> 0/);
  assert.match(importCenterSource, /Snapshot<\/b> validado/);
  assert.match(importCenterSource, /Rollback<\/b> testado/);
});

test('Import navigation does not invoke the normal persistence save on entry', () => {
  assert.match(source, /if\(t!=='importacao' && \!\(typeof isProtectedReadOnlyQaBoot==='function' && isProtectedReadOnlyQaBoot\(\)\)\) save\(\);/);
});
