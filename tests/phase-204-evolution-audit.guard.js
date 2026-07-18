const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { assertRoadmap204AClosed } = require('./phase-204a-documentary-closure.guard');

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

test('fase 204 fica registrada como auditoria documental', () => {
  const roadmap = read('docs/project-phases-roadmap.md');
  const audit = read('docs/phase-204-evolution-audit.md');

  assertUtf8WithoutBom('docs/project-phases-roadmap.md');
  assertUtf8WithoutBom('docs/phase-204-evolution-audit.md');
  assert.equal(roadmap.startsWith('# Project Phases Roadmap'), true);
  assert.equal(audit.startsWith('# Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo'), true);
  assertNoMojibake(roadmap, 'roadmap');
  assertNoMojibake(audit, 'audit');

  assertRoadmap204AClosed(roadmap);

  const phase204 = section(roadmap, '## 20. Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo', '## 21. Fase 204A - Dashboard executivo com destaques da carteira');
  assert.match(phase204, /Objetivo:/);
  assert.match(phase204, /- auditar o historico real disponivel para evolucao patrimonial sem inventar snapshots retroativos;/);
  assert.match(phase204, /- separar o que pode ser mostrado agora no dashboard executivo usando apenas numeros oficiais;/);
  assert.match(phase204, /- classificar cada recurso entre implementavel agora, parcial, futuro ou nao recomendado;/);
  assert.match(phase204, /Estado final:/);
  assert.match(phase204, /- fase concluida;/);
  assert.match(phase204, /- branch original: `docs\/phase-204-evolution-audit`;/);
  assert.match(phase204, /- PR `#204` merged e closed \(encerramento documental da fase 204\);/);
  assert.match(phase204, /- SHA final da Fase 204: `122a3506420b64c2be8df5950c3f01749f74e75d`;/);
  assert.match(phase204, /- conclusao: apto com ressalvas;/);
  assert.match(phase204, /- risco residual principal: responsividade em 768px;/);
  assert.match(phase204, /Inventario resumido:/);
  assert.match(phase204, /- `patrimonySnapshot\(\)`: leitura estimada a partir do estado atual e dos aportes, nao historico patrimonial verificado\./);
  assert.match(phase204, /Classificacao tecnica:/);
  assert.match(phase204, /- A: resumo patrimonial atual, composicao por classe, melhores e piores ativos, renda passiva atual, renda fixa atual;/);
  assert.match(phase204, /- B: leituras parciais a partir de eventos com data, como aportes, proventos e movimentacoes de renda fixa;/);
  assert.match(phase204, /- C: coleta de snapshots daqui para frente, sem preenchimento retroativo;/);
  assert.match(phase204, /- D: reconstruir patrimonio historico completo sem snapshots ou inventar valores passados\./);
  assert.match(phase204, /Conclusao tecnica:/);
  assert.match(phase204, /- recomendacao: Opcao 4 - adiar o grafico patrimonial;/);
  assert.match(phase204, /- primeiro passo seguro: dashboard executivo com numeros oficiais atuais;/);
  assert.match(phase204, /- segundo passo seguro: historico mensal premium com dados reais ja registrados;/);
  assert.match(phase204, /- terceiro passo possivel: evolucao patrimonial somente se uma coleta de snapshots for autorizada[.;]/);
  assert.match(phase204, /Proposta de PRs futuras:/);
  assert.match(phase204, /- PR funcional 204A - Dashboard executivo:/);
  assert.match(phase204, /- PR funcional 204B - Historico mensal premium:/);
  assert.match(phase204, /- PR funcional 204C - Evolucao patrimonial:/);
  assert.match(phase204, /- nenhuma implementacao funcional nesta fase;/);
  assert.match(phase204, /- nenhuma formula financeira nova;/);
  assert.match(phase204, /- nenhum schema novo;/);
  assert.match(phase204, /Conclusao Caveman:/);
  assert.match(phase204, /Conclusao Impeccable:/);
  assert.match(phase204, /UTF-8 sem BOM e sem mojibake\./);

  assert.match(audit, /# Fase 204 - Auditoria de evolucao patrimonial e dashboard executivo/);
  assert.match(audit, /## Resumo executivo/);
  assert.match(audit, /## Estado-base/);
  assert.match(audit, /## Inventario dos dados/);
  assert.match(audit, /## Fontes oficiais/);
  assert.match(audit, /## Historico disponivel/);
  assert.match(audit, /## Limitacoes/);
  assert.match(audit, /## Classificacao A\/B\/C\/D/);
  assert.match(audit, /## Riscos/);
  assert.match(audit, /## Proposta visual/);
  assert.match(audit, /## Recomendacao tecnica/);
  assert.match(audit, /## Sequencia de PRs futuras/);
  assert.match(audit, /## Critérios de aceite/);
  assert.match(audit, /## Rollback/);
  assert.match(audit, /## Conclusao Caveman/);
  assert.match(audit, /## Conclusao Impeccable/);
  assert.match(audit, /Opcao 4 - adiar o grafico patrimonial/);
  assert.match(audit, /204A - Dashboard executivo/);
  assert.match(audit, /204B - Historico mensal premium/);
  assert.match(audit, /204C - Evolucao patrimonial/);
});
