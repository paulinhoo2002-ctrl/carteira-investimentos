# Project Memory

## FULL EXECUTION AUTONOMY

The operational policy for Codex, OpenCode and Hermes is maintained in
`docs/ai/AGENT_AUTONOMY.md`. Authorized phases may proceed autonomously through
analysis, implementation, tests, browser validation, correction and review.
Financial semantics, persistence, merge and deploy remain protected gates.

## ui-ux-pro-max

- Instalacao oficial validada no clone de infraestrutura com `ui-ux-pro-max-cli` `2.14.1`.
- Codex foi gerado em `.agents/skills/`; OpenCode em `.opencode/`.
- O CLI gera a skill principal e auxiliares oficiais; nao duplicar manualmente em outros caminhos.
- A skill foi exercitada com a busca oficial de design system para o Dashboard, sem alterar codigo da aplicacao.

## PR #266 - Dividendos

- Acessibilidade: touch targets, focus-visible e contraste com tokens.
- CSS escopado em `.div-premium`; evitar seletores globais para mudancas locais.
- Smoke Playwright dedicado, sem alteracao financeira ou de persistencia.

## PR #267 - Renda Fixa

- `saveRfMovimentacao` passou a manter principal e bases de valor atual coerentes apos resgate; reducao de principal nunca e ganho.
- `svA` preserva o tipo oficial de Renda Fixa quando o modal nao expoe `f-ty`.
- Foram adicionados dois testes de regressao e `tests/rf-partial-redemption.smoke.test.js`.

## Contexto Operacional

- Clone usado na validacao e merge: `C:\Projetos\carteira-investimentos-buildcheck`.
- Main apos PR #267: `ba9eafdbbb7e0d137f7aff82da26d2b134384f75`.
- O SHA e contexto operacional; validar Git novamente antes de confiar nele.

## Test Mode e Build

- `testMode` usa fixture em memoria; `save()` nao representa persistencia real e `reload` reinicializa a fixture.
- Smokes em `testMode` devem validar estado, UI, calculos e telemetria durante a sessao, sem exigir persistencia apos reload.
- EPERM de `npm run build:modern` somente no sandbox deve ser validado em PowerShell normal do Windows. Nao alterar ACL, usar `takeown` ou desabilitar protecoes.

## Trabalho Paralelo

- Para trabalho critico ou simultaneo, preferir branch, worktree ou clone isolado.
- Antes de editar, confirmar repositorio, branch, HEAD, status e `origin/main`.
- Se houver working tree suja de outra feature, parar; nao usar `reset`, `clean`, `stash` ou `restore` sem autorizacao.

Historical facts and permanent decisions from the project's evolution.

## 2026-09-12 - Project Skills and automatic routing V1

- O catálogo canônico é `docs/ai/SKILLS.md`, o router é
  `docs/ai/SKILL_ROUTER.md` e o roteamento de modelos é
  `docs/ai/AGENT_MODEL_ROUTING.md`.
- Missões grandes começam com `find-skills`. Firebase/Auth/Firestore,
  permissões cloud, sincronização local/cloud e protected writes usam
  `firebase-security-rules-auditor`. UI, acessibilidade, responsividade,
  performance e QA web usam `web-quality-audit`.
- O inventário atual possui 29 pastas de primeiro nível e 32 `SKILL.md`
  recursivos; 26 Skills operacionais após excluir cópias upstream, backup e
  referências. As contagens futuras devem ser recalculadas no disco.
- `ZERO_RECURRING_COST_BY_DEFAULT=true` e `TOKEN_ECONOMY_REQUIRED=true` são
  políticas permanentes. Skills não podem superar `AGENTS.md`, contratos
  financeiros, áreas protegidas ou gates de autorização.

## 2026-09-13 - Operational Skill catalog audit

- Auditoria física de `C:\Projetos\carteira-investimentos\.agents\skills`:
  26 Skills operacionais reais; cópias upstream, backup e referências foram
  separadas e não entram no roteamento normal.
- O catálogo detalhado por momento do projeto está em
  `docs/ai/SKILL_OPERATIONAL_CATALOG.md`. Regra permanente: escolher o menor
  conjunto útil, normalmente no máximo duas Skills e três excepcionalmente.
- Financeiro/persistência/recovery usa `doubt-driven-development`; Firebase,
  Auth, Firestore, cloud/local e protected writes usa
  `firebase-security-rules-auditor`; browser QA usa `browser-harness` e
  `playwright`; qualidade web usa `web-quality-audit`.
- UI mantém trilhas mutuamente exclusivas por fase: `frontend-design` para
  direção nova, `interface-design` para product UI e `impeccable` para polish.
- Não foi identificada lacuna crítica. Chrome DevTools MCP continua opcional e
  não configurado; usar browser-harness/Playwright quando possível. Nenhuma
  Skill autoriza escrita financeira, cloud, dependência paga ou deploy.

## 2026-09-12 - Phase 4I V39 KNUQ contract reconciliation

- The August `21 links` assertion first appeared in commit `1a7b718` as a
  synthetic `LINK1..LINK21` sandbox fixture; it was not backed by a KNUQ event
  identity or authoritative provider record.
- Current source-backed accounting is `24 = 20 linked + 1 new TEPP11 + 2 ETF
  exclusions + 1 deferred ambiguity KNUQ11`. KNUQ source is `2026-08-12 / 8970
  cents`; its only plausible Yahoo candidate is `2026-08-03 / 8964 cents`.
- No provider ID, corporate-action ID or immutable historical mapping proves
  that these are the same event. The policy is therefore
  `DEFERRED_AMBIGUOUS_NO_OP`: KNUQ remains visible, unresolved, mutation-free
  and contributes zero financial delta. A forced 21st link is prohibited.
- TEPP11 remains the independent new event at `2026-08-14 / 8537 cents`;
  DIVD11 `559` cents and NDIV11 `5493` cents remain excluded.
- Project operation and long-term maintenance should remain free of recurring
  cost whenever technically possible. Paid B3/market-data/AI APIs, unnecessary
  SaaS, paid database or paid hosting are not normal runtime requirements and
  require explicit authorization.
- Authenticated read-only validation passed on HEAD
  `ae0941e469378c4b60a40581641018c3df4a9565`: three identical native prewrites
  reached the executor preflight with no snapshot, mutation, save, sync or
  authorization consumption. The canonical browser remained authenticated at
  `430/329/101`; browser QA passed all seven tested viewports without overflow,
  clipping, console errors, page errors or relevant request failures.
- Provider v2 is bound by hash
  `570ad362f0e935dfe7ec95c3da1a6aa2f38d505e07b5dc297d6832b0ec84869c`.
  The diagnostic manifests are evidence artifacts only. A real Class C or
  August authorization still requires a clean final HEAD and freshly generated
  authorization-grade manifests; V39 performed zero real financial/cloud writes.

## 2026-09-12 - Phase 4H V31 governance and safe hardening

- V26 remains the single consumed real Class C attempt: the protected save
  bypass was missing, the callback falsely reported success, postwrite failed,
  and targeted rollback restored the baseline. Its authorization is permanent
  and non-reusable; no new authorization exists.
- This mission revalidated the fixed Class C contracts offline and added a
  narrow equivalent guard to the protected August persistence callbacks:
  `__protectedLocalRecoveryWrite:true` is explicit and a failed save cannot be
  reported as success. No real portfolio or cloud write occurred.
- The canonical physical Skills inventory currently has 26 top-level folders
  containing `SKILL.md`; the catalog text still says 28 folders. The router's
  referenced operational names resolve, but the count discrepancy remains a
  documentation cleanup item.
- QA authentication was still unavailable at the final check (`AUTH_SESSION_VALID=false`),
  so authenticated cloud/browser gates and any new live prewrite remain
  deferred. Local and cloud authoritative baseline remains `430/329/101` and
  `3718285` cents from the current mission state.
- August remains blocked by unresolved KNUQ ambiguity and its active provider
  still needs a dedicated canonical-provider replacement pass under an
  authenticated read-only runtime; TEPP11 remains the independent `8537`
  cent candidate and DIVD11/NDIV11 remain excluded.

## Phase 4H current 101 recovery gate

- Current canonical branch validation remains read-only; no real recovery,
  rollback, reconciliation, sync, Class C or August pilot was executed.
- Current local authoritative forensic state is `329/329/0`, references `0`,
  financial `2685096`, fingerprint `e1ad958f5f04debf7de161e6572a64b93bff48c33343d21f5f918a6acbadcbe2`.
- Current cloud read-only state is `430/329/101`, references `0`, financial
  `3718285`, fingerprint `8f2df3f7d9be972f6e1048cc695e1447697800df83352a17273851805b4eda70`.
- The only accepted baseline drift is the user-confirmed BBAS3 event on
  2026-09-02: 2129 to 2137 cents, delta +8. It is represented as
  `USER_CONFIRMED_REAL_DATA_CHANGE`; no generic small-delta auto-approval exists.
- Current source classification is 101 cloud-only events: 94 exact donor,
  5 KNUQ variants, 2 post-donor, 0 unexplained. Current increment is
  `1033189` cents and has independent delta parity.
- Provenance/drift tooling now validates exact event identity and values,
  emits deterministic provenance/source/classification hashes, and reports
  semantic unrelated-state parity while retaining raw hashes for audit.
- Three independent protected read-only prewrites were identical and passed;
  the recovery executor remained local-only with cloud writes blocked.
- Three independent current-baseline sandbox lifecycles passed through the
  official executor: snapshot persisted/read back in a temporary file store,
  fresh-process verification, ADD 101, target readback `430/329/101` and
  `3718285` cents, reconciliation, idempotency, rollback, and rollback
  readback to `329/329/0` and `2685096` cents. All runs were identical.
- 2026-09-11: the writable `localStorage:civ5` baseline was re-read three
  times and remained stable at `329/329/0`, references `0`, financial
  `2685096`, raw hash `20a0d833ff1159fba9cef7d87ee6e349f164677da7e17bb10d6c745a107c1302`
  and structural fingerprint
  `583df4d25f8780ea2df236cb88e33a6db4dbed8711afd4a1ffc8a34a9a0f0ce8`.
- The previous forensic fingerprint `e1ad958f...` differs only because the
  writable payload contains non-economic descriptive/preferences metadata;
  economic event keys, counts, financial total and reconciliation identity
  are equivalent. The current official preflight passes with
  `AUTHORITATIVE_BRIDGE` and `localStorage:civ5`.
- The protected QA profile remained authenticated and cloud-readable at T0,
  30s, 60s and 120s checkpoints. Three current-baseline preflights were
  identical; cloud stayed `430/329/101`, `3718285` cents, and the local-only
  contract remained active. No real recovery or local mutation was executed.

## Current Product Baseline

- Produto: Carteira de Investimentos, SPA legada em `index.html`.
- Baseline atual da `main`: Fase 12 concluida no merge `3e8026aa005ab281176d0a496896fb2318353341`.
- Visual Master aprovado: padrao premium dark, sidebar lateral como navegacao principal e informacao financeira densa, clara e executiva.
- Baseline visual: Dashboard, Dividendos, Ativos e Rentabilidade.
- Numeros de referencias e mockups sao ilustrativos; dados reais da carteira sempre prevalecem.
- Nao reintroduzir elementos removidos sem justificativa e evidencia de necessidade.
- Metas, Rebalanceamento e demais telas devem manter a mesma linguagem sem alterar regras financeiras.
- Dispositivos prioritarios: Samsung Galaxy S25 (~6,2 polegadas) e notebook Dell (~14 polegadas).
- Viewports de validacao: 390x844, 430x932, 768x1024, 1366x768 e 1920x1080.
- Breakpoints adicionais quando necessarios: 960x768, 1024x768, 1180x820 e 1181x820.

