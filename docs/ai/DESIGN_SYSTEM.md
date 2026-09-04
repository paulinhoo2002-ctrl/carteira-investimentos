# Design System Visual

Status: `PILOT_01_OPT_IN`
Date: 2026-09-04

This document defines the small legacy visual pilot. It is not a global
migration and does not replace screen-specific contracts.

## Token aliases

The `--ds-*` aliases in `index.html` point to existing legacy tokens. Existing
tokens remain supported and are not renamed or removed.

| Alias | Existing source | Purpose |
| --- | --- | --- |
| `--ds-surface` | `--surface` | standard quiet surface |
| `--ds-surface-elevated` | `--panel` | elevated control/panel surface |
| `--ds-surface-subtle` | `--surface-2` | subtle/empty surface |
| `--ds-border` | `--border` | default border |
| `--ds-text-primary` | `--text` | primary text |
| `--ds-text-secondary` | `--muted` | secondary text |
| `--ds-positive` | `--success` | positive semantic value |
| `--ds-negative` | `--danger` | negative semantic value |
| `--ds-warning` | `--warning` | attention state |
| `--ds-info` | existing blue value | informational state |
| `--ds-accent` | `--primary` | primary action/accent |
| `--ds-radius-card` | `--radius-lg` | card/panel radius |
| `--ds-radius-control` | `--radius-md` | control radius |
| `--ds-space-1` to `--ds-space-6` | `--sp-1` to `--sp-6` | spacing aliases |
| `--ds-control-height` | `--control-min-h` | minimum interactive height |

The aliases exist in both theme scopes. They are opt-in and should be used by
new or explicitly piloted markup only.

## Primitives

### KPI

Classes: `.ds-kpi`, `.ds-kpi__label`, `.ds-kpi__value`, `.ds-kpi__context`.

Variants: `.ds-kpi--positive`, `.ds-kpi--negative`, `.ds-kpi--warning` and
`.ds-kpi--informational`. The base is visual only: the caller supplies the
official value, label, context and semantic state. It must not calculate
trends, percentages or financial values.

Pilot adoption: the four Metas KPI cards retain their existing classes and
add the opt-in classes. Inline colors and Metas-specific responsive rules stay
authoritative to preserve visual parity.

### Section/panel

Classes: `.ds-panel`, `.ds-panel--compact`, `.ds-panel--readonly` and
`.ds-panel--danger`.

Use for a visual container only. Safety, readonly and danger meaning must be
provided by the screen flow and must not be inferred from the panel class.

### Button

Classes: `.ds-button`, `.ds-button--primary`, `.ds-button--secondary`,
`.ds-button--ghost`, `.ds-button--danger` and `.ds-button--icon`.

The pilot may coexist with `.btn`, `.bgh` and `.bp`. Handlers, button type,
confirmation and destructive protections remain owned by the existing flow.

### Icon container

Class: `.ds-icon-container`.

It defines alignment and the small canonical SVG container. Interactive icons
still need the existing 44px touch-target contract. The pilot adds the class
to the existing `wave-b-icon` output without replacing its visual language.

### Badge

Classes: `.ds-badge`, `.ds-badge--positive`, `.ds-badge--negative`,
`.ds-badge--warning` and `.ds-badge--info`.

Text must communicate the state; color is supporting information only. Existing
screen-specific badge classes may remain alongside the opt-in class.

### Empty state

Class: `.ds-empty-state`.

It is a visual shell for explicit states such as `Nenhum`, `Sem dados`,
`Nao disponivel` and `Nao aplicavel`. `VALID_ZERO_IS_NOT_MISSING=true` is
mandatory. The caller owns the correct state and copy.

## Usage rules

- Preserve the legacy class alongside a `ds-*` class during the pilot.
- Prefer aliases over new literal colors, radii or spacing values.
- Keep official data sources, formulas, handlers and persistence outside the
  primitives.
