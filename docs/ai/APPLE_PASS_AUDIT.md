# Apple Pass Readiness Audit

**Scope:** auditoria de polish global e registro da implementação controlada da
Wave 1.

**Repository state audited:**

- Branch: `feat/visual-product-north-star`
- HEAD base: `abe6bdac6ba2d528651a7134ab3fa7dfa33ec7e1`
- `origin/main`: `d3170e9fda8f9a1b9b9746cc950ceb5445c3d3c2`
- Upstream: `origin/feat/visual-product-north-star`
- Product files changed by the read-only audit: `false`
- Wave 1 implementation change: `index.html` CSS-only interaction contract.
- Wave 2 working-tree change: `index.html` screen-local responsive spacing only.

## Decision

`APPLE_PASS_READINESS=PARTIAL`

The product already has a credible visual foundation: shared token aliases and
opt-in primitives, visible focus treatment, semantic colors, explicit empty
states, 44px-oriented controls, route smoke coverage, and tested responsive
layouts. It is not ready for a broad Apple Pass because interaction feedback,
reduced-motion behavior, loading states, icon language, and spacing rules are
not yet governed consistently enough across all surfaces.

Wave 1 was approved as a narrow interaction contract and is now implemented
without a broad visual rewrite. The remaining Apple Pass waves are still not
authorized by this change.

## Evidence Baseline

- Global `:focus-visible` coverage exists for buttons, summaries, fields,
  role-based controls, and tabs.
- The global button baseline includes hover and pressed feedback; local screens
  add their own variants.
- Search has a dialog, selected result state, keyboard hint, `aria-selected`,
  Enter navigation, and Escape close behavior.
- Existing visual primitives cover token aliases, KPI, panel, button, icon
  container, badge, and empty-state anatomy.
- Loading feedback exists for selected asynchronous flows and asset/report
  areas, including a tested skeleton in Ativos, but is not a complete product
  contract.
- Toast feedback is widely used for saves, exports, imports, refreshes, and
  protected operations.
- No `@media (prefers-reduced-motion: reduce)` contract was found.
- Motion is currently distributed across hover transforms, tab transitions,
  fade/slide keyframes, price updates, spinners, and bottom-navigation
  emphasis.

## Wave 1 Result

`APPLE_PASS_WAVE_1=IMPLEMENTED_READY_FOR_REVIEW`

- `FOCUS_CONTRACT_IMPLEMENTED=true`
- `HOVER_CONTRACT_IMPLEMENTED=true`
- `PRESS_FEEDBACK_IMPLEMENTED=true`
- `TRANSITION_CONTRACT_IMPLEMENTED=true`
- `REDUCED_MOTION_SUPPORTED=true`
- `SIDEBAR_LAYOUT_CHANGED=false`
- `BOTTOM_NAV_LAYOUT_CHANGED=false`
- `LOADING_SYSTEM_CHANGED=false`
- `SKELETON_SYSTEM_ADDED=false`
- `ICON_MIGRATION=false`
- `PERFORMANCE_RISK=LOW`

`APPLE_PASS_WAVE_1_FROZEN=true`

`HARNESS_FAILURE_CLASS=STALE_HARNESS`

`HARNESS_FIX_APPLIED=true`

`AUDIT_REAL_TOUCH_TARGET_REGRESSION=false`

`PRODUCT_CODE_CHANGED_FOR_HARNESS_FIX=false`

The implementation is CSS-only plus focused static guards. Existing handlers,
financial sources, protected flows, and screen-specific semantics were not
changed.

The broad route/browser smoke remained healthy across the required viewport
matrix. The pre-existing touch-target harness expectation for Auditoria was
reconciled from `.data-audit-chip` / `.data-audit-actions .btn` to the current
`.data-quality-chip` / `.data-quality-actions .btn` selectors. No protected
Auditoria markup was changed, and the 44px/focus assertions remain active.

## Screen Matrix

