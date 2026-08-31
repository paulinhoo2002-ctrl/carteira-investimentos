const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const source = fs.readFileSync(require.resolve('../index.html'), 'utf8');

test('reports decision center separates period movement categories', () => {
  assert.match(source, /Movimenta(?:c|ç)(?:ões|oes) do per(?:í|i)odo/);
  assert.match(source, /Fluxo registrado, sem confundir venda ou resgate com aporte/);
  assert.match(source, /movementCounts=filteredAportes\.reduce/);
  assert.match(source, /kind==='venda'/);
  assert.match(source, /kind==='renda-fixa'/);
  assert.match(source, /proventos:filteredProventos\.length/);
});

test('reports decision center keeps analysis distinct from backup', () => {
  assert.match(source, /Análise, conferência e exportação da carteira/);
  assert.match(source, /não substituem o Backup e restauração/);
});
