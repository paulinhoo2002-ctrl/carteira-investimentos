# Carteira Investimentos — Skill Router

O catálogo operacional detalhado por momento está em
`docs/ai/SKILL_OPERATIONAL_CATALOG.md`; este arquivo mantém as regras compactas
de roteamento e limites.

## PRÉ-REQUISITO DE IDENTIDADE E BOOT

Antes de qualquer ação substancial, confirme o PROJECT IDENTITY GATE definido
em `AGENTS.md`: raiz Git, remote, branch, HEAD, Git comum da worktree,
`origin/main` e ausência de uso do projeto proibido
`C:\Projetos\carteira-2.0`. Caminhos válidos ficam sob
`C:\Projetos\carteira-investimentos` ou
`C:\Projetos\carteira-investimentos.worktrees\*`.

`CANONICAL_PROJECT_ROOT=C:\Projetos\carteira-investimentos`
`CANONICAL_WORKTREE_ROOT=C:\Projetos\carteira-investimentos.worktrees`
`CANONICAL_SKILLS_ROOT=C:\Projetos\carteira-investimentos\.agents\skills`
`FORBIDDEN_PROJECT_ROOT=C:\Projetos\carteira-2.0`
`EXPECTED_REMOTE=https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git`

Em mismatch, não tente corrigir o contexto: use
`STATUS=BLOCKED_WRONG_PROJECT` e `STOP_IMMEDIATELY=true`.

O boot independente do chat segue `AGENTS.md` e
[`docs/SKILLS_ROUTING.md`](../SKILLS_ROUTING.md): identity gate, Superpowers
primeiro, descoberta do inventário físico `.agents/skills`, classificação da
missão e seleção mínima de Skills. Este arquivo mantém o roteamento técnico
por categoria; `.agents/SKILL_ROUTER.md` pode existir apenas como bridge local.

`PROJECT_IDENTITY_GATE_REQUIRED=true`
`AGENT_CAN_ROUTE_SKILLS_WITHOUT_LOCAL_BRIDGE=true`
`MANDATORY_FIRST_SKILL=Superpowers`

OFFICIAL_WORKSPACE:
C:\Projetos\carteira-investimentos

DEFAULT_SKILLS:
[]

SKILL_DISCOVERY_REQUIRED:
true

TOKEN_ECONOMY_REQUIRED:
true

ZERO_RECURRING_COST_BY_DEFAULT:
true

MAX_SKILLS_NORMAL:
2

MAX_SKILLS_EXCEPTIONAL:
3

Princípio:
"Use o menor conjunto de skills necessário para completar a missão."

---

## ROTEAMENTO PRINCIPAL POR TAREFA

| Categoria | Skills primárias | Esforço | Escalar quando |
|---|---|---|---|
| FINANCIAL_LOGIC | `doubt-driven-development`, `source-driven-development` | High | invariantes, arredondamento ou identidade divergirem |
| PERSISTENCE / RECOVERY / DATA_MIGRATION | `doubt-driven-development`, `caveman-review` | High | houver escrita, rollback ou mudança de schema |
| FIREBASE / AUTH / LOCAL_CLOUD_SYNC | `firebase-security-rules-auditor`, `doubt-driven-development` | High | permissões, divergência ou sincronização mudarem |
| SECURITY | `firebase-security-rules-auditor`, `source-driven-development` | High | risco de acesso, privilégio ou dado sensível |
| UI_UX / VISUAL_POLISH | `interface-design` ou `impeccable`, `web-quality-audit` | Medium | UI tocar em dados, persistência ou auth |
| RESPONSIVE / ACCESSIBILITY / WEB_QUALITY | `web-quality-audit`, `playwright` | Medium | erro de runtime ou fluxo protegido |
| BROWSER_QA / E2E / REGRESSION_TESTING | `browser-harness`, `playwright` | Medium | sessão/auth/CDP falhar repetidamente |
| DOCUMENTATION / ARCHITECTURE_DOCS | `archify` quando visual ajudar, `caveman-review` | Low/Medium | decisão arquitetural não for trivial |
| SKILL_DISCOVERY | `find-skills` | Low | apenas quando a capacidade não existir localmente |
| CONTEXT_COMPRESSION / TOKEN_ECONOMY | `caveman-compress` | Low | nunca remover invariantes, IDs, hashes ou autorizações |
| CODE_REVIEW / SELECTIVE_COMMITS | `caveman-review`, `caveman-commit` | Medium | sempre antes de integração/commit autorizado |

