# Controle oficial das melhorias e auditorias

## 1. Propósito

Este documento é o controle oficial das melhorias técnicas do projeto Carteira de Investimentos.

Objetivo:
- registrar auditorias, melhorias concluídas, fases futuras, riscos, dependências, decisões e evidências;
- manter rastreabilidade simples;
- evitar mudanças estruturais grandes sem registro prévio.

Regra central:
- nenhuma grande mudança estrutural deve ser iniciada sem estar registrada aqui.

## 2. Regras permanentes

- uso obrigatório de Caveman:
  documento simples, fácil de manter, sem sistema complexo, sem duplicação desnecessária;
- uso obrigatório de Impeccable:
  rastreabilidade, critérios objetivos, riscos, dependências, evidências e clareza de status;
- uma branch, um objetivo e um PR;
- não misturar correção, refatoração e funcionalidade na mesma fase;
- nenhuma publicação, push, PR, merge ou deploy sem autorização explícita;
- revisar o diff completo antes de qualquer aprovação;
- proteger cálculos, persistência, dados e integridade histórica;
- testar desktop `1366x768` e mobile `390x844` quando houver impacto visual;
- não alterar `Firebase/Auth`, schema, backup, sync, save, `sw.js` ou cálculos fora do escopo aprovado;
- não iniciar mudanças estruturais sem registro prévio nesta trilha oficial.

## 3. Estado atual

Base operacional desta fase:

- `main` em `40bbd320547c6de5e63166f59a5d556555144537`;
- `index.html` ainda concentra grande parte da interface e da orquestração;
- módulos extraídos existentes:
  - `finance-core.js`;
  - `persistence-core.js`;
  - `report-asset-row.js`;
- `80` testes financeiros;
- `30` testes de persistência;
- `6` testes integrados de restore;
- `7` testes integrados de `load()`;
- `7` testes integrados de roundtrip `save()/load()`;
- `4` testes de extração;
- `9` testes básicos de UI;
- `2` testes de performance;
- total atual de `145` testes;
- CI existente no GitHub Actions;
- deploy atual na Vercel;
- Firebase/Auth, sync e backup como áreas sensíveis;
- workspace esperado limpo;
- branches temporárias esperadas como encerradas após uso.

Leitura de status:

| Item | Estado |
| --- | --- |
| Commit base da `main` | confirmado |
| `index.html` como monólito principal | confirmado |
| `finance-core.js` | confirmado |
| `persistence-core.js` | confirmado |
| `report-asset-row.js` | confirmado |
| Total de 145 testes | confirmado |
| CI existente | confirmado |
| Vercel atual | confirmado |
| Firebase/Auth, sync e backup como áreas sensíveis | confirmado |
| Workspace esperado limpo | confirmado no início da fase |
| Branches temporárias encerradas | precisa confirmar periodicamente no remoto |

## 4. Resumo das auditorias

Consolidação dos principais achados já levantados, com classificação de situação atual.