### Fase 12 - estado consolidado

- `PHASE_12_PIXEL_CLOSE_VISUAL_PARITY`: MERGED.
- Merge commit: `3e8026aa005ab281176d0a496896fb2318353341`.
- Production: SUCCESS.
- Dashboard: executivo, sem voltar a uma evolucao patrimonial gigante.
- Dividendos: resumo, evolucao e historico sao a hierarquia primaria.
- Ativos: categorias compactas e inicialmente recolhidas.
- Rentabilidade: KPIs e comparacao de indices como foco.
- Rebalancear permanece compacto; Metas preserva a linguagem visual sem redesign gratuito.
- Sidebar e navegacao lateral sao o padrao desktop principal.

O Visual Master e baseline oficial ativo. Mudancas futuras devem corrigir bugs,
responsividade, acessibilidade, densidade ou inconsistencias sem destruir a
composicao aprovada.

Para a politica completa de autonomia, limites e continuidade entre agentes,
consulte `docs/ai/AGENT_AUTONOMY.md`. Para selecionar ferramentas e Skills,
consulte `docs/ai/SKILLS.md`.

## Pull Requests

### PR #260
**Resumo**: fix(movements): corrige edição e exclusão por id

### PR #261
**Resumo**: feat(sales): simplifica fluxo de venda de ativos

### PR #262
**Resumo**: fix(ui): corrige resgate RF, edição e refresh de cotação

## Permanent Decisions

- `frontend-design` passa a ser skill local padrao para telas, modais e refinamentos visuais.
- Em tarefas de interface, combinar `frontend-design` com `interface-design`, `playwright`, `impeccable` e `caveman-review` conforme o escopo.
- A skill orienta a apresentacao e a usabilidade, mas nao autoriza mudancas em regras financeiras, persistencia ou schema.

- `docs/ai/AGENT_AUTONOMY.md` registra a politica de autonomia para Codex, OpenCode, Hermes Agent e outros agentes autorizados. Contem escopo, limites, areas protegidas, autonomia visual/UX, liberdade ampliada para Hermes, Browser Harness, correcoes, areas financeiras protegidas, dados, git, commits, push/merge/deploy, qualidade minima, direcao do produto e memoria persistente. Agentes devem consultar este documento antes de fases maiores.

- Nunca duplicar `saveRfMovimentacao`; sempre reutilizar a função oficial.
- Sempre reutilizar `finance-core.js` para cálculos financeiros; nunca criar cálculos paralelos.
- Renderização da UI deve ser baseada no estado global `S` (ou equivalente via persistence).
- Persistência de dados deve ser centralizada em `persistence-core.js`; nunca duplicar lógica de storage.
- Sempre validar alterações de UI com testes Playwright em múltiplos viewports (390px, 768px, 1366px, 1920px).
- Nunca inventar regras financeiras; todas as regras devem ser extraídas do código existente (`finance-core.js`, `persistence-core.js`).
- Sempre reutilizar fluxos oficiais de movimentação (ex: `openRfMovementEditor`, `saveRfMovimentacao`).
- Preservar dados existentes (carteira, proventos, renda fixa, metas, backup) em todas as alterações.
- Cada alteração deve ter um rollback simples e verificável.
- Não reconstruir funções estáveis a cada fase; preferir alterações pontuais e verificáveis.
- Uma mudança por objetivo; diffs pequenos e temáticos.
- Antes de qualquer alteração, auditar o código existente e documentar o impacto.
- Após alterações, validar com os testes unitários e de integração exigidos pela governança do projeto.

## Visual North Star (Iteration 1 - Design System + Dashboard)

