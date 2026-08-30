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
