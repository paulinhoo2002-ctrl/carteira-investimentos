# Design System Extraction Audit

Date: 2026-09-04
Scope: audit and recommendation only
Product code changed: false

## Decision summary

The product has a proven visual language, but it is not yet a single shared
implementation. The legacy SPA concentrates the shell, screens, handlers and
inline CSS in `index.html`; the modern readonly host already has isolated
components and a separate token vocabulary. A broad extraction now would
create coupling and could disturb frozen screens.

`DESIGN_SYSTEM_EXTRACTION_STATUS=SIGNALS_PROVEN_NOT_YET_EXTRACTED`

Recommended first wave: a small, opt-in visual foundation for future work,
starting with token aliases and documentation, then icon containers, section
headers, buttons, badges and empty states one primitive at a time. Do not
replace existing screen markup in the first wave.

## Evidence and boundaries

- `index.html` remains the authoritative legacy runtime and contains the
  approved mature screens, shared shell and inline styles.
- `modern/src/` contains readonly shared components such as `Button`,
  `Badge`, `DashboardMetricCard`, `DashboardSection`, `EmptyState` and
  `ResponsiveDataList`; it is not a safe migration target for the legacy app.
- `docs/ai/WAVE_B_FREEZE.md` records the approved KPI, header, card, icon,
  filter, chart, table, ranking, empty-state and mobile-stack patterns.
- Existing legacy tokens include `--panel`, `--surface`, `--border`, semantic
  colors, spacing/radius/shadow values and `--control-min-h:44px`.
- The legacy file also has a second `--pd-*` token family and repeated local
  color, radius, spacing and grid declarations. This is evidence for an
  inventory and alias layer, not permission to rename everything.
- Protected semantics remain outside this audit: financial formulas, official
  sources, persistence, schema, backup/import, RF helpers, rebalance logic and
  the readonly modern bridge.

## Mature screen matrix

| Surface | Header | KPI/summary | Primary content | Controls | Data visualization | Mobile strategy |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard | compact executive header | five-KPI executive row | portfolio summary and highlights | secondary actions | evolution, composition, income | stacked analytical panels |
| Ativos | title, count and actions | asset summary cards | variable-asset table and class summaries | search, filters, sortable headers | allocation and result signals | class cards plus progressive table disclosure |
| Aportes | operational header | contribution summary | recent/history movements | search, tabs, filters, actions | monthly rhythm and class distribution | compact cards and modal flow |
| Rentabilidade | title and period context | return summary | comparative performance | period and benchmark controls | line chart and tooltip | readable chart and stacked controls |
| Dividendos | title and period context | semantic income KPIs | monthly history and rankings | filters and review controls | evolution, ranking and donut | stacked sections and preserved values |
| Rebalancear | simulation header | quick analytical strip | current versus target | amount input and scenario controls | allocation comparison | stacked readonly simulation |
| Analise | analytical header | exposure/result summary | rankings, concentration and attention | contextual links | concentration/performance views | analytical cards and expandable rows |
| Relatorios | report header | financial summary | report groups and exports | period/export actions | report-specific | stacked groups and explicit actions |
| Metas | goals header | goal summary | progress blocks and distribution | official edit/remove actions | progress bars | stacked goal cards |
| Auditoria | quality header | issue summary | severity and identity rows | protected actions and filters | status/detail indicators | identity-first cards and dialogs |

Common across the matrix: dark tonal surfaces, compact hierarchy, semantic
colors, explicit empty states, tabular financial values, visible focus and
responsive stacking. The differences are mostly semantic and must remain at
screen level.

## Pattern frequency matrix

