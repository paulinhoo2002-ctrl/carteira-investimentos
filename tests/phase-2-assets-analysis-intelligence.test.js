const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('assets and analysis keep one shared sector concentration source', () => {
  const uses = source.match(/portfolioSectorConcentrationRows\(/g) || [];
  assert.equal(uses.length, 3);
  assert.match(source, /sectorRows:portfolioSectorConcentrationRows\(analysis\)/);
  assert.match(source, /const sectors=portfolioSectorConcentrationRows\(rows\)/);
});

test('analysis labels sector exposure as current-value concentration', () => {
  assert.match(source, /Exposição por setor/);
  assert.match(source, /Distribuição do valor atual por setor informado/);
  assert.match(source, /Nenhum setor informado nos ativos atuais/);
});

test('analysis sector exposure remains read-only presentation content', () => {
  const start = source.indexOf('const sectors=portfolioSectorConcentrationRows(rows)');
  const end = source.indexOf('function hasOwnFiniteNumber', start);
  const snippet = source.slice(start, end);
  assert.doesNotMatch(snippet, /save\(|localStorage|FinanceCore/);
});