| Achado | Situação | Leitura atual |
| --- | --- | --- |
| `index.html` com aproximadamente 22 mil linhas | confirmado | Monólito ainda concentra grande parte da aplicação. |
| UI, CSS, lógica, Firebase e templates concentrados | confirmado | Alta concentração continua no arquivo principal. |
| build atual é apenas validação estática | confirmado | Não cobre fluxo real de UI nem regressão funcional ampla. |
| ausência de testes automatizados suficientes da UI fora dos fluxos já cobertos | parcialmente resolvido | A suíte estrutural mínima existe, mas ainda não cobre toda a aplicação. |
| riscos de segurança a confirmar fora dos fluxos auditados | precisa confirmar | Exigem auditoria específica e evidência atualizada. |
| risco de restauração parcial entre `civ5` e `civ5_cfg` | resolvido | Evidência: PR `#148`; commit `091f8405a405ae4937d3384d3a5b5b500100a0bf`; `30` testes de persistência; `6` testes integrados do restore. |
| `finance-core.js` e `persistence-core.js` como exemplos positivos | confirmado | São referências de modularização de baixo risco. |
| documentação como ponto forte | confirmado | A trilha documental evoluiu bem. |
| falha de `localStorage.getItem(STOR)` durante `load()` já não derruba a inicialização | resolvido | Fase 158: leitura do estado principal agora é isolada, preserva estado em memória, evita gravação destrutiva e mantém erro observável por `debugError(...)`. |
| falha de `localStorage.setItem(STOR)` durante `save()` é tratada sem corrupção do estado anterior | confirmado | Achado da Fase 155: teste integrado comprovou que a exceção não é propagada, `civ5` anterior é preservado, `civ5_cfg` anterior é preservado, `queueCloudSave()` não é chamada, `debugError(...)` registra o erro e um toast informa falha ao salvar localmente. Mantido sem correção porque o cenário testado preserva o estado anterior. |
| fechamento da prévia de Ativos devolvia foco ao `body` | resolvido | Fase 158: retorno de foco ao disparador implementado com fallback seguro quando o elemento original não existe mais. |
| fluxos de impressão abriam janela sem `noopener,noreferrer` | resolvido | Fase 158: `window.open()` endurecido nos fluxos de impressão de relatórios e IRPF, reduzindo exposição do `opener`. |
| abertura da prévia de Ativos recalculava `reportsSnapshot()` mais de uma vez no mesmo render | resolvido | Fase 159: cache restrito ao ciclo de render reduziu a recomputação duplicada sem persistir estado entre renders. Medição isolada da abertura da prévia caiu de `2` para `1` cálculo efetivo do snapshot por render. |

Resumo executivo:

- confirmado: riscos estruturais do monólito seguem presentes;
- parcialmente resolvido: a cobertura prática de UI melhorou, mas ainda não cobre a aplicação inteira;
- precisa confirmar: segurança ampla fora dos fluxos já auditados;
- resolvido: o risco de restauração parcial entre `civ5` e `civ5_cfg` foi fechado com evidência de PR, commit e testes;
- resolvido: `load()` deixou de propagar a falha de `getItem(STOR)` no cenário já comprovado;
- resolvido: retorno de foco da prévia de Ativos e proteção `noopener,noreferrer` nos fluxos de impressão auditados;
- resolvido: recomputação duplicada de `reportsSnapshot()` no fluxo auditado de Relatórios.

## 5. Tabela de controle

