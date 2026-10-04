# Roteamento de agentes, modelos e Skills — LEGACY

Este arquivo preserva a ponte legada e as regras de validação. A especificação
canônica para modelos, revisores, prioridade e relatório de Skills é
[`docs/ai/SKILLS_ROUTING.md`](ai/SKILLS_ROUTING.md). O inventário físico fica em
`.agents/skills/`; os documentos versionados são a fonte de continuidade, não
o histórico de chat. O roteamento técnico de Skills por categoria permanece em
[`ai/SKILL_ROUTER.md`](ai/SKILL_ROUTER.md), que não define um provider/modelo
concorrente. Em caso de divergência, siga `AGENTS.md` e o roteador canônico.

## Identidade e isolamento

```text
PROJECT=CARTEIRA_DE_INVESTIMENTOS_LEGACY
AUTHORIZED_WORKSPACE=C:\Projetos\carteira-investimentos
AUTHORIZED_WORKTREE_ROOT=C:\Projetos\carteira-investimentos.worktrees
FORBIDDEN_WORKSPACE=C:\Projetos\carteira-2.0
SKILLS_ROOT=C:\Projetos\carteira-investimentos\.agents\skills
MANDATORY_AGENT_BOOTSTRAP=true
BOOTSTRAP_ORDER=Superpowers using-superpowers>Ponytail>Caveman>minimum mission-specific-skills
MANDATORY_START_ANNOUNCEMENT=true
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
→ ANNOUNCE "Using Caveman + Ponytail + Superpowers to <purpose>"
→ SUPERPOWERS using-superpowers
→ PONYTAIL + CAVEMAN when available/relevant
→ DISCOVER SKILLS IN .agents/skills
→ CLASSIFY MISSION
→ SELECT MINIMUM RELEVANT SKILLS
→ EXECUTE
→ RE-EVALUATE IF SCOPE CHANGES
→ REPORT SKILL USAGE
```

- Não assuma o inventário com base em conversas anteriores; confirme os
  arquivos `SKILL.md` reais.
- Após o identity gate, use Superpowers primeiro; Ponytail e Caveman são
  considerados em toda missão substancial, seguidos pelo mínimo de Skills
  específicas disponíveis.
- O pacote local `caveman` orienta comunicação concisa. Preserve clareza e
  detalhe para riscos, segurança, finanças e ações irreversíveis; não concede
  autorização nem substitui método técnico.
- Após o bootstrap obrigatório, use normalmente no máximo duas Skills
  específicas da missão; excepcionalmente três se houver razão concreta.
- Reavalie as Skills quando a categoria/escopo mudar. Skills não ampliam
  autorização para dados financeiros, persistência, cloud, Git ou merge.
- Se Caveman, Ponytail ou Superpowers não existir, reporte a lacuna e use apenas fallback
  realmente disponível, sem alegar uso.

Superpowers é a camada de processo: classificação da missão, descoberta
dinâmica, seleção mínima e reavaliação de Skills. Ele não substitui a Skill
especializada. A governança do projeto prevalece sobre
instruções locais conflitantes; em particular, uma Skill não autoriza acesso a
outro projeto, instalação, escrita protegida, deploy ou merge.

Cabeçalho de missão substancial:

```text
MANDATORY_AGENT_BOOTSTRAP=true
BOOTSTRAP_ORDER=Superpowers using-superpowers>Ponytail>Caveman>minimum mission-specific-skills
SKILLS_ROOT=C:\Projetos\carteira-investimentos\.agents\skills
SKILL_DISCOVERY=REQUIRED
SKILL_REEVALUATION_ON_SCOPE_CHANGE=true
```

Campos de handoff obrigatórios:

```text
SKILLS_ROOT=
MANDATORY_AGENT_BOOTSTRAP=true
CAVEMAN_SKILL_AVAILABLE=
CAVEMAN_USED=
SKILLS_CONSIDERED=
SKILLS_USED=
SKILLS_NOT_USED=
SKILL_SELECTION_REASON=
SKILL_REEVALUATED=
SKILL_GAPS_FOUND=
```

## Seleção de agente/modelo

Use a matriz canônica em [`docs/ai/SKILLS_ROUTING.md`](ai/SKILLS_ROUTING.md).
Em resumo: Codex GPT-6 Luna Medium é o padrão de implementação; Codex GPT-6
Sol Medium é a escalação para arquitetura/segurança complexa ou uma causa
sem solução após três tentativas fundamentadas. Hermes GLM-5.3 via NVIDIA é o
revisor independente preferido quando disponível. Nemotron 3 Ultra 550B A55B
é alternativa de revisão pesada, Kimi K3 é opção visual segura, e NVIDIA não
é dependência obrigatória. Revisor e implementador devem ser distintos sempre
que possível. Verifique disponibilidade e relate o modelo realmente usado.

## Cabeçalho de missão

Use campos equivalentes a:

```text
PROJECT=CARTEIRA_DE_INVESTIMENTOS_LEGACY
AUTHORIZED_WORKSPACE=C:\Projetos\carteira-investimentos
FORBIDDEN_WORKSPACE=C:\Projetos\carteira-2.0
SKILLS_ROOT=C:\Projetos\carteira-investimentos\.agents\skills
MANDATORY_AGENT_BOOTSTRAP=true
BOOTSTRAP_ORDER=Superpowers using-superpowers>Ponytail>Caveman>minimum mission-specific-skills
PRIMARY_AGENT=<agente selecionado>
PRIMARY_MODEL=<modelo selecionado>
MODEL_SELECTION_REASON=<justificativa específica>
ESCALATION_MODEL=Codex GPT-6 Sol Medium
REVIEW_MODEL=Hermes GLM-5.3 via NVIDIA when available
VISUAL_MODEL=Kimi K3 or ChatGPT vision when safely available
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

---

## TIERED VALIDATION STRATEGY

```TIER 1 (FAST) - docs, small fixes, CSS, documentation-only
→ quick-check.ps1 (identity + git + package.json + governance files)
→ target: <10 seconds

TIER 2 (NORMAL) - features, refactors, moderate bugs
→ quick-check + related tests + required build
→ example: npm run test:finance + npm run build:modern

TIER 3 (CRITICAL) - finance, backup, restore, persistence, import, calculations, dividends, destructive deletion, migration, storage, auth/security
→ full-check.ps1 (identity + quick-check + ALL package.json scripts)
→ deep review + HUMAN_GATE required
→ validation cache via HEAD + diff hash

Record HEAD/hash when full-check passes to avoid re-running unchanged code.
```
