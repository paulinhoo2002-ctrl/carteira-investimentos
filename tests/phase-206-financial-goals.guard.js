const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function readUtf8WithoutBom(relativePath) {
  const filePath = path.join(__dirname, '..', relativePath);
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf, false, `${relativePath} nao pode ter BOM`);
  const text = buffer.toString('utf8');
  assert.equal(text.includes('\uFFFD'), false, `${relativePath} nao pode conter caractere de substituicao`);
  assert.equal(text.includes('\u00C3'), false, `${relativePath} nao pode conter mojibake`);
  assert.equal(text.includes('\u00C2'), false, `${relativePath} nao pode conter mojibake`);
  assert.equal(text.includes('\u0153'), false, `${relativePath} nao pode conter mojibake`);
  return text;
}

function extractSection(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois de ${startMarker}`);
  return text.slice(start, end);
}

function assertPhase206Roadmap(roadmap) {
  const currentState = extractSection(roadmap, '## Estado e governanca', 'Base de referencia desta fase:');
  const phase206 = extractSection(roadmap, '## 23. Fase 206 - Metas financeiras', '## 11. Sequencia planejada apos a Fase 202');

  assert.match(currentState, /- fase atual: 208;/);
  assert.match(currentState, /- nome: Qualidade dos dados;/);
  assert.match(currentState, /- branch atual: `feat\/phase-208-data-quality`;/);
  assert.match(currentState, /- SHA-base: `8c8f2c47a5fd07f4af80f952709dd1fc8866bf49`;/);
  assert.match(currentState, /- situacao: implementacao funcional em desenvolvimento;/);
  assert.match(currentState, /- PR atual: pendente;/);
  assert.match(currentState, /- implementacao ativa: auditoria de qualidade dos dados;/);
  assert.match(currentState, /- alteracao funcional autorizada exclusivamente para a Fase 208;/);
  assert.match(currentState, /- PR `#209` merged e closed \(encerramento funcional da Fase 206\);/);
  assert.match(currentState, /- modo de merge da Fase 206: squash;/);
  assert.match(currentState, /- SHA final da Fase 206: `8225262a27bdfc4a58c526b2e7d8c113774f638b`;/);
  assert.match(currentState, /- resultado: acompanhamento de metas financeiras concluido;/);
  assert.match(currentState, /- Fases 204A, 204B e 206 funcional e documentalmente encerradas;/);
  assert.match(currentState, /- 204C, 210 e 212 nao autorizadas[.;]/);
  assert.match(currentState, /- Fases 210 e 212 continuam planejadas e nao autorizadas\./);

  assert.match(phase206, /Estado final:/);
  assert.match(phase206, /- fase concluida;/);
  assert.match(phase206, /- branch original: `feat\/phase-206-financial-goals`;/);
  assert.match(phase206, /- SHA-base: `95383ba6f75be0fc7bc70472b1ec039bc9bf7308`;/);
  assert.match(phase206, /- PR `#209` merged e closed;/);
  assert.match(phase206, /- modo squash;/);
  assert.match(phase206, /- SHA final: `8225262a27bdfc4a58c526b2e7d8c113774f638b`;/);
  assert.match(phase206, /- titulo final: `feat: cria acompanhamento de metas financeiras`;/);
  assert.match(phase206, /- nenhuma implementacao ativa;/);
  assert.match(phase206, /- nenhuma formula financeira concorrente;/);
  assert.match(phase206, /- nenhum schema novo;/);
  assert.match(phase206, /- nenhum snapshot;/);
  assert.match(phase206, /- nenhuma evolucao patrimonial historica;/);
  assert.match(phase206, /- nenhum deploy manual;/);
  assert.match(phase206, /- shell moderno readonly preservado;/);
  assert.match(phase206, /- 204C, 210 e 212 nao autorizadas;/);
  assert.match(phase206, /- meta patrimonial acompanhada;/);
  assert.match(phase206, /- meta de renda passiva acompanhada;/);
  assert.match(phase206, /- valores reais separados das metas;/);
  assert.match(phase206, /- projeção adiada;/);
  assert.match(phase206, /- painel anterior de renda passiva preservado;/);
  assert.match(phase206, /- zero versus ausente preservado;/);
  assert.match(phase206, /- barra limitada visualmente a 100%;/);
  assert.match(phase206, /- percentual textual pode superar 100%;/);
  assert.match(phase206, /- valor faltante nunca negativo;/);
  assert.match(phase206, /- meta atingida tratada;/);
  assert.match(phase206, /- acessibilidade com progressbar e ARIA;/);
  assert.match(phase206, /- fontes oficiais reutilizadas;/);
  assert.match(phase206, /- nenhuma soma patrimonial paralela;/);
  assert.match(phase206, /- nenhuma reconstrução histórica\./);
}