| Pattern | Screens using it | Variants | Semantic differences | Visual differences | Extraction value | Coupling risk | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Page header | all mature screens | title-only, title+context, title+actions | operational, analytical, readonly | action density and context width | high | low if content slots stay generic | HIGH_CONFIDENCE_SHARED |
| Section header | all mature screens | title, subtitle, badge, action | report, data, safety, summary | spacing and action alignment | high | low | HIGH_CONFIDENCE_SHARED |
| KPI card anatomy | Dashboard, Ativos, Aportes, Rentabilidade, Dividendos, Metas, Auditoria | compact, hero, positive, warning, info | values are not interchangeable | icon, size and supporting copy | high | medium if formulas or labels are embedded | HIGH_CONFIDENCE_SHARED |
| Quiet panel/card | all mature screens | analytical, summary, readonly, danger | danger and audit need stronger guardrails | tone, border, depth | high | medium | HIGH_CONFIDENCE_SHARED |
| Semantic badge | Ativos, RF, Dividendos, Rebalancear, Auditoria, Reports | positive, negative, warning, info, readonly | status meanings are screen-specific | color and label treatment | medium | medium if state names are centralized | MEDIUM_CONFIDENCE_SHARED |
| Primary/secondary button | all mature screens and modern host | primary, secondary, ghost, danger, icon | destructive and transactional safety differs | compact/normal sizes | high | medium around dangerous handlers | HIGH_CONFIDENCE_SHARED |
| Search/filter control | Ativos, Aportes, Dividendos, Reports, Auditoria, global search | input, popover, select, count | available fields differ | row versus stacked layout | medium | medium due state ownership | MEDIUM_CONFIDENCE_SHARED |
| Sortable header | Ativos and data-heavy lists | numeric, text, date | source and missing-value order differ | indicator and aria state | medium | high if sort state is shared globally | SCREEN_SPECIFIC_BASE |
| Financial data row | Ativos, Dividendos, Reports, Auditoria, RF | table, compact row, mobile card | identity and zero/missing rules differ | columns and actions | low as universal component | high | DO_NOT_EXTRACT |
| Chart shell | Dashboard, Aportes, Rentabilidade, Dividendos | line, bar, donut, benchmark | series and formulas differ | legends, height, tooltip | medium | high if semantics are hidden | DO_NOT_EXTRACT |
| Empty state | all mature screens | no data, no match, not available, resolved | valid zero is distinct from missing | compact or large | high | low if copy is supplied by screen | HIGH_CONFIDENCE_SHARED |
| Contextual action row | Dashboard, Analise, Rebalancear, Reports | navigation, readonly detail, protected action | action safety differs | inline, card, dialog | low | high | SCREEN_SPECIFIC |
| Mobile stack | all mature screens | cards, disclosure, bottom nav | table fallback differs | one/two-column transitions | medium | medium | MEDIUM_CONFIDENCE_SHARED |

## Token audit

### Existing tokens

The legacy root token family already covers backgrounds, surfaces, borders,
text, semantic colors, shadows, spacing, radii, control height and scrollbar
colors. It includes dark and light theme values. Canonical tokens also define
green, blue, red, purple, orange, cyan, radius and tabular-number intent.

The premium screen layer adds `--pd-radius-*`, `--pd-sp-*`, semantic colors and
card shadow. The modern host has a separate `--color-*`, `--space-*`,
`--radius-*`, `--shadow-*`, `--motion-*` vocabulary. These are parallel
implementation families, not proof that the runtimes can share a stylesheet.

| Area | Status | Finding |
| --- | --- | --- |
| background/surface | TOKEN_ALREADY_EXISTS | root and canonical families cover the need |
| borders/text | TOKEN_ALREADY_EXISTS | repeated local overrides still exist |
| semantic colors | TOKEN_ALREADY_EXISTS | positive, negative, warning and info are proven |
| spacing | TOKEN_ALREADY_EXISTS + TOKEN_DUPLICATED | root, premium and modern scales overlap |
| radius/shadow | TOKEN_ALREADY_EXISTS + TOKEN_DUPLICATED | several equivalent values are local |
| typography | TOKEN_DUPLICATED | roles are repeated as local pixel rules |
| icon size/container | TOKEN_MISSING_AS_LEGACY_CONTRACT | visual pattern exists, formal legacy token does not |
| motion/reduced motion | TOKEN_ALREADY_EXISTS_PARTIAL | modern host is more explicit than legacy |
| safe areas/control height | TOKEN_ALREADY_EXISTS | `--control-min-h:44px` and safe-area variables exist |

Safe action: document semantic aliases and use them only in new or directly
updated primitives. Do not mass-replace existing values during this audit.

## Spacing system

`PROVEN_SPACING_SCALE=4, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32`

The stable practical core is `4, 8, 12, 16, 20, 24, 28, 32`, with `6, 7, 9,
10, 11, 14, 18, 22` used for dense financial rows and legacy controls. These
are not all outliers: compact tables legitimately use smaller increments.

`OUTLIERS=screen-specific modal/table padding, one-off grid gaps, legacy
premium overrides`

`SAFE_TO_STANDARDIZE=only new shared primitives and new screen work; do not
normalize mature markup in place`

## Typography roles

`TYPOGRAPHY_ROLES=`