- Keep tabular numbers, complete financial values and explicit missing states.
- Keep focus-visible treatment and 44px interactive targets.
- Validate 390, 430, 768, 1366 and 1920 after adoption.
- Add structural/accessibility tests, not pixel-perfect screenshot tests.

## Do not use as a universal abstraction

Do not use these primitives to flatten:

- Ativos variable/RF table or result/filter semantics;
- Renda Fixa valuation, maturity or editor rows;
- Rebalancear readonly engine and suggestion meaning;
- Auditoria identity, severity, revalidation or action levels;
- Aportes movement identity and duplicate rules;
- Rentabilidade/Dividendos chart series and period semantics;
- Metas progress/deadline formulas;
- Relatorios analytical versus backup/import separation;
- Configuracoes danger-zone, backup or restore behavior.

## Pilot boundary

`SCREENS_ADOPTING=Metas`

`VISUAL_CHANGE_INTENT=NONE_OR_MINIMAL`

`NEW_FRAMEWORK=false`

`NEW_DEPENDENCY=false`

`BUNDLER_CHANGE=false`

`CSS_REWRITE=false`

## Validation

- Focused pilot tests: `3/3`.
- Full gates: root `75/75`, modern `750/750`, finance `80/80`, persistence
  `32/32`, legacy build, modern build and `git diff --check` passed.
- Browser matrix for Metas: `390`, `430`, `768`, `1366` and `1920`; no page
  overflow, financial clipping, console errors, page errors or request failures.
- Visual parity: existing Metas classes and inline semantic colors remain in
  place and continue to control mature output; the new classes are additive.
- `DUPLICATED_RULES_REDUCED=0` in this pilot. The primitive is intentionally
  opt-in and reduces future duplication only when a screen is migrated under a
  separately approved scope.
- `MAINTENANCE_SIMPLIFICATION=true` for future opt-in work;
  `COUPLING_INCREASED=false`.

## Pilot 02: IRPF controlled adoption

`DESIGN_SYSTEM_PILOT_02_IRPF=IMPLEMENTED_OPT_IN`

IRPF adopted the existing primitives additively, while retaining its fiscal
classes and renderer. The adoption covers:

- `.ds-kpi` on IRPF summary, category, gain, fixed-income, alert and document
  cards;
- `.ds-panel.ds-panel--readonly` on the six fiscal sections;
- `.ds-button` variants on CSV/PDF and document actions, with existing
  handlers unchanged;
- `.ds-badge` on fiscal identity, section and summary status badges;
- `.ds-empty-state` on explicit IRPF missing-data states.

`IRPF_KPI_PRIMITIVE_ADOPTED=true`

`IRPF_PANEL_PRIMITIVE_ADOPTED=true`

`IRPF_BUTTON_PRIMITIVE_ADOPTED=true`

`IRPF_ICON_PRIMITIVE_ADOPTED=false; EXISTING_ICON_LANGUAGE_PRESERVED=true`

`IRPF_BADGE_PRIMITIVE_ADOPTED=true`

`IRPF_EMPTY_STATE_PRIMITIVE_ADOPTED=true`

The year selector, fiscal grouping, report totals, CSV/PDF handlers and all
IRPF data sources remain owned by the existing implementation. No tax logic,
financial formula, persistence or schema behavior was changed. The fiscal
hierarchy remains screen-specific, so IRPF does not become a clone of Metas or
Dashboard.

`VISUAL_PARITY_OR_IMPROVEMENT=true`

`FUNCTIONAL_PARITY=true`

`SCREEN_SPECIFIC_IDENTITY_PRESERVED=true`

`DUPLICATED_RULES_REDUCED=0; CLASS_ADOPTION_IS_ADDITIVE`

`VISUAL_CONSISTENCY_GAIN=MODERATE`

`MAINTENANCE_SIMPLIFICATION=true`

`COUPLING_INCREASED=false`

`DESIGN_SYSTEM_DECISION=EXPAND_CAREFULLY`

Next safe candidate: Renda Fixa shell visual only, with domain-specific rows
and helpers preserved. Configurações remains behind a separate safety gate.

