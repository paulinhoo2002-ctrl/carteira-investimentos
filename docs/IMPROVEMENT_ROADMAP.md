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

- `main` em `f26bfde9cee2ef95a5d20c5c8c25e163371a67ee`;
- módulo `finance-core.js` existente;
- módulo `persistence-core.js` existente;
- `80` testes financeiros;
- `30` testes de persistência;
- `6` testes integrados de restore;
- total atual de `116` testes;
- PR `#148` concluído;
- PR `#149` concluído;
- workspace esperado limpo;
- branches temporárias esperadas como encerradas após uso.

Leitura de status:

| Item | Estado |
| --- | --- |
| Commit base da `main` | confirmado |
| `finance-core.js` | confirmado |
| `persistence-core.js` | confirmado |
| 80 testes financeiros | confirmado |
| 30 testes de persistência | confirmado |
| 6 testes integrados do restore | confirmado |
| Total de 116 testes | confirmado |
| PR #148 concluído | confirmado |
| PR #149 concluído | confirmado |
| Workspace esperado limpo | confirmado no início da fase |
| Branches temporárias encerradas | precisa confirmar periodicamente no remoto |

## 4. Resumo das auditorias

Consolidação dos principais achados já levantados, com classificação de situação atual.

| Achado | Situação | Leitura atual |
| --- | --- | --- |
| `index.html` com aproximadamente 22 mil linhas | confirmado | Monólito ainda concentra grande parte da aplicação. |
| UI, CSS, lógica, Firebase e templates concentrados | confirmado | Alta concentração continua no arquivo principal. |
| `npm test` ainda não cobre os testes integrados de `load()` na base anterior à Fase 154 | confirmado | A cobertura de `load()` passa a entrar no comando principal apenas nesta fase. |
| build atual é apenas validação estática | confirmado | Não cobre fluxo real de UI nem regressão funcional ampla. |
| ausência de CI próprio | confirmado | Ainda não há pipeline mínimo registrado nesta base. |
| ausência de testes automatizados suficientes da UI | confirmado | Testes de UI ainda não cobrem fluxos centrais do app. |
| renderização ampla do DOM | confirmado | Render central continua extensa e sensível a regressões. |
| ausência de lint | confirmado | Não há lint ativo no fluxo padrão. |
| riscos de segurança a confirmar | precisa confirmar | Exigem auditoria específica e evidência atualizada. |
| excesso histórico de branches remotas a auditar | precisa confirmar | Precisa varredura dedicada no remoto. |
| risco de restauração parcial entre `civ5` e `civ5_cfg` | resolvido | Evidência: PR `#148`; commit `091f8405a405ae4937d3384d3a5b5b500100a0bf`; `30` testes de persistência; `6` testes integrados do restore. |
| `finance-core.js` e `persistence-core.js` como exemplos positivos | confirmado | São referências de modularização de baixo risco. |
| documentação como ponto forte | confirmado | A trilha documental evoluiu bem. |
| responsividade como ponto forte | parcialmente resolvido | Há cobertura relevante, mas depende de validação manual em telas afetadas. |
| poucas dependências como ponto forte | confirmado | Estrutura segue enxuta e reduz superfície operacional. |
| falha de `localStorage.getItem(STOR)` durante `load()` ainda propaga exceção | confirmado | O comportamento foi provado por teste integrado e permanece sem correção nesta fase. |
| falha de `localStorage.setItem(STOR)` durante `save()` é tratada sem corrupção do estado anterior | confirmado | Achado da Fase 155: teste integrado comprovou que a exceção não é propagada, `civ5` anterior é preservado, `civ5_cfg` anterior é preservado, `queueCloudSave()` não é chamada, `debugError(...)` registra o erro e um toast informa falha ao salvar localmente. Mantido sem correção nesta fase porque o objetivo foi validar roundtrip e o cenário testado preserva o estado anterior. Reavaliar apenas se a Fase 158 exigir melhoria de segurança, resiliência ou observabilidade. |

Resumo executivo:

