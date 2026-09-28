# V279B — Visual and Product Learning Audit

**Status:** audit and durable recommendations; no product implementation.

**Target:** LEGACY `index.html`, the current production surface. The modern app remains read-only and is not this redesign target.

**Decision rule:** references are laboratories, not authorities. Current contracts, privacy, accessibility, and financial semantics take precedence.

## EXECUTIVE_FINDINGS

The product is functionally broad and already has substantial useful structure: a consistent shell, desktop sidebar and mobile navigation, detailed analytical screens, asset tables/mobile cards, source/freshness surfaces, and explicit readiness states. The polish gap is not a lack of features. It is that several generations of screen-level styling coexist without one consistently enforced visual grammar.

The strongest concrete evidence is: (1) the legacy screen source mixes base, `canon-*`, `ds-*`, and feature-specific styles; static source scan found 2,132 hex literals, 10,131 `px` literals, 1,907 `font-size` declarations, and 927 `!important` occurrences. These are source counts, not counts of visible/runtime defects. (2) V274’s prior isolated synthetic Dashboard capture documented dense allocation-table cells overlapping at 1920px despite no document-level overflow. This is prior evidence, not re-tested in V279B. (3) navigation and mobile adaptations already exist, but desktop has many peer destinations and 768px wraps the desktop navigation into two rows in prior V274 evidence. (4) tiny secondary text appears frequently in source; actual visible sizes vary by route/state and were not remeasured here.

The recommended response is a small shared foundation, then a focused Dashboard → Ativos → Dividendos sequence. Preserve rich data and capability; improve grouping, hierarchy, table behavior, and contextual states. Do not begin by rewriting every screen or by adopting a laboratory’s palette wholesale.

### Evidence limits and privacy

- Current-source review was static. No new authenticated or real-wallet runtime session was opened. This audit does not certify current browser rendering, current contrast, exact visible font sizes, or all routes at all widths.
- Prior V274 evidence is attributed to its own synthetic isolated QA and SHA in project history. It is not promoted to fresh V279B verification.
- Reference A was inspected structurally in UI-only files; no data-bearing files or screenshot were used.
- Reference B (`carteira-2.0`) was inspected read-only, limited to UI architecture/styles. It remains a noncanonical laboratory and was not modified.
- Reference C’s experimental HTML variants and one composite image were reviewed for visual structure. The image contains financial-looking personal content; it is a local-private reference, not proven synthetic/public, and must not be committed or reproduced here.
- No reference business logic, financial values, tickers, private data, branding, or implementation was copied.

## CURRENT_PRODUCT_STRENGTHS

- A real product shell exists, with desktop sidebar, page surfaces, and a mobile bottom navigation plus secondary drawer.
- Screen boundaries cover core portfolio work and advanced integrity/admin tasks; Asset Detail is appropriately a detail surface rather than another primary destination.
- Dashboard already composes summary, composition, evolution, income, highlights, attention, data quality, and actions.
- Ativos has a rich comparison table and a separate mobile-card/expanded treatment rather than requiring a tiny desktop grid on phones.
- Dividendos already has multiple useful views: monthly/year history, annual comparison, future/announced items, filters, asset grouping, and data-quality context.
- Patrimônio and Rentabilidade are separate destinations with different source concepts. Keep that distinction visible.
- Existing design tokens and aliases, focus/reduced-motion rules, status semantics, tabular-number usage, and V274 accessibility work are valuable foundations to consolidate rather than replace.
- Readiness and uncertainty contracts are essential visual content: `UNKNOWN != ZERO`, `PARTIAL != COMPLETE`, `STALE != FRESH`, `ESTIMATE != RECEIVED`, `ENGINE_AVAILABLE != DATA_READY`.

## CURRENT_PRODUCT_VISUAL_DEBT