| Surface | Apple Pass priority | Risk | Benefit | Reason |
| --- | --- | --- | --- | --- |
| Dashboard | Medium | Low | Medium | Improve focus, feedback, loading, and chart interaction polish without changing executive information architecture. |
| Ativos | Low | Protected | Medium | Dense financial tables, filters, sorting, RF summary, and result semantics must remain local and exact. |
| Renda Fixa | Low | Protected | Medium | Editor, maturity, identity, and RF source semantics make generic interaction changes risky. |
| Análise | Medium | Medium | Medium | Good candidate for local empty-state, ranking, and responsive polish; formulas remain untouched. |
| Dividendos | Medium | Protected | Medium | Historical data, charts, and zero-versus-missing semantics require local treatment. |
| Rentabilidade | Low | Protected | Medium | Benchmark and chart semantics must not be hidden by generic motion or chart wrappers. |
| Rebalancear | Low | Protected | Low | Read-only suggestions and ordering are safety contracts, not Apple Pass decoration targets. |
| Relatórios | Low | Protected | Medium | Analytical reports must remain distinct from backup, import, and data export. |
| Metas | Medium | Medium | Medium | Progress, deadline, and status wording can receive shell polish without changing goal logic. |
| IRPF | Low | Protected | Medium | Fiscal grouping, year selection, and CSV/PDF behavior are screen-specific. |
| Auditoria | Low | Protected | Medium | Identity, severity, action levels, and target revalidation must remain explicit. |
| Aportes | Medium | Protected | Medium | Movement identity and duplicate protections take precedence over visual uniformity. |
| Configurações | Low | Protected | Medium | Backup, import, restore, reset, security, and data management require a separate safety gate. |

## Interaction State Audit

### Hover

`HOVER_SYSTEM_STATUS=PARTIAL_INCONSISTENT`

There is a shared button hover baseline and several strong local treatments for
search, tables, tabs, menus, and contextual actions. Opacity, background,
border, elevation, and translate feedback are not fully standardized. Some
hover transforms are appropriate for controls but should not spread to passive
financial rows or data cards.

### Focus

`FOCUS_SYSTEM_STATUS=PARTIAL_GOOD`

The global focus-visible rule is a strong base and route-specific rules add
high-contrast treatment in important dialogs and premium surfaces. Remaining
risks are local overrides, input styles that replace the outline with a shadow,
focus return after route/modal changes, and focus visibility inside responsive
containers. Focus must remain visible and keyboard navigation must remain
semantic; no broad focus refactor is justified by this audit.

### Pressed and active

`PRESS_FEEDBACK_STATUS=PARTIAL`

Buttons expose an active transform, tabs and bottom navigation expose selected
states, and search exposes a selected result. Filters, summary cards, menus,
and some icon-only controls use different conventions. A future shared contract
should define pressed feedback for actionable controls only, not for passive
financial content.

### Reduced motion

`REDUCED_MOTION_SUPPORTED=false`

No explicit reduced-motion media contract was found. This is the highest-value
global accessibility gap for an Apple Pass and should be addressed before broad
motion polish.

## Safe Motion Map

`SAFE_MOTION_OPPORTUNITIES=`

- 150-220ms opacity/background/border transitions for actionable controls.
- Short open/close transitions for menus, drawers, accordions, and search.
- Toast entrance/exit when it does not delay comprehension.
- Skeleton shimmer only while a real asynchronous operation is pending.

`MOTION_DO_NOT_USE=`

- Animated financial values, balances, returns, or target progress that could
  imply a change in the underlying data.
- Decorative chart animation that obscures benchmark or historical meaning.
- Motion in destructive confirmations, protected editors, backup/import, or
  identity revalidation flows.
- Continuous or attention-seeking motion in the shell or bottom navigation.
- Motion that changes reading order or hides a critical financial value.

## Loading and Action Feedback

`SKELETON_CANDIDATES=`

- Dashboard startup or market refresh when an actual asynchronous delay exists.
- Report generation/preview when the operation is genuinely pending.
- Analysis or data-quality refresh when the source is loading.
- Existing Ativos data refresh, preserving its current financial semantics.

`ACTION_FEEDBACK_GAPS=`

- Toast copy, duration, color, and placement vary between flows.
- Loading feedback is explicit in some async flows but absent or local in
  others.
- Export feedback is generally present, but pending/failed/success states are
  not expressed by one shared contract.
- Synchronous filters and sorting should remain quiet; adding toast noise there
  would reduce clarity.
- Destructive and protected actions already have safety-specific handlers and
  must not be replaced by generic feedback.

## Icon, Spacing, and Typography Findings

`ICON_OUTLIERS=`

The product mixes canonical SVG/icon containers with legacy emoji and local
textual symbols in sidebar, settings, audit, and section headers. This is a
real consistency gap, but a global replacement would create risk and erase
screen-specific meaning. Limit future migration to low-risk informational
shells; exclude Audit, RF editor, backup/import, and protected action icons.

`SPACING_OUTLIERS=`

Repeated control heights and common card anatomy exist, but local `padding`,
`gap`, `radius`, and mobile overrides remain common. A stable 4/8/12/16/20/24/
28/32 family is visible in practice, with local exceptions for dense tables,
dialogs, and chart internals.

`ALIGNMENT_OUTLIERS=`

