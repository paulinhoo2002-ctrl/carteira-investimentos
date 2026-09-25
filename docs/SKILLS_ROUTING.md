# Roteamento de agentes, modelos e Skills — LEGACY

Esta é a especificação detalhada e durável para seleção de agente/modelo e
Skills no projeto LEGACY. O inventário físico atual fica em
`.agents/skills/`; os documentos versionados são a fonte de continuidade, não
o histórico de chat. O roteamento técnico de Skills por categoria permanece em
[`ai/SKILL_ROUTER.md`](ai/SKILL_ROUTER.md), que não define um provider/modelo
concorrente.

## Identidade e isolamento

```text
PROJECT=CARTEIRA_DE_INVESTIMENTOS_LEGACY
AUTHORIZED_WORKSPACE=C:\Projetos\carteira-investimentos
AUTHORIZED_WORKTREE_ROOT=C:\Projetos\carteira-investimentos.worktrees
FORBIDDEN_WORKSPACE=C:\Projetos\carteira-2.0
SKILLS_ROOT=C:\Projetos\carteira-investimentos\.agents\skills
MANDATORY_FIRST_SKILL=Superpowers
MERGE_AUTHORIZATION=false
```

Toda missão substancial começa pelo PROJECT IDENTITY GATE de `AGENTS.md`.
Confirme raiz Git, remote, branch, HEAD, status e Git comum. O projeto
`carteira-2.0` é totalmente fora de escopo: não ler, listar, pesquisar,
comparar, copiar ou reutilizar. Se identidade não puder ser comprovada, pare
com `HUMAN_BLOCKER_WRONG_PROJECT`.

## Processo obrigatório

```text
PROJECT IDENTITY GATE
→ SUPERPOWERS (primeira Skill carregada e usada)
→ DISCOVER SKILLS IN .agents/skills
→ CLASSIFY MISSION
→ SELECT MINIMUM RELEVANT SKILLS
→ EXECUTE
→ RE-EVALUATE IF SCOPE CHANGES
→ REPORT SKILL USAGE
```

- Não assuma o inventário com base em conversas anteriores; confirme os
  arquivos `SKILL.md` reais.
- Superpowers é obrigatório e deve preceder Skills especializadas em toda
  missão substancial.
- Use normalmente no máximo duas Skills relevantes além da camada
  Superpowers; excepcionalmente três se houver razão concreta.
- Reavalie as Skills quando a categoria/escopo mudar. Skills não ampliam
  autorização para dados financeiros, persistência, cloud, Git ou merge.
- Se Superpowers não existir no ambiente, reporte a lacuna e use fallback de
  processo sem alegar que Superpowers foi usado.

Campos de handoff obrigatórios:

```text
SKILLS_ROOT=
MANDATORY_FIRST_SKILL=Superpowers
SKILLS_CONSIDERED=
SKILLS_USED=
SKILLS_NOT_USED=
SKILL_SELECTION_REASON=
SKILL_REEVALUATED=
SKILL_GAPS_FOUND=
```

## Seleção de agente/modelo

Toda missão substancial deve começar com recomendação explícita de agente e
modelo e uma justificativa específica para o tipo de trabalho. Use a seguinte
ordem quando os agentes, modelos e credenciais de execução estiverem realmente
disponíveis no ambiente:

| Tipo de missão | Caminho preferencial | Razão de seleção |
|---|---|---|
| Engenharia normal | Hermes + NVIDIA API / Nemotron 3 Super | Execução padrão de engenharia, implementação e testes com iteração autônoma. |
| Engenharia difícil, grande ou noturna | Hermes + NVIDIA API / Nemotron 3 Ultra 550B A55B | Problemas amplos/complexos que se beneficiam de maior capacidade e continuidade. |
| UI/UX visual ou mobile | Kimi K3 | Foco visual e responsivo. Continua sujeito aos contratos financeiros e de dados do projeto. |
| Revisão independente | GLM-5.3 | Perspectiva independente sobre uma implementação já produzida. |
| Fallback de engenharia | Codex + GPT-6 Sol | Usar quando o caminho Hermes/NVIDIA falhar repetidamente, ferramentas forem instáveis, testes/build não fecharem após tentativas razoáveis ou a cirurgia exigir precisão adicional. |