- Branch: `feat/visual-product-north-star` (from clean main `4efc66a`).
- Iteration 1 completed: Design System tokens, Dashboard KPI cards, shell/sidebar, Phase 7 standardization.
- Design tokens added: `--fs-caption` (10px), `--fs-label` (11px), `--fs-body` (12px), `--fs-sub` (13px), `--fs-h4` (14px), `--fs-h3` (17px), `--fs-h2` (20px), `--fs-h1` (24px).
- Elevation tokens: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glow`.
- Surface tokens: `--surface-raised`, `--surface-overlay`.
- KPI cards: reduced glow opacity from `.12` to `.08`, added hover transitions, tightened typography hierarchy.
- Panels: unified `border-radius` to `var(--pd-radius-md)`, added subtle hover transitions.
- Phase 7 standardization: all hardcoded font sizes replaced with design system tokens.
- All 222 tests pass (build + finance + persistence + backup + load + roundtrip + extraction + ui + performance + integration).
- Browser validation: screenshots captured at 390x844, 768x1024, 1366x768, 1920x1080.
- North Star document: `docs/visual/NORTH-STAR.md` (visual direction reference).
- UI Audit document: `docs/visual/UI-AUDIT.md` (screen-by-screen audit matrix).

## Visual North Star (Iteration 2 - Dashboard Core Refinement)

- Iteration 2 completed: Composition, Passive Income, Highlights, Insights panels refined.
- Composition: reduced donut scale (.76 -> .72), tighter row gaps (4px -> 3px), reduced bar height (4px -> 3px), improved scannability with tabular-nums.
- Passive Income: compacted receipt rows (6px -> 4px padding, 8px -> 6px gap), reduced KPI min-height (82px -> 72px), tighter income grid.
- Highlights: reduced max-height (340px -> 320px), compacted tabs/filters/exec-rows, tighter padding throughout.
- Insights: compacted consultive cards (9px -> 8px padding), reduced status badge size, tighter grid gaps.
- Executive rows: improved alignment (flex-start -> center), added tabular-nums for numeric values, reduced sub-text opacity.
- Grid spacing: master grids reduced from 12px to 10px gap, mobile from 9px to 8px.
- All 222 tests pass (build + finance + persistence + backup + load + roundtrip + extraction + ui + performance + integration).
- Browser validation: screenshots captured at 390x844, 430x932, 768x1024, 1366x768, 1920x1080.

## Visual North Star (Iteration 3 - Premium Assets & Positions)

- Iteration 3 completed: Assets/Positions screen density, mobile cards, table improvements.
- KPIs: reduced padding (10px 12px -> 8px 10px), min-height (72px -> 62px), gap (8px -> 6px), font-size (16px -> 14px), removed sub-text for compact labels.
- Asset class accordion: compacted icon (34px -> 30px), name font (18px -> 16px), stats gap (12px -> 8px), stat font (15px -> 13px), body padding (14px -> 12px).
- Premium table: reduced padding (10px 12px -> 8px 10px), font-size (12px -> 11px), header font (10px -> 9px), border-radius (12px -> 10px), tighter column min-widths.
- RF table: compacted padding (7px -> 6px), border-radius (14px -> 10px).
- Mobile cards: reduced gap (8px -> 6px), border-radius (12px -> 10px), tighter padding (12px -> 10px), compact action buttons (48px -> 42px min-height).
- Distribution items: compacted padding (8px 10px -> 6px 8px), color dot (10px -> 8px), font sizes reduced throughout.
- Header/search/filter: reduced title (18px -> 16px), search input (10px 12px -> 8px 10px), filter button (44px -> 40px min-height).
- Tabs: compacted padding (7px 12px -> 6px 11px), font (12px -> 11px), min-height (44px -> 40px).
- Empty state: reduced padding (40px -> 32px), icon (32px -> 28px), text sizes.
- All 222 tests pass (build + finance + persistence + backup + load + roundtrip + extraction + ui + performance + integration).
- Browser validation: screenshots captured at 390x844, 430x932, 768x1024, 1366x768, 1920x1080.

## Visual North Star (Iteration 4 - Premium Dividends & Passive Income)

- Iteration 4 completed: Dividends tab restructured with 5-level information architecture, full visual refinement.
- Information Architecture (5 levels):
  1. Executive KPIs (4 cards): Recebido no ano, Média mensal 12M, Este mês, Meta mensal — removed duplicated "Total acumulado".
  2. Primary Grid: Timeline evolution (6-month cards) + Upcoming receipts (grouped by date, status badges).
  3. Secondary Grid: Top payers ranking (8 assets, contribution bars, % of period income) + Distribution panel (collapsible monthly bars).
  4. Passive Income Context: compact panel with current month, 12M avg, monthly target, gap to target, progress % + progress bar + annual projection.
  5. History Block: Monthly list + Annual matrix (sticky year column, tabular-nums, future/absent/zero distinction) — mobile adapts to card layout.
  6. Review Block: RF/Proventos audit panel (collapsible).
- Top Payers refined: increased from 5 to 8 visible, added contribution bars, % of period income, removed redundant "Média" and "Último pagamento" columns, kept ticker visual priority.
- Upcoming Receipts refined: grouped by date, status badges (RECEBIDO/CONFIRMADO/ESTIMADO) with semantic colors, increased from 6 to 8 items per group, never present estimates as confirmed.
- Annual Matrix readability improved: font-size 10px->11px, min-width 680px->720px, padding 7px->8px, header 11px->12px. Mobile (<768px) adapts to card-based layout with data-month attributes.
- Distribution Panel: compacted padding, collapsible by default, uses official filtered data.
- Executive KPIs CSS: grid 5->4 columns, min-height 78px->70px, value font 15px->14px.
- Full CSS density pass across all Dividends components (hero, grids, cards, tables, collapsibles, timeline, mobile responsive).
- Dashboard = summary (executive); Dividendos = historical depth (never sacrificed for visual simplification).
- Premium != smaller fonts — prioritized hierarchy, clarity, scannability, useful info, alignment, progressive disclosure, consistency, reading comfort.
- All 222 tests pass (build + finance + persistence + backup + load + roundtrip + extraction + ui + performance + integration).
- Browser validation: screenshots captured at 390x844, 430x932, 768x1024, 1366x768, 1920x1080.
- Financial logic unchanged (finance-core.js, persistence-core.js protected).
- Persistence unchanged.
- Caveman review: 5-second test PASS — all 6 questions answered at a glance.

## Phase 18.1 Product Value Decisions

- Dashboard responde o que esta acontecendo agora; Relatorios e a area de investigacao e exportacao; IA concentra atencao e priorizacao deterministica.
- Acoes contextuais devem manter uma acao primaria visivel e reservar o menu para operacoes raras, sem criar fluxos financeiros paralelos.
- Explicacoes de metricas devem ser discretas, acessiveis e usar a mesma fonte oficial da metrica, sem recalculo paralelo.
- Empty states devem explicar ausencia e proximo passo somente quando houver uma acao real; nao criar CTAs artificiais.
- Insights permanecem read-only, sem recomendacao automatica de compra ou venda e sem ampliar a estrutura aprovada do Dashboard.

## Dashboard 7.4 Approved Baseline

- Dashboard 7.4 foi aprovado como baseline visual oficial.
- A estrutura oficial permanece limitada a seis areas conceituais.
- Mobile: Patrimonio em largura total, demais KPIs em grid 2x2, secoes principais em largura total e bottom navigation com safe-area e espaco inferior.
- Desktop: canvas centralizado com max-width de 1360px; Composicao + Renda Passiva agrupados; Destaques + Metas agrupados; Atencao & Insights como fechamento.
- Tablet 768 possui composicao responsiva propria.
- Metas permanecem resumidas no Dashboard; o detalhamento pertence a tela de Metas.
- Relatorios nao e referencia visual primaria. As referencias principais sao Ativos aprovado, Dividendos aprovado, Mobile aprovado e o design system existente.
- A logica financeira e a persistencia devem permanecer preservadas; futuras alteracoes do Dashboard devem tratar 7.4 como baseline e evitar regressao visual.

## Visual North Star (Iteration 5 - Premium Rentabilidade & Benchmarks)

- Iteration 5 completed: Rentabilidade tab transformed into premium performance-analysis screen.
- Information Architecture (5 levels):
  1. Executive Performance (4 KPIs): Rentabilidade total, Últimos 12M, Patrimônio (valor/custo/lucro), Período + Benchmark — clean tabular alignment.
  2. Main Chart: Portfolio vs Benchmark evolution — visual protagonist with improved legend, period context, series distinction.
  3. Benchmark Context: Succinct interpretation — what's compared, above/below, by how much, period context, no recommendation language.
  4. Breakdown by Asset Class: Collapsible section with type, value, % of portfolio, contribution bars — uses official allocation data.
  5. Historical Monthly Table: Preserved with sticky year column, tabular-nums, proventos columns.
- Period Selector: Proper periods (1M, 3M, 6M, 12M, YTD, Desde o início) — visually obvious selection.
- Chart improvements: Fixed width SVG (1080px), responsive container, grid lines with percentage labels, area fills, clean legend.
- Benchmark colors: Neutral categorical colors (warning for benchmark), portfolio result uses success/danger semantics only.
- Mobile adaptations: Exec KPIs stack single-column, chart full-width, period selector below title, breakdown adapts to card rows.
- Desktop 1366x768: Exec KPIs + substantial chart visible without excessive scrolling. 1920px controlled content width.
- All 222 tests pass (build + finance + persistence + backup + load + roundtrip + extraction + ui + performance + integration).
- Browser validation: screenshots captured at 390x844, 430x932, 768x1024, 1366x768, 1920x1080 (profitability-*-final.png + dividends-*-final.png).
- Financial logic unchanged (finance-core.js, persistence-core.js protected — no new benchmark calculations).
- Persistence unchanged.
- Caveman review: 5-second test PASS — all 6 questions answered at a glance.

## INVESTMENT_PRODUCT_PREMIUM_REDESIGN_PASS_2

### Summary
Complete visual/product redesign pass across all major screens (Dashboard, Ativos, Dividendos, Rentabilidade, Relatórios) using Investidor10 as product-learning reference. Four visual cycles executed with browser validation at 5 viewports each.

### Cycle 1: Global Shell + Dashboard
- Design tokens refreshed: new color palette, typography scale (--fs-xs 10px through --fs-4xl 28px), spacing rhythm (--space-1 through --space-6), shadow system (--shadow-sm through --shadow-xl), radius scale
- Sidebar widened to 240px with SVG icons, gradient background, improved brand area, better active states
- Header refined: larger icon, better typography, proper shadows
- Mobile bottom navigation added with SVG icons (Dashboard, Ativos, Aportes, Dividendos, Menu)
- Dashboard: stronger KPI strip, improved composition visualization, passive income summary, highlights as compact financial list, goals as executive progress, attention panel focused on exceptions

### Cycle 2: Ativos Screen
- Professional table with sticky columns, priority-based column hiding on narrow screens
- Asset class badges with semantic colors (Ação, FII, ETF, Renda Fixa, BDR, Crypto, Outros)
- Quote source badges (Brapi, Yahoo, Importado)
- Mobile cards with expandable details, proper financial hierarchy
- Sticky first column (ticker) on desktop tables
- RF table with dedicated columns for applied/current/profit/rentabilidade/% carteira

### Cycle 3: Dividendos Simplification
- Reduced to 3 core areas: SUMMARY (executive KPIs) + MONTHLY EVOLUTION CHART + MONTHLY HISTORY
- Removed: Upcoming receipts, Asset distribution, Distribution panel, Review block from overview
- Progressive disclosure: secondary tabs (Por ativo, Recebimentos, Revisão) available but not in overview
- Passive Income Context panel retained below main content
- Cleaner visual hierarchy, less visual noise

### Cycle 4: Rentabilidade + Relatórios
- Rentabilidade: Already premium from Iteration 5 — executive KPIs, main chart with proper period selector (1M, 3M, 6M, 12M, YTD, Desde o início), benchmark context, asset class breakdown, historical table
- Relatórios: Already well-developed — summary strip + main investigation region (evolução + distribuição) + supporting summaries (renda, RF, auditoria) + export actions
- Both screens use Investidor10-inspired visual language

### Cross-Cutting Improvements
- Tables: Professional appearance with sticky columns, tabular-nums, semantic positive/negative colors, priority-based responsive hiding
- Charts: Fixed width SVG (1080px), grid lines with percentage labels, area fills, clean legends, responsive containers
- Typography: Financial values immediately readable, secondary labels readable, line heights compact but comfortable
- Mobile: Cards instead of squeezed tables, bottom navigation, safe-area handling, touch targets ≥44px
- Color semantics: Green/red only for actual financial results; benchmark series use neutral categorical colors

### Safety & Quality
- 222/222 tests PASS (all suites)
- Build PASS
- Financial logic unchanged (finance-core.js, persistence-core.js protected)
- Persistence unchanged
- No parallel financial math
- All existing unrelated changes preserved

### Visual Cycles Evidence
- Before screenshots: output/premium-redesign-pass-2/before/ (25 files)
- Cycle 1: output/premium-redesign-pass-2/cycle-1/ (25 files)
- Cycle 2: output/premium-redesign-pass-2/cycle-2/ (25 files)
- Cycle 3: output/premium-redesign-pass-2/cycle-3/ (25 files)
- Cycle 4: output/premium-redesign-pass-2/cycle-4/ (25 files)
- All 5 viewports × 5 screens × 5 cycles = 625 screenshots captured

### Responsive Validation
- 390x844: Mobile cards, single-column KPIs, bottom nav, chart full-width
- 430x932: Same patterns, slightly more horizontal space
- 768x1024: 2-column KPIs, tablet table adaptations, sidebar collapsed
- 1366x768: Full desktop layout, exec KPIs + substantial chart visible
- 1920x1080: Controlled content width (max-width 1520px), no excessive stretching

### Caveman Review (5-second test)
All screens PASS — answers at a glance:
- Dashboard: Quanto tenho? Como está composto? Renda passiva? Destaques? Metas? Alertas?
- Ativos: Quanto em cada classe? Quantos ativos? Resultado? Rentabilidade? Participação? Onde detalhar?
- Dividendos: Quanto recebi? Evolução? Histórico? Meta? Próximos?
- Rentabilidade: Quanto rendeu? Em R$? Vs benchmark? Período? Melhorando/piorando? De onde vem?
- Relatórios: Patrimônio? Resultado? Distribuição? Proventos? RF? Auditoria? Exportar?

### Files Changed
- index.html (major visual redesign)
- tests/dividends-summary-clarity.test.js (updated for simplified layout)
- tests/dividends-visual-refinement.test.js (updated for simplified layout)
- docs/ai/PROJECT_MEMORY.md (this documentation)
- Screenshots: 625 files in output/premium-redesign-pass-2/

### Financial Safety
- financial_logic_changed: false
- persistence_changed: false
- No financial formula modifications
- No schema changes
- No persistence layer changes
- All tests passing

### Recommendation
READY_FOR_HUMAN_VISUAL_REVIEW
## E2E local seguro

O fluxo automatizado deve usar `http://127.0.0.1:<porta>/index.html?testMode=1` (ou `localhost`) para ativar o modo de teste local. Esse modo carrega uma fixture deterministica em memoria, exibe a identificacao "Modo de teste local", nao inicializa Firebase/sync e bloqueia importacao e backup reais. A condicao exige host local e a flag explicita; em qualquer dominio de producao o Google OAuth e o Auth Gate permanecem obrigatorios. Capturas e smokes devem falhar se encontrarem "Entre com Google para continuar" e nunca tratar o Auth Gate como evidencia de tela interna.
## Recuperacao de integridade do index.html

Em 27/08/2026, `index.html` foi encontrado totalmente sobrescrito por um fragmento de `overviewBody` de Dividendos, removendo o shell, `go()` e o bootstrap. A recuperacao usou `HEAD:index.html` como base integra; o fragmento nao continha mudancas exclusivas ausentes da base. A copia foi preservada em `output/index-corrupted-dividends.html`. `replace_dividends.py` agora recusa executar quando faltam `<!DOCTYPE html>`, `<html>`, `function go(` ou `</html>`, e `tests/index-integrity.test.js` protege esses marcadores. O incidente nao alterou logica financeira, persistencia ou autenticacao.
### 2026-08-27 - integridade do transformador de Dividendos

- A validação final usa `tests/index-integrity.test.js` e `tests/replace-dividends-integrity.test.js`.
- `replace_dividends.py` recusa entradas fragmentadas, valida a saída transformada e substitui `index.html` atomicamente; a prova isolada preserva o original quando a entrada é inválida.
- Evidências visuais recuperadas em `output/dividends-premium-final-review-recovered/` para 390, 430, 768, 1366 e 1920px.
- A suíte legada `tests/dividends-visual-refinement.test.js` continua incompatível com o HTML íntegro do HEAD ao exigir `dividend-primary-grid-simple`; isso é falha de expectativa preexistente, não motivo para corromper o documento.

### 2026-08-27 - convergência visual final de Dividendos

- O contrato visual atual de Dividendos usa `dividend-primary-grid`, `dividendExecutiveKpis` e gráfico mensal SVG oficial; a expectativa legada de adjacency direta e o import inválido de `assert` foram corrigidos no teste sem alterar a produção financeira.
- A reserva inferior mobile da página usa a altura real da navegação fixa (62px), safe-area e margem visual; o destaque central de Aportes só aparece quando `S.tab === 'aportes'`, evitando confusão quando Dividendos está ativo.
- A validação final em modo de teste local confirmou scroll no topo, gráfico protagonista, histórico mensal, `390/430/768/1366/1920`, zero overflow, clipping, erros de console, page errors e request failures.
- Evidências finais TOP/FULL: `output/dividends-final-visual-convergence/dividends-390-top.png`, `dividends-390-full.png`, `dividends-430-top.png`, `dividends-430-full.png`, `dividends-768-top.png`, `dividends-768-full.png`, `dividends-1366-top.png`, `dividends-1366-full.png`, `dividends-1920-top.png` e `dividends-1920-full.png`.

### 2026-08-27 - fechamento visual humano de Dividendos

