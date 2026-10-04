# CHATGPT_WAVE_B_HANDOFF — V290 Wave B certificação

MISSION=V290_WAVE_B
PROJECT=Carteira de Investimentos LEGACY
WORKTREE=C:/Projetos/carteira-investimentos.worktrees/v289-premium-visual-redesign
BRANCH=feature/v289-premium-visual-redesign
BASE_HEAD=f838451
FINAL_HEAD=9f4af2db81d25901a923ff29807daeebf5977212
WAVE_B_COMMIT_SHA=9f4af2db81d25901a923ff29807daeebf5977212

WHAT_CHANGED=
Reconciliação de testes legados RED contrários à spec HYBRID V2 aprovada (4 arquivos de teste: dashboard-premium-clarity, dashboard-patrimony-chart-correction, phase-2-dashboard-intelligence, phase-204a-dashboard-highlights) — substituindo asserções visuais obsoletas por asserções comportamentais da spec V3 sem enfraquecer verdade financeira. Um fix mínimo em produto (index.html): guard `typeof document!=='undefined' && typeof document.addEventListener==='function'` no listener de Escape do mobileMenu introduzido pela Wave B, padrão idêntico aos 4 listeners vizinhos pré-existentes, para não quebrar o harness VM (behavior no browser inalterado).

HYBRID_V2_CONTRACT=
≤3 unidades KPI · Patrimônio dominante · Investido secundário (dentro da unidade) · Resultado R$+% no mesmo unit quando compatíveis · Renda recebida rotulada (não estimativa) · evolução presente · alocação · no máximo uma prioridade — tudo verificado por teste+probe+revisão visual.

FIXTURE_RECOVERY=
Causa raiz: PDF de extrato 2025 sendo parseado como PDF de cotações → `parseQuotes` devolvia array vazio → fixture `quotes` vazia quebrava `dashboard-patrimony-chart` e correlatos. Fix: `tests/helpers/v289-visual-fixtures.js` com fixtures sintéticos explícitos (user opt-in humano: "E se puder, faça já os fixtures V289 e me mostra a diferença visual."). Intake stay-json do user nunca foi acionado; fixtures são sintéticos, não pessoais.

LEGACY_TEST_RECONCILIATION=
4 arquivos (razões no CHATGPT_RESEARCH_HANDOFF.md §4.1–4.4):
- dashboard-premium-clarity: PRE_V3 8-metric peer layout → HYBRID_V2 ≤3 KPIs, investido secundário, Result R$+%, Recebido rotulado.
- dashboard-patrimony-chart: tooltip 'Patrimônio' (falso semântico) → 'Aportes acumulados' (provado por tracing de patrimonySnapshot.cumulative) + sintaxe de fonte → teste comportamental VM de domínio/lacuna.
- phase-2-dashboard-intelligence: V2 intelligence-grid na primeira dobra → dashboardV3PriorityPanel (insights ainda alcançáveis, acessíveis, acionáveis).
- phase-204a-dashboard-highlights: ranking V2 na primeira dobra → spec L28 ("Dashboard sem ranking"), síntese/priority + fonte canônica `dashboardHighlightsRows` reafirmada.

QA_PRODUCT_BOUNDARY=
`__V289_VISUAL_SCENARIO__` aparece em 0 ocorrências no index.html (grep) — sem hook de teste no produto. Fixtures injetam apenas por `TEST_MODE` + `__CI7_FIXTURE__` (canal já existente).

TEST_EVIDENCE=
Focused: premium-clarity 4/4, patrimony 2/2, phase-2-intelligence 7/7, phase-204a 2/2, portfolio-analysis-modes (VM) 6/6, V289 fixtures 6/6 / shell 11/11 / dashboard-hybrid 18/18.
Neighbor: 97 testes, 87 PASS, 10 FAIL — 6 preexisting (baseline HEAD f838451 comprovado: aportes-readability 0/4 em ambos estados, utility-touch-targets 2/4 em ambos), 4 contabilizadas em reconciliações (resolvidas), + visual-master-parity TEST_HARNESS_FAILURE (exige servidor :4173, fora do npm test).
Full suite: npm.cmd test 252/252 PASS exit 0 (pós-todas-correções).

BUILD_EVIDENCE=
npm run build PASS · npm run build:modern PASS · git diff --check PASS (todos fresh, mesmo estado de working tree).

VIEWPORT_EVIDENCE=
7 viewports × 2 temas (390x844, 430x932, 768x1024, 1366x768, 1440x900, 1536x864, 1920x1080 × dark/light) = 14/14 PASS. overflow=0, console=0, pageerror=0, requestfailed=0, overlapping=0, clipping=0, unreadable labels=0, CTAs <44px = 0.

FIRST_FOLD=
1366x768 sem scroll: KPI bottom 246px, analytical (evolução+alocação) 253–556px, priority 563–623px, heading 96px — tudo < 768px. kpiCount=3 (Patrimônio atual/Resultado/Recebido).

TECH_REVIEW=
Model: z-ai/glm-5.3 (fresh context second-pass, full diff)
BLOCKER=<pendente>
MAJOR=<pendente>
MINOR=<pendente>
NOTES=<pendente>

VISUAL_REVIEW=
Model: Kimi K3 (vision subagent, 4 screenshots CURRENT pós-guard vs spec HYBRID V2)
BLOCKER=0
MAJOR=0
MINOR=3

DEFERRED_MINORS=
1. Mobile 390: valor "Resultado" (R$ + %) quebra em duas linhas (wrap) — unified-pair intent enfraquecido, sem perda de legibilidade.
2. Chart "Aportes Acumulados" fica flat quando histórico patrimonial escasso (limitação de dados declarada: "Histórico patrimonial indisponível") — condizente com CURRENT_STATE != HISTORICAL_STATE, não viola contrato.
3. Mobile: barra de alocação tangente ao bottom-nav fixo no scroll rest — possível clipping borderline.

PREEXISTING_FAILURES=
10 falhas vizinhas: 6 preexisting provadas contra HEAD f838451 com git archive isolado + node_modules symlink (dashboard-aportes-readability 0/4 nos dois estados — seletor CSS órfão sem markup em nenhum commit; utility-touch-targets 2/4 nos dois — markup tem 2 botões de utility em HEAD e atual, teste exige ≥3). 4 visual-master-parity TEST_HARNESS_FAILURE (requer servidor externo). Nenhuma alteração de produto feita para acomodar teste stale.

FINANCIAL_SAFETY=
financial logic changed=false · persistence changed=false · Firebase changed=false · import authority changed=false. Nenhuma asserção de verdade financeira removida; semântica Aportes acumulados patrimônio / recebido-vs-estimativa preservada.

GIT_SAFETY=
push=false · PR=false · merge=false · deploy=false. Trabalho em working tree + este commit local (quando criado); sem git add . nem -A.

NEXT_ACTION=
Wave C: Ativos + Análise + Movimentações/Aportes (somente após autorização explícita da próxima fase).

WAVE_C_STARTED=false