```text
DEFAULT_EXECUTION_PROVIDER=NVIDIA_API (quando configurado/disponível)
NORMAL_ENGINEERING=Hermes + Nemotron 3 Super
DIFFICULT_ENGINEERING=Hermes + Nemotron 3 Ultra 550B A55B
OVERNIGHT_LARGE_AUTONOMOUS_MISSION=Hermes + Nemotron 3 Ultra 550B A55B
VISUAL_MOBILE_UI_UX=Kimi K3
INDEPENDENT_REVIEW=GLM-5.3
FALLBACK_WHEN_NVIDIA_HERMES_DOES_NOT_RESOLVE=Codex + GPT-6 Sol
```

Esses valores são política de roteamento, não prova de disponibilidade. Antes
de selecionar, consulte a allowlist real do ambiente. Nunca invente troca de
modelo, execução Hermes/NVIDIA ou review independente. Se a rota preferida
estiver indisponível, registre `AGENT_MODEL_UNAVAILABLE`, recomende a opção
alternativa realmente executável e explique por quê. Fricção técnica comum
isolada não é motivo para abandonar imediatamente Hermes/NVIDIA; siga o
critério de fallback acima.

O autor da missão deve justificar o agente/modelo recomendado, por exemplo:
“Hermes/Nemotron 3 Super é adequado porque a tarefa é uma mudança documental
focada com testes simples; Codex/GPT-6 Sol é fallback apenas se a rota primária
não estiver disponível.”

## Cabeçalho de missão

Use campos equivalentes a:

```text
PROJECT=CARTEIRA_DE_INVESTIMENTOS_LEGACY
AUTHORIZED_WORKSPACE=C:\Projetos\carteira-investimentos
FORBIDDEN_WORKSPACE=C:\Projetos\carteira-2.0
SKILLS_ROOT=C:\Projetos\carteira-investimentos\.agents\skills
MANDATORY_FIRST_SKILL=Superpowers
PRIMARY_AGENT=<agente selecionado>
PRIMARY_MODEL=<modelo selecionado>
MODEL_SELECTION_REASON=<justificativa específica>
FALLBACK_AGENT=Codex
FALLBACK_MODEL=GPT-6 Sol
REVIEW_MODEL=GLM-5.3
VISUAL_MODEL=Kimi K3
MERGE_AUTHORIZATION=false
```

## Memória, autonomia e gates

- `AGENTS.md`, `docs/ai/PROJECT_MEMORY.md`, `docs/ai/NEXT_STEP.md`,
  `docs/ai/DECISIONS.md`, este arquivo e o router técnico versionado são a
  continuidade canônica. Chat e memória externa não substituem esses arquivos.
- `docs/PROJECT_MEMORY.md`, se usado por integração legada, é apenas um índice
  para a memória canônica em `docs/ai/PROJECT_MEMORY.md`; não replique estado
  transitório nele.
- `MAXIMUM_SAFE_AUTONOMY=true` para trabalho técnico reversível dentro do
  projeto. Resolver autonomamente falhas comuns de testes, build, lint, cache,
  seletores, tipos e runtime. Isso não autoriza operações destrutivas ou
  decisões de produto/negócio.
- `MERGE_AUTHORIZATION=false` por padrão. É proibido fazer merge, squash
  merge, ativar auto-merge, reescrever histórico compartilhado ou force-push
  sem autorização humana explícita e inequívoca, vinculada à PR correta.
- Commit, push e abertura de PR seguem a autorização específica da missão e a
  governança Git do repositório; nunca use staging amplo nem inclua conteúdo
  alheio à tarefa.

## Roteamento mínimo de Skills

Após Superpowers e a descoberta dinâmica do inventário, use `docs/ai/SKILL_ROUTER.md`
e `docs/ai/SKILL_OPERATIONAL_CATALOG.md` para escolher Skills por categoria.
Escolha apenas Skills presentes no catálogo físico atual; não instale novas
Skills automaticamente. Rotas típicas incluem:

- finanças, persistência e recuperação: `doubt-driven-development`;
- fontes oficiais: `source-driven-development`;
- navegador e E2E: `browser-harness` e/ou `playwright`;
- revisão de simplicidade/risco: `caveman-review`;
- identidade, regras e sync Firebase: `firebase-security-rules-auditor`.

A rota final depende do trabalho real; esta lista não substitui o inventário.