- `DIVIDENDS_FINAL_VISUAL_CONVERGENCE` e `DIVIDENDS_FINAL_MICRO_POLISH` foram concluídas com aprovação humana final.
- O gráfico mensal SVG é o padrão oficial da aba Dividendos; no mobile os KPIs seguem composição `1 + 2 + 2` e a bottom navigation destaca somente a rota ativa, mantendo Aportes como ação central sem parecer selecionado.
- Evidências finais do micro-polish: `output/dividends-final-micro-polish/dividends-390.png`, `dividends-430.png`, `dividends-1366.png` e `dividends-1920.png`.
- Fechamento validado com Dividend visual `16/16`, Dividend summary `PASS`, `npm test`, `test:modern`, `build`, `build:modern` e `git diff --check` verdes; lógica financeira, persistência, autenticação de produção, integridade do `index.html`, guarda de `replace_dividends.py` e `testMode` local permanecem protegidos.

### 2026-08-27 - convergencia analitica do Dashboard

- O Dashboard passou a exibir `dashboardEvolutionPanel()` como bloco analitico principal, usando `patrimonySnapshot()` e a serie real de aportes liquidos acumulados; sem historico valido, o componente mostra estado vazio honesto.
- A ordem oficial ficou KPIs, evolucao patrimonial + composicao, renda passiva + destaques e depois metas, atencao, insights e proximos passos; Dividendos e a logica financeira permanecem inalterados.
- A grade desktop usa mais largura para Evolucao/Renda Passiva, com valores financeiros sem ellipsis em 1366px; mobile e tablet usam empilhamento responsivo sem overflow ou sobreposicao da bottom navigation.
- Evidencias finais TOP/FULL: `output/dashboard-analytical-convergence/dashboard-390-top.png`, `dashboard-390-full.png`, `dashboard-430-top.png`, `dashboard-430-full.png`, `dashboard-768-top.png`, `dashboard-768-full.png`, `dashboard-1366-top.png`, `dashboard-1366-full.png`, `dashboard-1920-top.png` e `dashboard-1920-full.png`.

### 2026-08-28 - gate final de produto de Dividendos

- A aba Dividendos permanece organizada em resumo executivo, evolucao mensal oficial, historico mensal e contexto secundario de renda passiva.
- A validacao final em `testMode` foi repetida em 390x844, 430x932, 768x1024, 1366x768 e 1920x1080 por tres ciclos, com grafico, historico, bottom navigation e zero erros/overflow/clipping.
- Nenhuma regra financeira, persistencia ou autenticacao foi alterada; nenhum contrato de teste foi ajustado nesta passagem.
- A bottom navigation fixa pode aparecer sobre uma captura full-page por permanecer ancorada a viewport, mas o espaco inferior da pagina preserva a acessibilidade do conteudo.

### 2026-08-28 - reserva estrutural da navegacao mobile em Dividendos

- A bottom navigation mobile deve reservar espaco seguro no layout e nunca sobrepor conteudo financeiro durante a navegacao real.
- A aba Dividendos preserva o grafico mensal e o historico completo; no mobile, o ano atual permanece expandido e anos anteriores iniciam recolhidos.

### 2026-08-28 - primeira convergencia premium de Rentabilidade

- Rentabilidade usa `rentabilityHistory()` como fonte da serie da carteira, do benchmark selecionado e do historico anual; os benchmarks disponiveis permanecem CDI, IPCA, IFIX, IBOV, SMLL e IDIV.
- A hierarquia visual adotada e composta por tres KPIs executivos, grafico comparativo protagonista e historico mensal recolhido; no mobile, filtros rolam horizontalmente e o grafico permanece dentro do shell persistente.
### 2026-08-28 - gate visual final de Rentabilidade

- Refinamento exclusivamente visual em Rentabilidade: a regiao analitica limita
  a largura util em telas muito largas, o tablet organiza os tres filtros em
  uma linha e o historico mensal fechado exibe um preview compacto baseado nos
  dados ja calculados.
- Validado em 390, 430, 768, 1366 e 1920px sem overflow ou erros de runtime;
  Dividendos permanece a baseline visual aprovada.

### 2026-08-28 - gate visual final de Ativos

- Ativos preserva um unico cabecalho visual, as tabs funcionais e a divulgacao
  progressiva por classe; Dividendos e Rentabilidade continuam baselines visuais
  aprovadas.
- No mobile, os KPIs usam composicao `1 + 2 + 2` e as acoes ficam compactas;
  no desktop, a tabela prioriza ticker, quantidade, precos, atual, resultado,
  rentabilidade, total, peso e acoes, mantendo metadados secundarios nos
  detalhes/cards.
- A validacao visual cobre 390, 430, 768, 1366 e 1920px, com evidencia de
  interacao das classes e sem overflow ou erros de runtime.
- Decisao das tabs: Patrimonio e o conteudo padrao da pagina e nao repete mais
  uma pill; Analise preserva a visao exclusiva de composicao e sinais; Desempenho
  preserva a visao de performance; Renda Fixa preserva o acesso contextual ao
  dominio e suas acoes.
- O cabecalho unico usa Ativos e a quantidade agrupada; a tabela expandida
  prioriza campos financeiros completos e deixa setor, alvo, ideal, dividendos
  e DY para detalhes/cards.
- Evidencia humana final em `output/assets-premium/human-final-gate`: 390,
  390 expandido, 430, 768, 1366, 1366 expandido e 1920; todos inspecionados
  apos a ultima alteracao, com tabela expandida sem truncamento financeiro.
- Ativos: HUMAN VISUAL APPROVED em mobile 390/430, tablet 768 e desktop
  1366/1920; tabela expandida, progressive disclosure e bottom navigation
  aprovados. Análise, Desempenho e Renda Fixa permanecem por enquanto; nao
  reabrir Ativos sem regressao objetiva ou nova decisao de produto.
### 2026-08-28 - convergencia premium de Aportes

- Aportes preserva os contratos de compra, venda, aporte, provento e Renda Fixa,
  com validacao e persistencia existentes; Nova movimentacao usa fluxo
  contextual e nao altera a matematica financeira.
- A pagina organiza header, resumo, movimentacoes recentes, busca/filtros,
  modos de consulta e historico; importacoes permanecem acessiveis em faixa
  compacta.
- Mobile prioriza CTA, resumo legivel, filtros com touch target e bottom nav
  preservada; desktop usa lista densa com valores financeiros completos.
- Validado em 390, 430, 768, 1366 e 1920px; evidencias em
  `output/contributions-premium/`; sem overflow ou erros de runtime.

### 2026-08-28 - gate final de Aportes

- A primeira dobra mobile usa `+ Nova movimentacao` como CTA primario;
  `Nova movimentacao inteligente` permanece secundaria e as importacoes usam
  disclosure nativo, preservando B3, Excel, PDF e nota de corretagem.
- Os quatro KPIs do resumo permanecem como contexto operacional, enquanto
  historico, ultimos aportes e distribuicao por classe continuam como conteudo
  principal; nenhum dado ou handler financeiro foi removido.
- Validacao visual final em 390, 430, 768, 1366 e 1920px, incluindo modal de
  compra mobile e desktop. A navegacao inferior, valores financeiros e
  formulários permaneceram acessiveis, sem overflow ou erros de runtime.
- O smoke focado legado ainda possui quatro assercoes que interpretam
  `overflow:hidden` de cards como clipping, e quatro casos que dependem do
  seletor antigo `.dashboard-home-summary`; classificados como TEST_CONTRACT /
  HARNESS_GAP, sem alteracao artificial em producao nesta fase.
- O contrato de clipping foi corrigido para geometria real e o harness de
  Dashboard passou a aguardar o container atual. Aportes Premium Clarity e
  Dashboard/Aportes readability ficaram em 39/39; os cinco tipos exibem seus
  campos e CTAs no modal mobile sem overflow, e o painel Revisao atualiza ao
  vivo em compra desktop.
## Current operational checkpoint

- Official repository: `paulinhoo2002-ctrl/carteira-investimentos`.
- Current verified baseline: `origin/main = 4efc66ad0673c552934de2b4d42896148a11057f`.
- Never mix this project with `controle-financeiro` or `carteira-2.0`.
- RF enters portfolio value exactly once. Applied value is not current value;
  returned principal is not profit; redemption/sale is not aporte; internal
  transfers are not aportes; realized and unrealized results stay distinct;
  paid RF interest preserves its source and cannot duplicate linked dividends.
  Cross-surface numbers must reconcile to canonical sources.
- Visual Master is approved. Validate 390px first (Galaxy S25), then 430px,
  768px, 1366x768 and 1920x1080. Financial values must not clip; use
  progressive disclosure on mobile; do not redesign stable screens without
  reproduced evidence.
- Rentabilidade has a compact monthly-history preview in the current local
  visual work. That mixed working-tree diff is pre-existing and must be
  provenance-reviewed before commit; it does not imply financial or persistence
  changes.
- Stress baseline: 100 assets, 1,000 movements, 500 dividends and 43 RF
  positions. Do not optimize Dividendos or other heavier surfaces without
  measurement and regression evidence.
- A clean remote clone plus installable dependencies and authorized external
  configuration must be sufficient to continue without chat history. Never
  version secrets, personal data or production dumps.

## 2026-09-07 - Phase 4H authoritative QA runtime stabilization

- O runtime autoritativo de prevalidacao e um Chromium Playwright dedicado,
  com perfil persistente fora do repositorio e CDP somente em localhost;
  nenhuma aba pessoal externa deve ser usada como fonte de fingerprint.
- O servidor correto para o legado e `python.exe -m http.server 4173
  --bind 127.0.0.1`; Vite nao e evidencia valida para esse lifecycle.
- A fingerprint viva atual, recomputada no mesmo runtime autenticado, e
  `bfe99832c39fb365cf4953fcb161392ac6df4974e26343d8e27f53dc0cfd5fe4`.
  Donor `71b21a08f2bb1db2615dd838f06e5ccd124ef2f726a26e087e6e20215b22c4a7`,
  plano `690138e1f973e8a600907e0f7d87b2897fa352eb608b63d1725ca971d41cc4a5`
  e review `c3ab3a17db2c4e4d6c3a34474a65843e32c6b6e6add2698ce0efff0a05df9da4`.
- O estado vivo permanece `329/329/0`; recovery `99/99/0`; dry-runs native e
  de persistencia passaram 3/3, sem snapshot, mutacao, save ou sync reais.
- A fingerprint permaneceu estavel em 120s e em soak de 300s, incluindo
  reconexao CDP e reinicio do navegador QA. O diagnostico por campo expoe
  somente contagem, hash e orderHash, nunca conteudo privado.
- A antiga divergencia deve ser tratada como mistura de runtimes/referencias
  de perfil; nao reutilizar manifests antigos. Recuperacao Yahoo real e piloto
  de agosto continuam nao executados; nova autorizacao single-use ainda e
  obrigatoria.

## 2026-09-08 - Phase 4H V8 targeted Yahoo recovery completed

- A autorizacao V8 foi consumida uma unica vez no runtime QA autenticado e o
  executor oficial adicionou exatamente 99 eventos Yahoo por merge aditivo.
- O estado persistido e validado apos reload ficou em `428/329/99`, com
  incremento financeiro `0`, sem alteracao de posicao, PM, ativos ou RF.
- A reconciliacao pos-recovery ficou em `21/0/0`, com plano de agosto
  `24/21/1/2`; idempotencia foi `0/0/0` e o sync so foi liberado apos os gates
  locais. O piloto real de agosto nao foi executado.
- Foi criado backup pos-recovery fora do versionamento:
  `local-imports/carteira-investimentos-post-recovery-v8-2026-09-08-07-00.json`,
  fingerprint `a2cbe73690d571621ace0eea51dc62398694b8c7741df67e67a6e40e9eb42989`.
