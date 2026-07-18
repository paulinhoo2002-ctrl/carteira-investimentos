const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { assertPhase204BMonthlyIncomeHistory } = require('./phase-204b-monthly-income-history.guard');

function readUtf8WithoutBom(relativePath) {
  const filePath = path.join(__dirname, '..', relativePath);
  const buffer = fs.readFileSync(filePath);

  assert.equal(buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf, false, `${relativePath} nao pode ter BOM`);

  const text = buffer.toString('utf8');
  assert.equal(text.includes('�'), false, `${relativePath} nao pode conter caractere de substituicao`);
  assert.equal(text.includes('HistÃ'), false, `${relativePath} nao pode conter mojibake`);
  assert.equal(text.includes('EvoluÃ'), false, `${relativePath} nao pode conter mojibake`);
  assert.equal(text.includes('PatrimÃ'), false, `${relativePath} nao pode conter mojibake`);
  assert.equal(text.includes('ComposiÃ'), false, `${relativePath} nao pode conter mojibake`);
  assert.equal(text.includes('DividendÃ'), false, `${relativePath} nao pode conter mojibake`);
  assert.equal(text.includes('ConclusÃ'), false, `${relativePath} nao pode conter mojibake`);
  assert.equal(text.includes('EncerrÃ'), false, `${relativePath} nao pode conter mojibake`);
  return text;
}

test('fase 204B fica documentariamente encerrada', () => {
  const roadmap = readUtf8WithoutBom('docs/project-phases-roadmap.md');
  const documentation = readUtf8WithoutBom('docs/phase-204b-monthly-income-history.md');

  assertPhase204BMonthlyIncomeHistory(roadmap, documentation);
  assert.match(documentation, /4 testes funcionais principais aprovados;/);
  assert.match(documentation, /cobertura interna contempla recebidos, filtros, agrupamento, expansao e comparacao segura;/);
  assert.equal(documentation.includes('39 testes aprovados'), false);
});