1. **Several visual systems coexist.** Base variables, `canon-*`, `ds-*`, premium components, and feature-specific declarations all remain in one large legacy surface. The aliases are useful migration footholds, but do not yet guarantee one component behaves consistently everywhere.
2. **Density lacks a reliably shared rule.** Many screen-specific cards and micro-label treatments compete with the tables that carry the real analytical work. Static font declarations are evidence of a review target, not proof every small declaration is visible text.
3. **Wide-screen table geometry is not sufficiently robust.** V274’s prior Dashboard/1920 screenshot shows internal allocation-column collision while document width remains within the viewport. A page-level overflow check alone cannot certify table legibility.
4. **Desktop navigation competes for attention.** Several high-level and operational destinations sit near core portfolio screens. Mobile has a better progressive-disclosure pattern; desktop grouping can learn from it without removing capabilities.
5. **Screen composition is uneven.** Dashboard, Patrimônio, Reports, and other screens each have bespoke panels and KPI treatments. The resulting inconsistency is more noticeable than missing decorative polish.
6. **Trust and data freshness need a consistent visual slot.** Source/as-of/partial/unavailable context is present in several areas but should be predictable, concise, and never look like a financial KPI.
7. **Responsive behavior needs component-level assertions.** At 768px, prior evidence records wrapped desktop navigation. For dense tables, test clipping and cell geometry, not only document `scrollWidth`.

## REFERENCE_A_LESSONS

Reference A’s dashboard materials provide useful information architecture patterns: primary vs secondary KPI roles; a header and filter/tool bar separated from the data surface; chart and table workflows composed as related panels; clear asset identity cells; and contextual return/income summaries.

| Lesson | Decision | Application boundary |
|---|---|---|
| Primary and secondary KPI tiers | ADAPT | Use hierarchy and context, not another row of equal-weight metric cards. |
| Filter/tool bar separate from table | KEEP | Give filters a stable location and preserve active-filter feedback. |
| Chart plus adjacent/related table | ADAPT | Keep each chart interpretable with a short textual summary and matching period. |
| Asset identity as a compact two-level cell | ADAPT | Ticker/name and class can coexist; do not invent missing identity or status. |
| Branded palette, product naming, or proprietary visuals | REJECT | No copied identity, marks, or exact styling. |
| Any financial semantics inferred from appearance | REJECT | Current domain contracts remain authoritative. |

## REFERENCE_B_LESSONS

The read-only lab demonstrates clearer separation of shell, sidebar, page header, filter bar, empty state, and page-specific content. Named semantic tokens make surface and status roles easier to reason about. An asset table with a mobile card treatment is a useful structural idea.

| Lesson | Decision | Application boundary |
|---|---|---|
| Shell/navigation configuration separated from page content | ADAPT | Preserve the legacy runtime; unify visual contracts incrementally, not via framework migration. |
| Semantic surface/text/status token vocabulary | ADAPT | Map existing legacy roles into a small canonical vocabulary before changing values. |
| Reusable header, filter, empty-state patterns | KEEP | Adopt only where contracts match; keep screen-specific controls purposeful. |
| Mobile asset cards as an alternate representation | KEEP | Current Ativos already has this direction; improve parity and hierarchy. |
| Generic div-grid “DataTable” as an accessibility-ready table | REJECT | A visual grid wrapper alone does not establish table semantics, sorting, or keyboard behavior. |
| Lab/prototype composition or identity as canonical product | REJECT | B is explicitly noncanonical and contains conflicting visual variants. |
| Inconsistent breakpoints across shared and feature styles | REJECT | Responsive rules must have shared, intentional boundary ownership. |

## REFERENCE_C_LESSONS

The later `index2026`–`index2029` and `investpro-dashboard` variants show recurring dashboard metaphors: sidebar, compact hero/KPI strip, chart + table, income history, and asset lists. The composite image suggests strong hierarchy but is overly dense and has secondary text that warrants scrutiny. Its financial-looking contents are not reused.

| Pattern | Classification | Decision |
|---|---|---|
| Compact hero with a small, meaningful KPI set | PREMIUM_FINANCIAL_PATTERN | ADAPT; retain breathing room and clear context. |
| Chart and table as a continuous analysis workflow | STRONG_VISUAL_PATTERN | KEEP; align periods, labels, and summaries. |
| Repeatable sidebar and page heading | STRONG_VISUAL_PATTERN | ADAPT to current shell; do not reproduce prototype identity. |
| Many colored KPI icons/categories | OVERDESIGNED_PATTERN | REJECT as default; semantic color only when justified and never as sole signal. |
| One canvas packing several complete screens | WEAK_VISUAL_PATTERN | REJECT; it conceals the real viewport and interaction hierarchy. |
| Abbreviated, generic component vocabulary in later prototype | GENERIC_ADMIN_PATTERN | REJECT as implementation guidance; visual reuse must remain maintainable. |
| Screenshot-specific amounts, positions, logos, or labels | LOCAL_PRIVATE_REFERENCE | Do not copy, track, or restate. |