- O proximo passo e uma autorizacao separada para o piloto de agosto; nenhum
  evento TEPP11, DIVD11 ou NDIV11 foi escrito.

## 2026-09-08 - Phase 4I native August pilot dry-run

- Foi criada a superficie interna localhost-only em
  `?internalPilot=1&internalPilotDryRun=1#internal-pilot`, usando o readiness
  canonico, o adapter oficial e o mesmo preflight do piloto. O dry-run falha
  fechado para manifesto stale, decisao alterada ou autorizacao de escrita.
- A prova nativa alcancou handler, plan provider, review validator, auth
  validator e executor preflight; tres execucoes e os ciclos 5s/30s/60s,
  refresh e hard refresh retornaram o mesmo manifesto `91ebe347...` e estado
  `139412caf...`, sem snapshot, mutacao, save ou sync.
- O piloto real continua nao executado. O proximo passo e uma autorizacao
  single-use separada, vinculada ao manifesto Phase 4I congelado.

## 2026-09-08 - Phase 4I protected real pilot executor

- O executor protegido do piloto de agosto foi implementado no commit
  `b94d60b604504390a08c5b9677174b1e2a01f426`; dry-run e execucao real usam o
  mesmo entrypoint, mas nenhuma escrita real foi executada nesta fase.
- O modelo e estritamente direcionado: 21 metadados de evidencia B3 sobre os
  eventos Yahoo ja recuperados, uma criacao economica TEPP11 de R$ 85,37 e
  auditoria de duas exclusoes ETF, sem criar eventos DIVD11/NDIV11.
- A ordem protegida e snapshot direcionado, mutacao, save local-only, readback,
  invariantes, reconciliacao, idempotencia, sync e validacao do reload. Falha
  depois do inicio da mutacao aciona rollback apenas dos 22 itens tocados.
- O manifesto atual permanece: live `139412caf...`, source `962d80dc...`, plan
  `e5925aaa...`, review `6d14e67f...` e manifest `91ebe347...`, com estado
  `428/329/99` e plano `24/21/1/2`.
- Proximo passo: executar `npm.cmd run qa:phase4i:prewrite` no HEAD final e
  emitir nova autorizacao single-use exata. O piloto real segue nao executado.

## 2026-09-08 - Phase 4H V3 postwrite cloud/reload incident and hardening

- A V3 foi consumida uma unica vez. O merge local e o readback imediato
  confirmaram `428/329/99`, incremento financeiro zero e reconciliacao
  `21/0/0`, mas o reload autenticado real voltou a `329/329/0`.
- O validador anterior era nominal: combinava o estado `S` em memoria com uma
  leitura cloud e nao provava uma nova inicializacao. Esse fato supersede
  registros anteriores que declaravam reload V8 estavel.
- A correcao focada adiciona leitura cloud fresca antes/depois do envio,
  preservacao aditiva de eventos Yahoo contra payloads de abas atrasadas,
  acknowledgement de sync, rollback direcionado e cold boot com nova
  identidade de runtime.
- Nenhuma nova restauracao, patch manual, piloto ou escrita real ocorreu nesta
  correcao. A conta deve continuar tratada como `329/329/0` ate nova operacao
  autorizada. O backup offline validado tem SHA atual
  `e795d4e5b26297ca3e22ad04709b729924e9cc93841cfd11a7321dbf99a70c3b`.
## 2026-09-08 - Phase 4I cloud hydration overwrite guard

- O runtime autenticado revelou uma regressao entre o estado pos-recovery
  documentado e a conta atual: Firestore/runtime/local chegaram a
  `329/329/0`, enquanto o backup pos-recovery V8 continua contendo `428/329/99`.
  O `329` era estado local stale, nao donor oficial.
- A causa tecnica confirmada foi a possibilidade de `save()`/migracao local
  marcar `pendingCloudSave` antes de `FB.cloudLoaded`; esse estado podia vencer
  a hidratacao cloud. O guard em `queueCloudSave` agora so permite upload apos
  auth, acesso e hidratacao; saves de bootstrap sao local-only.
- A classificacao de referencias tambem reconhece
  `sourceEventKind=reference`, preservando evidence Yahoo em merges repetidos.
  Nenhuma escrita manual, recovery ou piloto foi executado nesta correcao.
- `npm.cmd run qa:cloud:state-check` e somente leitura. A conta precisa de uma
  restauracao/recovery explicitamente autorizada antes de novo manifesto Phase
  4I; nao reutilizar o manifesto anterior.

## 2026-09-08 - Phase 4H local pre-Class-C recovery executor

- A V3 Class C foi consumida e deixou o estado local em `430/329/101`, com 99
  referencias e total financeiro de `2701089` cents; a leitura cloud direta
  permaneceu como ancora pre-Class-C em `430/329/101`, zero referencias e
  `3718277` cents. Nenhuma nova escrita foi feita nesta etapa.
- O defeito `classCTouchedUnrelated is not defined` foi corrigido com helper
  lexical real no bridge do executor Class C. O novo caminho
  `TARGETED_PRE_CLASS_C_LOCAL_RECOVERY` e separado do Class C forward e da
  recovery Yahoo aditiva.
- O executor local e somente local: cria snapshot persistido no armazenamento
  local protegido, captura os 99 registros por slot/identidade original,
  preserva hashes de assets/aportes/RF/metas, valida readback independente,
  suporta rollback por identidade original e nao expoe callback de escrita
  cloud. Dry-run nao cria snapshot nem altera estado.
- A prova sandbox cobre tres execucoes, idempotencia, reinicio simulado,
  rollback nos dois sentidos, chaves ambiguas e drift de estado nao relacionado.
  A prova autenticada pos-commit foi deliberadamente adiada para nao recarregar
  a aba atual e aplicar cloud durante esta missao.
- Fingerprints observados permanecem: local `48da409d...`, cloud/alvo
  pre-Class-C `cf9b16bfd...`. A proxima autorizacao deve ser nova e vinculada
  ao HEAD final; Class C e piloto de agosto continuam bloqueados.

## 2026-09-10 - Visual final QA gate closure

- O Chromium do Playwright foi instalado somente como ferramenta de QA. As
  larguras 1440x900 e 1536x864 passaram sem overflow, clipping, erros de
  pagina ou falhas de requisicao.
- O parity visual passou após atualizar o guard para os contêineres atuais do
  Dashboard (`dashboard-analytical-primary` e `dashboard-intelligence-grid`).
  O smoke de Renda Fixa passou após alinhar o teste às linhas atuais
  `.rf-category-row`, sem alterar dados ou cálculos.
- A matriz visual (Dashboard, Ativos, Aportes, Dividendos, Relatórios,
  Configurações e Renda Fixa) passou nos viewports cobertos; não houve alteração
  em finanças, persistência, sync ou recovery nesta etapa.

## 2026-09-11 - Phase 4H canonical fingerprint engine V9

- A divergência entre os fingerprints semântico/reconciliação anteriores e a
  leitura atual foi classificada como divergência de implementação, não como
  mudança financeira. O fingerprint estrutural atual permaneceu
  `583df4d25f8780ea2df236cb88e33a6db4dbed8711afd4a1ffc8a34a9a0f0ce8`.
- Foi criado o motor único `canonical-fingerprint-engine.js`, versão
  `phase4h-canonical-fp-v1`, com normalização de valores em centavos,
  ordenação determinística, invariância a metadados de apresentação e
  sensibilidade a mudanças econômicas/identitárias. O executor 101, o sandbox
  e o prewrite canônico passaram a usar o mesmo contrato.
- O estado real permaneceu somente leitura em `329/329/0`, financeiro
  `2685096`; a âncora cloud permaneceu `430/329/101`, financeiro `3718285`.
  O conjunto atual tem 101 eventos, classificação `94/5/2`, delta `1033189`.
- Três sandboxes e três prewrites canônicos foram idênticos e passaram. A
  recuperação real continua não executada; a autorização anterior permanece
  inválida até uma nova autorização vinculada ao fingerprint canônico.
- Fingerprints canônicos atuais: local estrutural
  `583df4d25f8780ea2df236cb88e33a6db4dbed8711afd4a1ffc8a34a9a0f0ce8`, local
  financeiro `ca7c3c894b1a88b636882e4891307d6be66af707be9c7d3e73963b78b3410d16`,
  reconciliação `84ad710be16722d5e954f5320486fc2a310d3d402a2ac827e711f2c12fc8bab7`,
  source-set `2b7cee160fa077e408106dbb9c9a0862e7dd40570d73f10b8987550923e1fe58`,
  classificação `ac016392dee8d8f3bb84c5af0feddf94720691e0a01b93a22ed9add47e78b0e8`,
  plano `bf1d68864882340e38e1afc7a83804c88913de8e5fd6441687034c59b629501b`,
  revisão `a7a213b695d1c4560e0ac5000810354aba6f390053e41fa4077f6e0f776d360f` e
  alvo `8f2df3f7d9be972f6e1048cc695e1447697800df83352a17273851805b4eda70`.

## 2026-09-11 - Phase 4H target-count mismatch V14

- A tentativa real V13 consumiu a autorização, aplicou 101 eventos e falhou no
  readback com `101_RECOVERY_TARGET_COUNTS_MISMATCH`; o rollback direcionado foi
  verificado e o estado real permaneceu `329/329/0`, financeiro `2685096`.
- A causa foi localizada em `save()`: o callback protegido já atravessava os
  bloqueios de modo somente-leitura, mas ainda era rejeitado por
  `canEditFromThisTab()`, deixando `localStorage:civ5` sem a mutação e fazendo o
  readback retornar o estado anterior.
- O bypass é agora restrito a `__protectedLocalRecoveryWrite===true`; saves
  normais continuam sujeitos ao lock de edição. O commit focado é `7b5c270`.
  A regressão cobre persistência serializada, readback 430/329/101 e rollback
  fechado diante de readback stale.
- No novo HEAD, os testes focados passaram `33/33`, o root passou `332/332`, o
  moderno `750/750`, e os três prewrites Playwright dry-run foram idênticos.
  Nenhuma nova autorização foi consumida e nenhuma recuperação real foi
  executada.
- O gate de QA autenticado permanece pendente: o perfil persistente abre o
  executor protegido, mas não expõe `FB.user`/`cloudLoaded` de forma estável;
  não congelar nova autorização até a sessão autenticada ser revalidada.

## 2026-09-11 - Phase 4H Hermes V18 QA navigation and auth refreeze

- A autenticação Firebase estava persistida e válida nas duas origens. O falso
  bloqueio vinha do harness consultar `window.FB`, embora `FB` seja um binding
  global léxico declarado com `let`; o carregamento também era indevidamente
  tratado como sinal de readiness. Um service worker antigo agravava o caso
  quando uma aba protegida existente era reutilizada sem bypass prévio.
- O harness agora navega em `commit`, aplica bypass do service worker antes de
  toda navegação nova ou reutilizada, consulta `firebase.auth().currentUser` e
  o binding `FB` real, e separa navegação, autenticação e hidratação cloud.
  O fix foi versionado nos commits `83b85d2` e `83834c9`.
- Pós-restart do contexto: `AUTH_SESSION_VALID=true`, `FB_CLOUD_LOADED=true`,
  `CLOUD_STABILIZED=true`; reload, reabertura de página e estabilidade de 120s
  mantiveram auth, acesso permitido e cloud carregada. O modo protegido
  continuou bloqueando cloud apply/upload, fila e sync.