- Page title: approximately 20-24px, strong weight.
- Page subtitle/context: approximately 11-13px, muted.
- Section title: approximately 13-17px, strong weight.
- KPI label: approximately 10-11px, muted or uppercase metadata.
- KPI value: approximately 14-20px, strong weight, tabular when numeric.
- Body/table value: approximately 12-13px, readable and tabular for money.
- Metadata: approximately 9-11px, muted.
- Badge/button: approximately 10-13px, semibold/bold.

`DUPLICATED_TYPOGRAPHY_RULES=local font-size, font-weight, line-height and
letter-spacing declarations across premium, analysis, RF, report and audit
blocks`

`SAFE_SHARED_TYPOGRAPHY=roles for title, subtitle, section, label, value,
metadata and control only; preserve screen-specific financial value sizes`

Critical values must keep `font-variant-numeric: tabular-nums`, strong
contrast, wrapping where required and no critical ellipsis.

## KPI and card findings

`KPI_SHARED_BASE_READY=true`

Proven anatomy: label, value, optional context/trend, optional icon container,
semantic variant and compact/hero size. Required variants are `neutral`,
`positive`, `negative`, `warning`, `info`, `compact` and `hero`.

The base should own visual layout only. Screen renderers must provide the
label, official value, context and semantic state. Do not make the base
calculate trends or infer financial meaning.

`CARD_SHARED_BASE_READY=true`

Required card variants: `section`, `summary`, `analytical`, `readonly`,
`warning` and `danger`. Audit actions, RF editors and backup/import surfaces
must keep their own safety semantics even if they reuse a shell.

## Icon and button findings

`ICON_SYSTEM_READY=PARTIAL`

Inline SVGs with consistent weight, size and semantic accent are proven in the
frozen visual work. The legacy app still has historical outliers and lacks a
single enforceable icon-container contract.

`ICON_CONTAINER_READY=YES_FOR_NEW_PRIMITIVES_ONLY`

`ICON_SIZE_SCALE=16, 18, 20, 24, 28, 32` with 44px minimum interactive
container where the icon is the control. Do not migrate all existing icons in
one pass.

`LEGACY_ICON_OUTLIERS=emoji/older glyphs, screen-local SVG sizes, inconsistent
container padding`

`BUTTON_SYSTEM_READY=PARTIAL`

Modern `Button` already proves a variant/size model. Legacy buttons repeat
similar `.btn`, `.bgh` and screen-local rules. Safe variants are `primary`,
`secondary`, `ghost`, `danger`, `icon` and `contextual`; sizes are `sm`, `md`
and `lg`. Focus, disabled and destructive confirmation behavior must remain
owned by the calling flow.

## Search, filters and tables

`SEARCH_PATTERN_READY=MEDIUM_CONFIDENCE`

Global search and screen searches share input/focus/empty-state concerns, but
their sources and route safety differ. A shared visual input shell is safe;
shared query state is not.

`FILTER_PATTERN_READY=MEDIUM_CONFIDENCE`

Ativos proves popover, count, clear and composition behavior. Other screens
have different filters and safety rules. Extract only the visual trigger,
count badge, selected state and clear affordance.

`SORT_HEADER_PATTERN_READY=SCREEN-SPECIFIC_BASE`

Ativos Table Intelligence proves an accessible sortable header, but numeric
missing-value ordering and official source mapping are domain-specific. Keep
sorting logic in each screen.

`TABLE_BASE_READY=false_FOR_UNIVERSAL_EXTRACTION`

`TABLE_VARIANTS=asset positions, dividend history, report data, audit identity,
RF positions`. Each has different identity, zero/missing and action contracts.

`MOBILE_TABLE_STRATEGY=screen-owned progressive disclosure or cards; never
force a universal table`

## Chart findings

`CHART_TOKENS_READY=PARTIAL`

There are repeated colors, grid restraint, bounded heights and tabular tooltip
expectations, but chart semantics differ substantially.

`CHART_TOOLTIP_READY=CONTRACT_READY_IMPLEMENTATION_LOCAL`

Tooltips must identify date/period, series and exact value. Keep tooltip
formatting and data ownership local to each chart until a semantic chart model
is proven.

`CHART_LEGEND_READY=MEDIUM_CONFIDENCE`

Line/benchmark legends can share visual treatment; donut, bar and allocation
legends should remain screen-specific.

`CHART_PATTERN_VARIANTS=line evolution, benchmark comparison, monthly bars,
donut allocation, compact sparkline`

Recommendation: do not extract chart rendering in the first wave.