## CROSS_SOURCE_MATRIX

| Screen | Current canonical | A lesson | B lesson | C lesson | Canon decision |
|---|---|---|---|---|---|
| Dashboard | Multi-panel executive summary, composition, evolution, income, highlights and trust | KPI tiers; chart/table context | Separate shell and reusable panels | Compact hero + chart/table | Establish one primary KPI strip, one dominant evolution panel, then allocation/income and concise trust context. Audit duplication before adding cards. |
| Ativos | Rich table, filters, class/detail surfaces, mobile cards | Asset identity and filter toolbar | Mobile card alternative | Dense asset list | Preserve comparison depth; define primary columns, secondary details and contextual row actions. |
| Dividendos | KPI, monthly/year history, matrix, upcoming/announced and asset views | Income summary + history | Reusable filters/statuses | Chart/table workflow | Received history leads; estimates/announcements are a visibly separate section and state. |
| Renda Fixa | Position/distribution panels and detail actions | Asset summary cells | Semantic status tokens | Asset cards/lists | Prioritize instrument, institution/source, amount basis and freshness; distinguish applied/current/gross/liquid. |
| Patrimônio | Hero, composition, evolution and insights | KPI context | Shared shell and panels | Composition metaphor | Answer “what do I own and what is it worth?”; do not duplicate return performance. |
| Rentabilidade | Readiness-aware KPIs/charts/table | Period/filter context | Explicit status/empty states | Performance dashboard patterns | Answer “how did it perform?”; unavailable stays unavailable, never synthetic zero. |
| Metas | Progress and action panels | Secondary summaries | Shared status/empty pattern | Goal cards | Keep progress evidence and next action; no invented completion or decorative score. |
| Aportes | Contribution/cash-flow panels, chart and activity | Tool bar + history | Consistent forms/panels | Cash-flow timeline/table | Separate external investor flows from internal activity and display provenance/period context. |
| Rebalanceamento | Allocation and consultive actions | Comparison workflow | Shared shell | Allocation visuals | Recommendations are advisory; never imply an order was executed. |
| Análise | Reuses an asset analysis shell/destination | Filters and comparison | Component boundaries | Rich asset comparison | Explain findings from evidence; no arbitrary score or second asset table without a distinct task. |
| Relatórios | Summary, evolution, reports/export and integrity panels | Chart/table and report toolbar | Shared empty/filter states | Annual/monthly summary | Treat reports as evidence and workflow; keep export and source/as-of context clear. |
| Auditoria | Integrity summary, filters and records | Filterable data | Status/empty-state patterns | Dense data panels | Traceability first: event/source/date/state; advanced navigation grouping. |

## SCREEN_BY_SCREEN_DECISIONS

The following is source-structure review, not rendered sign-off. “Responsive” describes code-level intent or prior documented behavior; any unverified visual result remains a QA task.