- Prewrites 1 e 2 foram idênticos: local `329/329/0`, financeiro `2685096`;
  cloud `430/329/101`, financeiro `3718285`; delta `1033189`; classificação
  `94/5/2`. Manifesto atual no HEAD `83834c9` usa source-set
  `2b7cee160fa077e408106dbb9c9a0862e7dd40570d73f10b8987550923e1fe58`,
  classificação `ac016392dee8d8f3bb84c5af0feddf94720691e0a01b93a22ed9add47e78b0e8`,
  plano `0b78e608ab8d2fe9fb6e14e1c120c2b025b98787610282b8065aa27961360781`,
  revisão `a7a213b695d1c4560e0ac5000810354aba6f390053e41fa4077f6e0f776d360f`
  e alvo `8f2df3f7d9be972f6e1048cc695e1447697800df83352a17273851805b4eda70`.
- A recuperação real 101, rollback real, Class C, piloto de agosto, write
  cloud, push, PR, merge e deploy continuam não executados.

## 2026-09-11 - Phase 4H Weekend V19 real 101 recovery

- No HEAD autorizado `83834c9bb6faaf542e4703bd01425642e838c541`, os gates finais
  read-only passaram novamente: QA autenticado persistente, cloud somente
  leitura, local `329/329/0` e cloud `430/329/101`, com prewrites idênticos,
  fingerprints V18 preservados e sandbox 3/3 idêntico.
- A autorização single-use foi consumida imediatamente antes da única
  mutação real do executor `TARGETED_101_YAHOO_LOCAL_RECOVERY`. Resultado:
  `ADD=101`, `UPDATE=0`, `DELETE=0`, `RECLASSIFY=0`; persistência local
  `430/329/101`, financeiro `3718285`, readback independente e idempotência
  `0/0/0`. `queueCloud=false`, cloud write/apply/upload/sync não foram liberados.
- Snapshot pré-mutação privado e pós-recovery backup privado foram criados,
  validados por round-trip e mantidos fora do Git. Backup pós-recovery:
  `.qa-state/post-recovery-backup-v19.json`, SHA-256
  `47f6adefd12ff13dbfbc4695f7eeffaf790e0e8e5de990692492a8e9cc14416c`.
- Reload, reabertura e reinício do perfil QA sem novo login preservaram auth,
  `FB.user`, `FB.cloudLoaded`, `430/329/101` e `3718285` em T0/T30/T60/T120.
  Rollback não foi necessário. Class C e piloto de agosto continuam somente
  read-only e exigem autorizações futuras separadas.
- Validação final: root `337/337`, moderno `750/750`, build legado, build
  moderno e `git diff --check` passaram. Nenhum commit pós-recovery, push, PR,
  merge ou deploy foi feito; alterações sujas preexistentes foram preservadas.

## 2026-09-11 - Phase 4H V20 read-only Class C and August rebuild

- A partir do baseline recuperado `430/329/101`, `3718285` cents, a
  reconstrução atual do Class C encontrou `99` fontes, `5` REPLACE, `94`
  RECLASSIFY e `2` KEEP; KNUQ teve `4` replacements e delta `-35371` cents.
  Delta independente: `-1017196` cents, alvo `2701089`, sandbox isolado
  `3/3` idêntico. O preauth ficou bloqueado porque o executor oficial ainda
  exige o contrato histórico `4/95`.
- A reconstrução atual de agosto encontrou `24` linhas, `20` links, `1`
  criação TEPP11, `2` exclusões de ETFs e `1` revisão KNUQ ambígua. Delta
  independente `8537` cents; alvo hipotético `431/330/101`, `3726822` cents;
  sandbox isolado `3/3` idêntico. Preauth ficou bloqueado por ambiguidade e
  provider stale.
- O tooling de agosto deixou de depender obrigatoriamente do CDP 9333 e usa
  a porta QA configurável, default `9233`. Os dry-runs live foram idênticos,
  fail-closed e sem write.
- Os planos têm `20` eventos sobrepostos e convergiram nas simulações em
  `431/330/101`, `2709626` cents; a ordem segura recomendada é Class C e
  depois agosto, sempre com autorizações separadas. Manifestos V20 foram
  congelados como bloqueados em `docs/ai/PHASE4H_V20_READONLY_MANIFESTS.md` e
  `.qa-state/phase4h-v20-*-preauth-manifest.json`.
- Nesta fase: `REAL_CLASS_C_EXECUTED=false`, `REAL_AUGUST_PILOT_EXECUTED=false`,
  `REAL_USER_DATA_WRITE=false`, cloud write/sync/push/PR/merge/deploy false.
# Phase 4H V25 — Class C provenance closure

- V25 confirmed the recovered baseline remains `430/329/101` with financial
  total `3718285` locally and in read-only cloud inspection.
- BBAS3 `2026-09-02` keeps stored amount `2137`; its structured provenance is
  `INTENTIONAL_USER_EDIT` and Class C reclassifies its financial role to
  `REFERENCE` without changing the stored amount. References contribute zero
  to Finance Core totals.
- The current Class C plan is `4 REPLACE + 95 RECLASSIFY`, delta `-1017196`,
  target financial `2701089`; the prior V21 `5/94` plan is invalid.
- Provenance-aware planner/executor fields now include amount, financial role,
  contribution before/after, provenance and fingerprints. Three read-only
  Class C prewrites passed identically. No real Class C/August write occurred.
- August remains separately blocked by one ambiguous KNUQ row and stale
  manifest-provider work; do not issue August authorization until resolved.
## 2026-09-11 - Phase 4H V26 postwrite incident and V28 forensic fix

- A única execução real autorizada da Class C V26 consumiu a autorização,
  falhou em `CLASS_C_POSTWRITE_INVARIANT_FAILED` e foi revertida com sucesso.
  O baseline local e cloud permaneceu `430/329/101`, financeiro `3718285`,
  sem escrita cloud. Snapshot privado SHA-256:
  `f25afc0f01d0e774af9bfb3dd6a28a643dc9c591be4cf367744046ad0ec95c31`.
- Causa confirmada no caminho real: o callback de persistência Class C chamava
  `save({queueCloud:false})` sem `__protectedLocalRecoveryWrite:true` e reportava
  sucesso mesmo quando o save protegido era bloqueado. Correção aplicada em
  `index.html`; o executor agora exige retorno durável/local-only explícito e
  diagnósticos de invariável incluem id, esperado, atual e tipo.
- Regressões focadas `30/30` e suíte raiz `337/337` passaram; prewrites somente
  leitura seguem `3/3` idênticos. Não houve retry real. V28 ainda não é
  preautorizável até uma replay/shadow completa do caminho de produção.
- Agosto continua somente leitura, com provider stale e KNUQ ambíguo; nenhuma
  operação real de Agosto foi executada.

## 2026-09-12 - Phase 4H V30 browser shadow proof

- O valor exato da invariável histórica V26 continua irrecuperável porque o
  executor antigo descartava esperado/atual. O mecanismo foi provado: save
  protegido sem `__protectedLocalRecoveryWrite:true` podia ser bloqueado enquanto
  o callback sinalizava sucesso.
- O caminho corrigido passou em cinco replays browser independentes com storage
  isolado, callback de produção, persistência local-only, readback fresco,
  postwrite, reconciliação e idempotência. Resultado idêntico: `430/329/101`,
  `2701089`, `4 REPLACE`, `95 RECLASSIFY`, cloud/queue false.
- O verificador passou a respeitar a identidade econômica do doador nas
  substituições e a proveniência BBAS3 na idempotência. O manifesto privado
  `.qa-state/phase4h-v30-class-c-preauth-manifest.json` é apenas preautorização
  futura: não houve nova autorização nem escrita real.
- O baseline real e cloud segue `430/329/101`, financeiro `3718285`. A suíte
  raiz, prewrite Class C e builds passaram; a inspeção browser de Agosto teve
  timeout de superfície e permanece separada. Agosto segue sem execução, com
  KNUQ ambíguo e provider canônico ainda pendente.

## 2026-09-12 - Root hygiene V5R corrective execution

- Incident: the project reached ~10.61 GB; QA profile cleanup recovered
  ~5.81 GB (project down to ~4.65-4.80 GB). The previous response only
  delivered a forensic audit instead of executing the V5R mission.
- A normal `git gc` had already been executed; 24 `tmp_obj_*` garbage files
  (~258.63 MiB) remained. Git gc never removes non-conforming loose-object
  names under `objects/NN/tmp_obj_*`; they are reported as `garbage` by
  `git count-objects` and require targeted manual deletion.
- Root clutter source identified: `tools/qa/phase4h-101-recovery-prewrite.js`
  and `tools/qa/phase4h-preclassc-recovery-prewrite.js` spawned
  `browser-harness.exe` with `path.join(process.cwd(), '.browser-harness-*')`
  defaults, creating 49 harness directories in the repo root.
- Correction: new central policy module `tools/qa/harness-paths.js` resolves
  harness temp state under `%TEMP%\CarteiraInvestimentos\browser-harness\` and
  returns `BH_HOME`/`BH_TMP_DIR`/`BH_CONFIG_DIR`/`BH_RUNTIME_DIR`/`BH_SCRATCH_DIR`.
  Both root-writer scripts now use `HarnessPaths.envFor()`.
- 49 obsolete `.browser-harness-*` dirs deleted (all empty scaffolding, no
  active process; 12,363 bytes total). Log in `browser-harness-cleanup-v5r.log`.
- `.gitignore` hardened: added `.browser-harness-*/`,
  `.browser-harness-runtime*/`, `.qa-profile-*/`, `.qa-runtime-*/`,
  `.qa-auth-*/`, `.edge-qa-runtime-*/`, `.qa-*.log`, `.qa-v10-*`,
  `blob-report/`.
- Worktree policy: only the main project is a registered worktree; all
  `.visual-worktree`, `.integration-visual-*`, `.release-visual-*` remain
  preserved (unproven uniqueness; kept per V5R safety corrections).
- 4GB blob finding: dangling blob `28e3e16d4cdf6313675be67d78c4373def49c2b0`,
  type blob, uncompressed 4,269,932,544 bytes, stored in
  pack `93a60a9027eaa8871272dd10d41a015dcd499046`, NOT reachable from any ref
  (`rev-list --all --objects` = false), reported by `git fsck` as dangling.
  History rewrite NOT executed; left history alone.
- Canonical QA profile intact at
  `C:\Users\Paulo Sergio\AppData\Local\CarteiraInvestimentos\qa-browser-authenticated`.
- Root hygiene guard added: `scripts/root-hygiene-check.js`.
- Policy documented in `docs/ai/ROOT_HYGIENE.md`.

## 2026-09-13 - V49 authority durability forensics

- V47C/V48 reload and second-tab evidence did not prove process durability. The
  V47C marker stored `currentLocalFingerprint` as serialized state JSON, not a
  hash. V49 changes it to explicit schema 2 with hash-only fingerprints and
  fail-closed parsing.
- A disposable Chrome profile lost recent writes after forced `taskkill /T /F`,
  while the same profile preserved sentinel and synthetic state for 3/3 cycles
  with CDP `Browser.close`. Root cause is multiple: malformed legacy marker and
  forceful QA process termination.
- Canonical QA identity is the persistent `qa-browser-authenticated` directory,
  `Default` profile, origin `http://127.0.0.1:4173`, CDP 9233. No real marker or
  financial state was written during V49.
