# Visual Canon

## Canonical references

- `CANONICAL_REFERENCE_DASHBOARD=Refs/visual-canon/dashboard-canonical.png`
- `CANONICAL_REFERENCE_DIVIDENDS=Refs/visual-canon/dividendos-canonical.png`
- `REFERENCE_MODE=CANONICAL_PIXEL_TARGET`
- Dashboard reference: 1672x941, approved “Visão consolidada” composition.
- Dividendos reference: 1672x941, approved historical Dividendos composition.
- These PNGs are byte-preserved copies of the two explicitly approved images
  provided in the project session. They are final visual targets, not
  inspiration.

## Non-negotiable language

- Deep, continuous background with quiet tonal surfaces.
- Thin, discreet borders; moderate consistent radii; minimal shadow.
- Strong hierarchy with tabular financial numerals and no unsafe truncation.
- Semantic green/red/amber/blue use, not decorative color noise.
- Active state uses tonal surface plus restrained accent, not a heavy block.
- No gratuitous glassmorphism, glow, decorative gradients or ornamental motion.
- Dense desktop comparison and progressive mobile disclosure.

## Tokens and shared patterns

Use existing tokens in `index.html` before adding any new token. The project
history identifies the primary scale as caption 10px, label 11px, body 12px,
subtext 13px, h4 14px, h3 17px, h2 20px and h1 24px. These are guidance, not a
license to shrink critical financial values.

Shared patterns:

- `--primary`, `--panel`, `--surface` and existing border/radius/shadow tokens;
- quiet cards with aligned headers and compact secondary controls;
- right-aligned tabular numbers in tables and summaries;
- visible `:focus-visible` treatment and touch targets of at least 44px;
- safe mobile padding and bottom-navigation safe area.

## Screen contracts

### Sidebar

Continuous surface, uniform icon boxes, predictable vertical rhythm, tonal
active item, discreet accent, silent utility block at the bottom. Do not change
navigation order or route behavior for visual work.

### Dashboard

Executive reading first: principal KPIs, composition, evolution, passive income
and approved highlights. Do not reintroduce oversized secondary panels or
invent metrics. The home is a summary; depth belongs to the relevant screen.

### Dividendos

Title/context and official KPIs lead. Monthly evolution and historical depth are
protagonists; top assets and official distributions remain useful complements.
Preserve official history, review queue, filters, tooltips and action handlers.

## Tooltip contract

Where a chart already exposes a tooltip, it must identify the period/date, the
series and the exact formatted value. It must remain inside the viewport, work
with hover/touch/focus where supported by the component, and never obscure or
truncate a critical financial value.

## Responsive contract

- Required viewports: 390x844, 430x932, 768x1024, 1366x768 and 1920x1080.
- Mobile prioritizes financial reading, then context, then actions/details.
- Desktop uses width intentionally for comparison, not extra decorative cards.
- Horizontal overflow and financial clipping are defects.

## Freedom rule

`VISUAL_DESIGN_FREEDOM=0` means do not invent a third visual language.
`VISUAL_IMPLEMENTATION_FREEDOM=100` means implementation may use the existing
canon flexibly when preserving product structure, data and accessibility.

## Visual Reference Lock Process

`VISUAL_REFERENCE_LOCK_PROCESS=ACTIVE`.

Every visual approval must identify the primary canon, keep secondary
references subordinate, state the protected information architecture, and
record the changed scope. Browser evidence at 390, 430, 768, 1366 and 1920
must cover overflow, clipping, console/page/request errors and the relevant
interaction states. Tests and builds are necessary gates, but they do not
replace visual comparison or explicit user approval.

For Dashboard, the permanent structural target is
`Refs/visual-canon/dashboard-canonical.png`. `Tela Principal.png` is only a
secondary quality reference and must not change the executive-home purpose or
copy another screen's information architecture.