| Screen | Current language, hierarchy and usage | Strength / debt | Primary action and canon gap |
|---|---|---|---|
| Dashboard | Bespoke executive surface; KPI/summary, allocation, evolution, income, highlights, attention, data quality, quick actions. Charts, tables and cards coexist. | Broad useful overview; too many equally prominent panels can weaken one visual anchor. Prior V274 evidence: allocation cells collide at 1920 although page itself does not overflow. | Primary: understand portfolio status. Secondary: navigate to detail. Set KPI hierarchy and panel order; robust allocation table geometry; trust context compact. |
| Ativos | Dense analytical table with filters, class tabs, expanded/card treatments and asset detail route. | Strong comparison surface and mobile alternative; column priority/action placement need one rule. | Primary: compare holdings. Secondary: open details/actions. Identify always-visible vs detail-only values; ensure numeric alignment and no squeezed desktop table on mobile. |
| Dividendos | Multiple views: received history, monthly/yearly chart/table, annual matrix, upcoming/announced, search/filter, by asset, quality. | Rich capability; received, announced, estimated and quality states can compete if not grouped. | Primary: inspect received income/history. Secondary: inspect future/asset breakdown. Explicitly separate `RECEIVED` from `ESTIMATE` and `ANNOUNCED`. |
| Renda Fixa | Distribution/position rows with source/detail actions and status badges. | Domain detail is valuable; multiple valuation bases can be visually mistaken for one amount. | Primary: inspect fixed-income positions. Secondary: open instrument/source detail. Label applied/current/gross/liquid and freshness distinctly. |
| Rentabilidade | KPI, chart, filters, distribution/table/secondary panels; constrained by history/readiness. | Dedicated analytical intent; risk of empty-looking screen or metrics perceived as available prematurely. | Primary: assess performance for a period. Secondary: inspect class/detail. Put readiness and missing evidence before unavailable metric values; distinguish engine capability from data readiness. |
| Patrimônio | Hero/KPIs, composition/evolution, insights and panels. | Clear wealth question; can duplicate Dashboard allocation/performance. | Primary: understand current owned value and composition. Secondary: inspect change/value history. Avoid duplicating Rentabilidade return claims. |
| Metas | Goal KPIs/panels, status/progress and action rows. | Actionable planning surface; progress must remain tied to observed inputs. | Primary: review goals and progress. Secondary: planning actions. Show missing/unknown distinctly; do not imply completion. |
| Aportes | Contribution summary, monthly chart, class rows, trust/import panels and activity controls. | Useful cash-flow and provenance context; many controls can crowd the primary timeline. | Primary: record/review investor contribution workflow. Secondary: inspect history/import. Separate external flow from buy/sell/internal activity; keep destructive/financial actions contextual. |
| Relatórios | Executive summary, KPIs, evolution/chart, report grid, data rows, export and audit panels. | Strong evidence/export capability; multiple report types risk appearing as a card catalog. | Primary: choose/read a report. Secondary: export or inspect evidence. Group by user question and source/as-of; avoid redundant KPI tiles. |
| Rebalanceamento | Hero/insight and allocation rows. | Good consultive framing; visual affordance must not resemble executed trade. | Primary: review suggested allocation/action. Secondary: inspect holdings. Explicitly label recommendation; no buy/sell implication without confirmation. |
| Análise | Destination delegates to an asset-premium analysis shell. | Reuse limits duplication; boundary from Ativos/ranking can be unclear. | Primary: explain a comparison/diagnostic. Secondary: drill into asset. Name the task and evidence; avoid arbitrary score. |
| Auditoria | Integrity hero/summary, filters and records/cards/empty states. | Traceability is a product strength; administrative density can overwhelm core flows. | Primary: investigate a data event. Secondary: filter/source detail. Group under advanced/integrity navigation and use stable status grammar. |
| Configurações | Premium header, grouped sections/rows and wallet cards. | Familiar settings pattern; should not compete visually with daily portfolio screens. | Primary: change app/account preference. Secondary: inspect configuration. Keep advanced/security settings grouped, with explicit consequences. |
| Asset Detail | Detail hero, KPIs/badges, content grid, interpreted facts/lists/actions. | Correctly detail-only; KPI and action density can repeat the list. | Primary: understand one instrument. Secondary: contextual actions. Promote provenance/as-of and hide low-frequency metadata behind detail sections. |
| Import Center | Dedicated operational import workflow. | Properly separate from passive portfolio reading; multiple stages can feel technical. | Primary: review/import source workflow. Secondary: validation/history. Progressive disclosure, explicit preview/confirmation boundaries, no imported data implied as accepted. |

Other advanced surfaces: Confiabilidade should share the same trust/status vocabulary as Auditoria; IRPF remains a protected tax surface and must not inherit a visual shortcut that changes authoritative tax semantics; Corporate Events and IA should remain grouped/secondary unless their recurring user task warrants primary navigation.

## CANONICAL_SHELL_AND_PRODUCT_SURFACE

### Desktop shell

1. **Sidebar:** stable product identity and a small set of primary destinations. Group advanced/operational destinations (reports, integrity, imports, settings, IRPF) without removing them. One selected-state pattern; no per-screen navigation variants.
2. **Page header:** title + one-sentence purpose; period/context controls and primary action aligned consistently. Secondary help/status stays subordinate.
3. **KPI strip:** at most a few decision-relevant metrics, each with label, value, period/source context. Secondary metrics move to the relevant panel/table.
4. **Primary workspace:** one dominant chart, table, or workflow appropriate to the screen—not an arbitrary card grid.
5. **Secondary insights:** concise explanation, quality/freshness, and next actions tied to evidence.
6. **Detail surface:** table/list remains the analytical source of truth; row expansion/details are secondary.