## REGRA DE BOOT AUTOMÁTICO

Em toda missão substancial, declarar antes de agir:

```text
MODEL_SELECTED=
EFFORT_SELECTED=
PRIMARY_AGENT=
MODEL_SELECTION_REASON=
SKILLS_CONSIDERED=
SKILLS_USED=
SKILLS_NOT_USED=
SKILL_SELECTION_REASON=
SKILL_REEVALUATED=
SKILL_GAPS_FOUND=
SCOPE_GUARD=
```

`find-skills` deve ser carregado quando a missão realmente procura capacidade
ou Skill ausente. Para auditar a biblioteca instalada, a descoberta obrigatória
é física em `.agents/skills`; não faça busca externa nem instalação só por ser
uma missão grande. Skills não concedem autorização sobre áreas protegidas.

## ELEGIBILIDADE DE SKILLS

- `BROKEN` e `DISABLED_FOR_ROUTING` nunca entram na seleção automática.
- `ACTIVE_WITH_LIMITATIONS` só pode ser selecionada quando a limitação não
  afeta a tarefa; se afetar, escolha alternativa válida ou reporte a lacuna.
- `caveman-stats` está `DISABLED_FOR_ROUTING` neste snapshot: faltam os hooks
  `caveman-stats.js` e `caveman-mode-tracker.js` exigidos pelo pacote. Não
  estimar nem simular resultados. Reativar após localizar e validar os hooks.
- `banner-design` permanece `ACTIVE_WITH_LIMITATIONS`: a referência de tamanhos
  existe, mas `ai-artist`, `ai-multimodal`, `chrome-devtools`,
  `inject-brand-context.cjs` e brand guidelines citados não estão no pacote;
  não alegar geração/exportação ponta a ponta.
- `cavecrew` é condicional: os perfis `.agents/agents/cavecrew-*` citados não
  estão instalados localmente; só formular papéis explícitos quando suporte de
  subagentes estiver disponível. Não o tratar como requisito de execução.
- `caveman-compress` sobrescreve seu alvo depois de criar backup `.original.md`;
  só aplicar ao arquivo explicitamente autorizado e confirmar o backup. A Skill
  não autoriza alterações em arquivos desconhecidos ou governança canônica.
- `deploy-to-vercel` não autoriza publicação. Exigir autorização explícita de
  deploy e usar apenas o fluxo autenticado aprovado; o fallback sem autenticação
  que produz claim URL não é permitido neste projeto.

## TRACKS DE UI (MUTUAMENTE EXCLUSIVOS DURANTE A MESMA FASE)

| TRACK | SKILL | QUANDO USAR |
|-------|-------|-------------|
| **Nova direção visual** | `frontend-design` | Nova composição estética, rebranding, linguagem visual do zero |
| **Implementação product UI** | `interface-design` | Dashboard, Ativos, Dividendos, Renda Fixa, Rentabilidade, Aportes, Metas, Relatórios — implementação e refinamento |
| **Polish final** | `impeccable` | Tela pronta mas falta acabamento: contraste, spacing, acessibilidade, tipografia, revisão visual |

**REGRA CRÍTICA**: `interface-design`, `frontend-design`, `impeccable` são tracks mutuamente exclusivos DURANTE a mesma fase de implementação.
Nunca carregar os três simultaneamente.

**Fluxo correto:**
- FASE 1 — direção visual nova: `frontend-design`
- OU FASE 1 — implementação de interface de produto: `interface-design`
- Depois, SOMENTE se necessário: FASE 2 — polish final: `impeccable`
- Impeccable não deve redesenhar a tela novamente sem necessidade.

---

## SKILLS SOB DEMANDA (NÃO CARREGAR POR PADRÃO)