| ID | Fase | Categoria | Problema | Evidência | Prioridade | Risco | Dependências | Status | Branch | PR | Commit | Testes | Próxima ação |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 148 | Fase 148 | Persistência | Restore precisava cobertura mais robusta | PR #148 concluído | Alta | Alto | `persistence-core.js`, testes | concluído | histórico | #148 | histórico | validados na fase | manter cobertura |
| 149 | Fase 149 | Integração | Restore entre `civ5` e `civ5_cfg` precisava prova integrada | PR #149 concluído | Alta | Alto | testes integrados | concluído | histórico | #149 | `f26bfde` na base atual | 116 testes esperados | preservar estabilidade |
| 150 | Fase 150 | Documentação / Governança | Falta um controle oficial único das melhorias | PR `#150` concluído | Alta | Médio | estado atual confirmado | concluído | histórico | #150 | `370a328ac7110c8a67ed9dfef65e1cfeb2f833d8` | build + 116 testes validados | manter roadmap oficial |
| 151 | Fase 151 | Qualidade | `npm test` não roda os 116 testes | PR `#151` concluído | Alta | Médio | comandos atuais de teste | concluído | histórico | #151 | `a72596d8161248078a1283cf2ca61800b46868ac` | build + 116 testes validados | preservar comando único |
| 152 | Fase 152 | CI | Ausência de CI mínimo | PR `#152` concluído | Alta | Médio | Fase 151 | concluído | histórico | #152 | `2ead18a2b251a2a73cdd8020fbbef40399c5fa2d` | workflow `CI` + 116 testes no GitHub Actions | preservar CI mínimo |
| 153 | Fase 153 | Arquitetura | Monólito dificulta leitura do `index.html` | PR `#153` concluído | Média | Médio | base estável | concluído | histórico | #153 | `bfd23229d1ba27e48ac2d0a8b32602efda47a9a2` | `npm ci` + build + 116 testes validados | usar mapa antes de mexer em `load()` |
| 154 | Fase 154 | Testes integrados | `load()` precisa cobertura dedicada | PR `#154` concluído | Alta | Alto | Fase 153 + CI mínimo | concluído | histórico | #154 | `07b3a149e2f549b14d303201f247f020bab6911f` | build + 123 testes validados | usar cobertura antes do roundtrip |
| 155 | Fase 155 | Testes integrados | `save()/load()` precisa roundtrip confiável | PR `#155` concluído | Alta | Alto | Fase 154 concluída | concluído | histórico | #155 | `3cbe0a4b5450410513a440df8964c8158b9c0d36` | build + `npm test` com 130 testes | usar roundtrip antes de extrair |
| 156 | Fase 156 | Modularização | Primeira extração segura deve provar padrão mínimo de desacoplamento | PR `#156` concluído | Média | Alto | mapa arquitetural e 130 testes prévios | concluído | histórico | #156 | `d4b10fb6a4a0ae71da92d4844569f0ecaa1b75c9` | build + `npm test` com 134 testes | usar corte puro antes de ampliar UI |
| 157 | Fase 157 | UI | Cobertura automatizada da UI ainda era baixa | suíte estrutural mínima para `testMode=1`, navegação, relatórios e modal básico | Média | Médio | Fases 151 a 156 + 134 testes estáveis | concluído | histórico | #157 | `459c5ee93b5187f8667aec591c11d06df9f9e8a1` | build + `test:ui` + `npm test` com 140 testes | usar base de UI antes da Fase 158 |
| 158 | Fase 158 | Segurança / Resiliência / Acessibilidade | riscos pontuais ainda abertos em `load()`, foco de modal e impressão | achados auditados e correções pequenas comprovadas | Alta | Médio | base estabilizada + 140 testes | concluído | histórico | #158 | `c5e1a7ce6d1a86d3051e2d8150be76a4a8d7808b` | build + `test:load` + `test:ui` + `npm test` com 143 testes | preservar correções pequenas comprovadas |
| 159 | Fase 159 | Performance | Performance ainda não tinha medição objetiva dos fluxos reais de Relatórios | medição em navegador real identificou recomputação duplicada de `reportsSnapshot()` na abertura da prévia de Ativos | Média | Médio | mapa arquitetural + 143 testes estáveis | concluído | histórico | #159 | `40bbd320547c6de5e63166f59a5d556555144537` | build + `test:performance` + `npm test` com 145 testes | preservar melhoria pequena e reversível com evidência |
| 160 | Fase 160 | Arquitetura | Falta definir arquitetura alvo da modernização | decisão documental de React + TypeScript + Vite com migração incremental e tela inicial segura | Alta | Médio | Fases 150 a 159 concluídas + 145 testes estáveis | em implementação | `docs/modernization-architecture` | — | — | build + `npm test` com 145 testes | preparar a Fase 161 sem iniciar migração real |

## 6. Fases concluídas

Concluído até a base atual:

- extração e testes financeiros;
- extração e testes de persistência;
- transação de restauração entre `civ5` e `civ5_cfg`;
- testes integrados de `applyBackupData()`;
- PR `#148`;
- PR `#149`.
- PR `#150`;
- commit da `main` `370a328ac7110c8a67ed9dfef65e1cfeb2f833d8`.
- PR `#151`;
- commit da `main` `a72596d8161248078a1283cf2ca61800b46868ac`.
- PR `#152`;
- commit da `main` `2ead18a2b251a2a73cdd8020fbbef40399c5fa2d`;
- workflow `CI` em `pull_request` e `push` para `main`;
- `116` testes aprovados no GitHub Actions.
- PR `#153`;
- commit da `main` `bfd23229d1ba27e48ac2d0a8b32602efda47a9a2`;
- mapa arquitetural do `index.html` registrado antes da Fase 154.
- PR `#154`;
- commit da `main` `07b3a149e2f549b14d303201f247f020bab6911f`;
- `123` testes já integrados ao comando principal com cobertura dedicada de `load()`.
- PR `#155`;
- commit da `main` `3cbe0a4b5450410513a440df8964c8158b9c0d36`;
- `130` testes já integrados ao comando principal com roundtrip real de `save()/load()`.
- PR `#156`;
- commit da `main` `d4b10fb6a4a0ae71da92d4844569f0ecaa1b75c9`;
- helper `buildReportAssetRow()` extraído para arquivo dedicado;
- `134` testes aprovados antes da Fase 157.
- PR `#157`;
- commit da `main` `459c5ee93b5187f8667aec591c11d06df9f9e8a1`;
- `140` testes aprovados antes da Fase 158.
- PR `#158`;
- commit da `main` `c5e1a7ce6d1a86d3051e2d8150be76a4a8d7808b`;
- `143` testes aprovados antes da Fase 159.
- PR `#159`;
- commit da `main` `40bbd320547c6de5e63166f59a5d556555144537`;
- `145` testes aprovados antes da Fase 160.