### Mobile shell

Retain the existing bottom-nav plus secondary drawer concept unless usability evidence shows a real problem. Core tasks should remain reachable; the drawer groups secondary functions. Use stacked KPI summaries and purposeful asset cards, not a scaled desktop table. Respect safe areas, readable targets, and page-header vertical footprint. Do not redesign mobile navigation solely from mockups.

### Feature surface taxonomy

| Surface | Recommended placement |
|---|---|
| Dashboard, Ativos, Dividendos | Primary navigation |
| Patrimônio, Rentabilidade, Aportes, Metas, Renda Fixa | Primary or a visibly cohesive “Carteira” group; preserve direct discoverability for high-frequency use |
| Rebalanceamento, Análise | Grouped analytical/advanced destinations |
| Relatórios, Auditoria, Confiabilidade, IRPF, Import Center, Corporate Events | Grouped reports/integrity/operations; preserve permissions and workflows |
| Asset Detail, expanded position, contextual history | Detail-only, reached from the owning surface |
| Configurações | Secondary/admin |

This is a grouping recommendation, not a request to remove, rename, or reroute features.

## CANONICAL_COMPONENT_SYSTEM

Detailed component contracts, including purpose, hierarchy, density, spacing, type, semantic colors, interaction, responsive behavior, and anti-patterns, are in [`VISUAL_CANON_V2.md`](VISUAL_CANON_V2.md). Key rules:

- A panel has one job and a clear primary/secondary relationship; avoid nested card-on-card as the default.
- Status uses label + optional icon/color. Unknown, partial, stale, unavailable, estimate, and received have separate visible states.
- Tables own comparison; charts own trend. A chart includes period, unit, and one-line interpretation where useful.
- Asset logo/icon is optional identity support, never the only identifier or status signal.
- Positive/negative numbers use consistent sign, tabular alignment, and semantic label/icon as needed; color is redundant, never sole meaning.
- Empty state explains what is absent and why; only offer an action the user can actually take.
- Tooltip supplements, never carries essential-only meaning.

## TOKEN_DIRECTION

The existing stylesheet has a useful starting vocabulary (`--bg`, `--panel`, `--surface`, `--border`, `--text`, `--muted`, primary/semantic aliases, `canon-*`, `ds-*`) but several layers and repeated literals coexist. V279B proposes consolidation by role, not a wholesale palette replacement.

| Token family | Minimal direction |
|---|---|
| Surfaces | `canvas`, `surface`, `surface-raised`, `surface-subtle`; theme-aware. |
| Text/border | `text-primary`, `text-secondary`, `text-muted`, `border-default`, `border-strong`. |
| Accent/status | `accent`, `info`, `positive`, `attention`, `negative`, each with text/border/background variants only where needed. |
| Typography | A small six-step scale around 0.75/0.8125/0.875/1/1.25/1.5rem, with contextual role mapping; dense secondary labels are not a license for unreadable text. |
| Spacing | A compact consistent scale, e.g. 4/8/12/16/24/32px, adapted to density. |
| Radius/elevation | Small/medium/large/pill roles and two restrained elevation levels; no per-screen glow. |
| Controls | 44px minimum interactive target, 48px for critical mobile action when appropriate. Verify actual bounding boxes. |
| Numeric | Tabular numerals on monetary, quantity, percent, and date columns where comparison benefits. |

Implementation should first map aliases and identify true visible duplication; it should not change token values everywhere in one sweep. Breakpoints must express valid max-N/min-N+1 boundaries or intentional component transitions, not be mechanically collapsed.

## TABLE_SYSTEM