- confirmado: riscos estruturais do monólito e a exceção ainda propagada em `getItem(STOR)` dentro de `load()`;
- confirmado: a falha de `setItem(STOR)` em `save()` continua como risco conhecido de indisponibilidade da gravação local, mas sem corrupção do estado anterior no cenário testado;
- parcialmente resolvido: documentação e parte da responsividade já melhoraram, mas ainda pedem validação contínua;
- precisa confirmar: segurança e higiene completa de branches remotas;
- resolvido: o risco de restauração parcial entre `civ5` e `civ5_cfg` foi fechado com evidência de PR, commit e testes.

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
| 157 | Fase 157 | UI | Cobertura automatizada da UI ainda é baixa | suíte estrutural mínima para `testMode=1`, navegação, relatórios e modal básico | Média | Médio | Fases 151 a 156 + 134 testes estáveis | em implementação | `test/basic-ui` | — | — | build + `test:ui` + `npm test` | validar fluxos críticos sem dependência nova |
| 158 | Fase 158 | Segurança | Riscos de segurança ainda sem fechamento formal | achado pendente de confirmação | Alta | Alto | base estabilizada | aprovado | futura | — | — | auditoria dedicada | auditar e corrigir com escopo controlado |
| 159 | Fase 159 | Performance | Performance ainda sem medição formal | renderização ampla do DOM | Média | Médio | mapa arquitetural | aprovado | futura | — | — | métricas obrigatórias | medir e melhorar |

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
9. Fase 158 — Auditoria e melhorias de segurança
10. Fase 159 — Medição e melhoria de performance

Regra:

- manter esta ordem salvo nova decisão registrada no histórico;
- não abrir fase posterior sem fechar dependências críticas da anterior.

## 8. Itens adiados

Itens adiados, não rejeitados:

- migração para framework;
- TypeScript;
- Vite;
- separação total do CSS;
- Prettier no monólito;
- grande refatoração do `render()`;
- code splitting;
- Sentry.

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

## 11. Próxima fase preparada

Próxima fase prevista:

### Fase 157 — Testes básicos de UI

Status atual:

- em implementação;
- branch `test/basic-ui` criada a partir de `main`;
- Fase 156 concluída via PR `#156` no commit `d4b10fb6a4a0ae71da92d4844569f0ecaa1b75c9`;
- base atual registrada com `134` testes aprovados antes da suíte de UI;
- total atual registrado em `140` testes após incluir `test:ui` no `npm test`;
- escopo de UI: inicialização local com `testMode=1`, navegação estável, relatórios, prévia de ativos e modal básico;
- estratégia prevista: testes estruturais do `index.html` com `node:vm`, sem rede real, sem Firebase real, sem conta Google e sem dependência nova;
- validação manual complementar já repetida em desktop `1366x768` e mobile `390x844`, sem gate Google, sem overflow horizontal grave e sem erros críticos de console nos fluxos testados;
- limitação assumida: a suíte continua estrutural, não substitui uma cobertura end-to-end completa com navegador real no CI;
- refinamento futuro registrado: ao fechar a prévia de Ativos, o foco volta ao `body`; não bloqueia a fase, mas vale reavaliar em acessibilidade na Fase 158.

Objetivo preliminar:

- validar que a aplicação abre localmente em `testMode=1` sem cair no gate Google;
- cobrir navegação básica entre Início, Ativos e Relatórios;
- validar uma ação real de relatórios com ausência de `NaN`, `undefined` e `[object Object]`;
- incluir a nova suíte no `npm test` sem alterar framework, CI ou dependências.

Regra desta preparação:

- deve usar infraestrutura mínima e previsível;
- precisa preservar comportamento atual da aplicação sem refatoração ampla, sem mudança visual intencional e sem tocar produção fora do necessário.

---

## Parecer Caveman

- um arquivo;
- um objetivo;
- sem duplicar sistema de gestão;
- leitura rápida;
- manutenção barata.

## Parecer Impeccable

- há rastreabilidade de estado, riscos, dependências e próximos passos;
- os achados foram classificados;
- há tabela de controle, histórico de decisões e critérios de conclusão;
- o documento separa concluído, pendente, aprovado e adiado com clareza.