Critério de leitura:

- concluído significa entregue e incorporado à `main`;
- manter o que já foi estabilizado tem prioridade sobre acelerar novas frentes.

## 7. Roadmap aprovado

Sequência aprovada no momento:

1. Fase 150 — Controle oficial das melhorias
2. Fase 151 — Comando completo de testes
3. Fase 152 — CI mínimo com GitHub Actions
4. Fase 153 — Mapa arquitetural do `index.html`
5. Fase 154 — Testes integrados de `load()`
6. Fase 155 — Roundtrip `save()/load()`
7. Fase 156 — Primeira extração modular de baixo risco
8. Fase 157 — Testes básicos de UI
9. Fase 158 — Segurança, resiliência e acessibilidade pontual
10. Fase 159 — Medição e melhoria de performance
11. Fase 160 — Arquitetura alvo React + TypeScript + Vite
12. Fase 161 — Base Vite + React + TypeScript em paralelo
13. Fase 162 — Tipos e contratos de domínio
14. Fase 163 — CSS base e tokens visuais
15. Fase 164 — Shell, tema e navegação React isolados
16. Fase 165 — Primeira tela simples e somente leitura
17. Fase 166 — Telas de consulta de ativos e Relatórios
18. Fase 167 — Formulários e operações de escrita
19. Fase 168 — Backup, importação, exportação e relatórios sensíveis
20. Fase 169 — Auth, Firebase e sincronização
21. Fase 170 — Remoção progressiva do monólito legado
22. Fase 171 — Prettier, ESLint e padronização completa
23. Fase 172 — Auditoria final de acessibilidade, performance, segurança e dados

Regra:

- manter esta ordem salvo nova decisão registrada no histórico;
- não abrir fase posterior sem fechar dependências críticas da anterior.

## 8. Itens adiados

Itens adiados, não rejeitados:

- instalação real de React antes da Fase 161;
- instalação real de TypeScript antes da Fase 161;
- instalação real de Vite antes da Fase 161;
- separação progressiva de CSS;
- migração incremental do `render()`;
- retirada gradual do monólito;
- Prettier somente após modularização relevante;
- grande refatoração do `render()`;
- mudança de schema;
- troca de Firebase;
- Next.js;
- SSR;
- microfrontends;
- design system externo;
- banco novo;
- backend novo;
- troca completa do PWA;
- Web Workers.

Motivo do adiamento:

- risco alto para uma base financeira em produção;
- dependências técnicas ainda não fechadas;
- necessidade de cobertura de testes e governança antes de ampliar escopo.

Leitura correta:

- adiado por risco e dependências;
- não rejeitado definitivamente.

## 9. Critério de conclusão de cada fase

Toda fase precisa cumprir:

- objetivo único;
- arquivos permitidos definidos;
- arquivos proibidos definidos;
- testes obrigatórios definidos;
- revisão Caveman;
- revisão Impeccable;
- revisão do diff completo;
- commit autorizado;
- push autorizado;
- PR revisado;
- merge autorizado;
- limpeza da branch ao final.

Checklist operacional:

| Item | Obrigatório |
| --- | --- |
| Objetivo único | sim |
| Escopo de arquivos | sim |
| Testes obrigatórios | sim |
| Revisão Caveman | sim |
| Revisão Impeccable | sim |
| Diff completo revisado | sim |
| Commit autorizado | sim |
| Push autorizado | sim |
| PR revisado | sim |
| Merge autorizado | sim |
| Limpeza da branch | sim |

## 10. Histórico de decisões