| Rule | Canonical behavior |
|---|---|
| Row density | Comfortable compact desktop rows with clear two-line identity where needed; do not shrink typography to fit every field. Establish one base height and a distinct expandable-detail treatment. |
| Column priority | Keep identity and decision fields first; secondary metadata may be hidden behind detail/expansion at narrower widths. Column policy is screen-specific and documented. |
| Numbers | Right-align and use tabular numerals; keep unit/currency and sign semantics clear. Sort uses the underlying canonical value, not display text. |
| Header/sort/filter | Semantic table markup when the content is tabular; named sort controls, stable header, visible active filters and clear reset. Sticky header only if it does not obscure focus or mobile content. |
| Actions | One compact contextual row action or overflow menu; no giant Comprar/Vender buttons taking a primary data column. Financial execution remains explicit and governed by existing contracts. |
| Status | Compact text badge/label with redundant icon/color. Source freshness/as-of is secondary, not mixed into value. |
| Wide viewport | Bound column widths and allow flexible identity; test actual cell rectangles and text overlap at 1366/1920. No reliance on document-level overflow alone. |
| Mobile | Use a designed stacked/card representation for high-value fields, or a labeled horizontal scroller with clear affordance only when comparison truly needs columns. Never silently clip values. |
| Empty/loading/error | Preserve table headers/context where helpful; explain no data vs unavailable vs error distinctly. |

Apply to Ativos, Renda Fixa, Dividendos history, Reports, Audit, and Transactions with a documented per-screen primary/secondary field map.

## RESPONSIVE_SYSTEM

- First-class desktop is 1366×768. A layout that only looks spacious at 1920 is not canonical.
- Validate 390, 430, 768, 1366, 1440, 1536, and 1920 for the shared shell and affected components; run the project’s required full matrix for implementation.
- At 390/430, use compact page headers, stacked KPI summary, readable cards, and contextual actions. Do not squeeze desktop tables into the viewport.
- At 768, explicitly decide when sidebar/navigation transitions and check vertical footprint, wrapping, focus visibility, and content start position.
- At 1366, protect primary table/chart width and keep the first screenful useful at 768px height.
- At 1440/1536/1920, cap content growth and let analytical surfaces use space without stretching labels or colliding columns.
- Test element/cell geometry, clipping, keyboard focus, 200% text zoom/reflow where relevant, and horizontal scrolling; `documentElement.scrollWidth` alone is insufficient.
- Respect reduced-motion preference with scoped behavior; no blanket unreviewed transition kill switch.

## DASHBOARD_SPECIFIC_DECISION

Recommended reading order:

1. A small set of primary current-portfolio KPIs with period/as-of context.
2. Portfolio evolution as the dominant chart, only to the extent supported by available history.
3. Current allocation as the primary comparison table/panel, with collision-safe columns.
4. Passive income as a distinct contextual panel with received vs estimated states.
5. A concise portfolio highlight/attention panel, not a second dashboard of microcards.
6. Data freshness/trust in one predictable, compact region with drill-through.

The current Dashboard already contains most of these roles; work should prioritize hierarchy, duplication audit, table geometry, and progressive disclosure rather than adding more features. Do not assume that every metric has a trustworthy historical series.

## ATIVOS_SPECIFIC_DECISION

| Field | Desktop | Narrow/mobile |
|---|---|---|
| Ticker/name and class | Always visible, first | Always visible, stacked |
| Quantity | Primary comparison column | In first card detail block |
| Average cost and current price | Visible when present and semantically valid | Secondary pair or expand |
| Market value | Always visible, primary numeric anchor | Always visible |
| Gain/loss and return | Visible with sign/text semantics | Secondary but readily reachable |
| Portfolio weight | Visible if reliable | Secondary/card metadata |
| Yield/income | Secondary/contextual, only when supported | Detail-only or secondary |
| Source/freshness/as-of | Compact secondary status | Stacked metadata/expand |
| Actions | Contextual menu/one restrained affordance | Detail/action sheet |

The field map does not authorize changing existing calculation, missing-data, or valuation semantics.

## DIVIDENDOS_SPECIFIC_DECISION

1. KPI strip: received totals with a clear period; only trustworthy received values.
2. Main history: monthly chart plus corresponding monthly table/summary; same date window and unit.
3. Annual summary/top payers: secondary comparison, not equal-weight dashboard cards.
4. Future/announced income: separate, explicitly labeled, never summed into received.
5. Data-quality/freshness note: concise and linked to provenance/details.
6. Filters/search: stable toolbar above the relevant history/list.

Preserve `RECEIVED != ESTIMATE` and `ANNOUNCED != RECEIVED`. Empty/unavailable is not zero, and no future payment should be invented for visual completeness.

## PATRIMONIO_VS_RENTABILIDADE