- Current real profile was read only and remains cloud-shaped: `430` events,
  `329` B3, `101` Yahoo, `0` references, `3718285` cents, no marker. Since V49 forbids a
  real marker write, preservation of the old Class C target on a normal fresh
  boot remains an authorization-gated blocker.

## 2026-09-13 - V49B recovery authorization normalization

- V49's 16-hex FNV marker hash did not equal the canonical 64-hex SHA-256
  recovery fingerprint. Authority schema 2 now uses synchronous SHA-256 over
  the same six canonical fields and reproduces target `0695018d...ad9` exactly.
- PREAUTH no longer requires the real recovered target before authorization.
  Disposable proofs, source/target/plan/rollback bindings and failure guards
  are PREAUTH; real target/marker durability is mandatory POSTWRITE evidence.
- Recovery remains one local-only restore. It affects 99 event records but is
  one financial persistence operation; Class C is not replayed. Authorization
  is consumed immediately before that restore and cannot authorize a retry.
- Canonical close proves profile identity and uses CDP `Browser.close` only.
  Full process restart, a second restart and three-tab parity are mandatory
  after the future authorized write. August remains blocked until recovery.

## 2026-09-13 - V50 real boot hydration forensics

- O HEAD V49B foi confirmado em `2e802003f5ed0b380f88eeec2bcbad33af220f3a`.
- Duas páginas novas no perfil canônico leram `430/329/101`, zero referências,
  `3718285` cents, fingerprint `8f2df3f7...eda70` e marcador nulo. Nenhuma
  escreveu `civ5` ou `civ5_authority`; somente chaves auxiliares do
  Chrome/Firebase foram alteradas.
- A evidência V47C mostra o alvo com 99 referências e `2701089` cents após
  reload, mas com marcador `local-cloud-authority-v1`. O caminho usava
  `localStorage.setItem` direto e não comprovava flush/restart no mesmo perfil.
- V50 registra o fingerprint cloud antes do save authoritative, faz save
  protegido falhar fechado sem autoridade/fingerprint e inclui `--disable-gpu`
  no launcher após o erro comprovado do Chrome 153.
- Nenhum recovery real, marcador real, Class C replay, August ou cloud write foi
  executado. O manifesto V49B está stale até novo preauth.

## 2026-09-14 - V65 encerramento e fluxo mensal

- V60 concluiu a única recuperação local real; V63/V64 concluíram a única
  execução real de August. As autorizações antigas estão CONSUMED,
  HISTORICAL, STALE e NON-REUSABLE.
- Estado atual confiável: `431/330/101`, 99 referências, `2709626` cents,
  FP `06df1e4ea0adf48cdba16c6eab62c39641a75f6800fe0e296b5846213bd201c2`.
- Runtime contratual: origem HTTP `http://127.0.0.1:4173`, perfil
  `qa-browser-authenticated`/`Default`, CDP `9233`, autoridade V2 e SW v17.
- O fluxo mensal V65 é local, somente pré-autorização, hashado, idempotente e
  sem cloud. `tools/qa/monthly-preauth.js` rejeita escrita real e foi validado
  contra August em sombra 5x.
- Normal mode exige apenas bindings de workspace/runtime/baseline/source/plano,
  sombra, durabilidade mínima, stale-cloud, duplicidade, cloud-zero e manifesto.
  Divergência, save falso, readback, ownership, schema, Firebase ou runtime
  mismatch escalam para INCIDENT_MODE.
- Há exports locais candidatos de setembro, mas nenhum foi promovido a plano
  determinístico nesta missão. Setembro permanece sem execução.

## 2026-09-14 - V68 motor automático de eventos corporativos

- Nova camada separada para `CorporateEvent`: descoberta, anúncio, expectativa,
  elegibilidade histórica, correções, conflitos e reconciliação não alteram o
  ledger realizado.
- `B3_UPLOAD_NOT_PRIMARY=true`: B3 é auditoria opcional. Fontes oficiais de
  emissor/fundo/CVM são validação; Brapi é camada estruturada rápida com
  cobertura parcial e failover. `MANDATORY_PAID_DEPENDENCIES=0`.
- `corporate-events-core.js` calcula posição na data de direito, quantidade
  elegível e bruto/líquido; providers e sync não fazem escrita financeira/cloud.
- `EXPECTED_AND_REALIZED_SEPARATED=true`; `REAL_AUTO_REALIZATION_ENABLED=false`;
  política recomendada MODE_A — descobrir automaticamente e realizar
  manualmente após reconciliação.
- Sem provedor configurado, os relatórios V68 permanecem
  `NOT_FETCHED_UNCONFIGURED` / `NOT_AVAILABLE_WITHOUT_PROVIDER`; nenhum evento
  foi inventado.
- Estado real preservado: `431/330/101`, 99 referências, `2709626` cents,
  FP `06df1e4ea0adf48cdba16c6eab62c39641a75f6800fe0e296b5846213bd201c2`;
  cloud write/queue/sync/upload permanecem zero.
## V69 — dados públicos read-only e inteligência da carteira (15/09/2026)

- V68 foi consolidada no commit `bacfd25b7bb4cbf1accc83380dce6a80db33864e`.
- O caminho público atual é Yahoo Chart sem token, apenas por ticker; Brapi
  continua opcional porque o endpoint vivo retornou `401 MISSING_TOKEN`.
- A coleta V69 confirmou 36/36 cotações e 574 eventos históricos, sem falha,
  sem escrita local financeira e sem escrita/queue/sync/upload cloud.
- Quantidade, custo, valor de carteira e métricas são combinados localmente;
  nenhum dado privado é enviado ao provedor.
- Eventos públicos permanecem separados do ledger realizado; a política é
  `AUTO_DISCOVER_MANUAL_REALIZE` e auto-realização real continua desativada.
- A cobertura de anúncios futuros é parcial; ausência no Yahoo não é prova de
  inexistência. Eventos relevantes exigem fonte oficial/reconciliação.
- V70 adiciona descoberta read-only do catálogo IPE da CVM, cache local separado
  para eventos públicos e runtime cache-first com atualização em segundo plano.
  O catálogo oficial é descoberta de documentos; extração só é aceita quando
  valor, datas e identidade estão estruturados.
- O runtime público atualiza a seção de eventos sem chamar `save()`, ledger
  realizado ou Firebase. Auto-realização continua desligada.
- O coletor não encerra o Chrome QA compartilhado. Origem canônica permanece
  `http://127.0.0.1:4173`, perfil autenticado e CDP 9233.
## V70 — encerramento técnico (14/09/2026)

- Commits técnicos: `17ccdfb191e7fe1a7334927819d80e243fdabd5c` e o fechamento
  `b263046` (integração do ciclo público e diagnóstico do provedor).
- A integração de ciclo público foi concluída com cache-first, refresh em foco,
  intervalo de 60 minutos e atualização manual; o cache é separado do ledger.
- A saúde do Yahoo agora possui diagnóstico explícito; consultas continuam
  ticker-only e sem token obrigatório.
- CVM IPE foi validada como catálogo oficial e gratuito, mas a extração de
  eventos futuros permanece parcial por depender de documentos não estruturados.
- `OFFICIAL_FUTURE_EVENT_COVERAGE=PARTIAL`; ausência de próximos eventos não
  significa que não existam eventos.
- Estado real permanece `431/330/101`, 99 referências, `2709626` cents, FP
  `06df1e4ea0adf48cdba16c6eab62c39641a75f6800fe0e296b5846213bd201c2`.
- `REAL_AUTO_REALIZATION_ENABLED=false`, cloud write/queue/sync/upload = 0.
## V71 — parser oficial e mapeamento (14/09/2026)

- `issuer-mapping.js` resolve identidade somente por chaves exatas; nomes
  ambíguos entram em revisão.
- `official-document-fetcher.js` e `official-document-pipeline.js` aplicam
  allowlist oficial, limites, hash e validação de redirect/content-type.
- `official-document-parser.js` aceita somente evidência determinística para
  dividendos, JCP, FII, parcelas e cancelamentos; PDF não estruturado permanece
  em revisão.
- Eventos oficiais continuam no cache público local separado, sem escrita no
  ledger realizado, sem cloud e com `MODE_A` ativo.
## V71 — parser oficial (14/09/2026)

- `issuer-mapping.js` e os módulos `official-document-*` implementam identidade
  exata, aquisição allowlisted, SHA-256 e parsing read-only versionado.
- Dividendos, JCP, FII, parcelas, datas brasileiras e cancelamentos são aceitos
  somente quando a evidência é determinística; ambiguidades ficam em revisão.
- O catálogo CVM IPE foi confirmado vivo/gratuito, mas a cobertura estruturada
  de eventos futuros continua parcial. Auto-realização permanece desligada.

## V73/V74 — performance e agregação (15/09/2026)

- V73 adicionou `portfolio-performance.js`, um módulo puro para agregação,
  retorno por ativo, TWR e XIRR. Ele não acessa storage, rede ou ledger.
- Compras, depósitos, transferências e retiradas não são retorno; TWR/XIRR só
  podem ser exibidos quando houver avaliações e fluxos externos datados.
- A importação de notas continua preview-first, com identidade e dedupe; Inter
  é suportado, B3 é parcial e XP/BTG permanecem em revisão.
- Snapshot local disponível indicou cinco posições de renda fixa com valor
  atual líquido de `201765.95`, mas a sessão QA autenticada não estava ativa na
  validação V74; esse número é histórico/snapshot, não leitura live.
- Estado financeiro confiável não foi alterado: `431/330/101`, 99 referências,
  `2709626` cents, FP `06df1e4ea0adf48cdba16c6eab62c39641a75f6800fe0e296b5846213bd201c2`.
- `REAL_AUTO_REALIZATION_ENABLED=false`; cloud write/queue/sync/upload = 0.

## V76 — runtime local de valuation e fluxos externos (15/09/2026)

- `portfolio-runtime-stores.js` implementa stores derivados locais versionados:
  `portfolioValuationSnapshotsV1` e `portfolioExternalCashFlowsV1`.
- Snapshots usam uma chave diária na data local `America/Sao_Paulo`, deduplicam
  atualizações do mesmo dia, preservam a primeira captura e armazenam valores
  em centavos; falha/corrupção não alcança o ledger financeiro.
- A aplicação captura snapshot após cotações quando há cobertura segura; a
  sessão autenticada/CDP não estava disponível neste fechamento, portanto não
  foi criado snapshot real nem inserido fluxo real.
- A UI permite registrar aporte, retirada e transferências externas. Compra e
  venda não são convertidas em fluxo. Backup inclui `data.v76Runtime`, backups
  legados usam stores vazios e seção derivada inválida falha fechado antes do
  restore financeiro.
- TWR/XIRR ficam prospectivamente prontos, mas não há taxa real sem duas
  avaliações/fluxos datados suficientes. Auto-realização segue desligada e
  cloud write/queue/sync/upload permanecem zero.

## V77 — primeira ativação real de snapshot (15/09/2026)

- O launcher QA canônico foi corrigido para validar o marcador atual
  `phase4i-authority-2`; `qa:browser:start`, `qa:auth:status` e o doctor
  passaram no perfil dedicado e na origem `http://127.0.0.1:4173`.