function assertPhase206Documentation(doc) {
  assert.match(doc, /# Fase 206 - Metas financeiras/);
  assert.match(doc, /## Objetivo/);
  assert.match(doc, /## Inventario tecnico/);
  assert.match(doc, /## Fonte oficial do patrimonio/);
  assert.match(doc, /## Fonte oficial da renda passiva/);
  assert.match(doc, /## Metas existentes/);
  assert.match(doc, /## Decisao/);
  assert.match(doc, /## Regras de progresso/);
  assert.match(doc, /## Valor que falta/);
  assert.match(doc, /## Projecao/);
  assert.match(doc, /## Estados visuais/);
  assert.match(doc, /## Acessibilidade/);
  assert.match(doc, /## Responsividade/);
  assert.match(doc, /## Performance/);
  assert.match(doc, /## Riscos/);
  assert.match(doc, /## Testes/);
  assert.match(doc, /## Rollback final/);
  assert.match(doc, /## Conclusao Caveman/);
  assert.match(doc, /## Conclusao Impeccable/);
  assert.match(doc, /## Encerramento/);
  assert.match(doc, /R\$ 1\.000\.000/);
  assert.match(doc, /R\$ 4\.000/);
  assert.match(doc, /Patrimonio atual indisponivel/);
  assert.match(doc, /Meta atingida/);
  assert.match(doc, /Opcao A - reutilizar metas ja persistidas/);
  assert.match(doc, /evitar historico inventado/i);
  assert.match(doc, /snapshot novo/i);
  assert.match(doc, /PR `#209`;/);
  assert.match(doc, /5 testes funcionais da fase aprovados;/);
  assert.match(doc, /1 guardrail documental\/arquitetural aprovado;/);
  assert.match(doc, /Vercel success antes do merge;/);
  assert.match(doc, /rollback final;/);
  assert.match(doc, /Fase 208 nao iniciada;/);
}

test('fase 206 fica documentada e encerrada com governanca rastreavel', () => {
  const roadmap = readUtf8WithoutBom('docs/project-phases-roadmap.md');
  const doc = readUtf8WithoutBom('docs/phase-206-financial-goals.md');

  assertPhase206Roadmap(roadmap);
  assertPhase206Documentation(doc);
  assert.match(roadmap, /- a sequencia futura planejada inclui 204C, 210 e 212\./);
  assert.equal(roadmap.includes('a sequencia futura planejada inclui 204C, 208, 210 e 212.'), false);
  assert.equal(roadmap.includes('a sequencia futura planejada inclui 204, 208, 210 e 212.'), false);
  assert.equal(roadmap.includes('Fase 206 funcional em desenvolvimento;'), false);
  assert.equal(roadmap.includes('PR atual: `#209`;'), false);
  assert.equal(doc.includes('Nenhuma fase futura esta automaticamente autorizada.'), false);
  assert.equal(doc.includes('\uFFFD'), false);
});

module.exports = {
  assertPhase206Documentation,
  assertPhase206Roadmap,
};