## Integration checkpoint

`DESIGN_SYSTEM_PILOT_01=FROZEN`

`DESIGN_SYSTEM_PILOT_02_IRPF=FROZEN`

`DESIGN_SYSTEM_SCOPE=VISUAL_PRIMITIVES_ONLY`

`DESIGN_SYSTEM_CURRENT_ROI=CONSISTENCY_AND_FUTURE_REUSE_NOT_CODE_REDUCTION`

`NEXT_SAFE_ADOPTION=RENDA_FIXA_VISUAL_SHELL_ONLY`

`MODERN_FRONTEND_COUPLING=false`

The checkpoint intentionally leaves tables, charts, filter engines, sort
headers, audit actions, RF-specific UI, rebalance visualization, editors and
backup/import outside the shared primitive scope.

## Pilot 03: Renda Fixa controlled adoption

`DESIGN_SYSTEM_PILOT_03_RF=PASS`

Renda Fixa adopted the visual primitives only at the shell level:

- `.ds-kpi` on the five official summary metrics;
- `.ds-panel.ds-panel--readonly` on review, position, maturity,
  distribution and detail containers;
- `.ds-button` variants on existing value/application/review actions;
- `.ds-badge` on existing maturity, review-count and status states;
- `.ds-empty-state` on real empty RF scenarios.

`RF_ROW_PATTERN=SCREEN_SPECIFIC`

The RF rows retain indexer, rate, issuer, applied value, current value,
profit, maturity and liquidity/review context. `rfIntelligenceSnapshot()`,
`rfValues()`, `assetRfMaturityDate()`, explicit `assetId` resolution and
`edA()` remain unchanged. No RF calculation, identity matching, editor field,
review logic, persistence or schema behavior was changed.

`RF_FINANCE_LOGIC_CHANGED=false`

`RF_EDITOR_CHANGED=false`

`RF_IDENTITY_LOGIC_CHANGED=false`

`VISUAL_PARITY_OR_IMPROVEMENT=true`

`FUNCTIONAL_PARITY=true`

`SCREEN_SPECIFIC_IDENTITY_PRESERVED=true`

`DUPLICATED_RULES_REDUCED=0`

`VISUAL_CONSISTENCY_GAIN=MODERATE`

`MAINTENANCE_SIMPLIFICATION=true`

`COUPLING_INCREASED=false`

`DESIGN_SYSTEM_DECISION=EXPAND_CAREFULLY`

The next candidate is Configurações, but only after its dedicated
backup/import safety audit.

## Pilot 04: Configurações controlled adoption

`DESIGN_SYSTEM_PILOT_04_SETTINGS=PASS`

The adoption is intentionally limited to safe, non-destructive areas:

- `.ds-panel` on Aparência, Ambiente de teste and Sobre shells;
- `.ds-button` variants on theme, test-fixture, PWA and update controls;
- `.ds-icon-container` on safe informational section icons;
- `.ds-badge` on existing informational PWA statuses.

No KPI primitive was added because Configurações has no genuine KPI summary.
No empty-state primitive was added because there is no empty state to normalize.

Backup/import, restore, reset, wallet deletion, security and synchronization
remain outside the shared primitive adoption. Existing handlers, confirmations,
validation, rollback, RF event cleanup and persistence boundaries are unchanged.

`HIGH_RISK_FLOWS_UNTOUCHED=true`

`DESTRUCTIVE_SEMANTICS_PRESERVED=true`

`BUTTON_HIERARCHY_PRESERVED=true`

`VISUAL_PARITY_OR_IMPROVEMENT=true`

`FUNCTIONAL_PARITY=true`

`SETTINGS_IDENTITY_PRESERVED=true`

`COUPLING_INCREASED=false`

`DESIGN_SYSTEM_DECISION=KEEP_LIMITED`

The pilot proves safe reuse in preference, test-fixture and informational
sections without authorizing a generic migration of protected settings flows.
