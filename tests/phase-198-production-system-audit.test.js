const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertUtf8WithoutBom(relativePath) {
  const buffer = fs.readFileSync(path.join(repoRoot, relativePath));
  assert.equal(buffer[0], 0x23, `${relativePath} precisa comecar com # e sem BOM`);
}

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois de ${startMarker}`);
  return text.slice(start, end);
}

test('fase 198 ativa e sequencia planejada registrada', () => {
  const roadmap = read('docs/project-phases-roadmap.md');
  const audit = read('docs/phase-198-production-system-audit.md');
  const sequence = section(roadmap, '## 11. Sequencia planejada apos a Fase 198', '## 12. Radar estrategico - mudancas de alto impacto');
  const phase198 = roadmap.slice(roadmap.indexOf('## 17. Fase 198 - auditoria geral do sistema em producao'));
  const audit198 = audit;

  assertUtf8WithoutBom('docs/project-phases-roadmap.md');
  assertUtf8WithoutBom('docs/phase-198-production-system-audit.md');
  assert.equal(roadmap.startsWith('# Project Phases Roadmap'), true);
  assert.equal(audit.startsWith('# Fase 198 - Auditoria geral do sistema em producao'), true);
  assert.match(roadmap, /- fase atual: nenhuma;/);
  assert.match(roadmap, /- branch atual: main;/);
  assert.match(roadmap, /- SHA-base: `e358994bbc4270d0694990b4f3a713f0c20b0cba`;/);
  assert.match(roadmap, /- situacao: Fase 198 concluida e aguardando nova autorizacao;/);
  assert.match(roadmap, /- PR atual: nenhuma;/);
  assert.match(roadmap, /- implementacao ativa: nenhuma;/);
  assert.match(roadmap, /- PR `#198` merged e closed \(encerramento da auditoria\);/);
  assert.match(roadmap, /- resultado da auditoria: apto com ressalvas;/);
  assert.match(roadmap, /- risco residual principal: responsividade em 768px;/);
  assert.match(roadmap, /- nenhuma Fase 199 funcional;/);
  assert.match(roadmap, /- nenhuma Fase 200 ativa;/);
  assert.match(phase198, /Estado final:/);
  assert.match(phase198, /- fase atual: nenhuma;/);
  assert.match(phase198, /- branch original: `audit\/phase-198-production-system-review`;/);
  assert.match(phase198, /- SHA-base: `977cd624648c957a10cd8df5fa265313f630ce05`;/);
  assert.match(phase198, /- SHA final: `e358994bbc4270d0694990b4f3a713f0c20b0cba`;/);
  assert.match(phase198, /- situacao: Fase 198 concluida;/);
  assert.match(phase198, /- PR atual: nenhuma;/);
  assert.match(phase198, /- implementacao ativa: nenhuma;/);
  assert.match(phase198, /- PR `#198`: merged e closed \(encerramento da auditoria\);/);
  assert.match(phase198, /- resultado: apto com ressalvas;/);
  assert.match(phase198, /- risco residual principal: responsividade em 768px;/);
  assert.match(phase198, /Caveman: ativo/);
  assert.match(phase198, /Impeccable: ativo/);
  assert.match(phase198, /Evidencias validadas:/);
  assert.match(phase198, /390px/);
  assert.match(phase198, /1366px/);
  assert.match(phase198, /1920px/);
  assert.match(phase198, /768px com overflow estrutural e faixa vazia lateral/);
  assert.match(phase198, /apto com ressalvas/i);
  assert.match(phase198, /Fase 200 pode seguir depois de correcoes pontuais/);
  assert.match(audit198, /Resumo executivo/);
  assert.match(audit198, /Escopo examinado/);
  assert.match(audit198, /Evidencias/);
  assert.match(audit198, /AUD-198-01/);
  assert.match(audit198, /AUD-198-02/);
  assert.match(audit198, /AUD-198-03/);
  assert.match(audit198, /Seguranca dos dados/);
  assert.match(audit198, /Qualidade visual/);
  assert.match(audit198, /Performance/);
  assert.match(audit198, /Classificacao final: apto com ressalvas\./i);
  assert.match(audit198, /Backlog priorizado/);
  assert.match(audit198, /Recomendacao para a Fase 200/);
  assert.match(sequence, /### Fase 200 - Painel consolidado de desempenho dos ativos/);
  assert.match(sequence, /### Fase 202 - Evolucao patrimonial/);
  assert.match(sequence, /### Fase 204 - Metas financeiras/);
  assert.match(sequence, /### Fase 206 - Qualidade dos dados/);
  assert.match(sequence, /### Fase 208 - Relatorio executivo mensal/);
  assert.match(sequence, /### Fase 210 - Desempenho e manutencao tecnica/);
  assert.match(sequence, /nao existe Fase 199 funcional/);
  assert.match(sequence, /nao abrir a Fase 200 nesta execucao/);
  assert.equal(roadmap.includes('Fase 199 -'), false, 'Roadmap nao pode abrir Fase 199 funcional');
  assert.equal(roadmap.includes('- Fase 198 aberta para auditoria geral do sistema em producao;'), false, 'Roadmap nao pode manter Fase 198 aberta');
  assert.equal(execFileSync('git', ['ls-files', 'modern/dist'], { cwd: repoRoot, encoding: 'utf8' }).trim(), '', 'modern/dist nao pode entrar no indice');
});
