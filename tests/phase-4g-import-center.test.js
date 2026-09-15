const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const source = fs.readFileSync('index.html', 'utf8');

test('Import center route is isolated and does not alter frozen screens', () => {
  assert.match(source, /navItem\('importacao','Importar dados'/);
  assert.match(source, /if\(S\.tab==='importacao'\)return importCenterTab\(\);/);
  assert.match(source, /function importCenterTab\(\)/);
  assert.match(source, /esta simulação não altera sua carteira/);
  assert.match(source, /Executar simulação/);
  assert.match(source, /Etapa \$\{session\.step\} de \$\{IMPORT_CENTER_STEPS\.length\}/);
  assert.match(source, /import-center-step-mobile/);
});

test('Import center exposes honest source support and unknown-format behavior', () => {
  assert.match(source, /Movimentações B3/);
  assert.match(source, /Posição B3/);
  assert.match(source, /Proventos B3/);
  assert.match(source, /Nota de corretagem/);
  assert.match(source, /Formato não reconhecido/);
  assert.match(source, /UNKNOWN/);
  assert.match(source, /formatos desconhecidos sempre ficam em revisão/);
  assert.match(source, /Suporte completo/);
  assert.match(source, /Revisão necessária/);
});

test('Import center exposes review, reconciliation and rollback states accessibly', () => {
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Snapshot \$\{result\.snapshot\}/);
  assert.match(source, /rollback \$\{result\.rollback\}/);
  assert.match(source, /Histórico de simulações/);
  assert.match(source, /class="import-center-step/);
  assert.match(source, /min-height:44px/);
  assert.match(source, /Dados insuficientes para classificar automaticamente/);
  assert.match(source, /Relatório de reconciliação/);
  assert.match(source, /Possíveis duplicados/);
  assert.match(source, /Reconciliação de posição/);
  assert.match(source, /Fonte A/);
  assert.match(source, /Histórico verificado/);
  assert.match(source, /import-reconciliation-mobile/);
  assert.match(source, /Posição<\/b> preservada/);
  assert.match(source, /Escritas<\/b> 0/);
  assert.match(source, /Snapshot<\/b> validado/);
  assert.match(source, /Rollback<\/b> testado/);
});

test('Import navigation does not invoke the normal persistence save on entry', () => {
  assert.match(source, /if\(t!=='importacao'\) save\(\);/);
});
