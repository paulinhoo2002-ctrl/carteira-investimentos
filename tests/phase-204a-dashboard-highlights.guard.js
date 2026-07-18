const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  assertPhase204ADocumentation,
  assertRoadmap204AClosed,
} = require('./phase-204a-documentary-closure.guard');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertUtf8WithoutBom(relativePath) {
  const buffer = fs.readFileSync(path.join(repoRoot, relativePath));
  assert.equal(buffer[0], 0x23, `${relativePath} precisa comecar com # e sem BOM`);
}

function assertNoMojibake(text, label) {
  for (const token of ['\uFFFD', '\u00C3', '\u00C2', '\u0153']) {
    assert.equal(text.includes(token), false, `${label} nao pode conter ${token}`);
  }
}

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois de ${startMarker}`);
  return text.slice(start, end);
}

test('fase 204A fica registrada como dashboard executivo com destaques', () => {
  const roadmap = read('docs/project-phases-roadmap.md');
  const audit = read('docs/phase-204a-dashboard-highlights.md');

  assertUtf8WithoutBom('docs/project-phases-roadmap.md');
  assertUtf8WithoutBom('docs/phase-204a-dashboard-highlights.md');
  assert.equal(roadmap.startsWith('# Project Phases Roadmap'), true);
  assertNoMojibake(roadmap, 'roadmap');
  assertNoMojibake(audit, 'audit');

  assertRoadmap204AClosed(roadmap);
  assertPhase204ADocumentation(audit);

  const phase204 = section(roadmap, '## 20. Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo', '## 21. Fase 204A - Dashboard executivo com destaques da carteira');
  assert.match(phase204, /- fase concluida;/);
  assert.match(phase204, /- branch original: `docs\/phase-204-evolution-audit`;/);
  assert.match(phase204, /- PR `#204` merged e closed \(encerramento documental da fase 204\);/);
  assert.match(phase204, /- SHA final da Fase 204: `122a3506420b64c2be8df5950c3f01749f74e75d`;/);
  assert.match(phase204, /- conclusao: apto com ressalvas;/);
  assert.match(phase204, /- risco residual principal: responsividade em 768px;/);
  assert.match(phase204, /- Fase 204 documental concluida;/);
  assert.match(phase204, /- 204B, 204C, 206, 208, 210 e 212 nao autorizadas[.;]/);
});
