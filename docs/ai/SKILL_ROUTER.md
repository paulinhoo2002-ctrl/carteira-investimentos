# Carteira Investimentos — Skill Router

OFFICIAL_WORKSPACE:
C:\Projetos\carteira-investimentos

DEFAULT_MODEL:
5.6 Sol

DEFAULT_EFFORT:
Padrão

DEFAULT_SKILLS:
[]

MAX_SKILLS_NORMAL:
2

MAX_SKILLS_EXCEPTIONAL:
3

Princípio:
"Use o menor conjunto de skills necessário para completar a missão."

---

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
| `cavecrew` | Decidir quando delegação separada ajuda; não é obrigatório |
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
| `caveman-compress` | Somente para compactar documentação/memória longa |
| `caveman-help` | Referência rápida dos modos/comandos |
| `caveman-stats` | Medir custo de contexto ou comparar modos |

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