| Data | Decisão | Motivo | Impacto | PR/commit relacionado |
| --- | --- | --- | --- | --- |
| 2026-07-13 | Criar um controle oficial único para melhorias e auditorias | Evitar dispersão de decisões e mudanças estruturais sem trilha formal | Melhora governança técnica e rastreabilidade | Fase 150 |
| 2026-07-13 | Manter roadmap simples, sem sistema pesado de gestão | Preservar manutenção barata e aderência Caveman | Documento mais fácil de manter no dia a dia | Fase 150 |
| 2026-07-13 | Não iniciar Fase 151 nesta branch | Regra de uma branch, um objetivo e um PR | Mantém escopo documental puro | Fase 150 |
| 2026-07-13 | Iniciar a Fase 151 apenas para corrigir o comando `npm test` | Garantir que a suíte completa rode por um comando único, sem mexer nos testes ou no código de produção | Melhora execução local e futura compatibilidade com CI | Fase 151 |
| 2026-07-13 | Iniciar a Fase 152 com um único workflow mínimo reaproveitando `npm test` | Garantir CI reproduzível sem duplicar lógica de build e testes nem introduzir ferramentas extras | Cria validação automática em pushes e PRs para `main` | Fase 152 |
| 2026-07-13 | Iniciar a Fase 153 apenas como mapeamento técnico do `index.html` | Preparar futuras extrações de baixo risco sem tocar produção | Cria visão arquitetural rastreável do monólito | Fase 153 |
| 2026-07-13 | Tratar a Fase 158 como pacote pequeno de correções reais em resiliência, acessibilidade e segurança pontual | Evitar auditoria infinita e refatoração ampla em área sensível | Escopo fechado em `load()`, retorno de foco e proteção pequena de impressão | Fase 158 |
| 2026-07-13 | Tratar a Fase 159 como medição primeiro e otimização só com prova objetiva | Evitar micro-otimização especulativa em monólito sensível | Escopo fechado em Relatórios com ganho local, reversível e coberto por teste dedicado | Fase 159 |
| 2026-07-13 | Preparar a Fase 160 como definição documental da arquitetura alvo antes de instalar nova stack | Evitar iniciar React, TypeScript e Vite sem fronteiras, rollback e ordem de migração definidos | Registra a arquitetura alvo, a estratégia incremental e a primeira tela candidata sem iniciar a Fase 161 | Fase 160 |

## 11. Próxima fase preparada

Próxima fase prevista:

### Fase 160 — Arquitetura alvo React + TypeScript + Vite

Status atual:

- em implementação;
- branch `docs/modernization-architecture` criada a partir de `main`;
- Fase 159 concluída via PR `#159` no commit `40bbd320547c6de5e63166f59a5d556555144537`;
- base atual registrada com `145` testes aprovados antes desta fase;
- objetivo exclusivamente documental;
- decisão arquitetural alvo:
  - React para a interface;
  - TypeScript em modo estrito progressivo;
  - Vite para build e desenvolvimento;
- estratégia obrigatória:
  - migração incremental;
  - coexistência temporária entre legado e moderno;
  - sem reescrita total;
  - sem troca inicial de persistência, schema, Firebase/Auth, backup/restauração ou sync cloud;
- primeira tela candidata escolhida:
  - prévia somente leitura de Ativos em Relatórios;
- justificativa principal:
  - fluxo isolável;
  - sem escrita;
  - sem Firebase;
  - sem backup;
  - simples de comparar com o legado;
  - já coberto por testes e validação manual;
- próxima fase esperada após esta etapa:
  - Fase 161 — Base Vite + React + TypeScript em paralelo.

Regra desta preparação:

- deve manter o legado funcionando como caminho principal no início;
- não pode instalar dependências nem criar código executável nesta fase;
- precisa deixar a Fase 161 pronta sem iniciar migração real;
- a Fase 160 não conclui a modernização e não inicia a Fase 161.

---

## Parecer Caveman

- um arquivo;
- um objetivo;
- sem duplicar sistema de gestão;
- leitura rápida;
- manutenção barata;
- arquitetura alvo definida sem reescrever o projeto.

## Parecer Impeccable

- há rastreabilidade de estado, riscos, dependências e próximos passos;
- os achados continuam classificados;
- a Fase 159 ficou registrada como concluída com evidência;
- a Fase 160 ficou documentada com arquitetura, coexistência, rollback e próxima fase;
- o documento continua simples de manter e sem iniciar mudança estrutural real.