## Empty states, badges and responsive rules

`EMPTY_STATE_PATTERN_READY=true`

Shared anatomy is safe: status/icon, title, explanation and optional action.
Variants must preserve `Nenhum`, `Sem dados`, `Nao disponivel`, `Nao aplicavel`,
resolved/positive and no-match semantics. `VALID_ZERO_IS_NOT_MISSING=true`.

`BADGE_SYSTEM_READY=PARTIAL`

`STATUS_VARIANTS=positive, negative, warning, critical, info, readonly, active,
test, connected, count`. Labels and icons must carry meaning; color alone is
insufficient. Audit severity and destructive states remain local contracts.

`RESPONSIVE_BREAKPOINT_CONTRACT=640px dense mobile, 768px/tablet transition,
900px analytical layout transition, 1023/1180px shell transition, 1366px
notebook density, 1536px wide shell`

`MOBILE_STACK_PATTERN=summary first, two-column KPI where readable, then
stacked cards/lists, progressive disclosure, bottom-nav safe area`

`TABLET_PATTERN=reduce grid columns and preserve internal table scroll only
where the screen contract requires it`

`DESKTOP_DENSITY_PATTERN=use width for comparison and complete values, not for
decorative panels; financial columns remain aligned`

## Shell findings

`SHELL_PRIMITIVES_READY=PROTECTED_AND_MATURE`

The sidebar, main gutter, mobile header, bottom navigation and safe areas are
already frozen and should be consumed as a contract, not extracted by
rewriting them. The modern host has its own shell and must not be coupled to
the legacy shell in this phase.

`SHELL_DO_NOT_TOUCH=sidebar order/identity, bottom navigation behavior, route
contracts, safe-area handling and frozen screen layout`

## Screen-specific exceptions

Keep these out of generic primitives:

- Dashboard executive composition, patrimony chart and simultaneous highlights.
- Ativos mixed variable/RF table, official result semantics, sector/performance
  filters and column sorting.
- RF rows, maturity, valuation and editor/review flow.
- Aportes movement identity, duplicate rules and write actions.
- Rentabilidade benchmark/period semantics and chart series.
- Dividendos history, annual matrix, review queue and valid-zero treatment.
- Rebalancear readonly engine, target deviation and suggestion ordering.
- Analise concentration rule and asset analysis source.
- Metas official progress, deadline and write handlers.
- Relatorios analytical versus backup/import separation.
- Auditoria severity, `entityId + identityKey`, revalidation and action levels.
- IRPF tax-specific blocks and Configuracoes/backup/import danger zone.

## Extraction candidates

### P0

None identified for immediate shared extraction. Financial safety issues belong
to their own reviewed missions, not a visual primitive wave.

### P1

1. **Semantic token alias layer**
   - Benefit: one documented vocabulary for new work without changing old CSS.
   - Screens: future work across all mature surfaces.
   - Risk: competing token families if aliases are applied globally.
   - Complexity: low.
   - Recommended: yes, opt-in only.

2. **KPI visual base**
   - Benefit: consistent label/value/context/icon anatomy.
   - Screens: Dashboard, Ativos, Aportes, Rentabilidade, Dividendos, Metas.
   - Risk: accidentally embedding formulas or collapsing semantic variants.
   - Complexity: medium.
   - Recommended: yes, after a contract test and one pilot screen.

3. **Section header and quiet panel shells**
   - Benefit: consistency and less repeated CSS.
   - Screens: all mature analytical screens.
   - Risk: density changes if padding is centralized too early.
   - Complexity: low to medium.
   - Recommended: yes, new markup first.

4. **Button/icon-container visual primitives**
   - Benefit: safer focus/touch targets and consistent affordance.
   - Screens: all, excluding protected action semantics.
   - Risk: icon migration churn and action hierarchy drift.
   - Complexity: medium.
   - Recommended: yes for new contextual controls only.

### P2

- Visual search/filter shell: useful, but query ownership must remain local.
- Badge/status shell: useful after state labels are mapped per screen.
- Empty-state shell: high consistency value with low semantic risk.
- Shared responsive layout utilities: document first; avoid another breakpoint.
- Chart color/tooltip tokens: share tokens only, not a universal chart component.

### P3

- Legacy icon normalization beyond new controls.
- Consolidating equivalent radius/shadow declarations.
- Replacing local typography values with aliases after visual comparison.
- Motion/hover polish and Apple Pass details after structural primitives prove
  stable.

## First extraction wave recommendation

