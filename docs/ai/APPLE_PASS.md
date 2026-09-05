# Apple Pass

Status: `WAVE_1_FROZEN`

## Wave 1 Scope

Wave 1 is a low-risk interaction and accessibility contract for the legacy
shell. It is intentionally not a redesign, component migration, loading
rewrite, icon migration, responsive rewrite, or financial change.

Implemented in `index.html`:

- explicit transition properties and a short 160ms timing baseline;
- visible `:focus-visible` treatment for common interactive semantics;
- restrained pressed feedback for proven controls and tabs;
- `prefers-reduced-motion: reduce` handling for non-essential motion;
- no handler, markup, financial source, persistence, or schema change.

## Interaction Contract

| State | Rule |
| --- | --- |
| Focus | visible outline, 2px offset, no geometry-changing border |
| Hover | existing local hover behavior remains; only interactive elements are eligible |
| Pressed | restrained 1px feedback for buttons, tabs, chips, and action controls |
| Transition | background, border, color, shadow, opacity, and transform only |
| Duration | 160ms with a restrained ease curve |
| Reduced motion | transitions and animations are sharply reduced; functional visibility remains |

The contract does not add hover to passive cards or financial rows. Existing
screen-specific focus and selected-state rules remain authoritative where they
provide a stronger semantic treatment.

## Protected Exclusions

Wave 1 does not change Auditoria actions or identity revalidation, Renda Fixa
handlers or maturity semantics, Rebalancear calculations or readonly behavior,
IRPF tax logic or exports, backup/import/reset/delete/security/sync flows,
financial editors, loading/skeleton behavior, icon assets, charts, or layout.

`LOADING_SYSTEM_CHANGED=false`

`SKELETON_SYSTEM_ADDED=false`

`ICON_MIGRATION=false`

`FINANCE_CORE_CHANGED=false`

`PERSISTENCE_CHANGED=false`

`SCHEMA_CHANGED=false`

`REAL_DATA_CHANGED=false`

## Frozen Contract

`APPLE_PASS_WAVE_1=FROZEN`

`FOCUS_CONTRACT=FROZEN`

`HOVER_CONTRACT=FROZEN`

`PRESS_FEEDBACK_CONTRACT=FROZEN`

`TRANSITION_CONTRACT=FROZEN`

`REDUCED_MOTION_CONTRACT=FROZEN`

`TRANSITION_DURATION=160ms`

`NO_NEW_TRANSITION_ALL=true`

`PROTECTED_HANDLERS_CHANGED=false`

The Auditoria touch-target harness was reconciled from stale selectors to the
current `data-quality` renderer. The product code was not changed for that
correction, and the original 44px and focus assertions remain active.

## Validation Contract

Focused guards cover the Wave 1 style block, reduced motion, explicit
transition properties, protected handlers, and the isolated modern bridge.
Browser validation must continue to cover 390, 430, 768, 1366, and 1920px,
including keyboard focus, pressed states, mobile bottom navigation, overflow,
financial clipping, console errors, page errors, and request failures.

## Future Waves

- Wave 2: screen-local spacing, alignment, empty-state, and responsive polish.
- Wave 3: loading, skeleton eligibility, and async feedback consistency.
- Wave 4: carefully scoped legacy icon cleanup.

No future wave is implied by this document. Each requires its own scope and
protected-flow regression review.