- **Patrimônio:** “What do I own and what is it worth?” Current valuation, composition, and supported wealth history.
- **Rentabilidade:** “How did the portfolio perform?” Period return/performance only when method, valuation history, external flows, wallet scope, and readiness contracts allow it.
- A repeated chart/KPI is acceptable only when its question, period, basis, and explanation are materially different. Shared data does not imply duplicated presentation.
- `ENGINE_AVAILABLE != DATA_READY`; `UNKNOWN != ZERO`; `PARTIAL != AVAILABLE`.

## ANTI_PATTERNS

- `DO_NOT_CREATE_NEW_VISUAL_LANGUAGE_PER_SCREEN`.
- `DO_NOT_ADD_MICROCARDS_WITHOUT_INFORMATIONAL_VALUE`.
- `DO_NOT_USE_SEMANTIC_COLORS_AS_DECORATION_OR_SOLE_SIGNAL`.
- `DO_NOT_REPLACE_UNKNOWN_WITH_ZERO_OR_PARTIAL_WITH_COMPLETE`.
- `DO_NOT_MIX_RECEIVED_AND_ESTIMATED_INCOME`.
- `DO_NOT_PUT_PRIMARY_ACTIONS_IN_EVERY_TABLE_CELL`.
- `DO_NOT_CERTIFY_TABLES_FROM_DOCUMENT_SCROLLWIDTH_ONLY`.
- `DO_NOT_OPTIMIZE_ONLY_FOR_1920`.
- `DO_NOT_SQUEEZE_DESKTOP_TABLES_INTO_MOBILE`.
- `DO_NOT_COPY_REFERENCE_BRANDING_OR_PRIVATE_SCREENSHOT_CONTENT`.
- `DO_NOT_COPY_PROTOTYPE_DATA_LOGIC_OR_FINANCIAL_VALUES`.
- `DO_NOT_TREAT_A_GENERIC_DIV_GRID_AS_AN_ACCESSIBLE_DATA_TABLE`.
- `DO_NOT_USE_COLOR_OR_ICON_TO_ASSERT_MISSING_FINANCIAL_EVIDENCE`.
- `DO_NOT_USE_TOOLTIP_AS_THE_ONLY_LABEL_OR_EXPLANATION`.
- `DO_NOT_ADD_GLOW_GRADIENTS_OR_RAINBOW_STATUS_WITHOUT_FUNCTIONAL_REASON`.
- `DO_NOT_CHANGE_FINANCIAL_OR_TAX_BEHAVIOR_DURING_VISUAL_FOUNDATION_WORK`.

## IMPLEMENTATION_SEQUENCE

1. **Shared visual foundation and shell:** consolidate role mapping, theme contrast, typography/spacing/control tokens, navigation grouping, headers, focus, and responsive transitions. Dependency: every subsequent screen uses these rules.
2. **Dashboard:** settle executive hierarchy and allocation table geometry; it exercises shell, KPIs, charts, tables, and trust state together.
3. **Ativos:** define reusable analytical table, field priority, mobile-card parity, and contextual row actions.
4. **Dividendos:** apply the table/chart/filter/status foundation while protecting received/announced/estimated separation.
5. **Patrimônio:** align composition/value without duplicating performance.
6. **Rentabilidade:** render only supported metrics and readiness explanations using the shared trust grammar.
7. **Aportes and Metas:** apply shared workflow/forms and progress/flow semantics.
8. **Renda Fixa:** apply table and multi-basis valuation labels; preserve source/as-of distinctions.
9. **Análise and Rebalanceamento:** align evidence panels and consultive recommendations.
10. **Relatórios, Auditoria, Confiabilidade, IRPF, imports, settings:** group advanced surfaces and apply shared table/status patterns; tax and import contracts remain protected.

Each implementation phase must be independently scoped, preserve product/financial contracts, and use rendered evidence at relevant widths. This sequence is a recommendation, not implementation authorization.

## NEXT_RECOMMENDED_MISSION

`V280_GLOBAL_VISUAL_FOUNDATION_AND_DASHBOARD` — implementation candidate; requires its own authorization. Begin with a focused foundation/dashboard slice, establish the shared component/token mapping, fix the evidenced allocation-table collision, and certify the rendered LEGACY surface at the required viewports. Do not start it automatically from this audit.