`FIRST_WAVE=token aliases + documented role contracts + one opt-in KPI/panel
pilot`

Do not modify every mature screen. A safe implementation sequence is:

1. Add or document aliases without deleting current tokens.
2. Add a primitive in an isolated, non-protected future surface or a single
   explicitly approved pilot.
3. Protect anatomy with structural/accessibility tests, not pixel snapshots.
4. Compare 390, 430, 768, 1366 and 1920 before adopting it elsewhere.
5. Expand only if the pilot preserves financial values, focus, density and
   empty/zero semantics.

Avoid in the first wave: universal tables, charts, Rebalance UI, Audit action
system, RF editor, asset editor and backup/import.

## Architecture churn check

`NEW_FRAMEWORK_NEEDED=false`

`BUNDLER_CHANGE_NEEDED=false`

`CODE_SPLITTING_NEEDED=false`

`COMPONENT_FRAMEWORK_NEEDED=false`

`CSS_REWRITE_NEEDED=false`

The current stack can support opt-in primitives. A new framework or bundler
would add risk without solving a demonstrated product problem.

## Maintenance benefit and ROI

`MAINTENANCE_BENEFIT=`

- Consistency: high for new headers, KPI cards, buttons, badges and empty states.
- Future screen development: medium-high if primitives remain opt-in and
  content-agnostic.
- Bug prevention: medium for focus/touch/status presentation; low for finance
  semantics, which must remain local.
- Responsive maintenance: medium through documented layout contracts.
- Visual polish: medium-high after a successful pilot.
- Testability: high for structural/accessibility contracts.

`EXTRACTION_ROI=HIGH_FOR_SMALL_VISUAL_PRIMITIVES; LOW_FOR_UNIVERSAL_DATA_OR
CHART_COMPONENTS_AT_THIS_STAGE`

## Recommended sequence: IRPF, RF and Settings

`RECOMMENDED_SEQUENCE=PARTIALLY_BEFORE`

Before further polish on IRPF and Settings, document and optionally pilot the
visual foundation primitives. Do not migrate their tax, RF or backup/import
semantics. Renda Fixa should continue using its dedicated, domain-specific
rows and helpers. Settings must remain a safety review surface; only its
visual shells can consume proven primitives after persistence boundaries are
reviewed.

Suggested order:

1. Token/role documentation and a small KPI/panel pilot.
2. IRPF visual refinement using the pilot without tax formula changes.
3. RF visual refinement using domain-owned rows and the shared shell only.
4. Settings/backup/import visual review with a separate safety gate.
5. Broader Apple Pass only after the above surfaces are stable.

## Apple Pass readiness

`APPLE_PASS_READY=PARTIAL`

The product is visually mature enough for a later polish pass, but not ready
for a global automated pass. Existing blockers are:

- legacy and modern token families are not unified;
- icon outliers remain;
- repeated CSS rules are not yet proven safe to consolidate;
- chart/table semantics differ by screen;
- Settings, RF editor and backup/import require safety-specific review;
- browser evidence must remain interaction- and viewport-based, not only
  screenshot-based.

`APPLE_PASS_BLOCKERS=token duplication, icon outliers, screen-specific data
semantics, protected safety flows, no approved pilot primitive`

## Future test candidates

Avoid brittle screenshot pixel tests. Prefer DOM/accessibility contracts:

`TOKEN_TEST_CANDIDATES=` aliases exist, semantic colors map, control minimum
height remains 44px, tabular number intent is preserved.

`KPI_PATTERN_TEST_CANDIDATES=` label/value/context anatomy, variant class,
no truncation of critical value, readable mobile grid.

`BUTTON_PATTERN_TEST_CANDIDATES=` button type, variant/size attributes,
focus-visible, disabled/loading semantics and 44px target where applicable.

`RESPONSIVE_PATTERN_TEST_CANDIDATES=` no page horizontal overflow, bottom-nav
safe area, table/card fallback, primary action visibility and no financial
clipping at 390/430/768/1366/1920.

## Final audit result

`MATURE_SCREEN_COUNT=10`

`PATTERN_REPETITION_CONFIDENCE=HIGH_FOR_SHELL_KPI_CARD_BUTTON_EMPTY_STATE;
MEDIUM_FOR_FILTER_BADGE_RESPONSIVE_CHART_LEGEND`

`DESIGN_SYSTEM_EXTRACTION_READY=YES_FOR_SMALL_OPT_IN_VISUAL_PRIMITIVES;
NO_FOR_GLOBAL_REFACTOR`