| SKILL | QUANDO USAR |
|-------|-------------|
| `browser-testing-with-devtools` | Mudança afetar UI/browser — diagnóstico de DOM, estilos, console, rede, eventos |
| `playwright` | Jornadas automatizadas, E2E, smoke, multi-viewport, prova automatizada |
| `source-driven-development` | Dependência de documentação oficial: framework, API, versão, Firebase, Vite, Playwright, Vercel, B3, CVM, Banco Central, CDI, Selic, IPCA, formatos externos, tributação |
| `doubt-driven-development` | Lógica de alto risco: financeiro, persistência, migração, arquitetura, segurança, bugs complexos/incertos. **OBRIGATÓRIA** antes de consolidar mudanças em: patrimônio, rentabilidade, preço médio, dividendos, proventos, renda fixa, imposto, aportes, importação, backup, persistencia, datas financeiras, arredondamentos, bruto/líquido |
| `ui-ux-pro-max` | Não usar normalmente. Somente para design system amplo, nova linguagem visual ou pesquisa estruturada específica (design systems, dashboards, charts, tipografia, paletas, heurísticas responsivas) |
| `design-system` | Apenas quando houver alteração real de tokens, component rules ou sistema visual |
| `ui-styling` | Somente quando a stack real for compatível (shadcn/ui + Tailwind) |
| `brand` | Apenas para identidade/marca |
| `archify` | Quando um diagrama realmente ajudar (arquitetura, workflow, sequence, dataflow, lifecycle) |
| `slides` / `banner-design` | Não usar em tarefas normais do produto |
| `browser-harness` | Não usar se Playwright/DevTools já resolverem |
| `firebase-security-rules-auditor` | Firestore rules, ownership, create/update, tipos, limites e privilégio; não usar para editar ou fazer deploy |
| `web-quality-audit` | Auditoria baseada em evidências de acessibilidade, performance, SEO, práticas web e navegação assistida |
| `cavecrew` | Condicional: formular papéis se subagentes estiverem disponíveis; perfis locais não validados |
| `interview-me` | Pedido subespecificado ou ambíguo; nunca executar automaticamente em loops/CI |

---

## CAVEMAN ECOSYSTEM

Não carregar `caveman` por padrão.

Transformar os princípios úteis de economia em regra curta de governança:
- respostas objetivas;
- sem narrar cada comando executado;
- relatórios focados em decisão;
- preservar detalhes completos para risco, segurança e ações irreversíveis.

| SKILL | USO |
|-------|-----|
| `caveman-review` | Review curto quando fizer sentido (escopo, simplicidade, riscos do diff) |
| `caveman-commit` | Commit messages quando necessário (curta, conventional, descreve comportamento) |
| `caveman-compress` | Somente com alvo explícito e backup `.original.md` confirmado |
| `caveman-help` | Referência rápida dos modos/comandos |
| `caveman-stats` | Desativada para roteamento até que ambos os hooks obrigatórios sejam validados |

---

## TABELA DE DECISÃO DE SKILL DE UI

| TAREFA | SKILL |
|--------|-------|
| Nova direção estética inteira | `frontend-design` |
| Dashboard/Ativos/Dividendos/RF/Rebalance product UI | `interface-design` |
| Tela pronta mas falta acabamento | `impeccable` |
| Debug visual/browser | `browser-testing-with-devtools` |
| E2E multi-viewport | `playwright` |
| API/framework/version | `source-driven-development` |
| Finance/persistence high risk | `doubt-driven-development` |

---

## POLÍTICA DE TOKEN BUDGET

| NÍVEL | BUDGET |
|-------|--------|
| SMALL_TASK | LOW |
| NORMAL_FEATURE | MEDIUM |
| HIGH_RISK | HIGH |

**Regras:**
- Nunca carregar skill "só por segurança"
- Buscar função/trecho antes de ler arquivo inteiro (`search_files` antes de `read_file`)
- Não reler docs estáveis em toda missão
- Não repetir análise feita no mesmo handoff
- Não listar dezenas de detalhes se o usuário precisa apenas da decisão

## Skills externas aprovadas — perfil seguro (2026-09-14)

| Skill | Usar quando | Guardrails |
|---|---|---|
| `planning-with-files` | Missões longas e retomadas | Planos somente em `.qa-state/plans/<MISSION>/`; hooks desligados; não autoriza execução ou entrega. |
| `mantis-threat-model`, `mantis-architecture`, `mantis-structural-index` | Threat model, arquitetura e índice | Análise estática/manual; sem pipeline autônomo, rede ou dados reais. |
| `mantis-review`, `mantis-critic` | Revisar achados | `reproduce`/`patch` desabilitados por padrão; isolamento e autorização separados. |
| `mantis-report` | Consolidar relatório | Somente relatório; não aplicar patches nem commitar. |
| `deep-research` | Pesquisa externa multifuente | Fontes verificáveis; zero custo recorrente por padrão. |
| `fact-checker` | Verificar afirmação específica | Citar fontes, contradições e data; helper manual. |
| `source-tracker` | Citações/bibliografia | Banco em `.qa-state/source-tracker/`; health-check manual, sem cron. |

`Agent Reach` não foi instalado. Mantis `reproduce`, `patch`, `chain`,
`researcher`, `pipeline` e `meta-agent` permanecem rejeitados nesta fase.