Button icon/text alignment, icon-only control centering, sidebar label alignment,
and table/action columns vary by screen. Financial cells already use dedicated
alignment rules and should not be normalized through a generic card primitive.

`TYPOGRAPHY_MICRO_GAPS=`

Title, section, KPI, metadata, badge, and button roles recur but are not fully
centralized. Secondary metadata can become too small or faint on dense screens.
Financial values should retain tabular alignment, strong contrast, and no
critical ellipsis; a global font replacement is not justified.

`CONTRAST_GAPS=`

Muted metadata and local dark/light variants need targeted review. Semantic
states are usually paired with text or labels, but future work must ensure that
color is never the only signal.

`FINANCIAL_LEGIBILITY_GAPS=`

The main residual risk is local inconsistency: values, missing markers, status
labels, and table density are not governed by one visual checklist. Apple Pass
work must preserve valid zero versus missing, tabular numbers, full critical
identifiers, and existing result/severity semantics.

`EMPTY_STATE_POLISH_GAPS=`

Explicit empty states already exist, but wrapper, spacing, icon, and copy
consistency varies. Empty, unavailable, not applicable, and valid zero must
remain distinct.

## Responsive and Shell Findings

`RESPONSIVE_MICRO_GAPS=`

The tested 390/430/768/1366/1920 matrices are structurally healthy, but local
first-screen density, text wrapping, and tablet hybrid behavior differ between
surfaces. Improve one screen at a time; do not introduce new breakpoints without
evidence.

`SHELL_MICRO_GAPS=`

Sidebar hover/focus/icon-label alignment and bottom-navigation active/hover
emphasis are not perfectly uniform. The shell is protected and should receive
only a dedicated, regression-tested contract change.

## Protected Exclusions

`APPLE_PASS_EXCLUSIONS=`

- Finance Core, persistence, schema, local data, backup/import, restore, reset,
  sync, and security behavior.
- Audit exact/context/general/info action levels, identity keys, and target
  revalidation.
- RF editor, maturity, asset identity, `rfIntelligenceSnapshot`, `rfValues`,
  and RF event behavior.
- Read-only rebalance engine, contribution distribution, and suggestion order.
- Tax groupings, IRPF year semantics, CSV/PDF meaning, goal progress/deadlines,
  dividend history/chart semantics, and analytical-versus-backup separation.
- Financial editors and any interaction that can mutate real data.

## Global Versus Local Decisions

`GLOBAL_LOW_RISK_CANDIDATES=`

- Explicit reduced-motion baseline.
- Focus-visible and pressed-state contract for actionable controls.
- Token aliases and low-level icon-container/button/badge rules already proven
  by the design-system pilots.
- A compact feedback taxonomy for loading, success, warning, and error states.
- Shared responsive/touch-target guard tests, not shared financial markup.

`SCREEN_LOCAL_ONLY=`

- Financial tables and sortable headers.
- Charts, rankings, allocation, and dividend history.
- RF rows/editors and maturity presentation.
- Audit identity/actions/severity.
- Rebalance visualizations and suggestion ordering.
- IRPF tax blocks and export structure.
- Goal progress and deadline semantics.

## Proposed Apple Pass Waves

`APPLE_PASS_WAVE_1=` **interaction accessibility baseline**

Add reduced-motion handling, verify focus-visible/return behavior, define
actionable hover/pressed states, and protect touch-target/disabled semantics.
Keep the work CSS/test focused and exclude protected handlers.

`APPLE_PASS_WAVE_2=` **screen-local micro-polish**

Apply spacing, alignment, empty-state, and responsive refinements only to
low-risk surfaces such as Dashboard, Análise, Metas, and selected informational
shell areas.

`APPLE_PASS_WAVE_3=` **async feedback consistency**

Standardize loading, skeleton eligibility, toast language, and error/success
feedback for real asynchronous operations. Do not add feedback to synchronous
filtering or safe read-only navigation.

`APPLE_PASS_WAVE_4=` **icon language and final polish**

Migrate only low-risk legacy icon outliers, then evaluate fine hover, focus,
motion, and responsive polish with protected-surface regression coverage.

## Risks and Test Strategy

`PERFORMANCE_RISKS=`

- Broad transitions can cause layout thrash in the large legacy document.
- Heavy shadows, continuous animations, and chart/value animation can increase
  paint cost and reduce readability.
- Observer/listener proliferation can leak across route renders.
- Skeletons must not mask stale or unavailable financial data.

`ACCESSIBILITY_RISKS=`

- Focus loss after rerender, navigation, or dialog close.
- State conveyed by color only.
- Missing reduced-motion support.
- Small icon-only targets and adjacent mobile actions.
- Dialog focus trapping/return behavior in protected flows.