`PRODUCT_FILES_CHANGED=false`

`NEXT_RECOMMENDED_ACTION=REVIEW_THIS_AUDIT_AND_AUTHORIZE_A_SMALL_TOKEN_OR_KPI
PILOT; DO_NOT_START_AUTOMATICALLY`

## Pilot 01 result

- `DESIGN_SYSTEM_PILOT_01=IMPLEMENTED_OPT_IN`
- `TOKEN_ALIASES_ADDED=true`; existing tokens remain preserved.
- `KPI_BASE_CREATED=true`; `SECTION_PANEL_BASE_CREATED=true`;
  `BUTTON_BASE_CREATED=true`; `ICON_CONTAINER_BASE_CREATED=true`;
  `BADGE_BASE_CREATED=true`; `EMPTY_STATE_BASE_CREATED=true`.
- `KPI_PILOT_TARGETS=Metas`; the four goal KPIs and the goals summary panel
  adopted the classes while retaining their legacy classes and handlers.
- No tables, charts, filters, search engines, audit actions, RF UI,
  rebalance UI, backup/import or protected editors were extracted.
- `PRODUCT_SEMANTICS_CHANGED=false`; `FINANCE_CORE_CHANGED=false`;
  `PERSISTENCE_CHANGED=false`; `SCHEMA_CHANGED=false`;
  `REAL_DATA_CHANGED=false`.
- Focused structural tests protect aliases, variants, legacy class coexistence,
  no modern coupling and valid-zero semantics.
- `PILOT_DECISION=KEEP_LIMITED` until a visual parity review authorizes an
  additional screen.

## Pilot 02 result: IRPF

`DESIGN_SYSTEM_PILOT_02_IRPF=PASS`

This was a controlled adoption, not a redesign or global migration. IRPF kept
its own fiscal hierarchy, year context, tax-specific sections, document copy,
and export structure. Existing IRPF classes remain alongside the shared
classes, allowing visual parity to be checked without flattening semantics.

`PRIMITIVES_ADOPTED=KPI; PANEL_READONLY; BUTTON; BADGE; EMPTY_STATE`

`IRPF_ICON_PRIMITIVE_ADOPTED=false; NO_ICON_MIGRATION_NEEDED`

`SCREEN_SPECIFIC_IDENTITY_PRESERVED=true`

`FUNCTIONAL_PARITY=true`

`IRPF_TAX_LOGIC_CHANGED=false`

`FINANCE_CORE_CHANGED=false`

`PERSISTENCE_CHANGED=false`

`SCHEMA_CHANGED=false`

`REAL_DATA_CHANGED=false`

The focused IRPF structural tests passed. Browser validation at 390, 430,
768, 1366 and 1920 confirmed no horizontal overflow, critical-value clipping,
console errors, page errors or request failures. Cross-screen route smoke also
kept the mature primary routes non-blank and error-free.

`DUPLICATED_RULES_REDUCED=0`

`VISUAL_CONSISTENCY_GAIN=MODERATE`

`MAINTENANCE_SIMPLIFICATION=true`

`COUPLING_INCREASED=false`

`DESIGN_SYSTEM_DECISION=EXPAND_CAREFULLY`

Recommended next expansion is a small Renda Fixa shell pilot. Do not migrate
Configurações without a separate backup/import safety review.

## Integration checkpoint

`PILOT_01=FROZEN`

`PILOT_02_IRPF=FROZEN`

`TOKEN_ALIASES=PROVEN`

`KPI_BASE=PROVEN`

`SECTION_PANEL_BASE=PROVEN`

`BUTTON_BASE=PROVEN_LIMITED`

`ICON_CONTAINER_BASE=PROVEN_LIMITED`

`BADGE_BASE=PROVEN_LIMITED`

`EMPTY_STATE_BASE=PROVEN`

`TABLE_BASE=NOT_READY_FOR_UNIVERSAL_EXTRACTION`

`CHART_BASE=NOT_READY_FOR_UNIVERSAL_EXTRACTION`

`FILTER_ENGINE=NOT_SHARED`

`SORT_HEADER=SCREEN_SPECIFIC`

`DESIGN_SYSTEM_CURRENT_ROI=CONSISTENCY_AND_FUTURE_REUSE_NOT_CODE_REDUCTION`

The approved Wave C icon deltas for Metas and Auditoria remain separate from
the design-system primitive maturity assessment and do not alter financial or
persistence contracts.