- Foi criado o primeiro snapshot derivado real em `2026-09-15` no store
  `portfolioValuationSnapshotsV1`: bolsa `41893347` cents, renda fixa
  `20176595` cents, total conhecido `62069942` cents e cobertura de 100%.
  A renda fixa permanece explicitamente `STALE_SNAPSHOT` por ter as-of em
  `2026-06-18`; o total não é chamado de live.
- O snapshot sobreviveu ao reload e duas capturas adicionais retornaram
  `UNCHANGED`, mantendo uma única entrada diária. O fingerprint financeiro
  permaneceu `06df1e4ea0adf48cdba16c6eab62c39641a75f6800fe0e296b5846213bd201c2`.
- `trackingStartDate` derivado foi fixado em `2026-09-15`; TWR está em
  `TRACKING_STARTED` e XIRR em `TRACKING_STARTED_NO_EXTERNAL_FLOWS`. O store
  real de fluxos externos continua vazio. Auto-realização e cloud permanecem
  desligados/zerados.

## V79 — memória viva e continuidade (15/09/2026)

- `CURRENT_HEAD_FUNCTIONAL=25c5854177a9db88dba76a87d2d66d49dc59feb0`;
  `MEMORY_UPDATED_FOR_HEAD=25c5854177a9db88dba76a87d2d66d49dc59feb0`.
- A memória canônica foi organizada em documentos especializados sob
  `docs/ai/`, sem incluir segredos, cookies, credenciais ou dados privados de
  linha.
- O último marco funcional é `25c5854177a9db88dba76a87d2d66d49dc59feb0`;
  V79 é documentação/governança e não altera runtime financeiro.
- Estado financeiro protegido continua `431/330/101`, 99 referências,
  `2709626` cents e fingerprint `06df1e4ea0adf48cdba16c6eab62c39641a75f6800fe0e296b5846213bd201c2`.
- Próximo agente deve ler `PROJECT_STATE.md`, `OPEN_WORK.md` e
  `FINANCIAL_INVARIANTS.md` antes de agir. Não repetir recovery, fundações
  V68–V78 ou converter compra/venda em fluxo externo.

## V78 — auditoria de renda fixa e benchmark CDI (15/09/2026)

- A divergência `08/09` versus `18/06` foi resolvida: `08/09` era a data de
  reconstrução/snapshot; `18/06T13:09:43.614Z` é o último `updated_at` e
  `quoteUpdatedAt` efetivo dos registros CRA024004SB e MOVI18. Os registros
  manuais não possuem timestamp de valuation.
- O provider `fixed-income-benchmark-provider.js` usa o SGS/BCB série 12
  (CDI), público e gratuito, com composição apenas dos fatores diários
  fornecidos. Dois contratos `100% CDI` podem ser avaliados em sombra; IPCA+
  permanece não suportado sem indexação/fluxos determinísticos.
- Valores manuais continuam autoridade e nenhum valuation automático altera
  `civ5`, o ledger realizado, transações, snapshots financeiros ou cloud.

## V80 — frescor e valuation CDI shadow (15/09/2026)

- O provider foi endurecido na versão `v80.1`: percentuais CDI explícitos,
  timeout, validação de resposta, cache com cópia defensiva e relatório por
  posição com proveniência, cobertura por posição e cobertura por valor.
- O cálculo automático continua `SHADOW_ONLY`: estima valor bruto contratual
  usando SGS/BCB série 12 e preserva o valor manual/líquido como autoridade.
  Nenhuma estimativa escreve `civ5`, transações, eventos realizados, snapshots
  financeiros ou cloud.
- A auditoria confirma cinco posições de renda fixa: uma manual-only, duas
  candidatas determinísticas `100% CDI` e duas IPCA+ sem valuation exato. A
  cobertura automática é 40% por posição; a cobertura ponderada depende do
  valor manual e deve ser reportada separadamente.
- A divergência entre `08/09` e `18/06` é semântica: a primeira é captura ou
  reconstrução; a segunda é o último timestamp efetivo B3/XP. Ausência de
  timestamp nos registros manuais é `UNKNOWN`, nunca `LIVE`.

## V81 — reconciliação temporal de renda fixa (15/09/2026)

- `financialAsOf` agora é separado de `applicationDate`, `capturedAt`,
  `reconstructedAt` e `importedAt`. Data de aplicação não é evidência do valor
  atual.
- Os dois registros B3/XP com timestamp efetivo em `2026-06-18` ficam como
  `B3_EFFECTIVE_TIMESTAMP`/`MEDIUM`: há forte relação temporal, mas o campo não
  é rotulado explicitamente como valuation date. CDB Porquinho e os dois fundos
  manuais permanecem `UNKNOWN` por ausência de timestamp financeiro.
- A comparação CDI same-as-of falha fechado sem `financialAsOf` comprovado;
  valores shadow mais recentes continuam diagnósticos e não autoridade.
  `AUTO_AUTHORITY_READINESS=NOT_READY`.
- Frescor da posição usa o as-of financeiro verdadeiro e agrega como
  `FRESH`, `MIXED`, `STALE` ou `UNKNOWN`; o snapshot pode ser capturado hoje
  carregando valor financeiro antigo.
- Artefato local: `.qa-state/v81-fixed-income-asof-reconciliation.json`.
  A missão não alterou o ledger, snapshots financeiros, transações, cloud ou
  auto-realização.

## V82 — aquisição de timestamps financeiros (15/09/2026)

- A auditoria local de forensics, backups, snapshots, imports e registros
  normalizados encontrou cinco posições, nenhum timestamp HIGH, dois MEDIUM e
  três UNKNOWN. CRA JBS e DEB MOVIDA mantêm 18/06/2026 como evidência MEDIUM de
  atualização efetiva B3/XP; `08/09` continua sendo captura/reconstrução.
- O registry `fixed-income-source-semantics.js` formaliza que application date,
  `quoteUpdatedAt`, `capturedAt`, `reconstructedAt`, `importedAt` e `createdAt`
  não são `financialAsOf`. Promoção para HIGH exige associação explícita entre
  timestamp e valor/posição.
- A lâmina pública da CVM confirma o TREND DI FIC como fundo de cotas, CNPJ
  45.278.833/0001-57, cujo CDI é referência de rentabilidade. Trend DI FIC e
  Trend DI II passam a
  `CDI_BENCHMARK_SHADOW`, não `DETERMINISTIC_CDI_PERCENT`; valuation automático
  e autoridade continuam bloqueados.
- O relatório local é `.qa-state/v82-fixed-income-source-timestamps.json`.
  Valores manuais, ledger, transações, eventos realizados, snapshots financeiros
  e cloud permaneceram inalterados.

## V84 — detalhe dedicado do ativo (15/09/2026)

- O detalhe do ativo passou a ser uma view interna transitória, identificada
  exclusivamente por `asset.id`, sem nova rota, schema ou persistência. A tela
  preserva a aba de origem (`Ativos` ou `Renda Fixa`) e retorna por ação explícita.
- O header, resumo, abas e estados de confiança reutilizam os seletores
  canônicos `assetAppliedValue`, `assetCurrentValue`, `assetJurosValue` e
  `assetRentabPct`. Valores ausentes permanecem `—`; não há fórmula paralela.
- Ações de detalhe foram expostas nas listas desktop, cards mobile e posições
  dedicadas de Renda Fixa. Editar, comprar, movimentar e resgatar continuam
  usando os handlers existentes.
- Abas de histórico, proventos e documentos só aparecem quando há registros
  reais; valuation explicita benchmark, valor informado ou indisponibilidade.
  Trend DI continua descrito como comparação com CDI, nunca como valor oficial.
- Evidência visual e funcional: `tests/v84-asset-detail.smoke.test.js` e
  `.qa-state/v84-ui/`. Nenhuma alteração financeira, de persistência ou cloud.

## V88 — consolidação do estado limpo (15/09/2026)

- A branch `integration/clean-state-v1` foi criada diretamente de
  `origin/main` em `56e5488b95cf2ec9736297d67e2c3622e9527916` e reconstruiu
  seletivamente o runtime funcional, testes duráveis e documentação da branch
  de produto.
- Scripts, testes e ferramentas de recuperação, prewrite, Class C, pilotos e
  evidências privadas não foram incluídos no estado executável limpo. A
  superfície financeira continua protegida; não houve escrita financeira,
  cloud, push, PR, merge ou deploy.
- Os commits locais da consolidação são `e5c1eac9`, `31c52ede` e `b62ad2d8`.
  O próximo passo exato é revisar este branch limpo e, mediante autorização
  separada, integrá-lo à linha de desenvolvimento apropriada.

## V92 — endurecimento do contrato do Import Center (15/09/2026)

- A branch `feature/v92-import-center-hardening` parte do `origin/main`
  `72919996675d66a25fc5de2d78f11802542ffddd` e adiciona o módulo puro
  `import-center-core.js`.
- O core unifica detecção conservadora, registry de parser, normalização
  canônica, validação, identidade de trade, dedupe/conflict review, sessão e
  preview/confirm gate. Preview e confirmação continuam com zero escrita
  financeira; `save()`, Firebase, localStorage e o ledger não são chamados.
- Inter permanece suportado pela implementação existente; XP e BTG ficam
  explicitamente `FIXTURE_REQUIRED`, sem layout inventado. O Import Center
  visual continua simulação/test-mode e B3 continua opcional.
- Gate local V92: `tests/import-center-core.test.js` 5/5, root 205/205,
  modern 750/750, finance 80/80, persistence 32/32, build moderno e smoke
  browser sem overflow/erros relevantes. Evidência visual fica em `.qa-state/`.

## V93 — inteligência de relatórios (15/09/2026)

- A branch `feature/v93-reports-intelligence` adiciona `portfolio-report-model.js`,
  uma camada pura para consolidar resumo, patrimônio, performance, renda,
  alocação, concentração, ativos, proventos e qualidade dos dados.
- O modelo preserva `null`/indisponibilidade, explicita status, proveniência,
  frescor e cobertura, e não acessa storage, rede, Firebase ou o ledger. A tela
  de Relatórios reutiliza o domínio legado e exibe uma leitura executiva sem
  duplicar fórmulas.
- A cobertura do Import Center permanece verde; TWR/XIRR continuam mostrando
  coleta/insuficiência quando não há evidência bastante. Nenhuma lógica
  financeira, persistência ou cloud foi alterada.

## V192 — plataforma de inteligência do projeto

- A memória canônica vive em `docs/ai/` e no `DESIGN.md`; índices externos são
  derivados e não substituem a documentação versionada.
- O worktree V192 parte de `origin/main` em `a904b19...`; o main local e os
  históricos V166, V178 e V182 permanecem protegidos.
- Skills operacionais físicas presentes neste baseline: browser-testing-with-
  devtools, doubt-driven-development, interview-me e
  source-driven-development. `references` é auxiliar, não Skill roteável.
- O Codebase Memory MCP v0.8.1 foi verificado por checksum e executado em
  modo local de ajuda; sua instalação persistente foi bloqueada pelo executor
  por exigir autorização adicional. Nenhuma configuração de agente foi
  alterada.
- Browser Use, Defuddle, Composio, Agent Reach, Caveman e skills de marketing
  permanecem fora do conjunto padrão por redundância, custo, telemetria ou
  ausência de requisito concreto.
