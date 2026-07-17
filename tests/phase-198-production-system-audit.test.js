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

test('fase 198 continua registrada e a fase 200 assume o estado atual', () => {
  const roadmap = read('docs/project-phases-roadmap.md');
  const audit = read('docs/phase-198-production-system-audit.md');
  const phase200Doc = read('docs/phase-200-dividends-trustworthy-overview.md');
  const sequence = section(roadmap, '## 11. Sequencia planejada apos a Fase 200', '## 12. Radar estrategico - mudancas de alto impacto');
  const phase198 = roadmap.slice(roadmap.indexOf('## 17. Fase 198 - auditoria geral do sistema em producao'));
  const phase200Start = roadmap.indexOf('## 18. Fase 200 - refinamento confiavel da tela de Dividendos');
  assert.equal(phase200Start >= 0, true, 'Secao da Fase 200 precisa existir');
  const phase200 = roadmap.slice(phase200Start);

  assertUtf8WithoutBom('docs/project-phases-roadmap.md');
  assertUtf8WithoutBom('docs/phase-198-production-system-audit.md');
  assertUtf8WithoutBom('docs/phase-200-dividends-trustworthy-overview.md');
  assert.equal(roadmap.startsWith('# Project Phases Roadmap'), true);
  assert.equal(audit.startsWith('# Fase 198 - Auditoria geral do sistema em producao'), true);
  assert.equal(phase200Doc.startsWith('# Fase 200 - Refinamento confiavel da tela de Dividendos'), true);

  assert.match(roadmap, /- fase atual: 200;/);
  assert.match(roadmap, /- nome: Refinamento confiavel da tela de Dividendos;/);
  assert.match(roadmap, /- branch atual: `feat\/phase-200-dividends-trustworthy-overview`;/);
  assert.match(roadmap, /- SHA-base: `8951891a0ffa15edade8867a3e7078ac63c09b73`;/);
  assert.match(roadmap, /- situacao: em desenvolvimento;/);
  assert.match(roadmap, /- PR atual: pendente;/);
  assert.match(roadmap, /- implementacao ativa: refinamento confiavel da tela de Dividendos;/);
  assert.match(roadmap, /- head de revisao: consultavel na futura PR;/);
  assert.match(roadmap, /- SHA final na main: pendente de merge;/);
  assert.match(roadmap, /- PR `#198` merged e closed \(encerramento da auditoria\);/);
  assert.match(roadmap, /- resultado da auditoria: apto com ressalvas;/);
  assert.match(roadmap, /- risco residual principal: responsividade em 768px;/);
  assert.match(roadmap, /- nenhuma Fase 199 funcional;/);
  assert.match(roadmap, /- a Fase 200 e a fase atual; a sequencia futura comeca em 202\./);

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

  assert.match(phase200, /Objetivo:/);
  assert.match(phase200, /- revisar a composicao de "Recebido no mes" com dados oficiais, sem novo calculo financeiro;/);
  assert.match(phase200, /- remover "Historico recente" da visao geral;/);
  assert.match(phase200, /- manter "Historico mensal" como primeira secao principal da pagina;/);
  assert.match(phase200, /- corrigir o comportamento em 768px sem mexer em schema, dependencias ou fontes de verdade;/);
  assert.match(phase200, /- preservar edicao, exclusao, filtros, historico e acessibilidade\./);
  assert.match(phase200, /- branch atual: `feat\/phase-200-dividends-trustworthy-overview`;/);
  assert.match(phase200, /- SHA-base: `8951891a0ffa15edade8867a3e7078ac63c09b73`;/);
  assert.match(phase200, /- situacao: em desenvolvimento;/);
  assert.match(phase200, /- PR atual: pendente;/);
  assert.match(phase200, /- head de revisao: consultavel na futura PR;/);
  assert.match(phase200, /- SHA final na main: pendente de merge;/);
  assert.match(phase200, /- validacao visual em desktop, tablet e mobile sem overflow horizontal global;/);
  assert.match(phase200Doc, /- "Recebido no mes" fica claro e auditavel;/);
  assert.match(phase200Doc, /- "Historico recente" sai da visao geral;/);
  assert.match(phase200Doc, /- "Historico mensal" fica logo abaixo dos cards de resumo;/);
  assert.match(phase200, /- `Recebido no mes` claramente explicado e sem ambiguidade de composicao;/);
  assert.match(phase200, /- `Historico mensal` em destaque na visao geral;/);
  assert.match(phase200, /- `Historico recente` fora da visao geral;/);
  assert.match(phase200, /- nenhum dado funcional removido\./);
  assert.match(phase200, /Rollback:/);

  assert.match(phase200Doc, /Recebido no mes/);
  assert.match(phase200Doc, /Historico recente/);
  assert.match(phase200Doc, /Historico mensal/);
  assert.match(phase200Doc, /768px/);
  assert.match(phase200Doc, /Rollback/);

  assert.match(sequence, /### Fase 202 - Evolucao patrimonial/);
  assert.match(sequence, /### Fase 204 - Metas financeiras/);
  assert.match(sequence, /### Fase 206 - Qualidade dos dados/);
  assert.match(sequence, /### Fase 208 - Relatorio executivo mensal/);
  assert.match(sequence, /### Fase 210 - Desempenho e manutencao tecnica/);
  assert.match(sequence, /nao existe Fase 199 funcional/);
  assert.match(sequence, /a Fase 200 e a fase atual; a sequencia futura comeca em 202\./);
  assert.equal(roadmap.includes('Fase 199 -'), false, 'Roadmap nao pode abrir Fase 199 funcional');
  assert.equal(roadmap.includes('- Fase 198 aberta para auditoria geral do sistema em producao;'), false, 'Roadmap nao pode manter Fase 198 aberta');
  assert.equal(execFileSync('git', ['ls-files', 'modern/dist'], { cwd: repoRoot, encoding: 'utf8' }).trim(), '', 'modern/dist nao pode entrar no indice');
});
