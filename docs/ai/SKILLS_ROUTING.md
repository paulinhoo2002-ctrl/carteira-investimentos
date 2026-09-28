# Bootstrap e roteamento de Skills

Este contrato define a ordem comum a todos os agentes. O PROJECT IDENTITY GATE continua sendo pré-requisito de segurança, antes de Skills, exploração substancial ou edição.

```text
MANDATORY_AGENT_BOOTSTRAP=true
BOOTSTRAP_ORDER=Caveman>Superpowers using-superpowers>mission-specific-skills
MANDATORY_START_ANNOUNCEMENT=true
```

No início de toda missão substancial, anuncie: `Using Caveman + Superpowers to <purpose>`. Depois do gate de identidade, carregue `caveman`, em seguida `using-superpowers`, e só então Skills específicas. A disponibilidade é verificada no ambiente atual. Se uma Skill não existir, informe `SKILL_GAPS_FOUND`; não alegue uso nem invente seu conteúdo. Continue apenas com capacidades disponíveis e fallback seguro.

O pacote local `caveman` disponível neste projeto é um guia de comunicação concisa. Preserve precisão e clareza; expanda explicações para riscos, segurança, finanças e ações irreversíveis. Caveman não substitui diagnóstico, testes, revisão, contratos financeiros ou autorização.

## Roteamento por missão

As rotas abaixo incluem bootstrap obrigatório; use Skills somente se estiverem realmente disponíveis.

| Missão | Skills na ordem |
|---|---|
| `BUG_OR_UNEXPECTED_BEHAVIOR` | `caveman` → `using-superpowers` → `systematic-debugging` → `test-driven-development` |
| `NEW_FEATURE` | `caveman` → `using-superpowers` → `brainstorming` → `writing-plans` → `test-driven-development` |
| `IMPLEMENTATION` | `caveman` → `using-superpowers` → `executing-plans` ou `subagent-driven-development`, conforme ferramentas disponíveis |
| `GIT_WORKTREE` | `caveman` → `using-superpowers` → `using-git-worktrees` |
| `CODE_REVIEW` | `caveman` → `using-superpowers` → `requesting-code-review` → `receiving-code-review` quando cada papel se aplicar |
| `COMPLETION` | `caveman` → `using-superpowers` → `verification-before-completion` |
| documentação | `caveman` → `using-superpowers` → `good-docs-writing` e/ou `caveman-review`, se presentes e adequadas |

As rotas são orientação de processo, não autorização. Skills não ampliam caminhos permitidos, escopo, dependências, dados acessíveis, escrita financeira/fiscal, commit, push, PR, merge ou deploy. Siga primeiro instruções do projeto e autorização explícita da missão. Se a categoria mudar, defina `SKILL_REEVALUATED=true` e reavalie o conjunto mínimo.

## Seleção de agente/modelo

| Trabalho | Preferência quando disponível | Limite |
|---|---|---|
| Implementação longa ou auditoria ampla | Hermes / Nemotron Ultra | Verificar disponibilidade atual; não alegar uso se indisponível. |
| Revisão técnica focada | Codex / GPT-5.6 Sol | Revisão do mesmo agente não é independente. |
| Revisão final de Git ou filesystem de alto risco | Codex / GPT-5.6 Sol | Inspecionar estado atual; preservar dados desconhecidos. |
| Revisão visual multimodal | Revisor multimodal disponível quando útil | Usar artefatos sintéticos/públicos; não usar dados financeiros pessoais. |

Disponibilidade de agente/modelo deve ser verificada em cada missão. Separe roteamento de agente do roteamento de Skills. Nunca declare review independente quando mesma sessão/modelo fez implementação e revisão.

## Política visual e prioridade funcional

```text
VISUAL_CANON_V2=FROZEN_REFERENCE
FUNCTIONAL_COMPLETION_FIRST=true
GLOBAL_VISUAL_IMPLEMENTATION_DEFERRED=true
```

Durante ondas funcionais, só corrigir defeitos visuais que bloqueiem usabilidade ou compreensão. Não iniciar implementação visual global até fechar os bloqueadores funcionais e autorizar fase visual própria.

## Continuidade V280

`P0_RENTABILIDADE_HISTORICAL_SERIES=true`. Até provar que a série é baseada em valuations históricas datadas e benchmark observado/alinhado, `UNVERIFIED_HISTORICAL_RETURN=UNAVAILABLE`. Não interpolar, retroprojetar cotação presente nem substituir benchmark datado por taxa fixa. Próxima missão funcional recomendada: `V281_HISTORICAL_RETURN_TRUTH_REPAIR`. É recomendação, não autorização para iniciar.