`APPLE_PASS_TEST_STRATEGY=`

- CSS contract tests for reduced motion, focus-visible, transition scope, and
  semantic variants.
- Keyboard/browser checks for focus, active result, Escape, Enter, dialogs,
  drawers, and route transitions.
- Existing responsive smoke matrices at 390, 430, 768, 1366, and 1920.
- Overflow, clipping, console, page-error, request-failure, and blank-route
  guards.
- Protected-flow regression tests for audit, RF, rebalance, backup/import,
  settings, IRPF, and financial editors.
- Avoid brittle screenshot-pixel tests; use screenshots as review evidence.

`APPLE_PASS_SUCCESS_CRITERIA=`

- No horizontal overflow, financial clipping, blank primary routes, or new
  console/page/request errors.
- Focus remains visible and returns sensibly after dialogs and navigation.
- Reduced-motion preferences are honored.
- Actionable controls have understandable hover/pressed/disabled feedback.
- Status is not communicated by color alone.
- No Finance Core, persistence, schema, backup/import, or real-data changes.
- Protected handlers and financial semantics remain unchanged.
- Measurable polish improvement without coupling screen-specific semantics.

## Readiness

`APPLE_PASS_READINESS_AUDIT=COMPLETE`

`APPLE_PASS_READINESS=PARTIAL`

`APPLE_PASS_READY_FOR_IMPLEMENTATION=true`

`NEXT_RECOMMENDED_ACTION=keep Wave 2 separate; review the frozen Wave 1 commit`

Wave 1 does not change dependencies, schema, persistence, or data. It remains
subject to browser review before any commit or release action.

## Wave 2 Audit Result

`APPLE_PASS_WAVE_2=FROZEN`

`SCREENS_AUDITED=13`

`SCREENS_CHANGED=Rentabilidade`

`SCREENS_UNCHANGED=Dashboard,Ativos,Renda Fixa,Análise,Dividendos,Rebalancear,Relatórios,Metas,IRPF,Auditoria,Aportes,Configurações`

`SCREEN_CHANGE_MATRIX=`

| Surface | Result | Evidence | Risk |
| --- | --- | --- | --- |
| Rentabilidade | `TARGETED_POLISH` | Mobile KPI rhythm corrected at 390/430px; desktop grid preserved. | Low; CSS-only, screen-local selector. |
| Dashboard | `NO_CHANGE` | No visible spacing, alignment, wrapping, or density gap justified a change. | None. |
| Ativos | `NO_CHANGE` | Dense financial table and frozen result/filter semantics remain authoritative. | Protected. |
| Renda Fixa | `NO_CHANGE` | RF identity, maturity, and editor patterns remain protected. | Protected. |
| Análise | `NO_CHANGE` | Existing analytical hierarchy and mobile scanability were sufficient. | Protected. |
| Dividendos | `NO_CHANGE` | Chart/table balance and dividend semantics were sufficient. | Protected. |
| Rebalancear | `NO_CHANGE` | Read-only allocation and suggestion semantics remain protected. | Protected. |
| Relatórios | `NO_CHANGE` | Analytical/export separation remains protected. | Protected. |
| Metas | `NO_CHANGE` | Goal progress hierarchy and responsive layout were sufficient. | Protected. |
| IRPF | `NO_CHANGE` | Fiscal grouping, year, and export semantics remain protected. | High. |
| Auditoria | `NO_CHANGE` | Identity, severity, and action safety remain protected. | High. |
| Aportes | `NO_CHANGE` | Movement identity and action layout showed no justified local gap. | Protected. |
| Configurações | `NO_CHANGE` | Backup/import/reset/security hierarchy was not touched. | High. |

`SPACING_OUTLIERS_FIXED=1`

`ALIGNMENT_OUTLIERS_FIXED=0`

`RESPONSIVE_GAPS_FIXED=1`

`FIRST_SCREEN_DENSITY_IMPROVED=true`

`TABLET_COMPOSITION_IMPROVED=not needed`

`DESKTOP_BALANCE_IMPROVED=preserved`

`CHANGE_JUSTIFIED_BY_VISIBLE_GAP=true`

`APPLE_PASS_WAVE_1_REGRESSION=PASS`

`APPLE_PASS_WAVE_3_READY=READY_FOR_SEPARATE_REVIEW`

Wave 2 deliberately did not introduce a new breakpoint, component system,
loading behavior, skeleton behavior, icon migration, financial calculation, or
protected-flow change. Browser evidence and full gates remain the release
criteria for this separate review.

`NEXT_PHASE=APPLE_PASS_WAVE_3_READINESS_AUDIT`
