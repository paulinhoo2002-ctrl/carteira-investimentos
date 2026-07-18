const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  assertPhase206Documentation,
  assertPhase206Roadmap,
} = require('./phase-206-financial-goals.guard');

function readUtf8WithoutBom(relativePath) {
  const filePath = path.join(__dirname, '..', relativePath);
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf, false, `${relativePath} nao pode ter BOM`);
  const text = buffer.toString('utf8');
  for (const token of ['\uFFFD', '\u00C3', '\u00C2', '\u0153']) {
    assert.equal(text.includes(token), false, `${relativePath} nao pode conter ${token}`);
  }
  return text;
}

test('fase 206 fica documentariamente encerrada', () => {
  const roadmap = readUtf8WithoutBom('docs/project-phases-roadmap.md');
  const documentation = readUtf8WithoutBom('docs/phase-206-financial-goals.md');

  assertPhase206Roadmap(roadmap);
  assertPhase206Documentation(documentation);
  assert.equal(roadmap.includes('Fase 206 funcional em desenvolvimento;'), false);
  assert.equal(roadmap.includes('PR atual: `#209`;'), false);
  assert.equal(documentation.includes('Rollback final'), true);
  assert.equal(documentation.includes('git revert 8225262a27bdfc4a58c526b2e7d8c113774f638b'), true);
  assert.equal(documentation.includes('git revert 313c71146181a58157e6236ef3305ca259d6ca5f'), false);
  assert.equal(documentation.includes('\uFFFD'), false);
});

