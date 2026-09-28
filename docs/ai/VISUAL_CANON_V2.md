# Visual Canon V2 — LEGACY Product System

`VISUAL_DIRECTION=PREMIUM_DARK_EXECUTIVE`

`UI_WORK_MUST_READ_VISUAL_CANON=true`

`TARGET_SHELL=LEGACY`
`REFERENCE_IMAGES_PUBLIC_SAFE=NONE_ASSERTED`

This is a reusable product/design contract, not a screenshot recreation or a financial-data specification. Read it with [`VISUAL_CANON.md`](VISUAL_CANON.md) and the evidence/sequence in [`V279B_VISUAL_PRODUCT_AUDIT.md`](V279B_VISUAL_PRODUCT_AUDIT.md). Existing code and contracts remain authoritative for behavior. Private visual references may exist locally and must not be committed.

## Product principles

- One coherent shell, sidebar, page-header grammar, and KPI hierarchy.
- Tables remain primary analytical surfaces; charts explain trends and include context.
- Dense but comfortable; 1366×768 is first-class. Mobile is adapted, not squeezed desktop.
- Restrained graphite/slate/navy surfaces with controlled blue/indigo structural accent.
- Green/red/amber are semantic only; color is never the sole state signal.
- No invented financial/tax data, arbitrary score, or implied operation.
- Preserve `UNKNOWN != ZERO`, `PARTIAL != COMPLETE`, `STALE != FRESH`, `ESTIMATE != RECEIVED`, `ENGINE_AVAILABLE != DATA_READY`.

## Component contracts

| Component | Purpose and visual role | Density, spacing, typography | Color and interaction | Responsive rule | Anti-pattern |
|---|---|---|---|---|---|
| APP_SHELL | Stable application frame; sidebar + content + mobile navigation. | Dense enough for daily use; consistent content gutter and header start. | Neutral structural surfaces; selected nav state uses restrained accent and text, not glow. | Desktop sidebar; existing mobile bottom nav plus secondary drawer, safe-area aware. | A different shell per route; hiding destinations without discoverability. |
| SIDEBAR | Primary destinations and orientation. | Compact rows with readable labels and consistent group rhythm. | Accent for current destination; semantic status only when real. | At 768 transition intentionally; keyboard focus remains visible. | Dozens of equal-priority links; color-only selected state. |
| PAGE_HEADER | Screen purpose, context/period, primary action. | One title scale; purpose text subordinate; avoid multiple stacked micro-labels. | Neutral title; primary action accent. | On mobile, wrap controls deliberately and protect content height. | Title + redundant subtitle + unrelated metadata competing. |
| KPI_STRIP | Small number of decision-relevant current metrics. | Clear label/value/context; consistent gaps; tabular numeric values. | Structural accent sparingly; positive/negative only for true semantics. | Stack or horizontally summarize without clipping. | Every metric gets an equal card; icon-color category rainbow. |
| PRIMARY_PANEL | Main task/data surface. | Dominant hierarchy; one clear heading and content. | Standard raised surface and border. | Full width when primary; avoid fixed desktop width. | Nested panels without hierarchy. |
| SECONDARY_PANEL | Supporting evidence or next action. | Lower contrast/visual weight, same spacing grammar. | Neutral/subtle surface; semantic state only when justified. | Stack after the main task. | Secondary content styled more prominently than the task. |
| DATA_TABLE | Compare exact records and values. | Comfortable compact rows; numeric columns right-aligned/tabular; identity can use two levels. | Neutral rows; status label plus redundant icon/color. | Prioritized columns, designed cards, or explicit scroller; never silent clipping. | Giant action column, ambiguous values, div-grid assumed accessible, scrollWidth-only check. |
| CHART_PANEL | Explain time or distribution with a bounded question. | Legible axes/legend; a short context sentence; no chart-only meaning. | Restrained series palette; semantic series mapping documented. | Reflow legend/labels; preserve unit and period. | Rainbow series, hidden unit, unsupported projection displayed as received. |
| FILTER_BAR | Set scope before table/chart. | Compact aligned controls with consistent control height. | Neutral controls; active filters plainly visible. | Wrap into rows or drawer; maintain labels. | Filters scattered between rows or unlabeled icons. |
| SEGMENTED_CONTROL | Switch mutually exclusive views/periods. | Compact, touch-usable options; selected text remains readable. | Selected state has shape/text/border, not color alone. | Horizontal scroll only with discoverable affordance when options exceed width. | Tab controls with no accessible name/keyboard semantics. |
| BUTTON | Invoke a clear action. | One primary action per context; secondary actions quiet. | Primary accent; destructive/financial meaning explicit. | Minimum 44×44px actual target; critical mobile actions may use 48px. | Primary styling on every action; small text with large invisible target assumptions. |
| BADGE | Compact classification. | Short label, secondary typography; avoid dense badge clusters. | Semantic text + optional icon/border/background. | Wrap cleanly. | Color-only dot; badge mistaken for metric. |
| STATUS | Communicate availability, completion, error, or evidence quality. | Stable label grammar and concise explanation. | Positive/info/attention/negative roles; unknown has neutral explicit state. | Remains visible in card/row form. | Unknown rendered as zero, partial rendered complete. |
| EMPTY_STATE | Explain genuinely absent content. | Short reason and next step, if actionable. | Neutral surface; no false success. | Compact, full-width, readable. | Fake CTA or meaningful instruction generated by CSS content. |
| WARNING_STATE | Surface risk/actionable attention. | Proportional; explain impact and route to details. | Amber/red only according to actual severity. | Keep title and action visible when stacked. | Persistent alarm color for ordinary metadata. |
| PARTIAL_STATE | Show known subset and missing coverage. | State both what is present and what is incomplete. | Neutral/info or attention based on actual risk. | Avoid collapsing explanation to a tooltip. | Labeling subset as total/complete. |
| UNKNOWN_STATE | Say evidence is unknown/unavailable. | Explicit word plus concise reason where known. | Neutral, never styled as zero or failure by default. | Same explicit semantics in card, chart, table. | Blank cell interpreted as zero. |
| DATA_FRESHNESS | Show source/as-of and freshness confidence separately from value. | Compact secondary metadata; date format consistent. | Fresh/stale/unknown label plus text/icon; do not conflate financial-as-of/source-as-of. | Wrap beneath value on mobile. | Color-only age signal or freshness inferred from a missing date. |
| TOOLTIP | Add optional detail to an already labeled control/value. | Concise; no essential-only information. | Standard accessible trigger. | Touch/keyboard operable; not hover-only. | Hiding definition, unit, warning, or source solely in tooltip. |
| MOBILE_NAV | Keep core destinations reachable on phone. | Small stable primary set plus grouped secondary destinations. | Strong selected label/icon state with visible text. | Respect safe area and vertical footprint; drawer reachable by keyboard. | Adding a new nav scheme without user evidence; 5 tiny unlabeled icons. |
| MODAL_OR_DRAWER | Focus a bounded task/details without losing context. | Clear title, concise content, action hierarchy. | Surface elevation and distinct primary/secondary controls. | Drawer on narrow screens where appropriate; focus management and escape behavior. | Long complex workflows in a cramped dialog. |
| ASSET_ROW | Identify holding and compare key financial fields. | Identity first, values aligned, secondary source/status lower weight. | Logo optional and decorative unless meaningful; semantic gain/loss has text/icon. | Card stacks identity, market value, quantity and reachable detail. | Logo-only identity; all fields/actions forced into one narrow row. |
| ASSET_LOGO | Fast visual recognition only. | Small consistent box; fallback initials/class glyph. | Neutral container; no meaning encoded in brand color. | Do not consume the primary mobile text column. | Treat missing logo as missing asset; fetch/error state changes identity. |
| NUMBER_FORMATTING | Make financial comparisons scan-friendly. | Tabular numerals; consistent BRL/percent/quantity precision per existing domain formatter. | Sign, label/icon, and semantic color redundantly express gain/loss. | Avoid truncating significant digits; use wrapping/secondary line. | Changing rounding/calculation for visual fit; color-only positive/negative. |
| FINANCIAL_POSITIVE_NEGATIVE | Present signed values without changing their financial meaning. | Preserve sign, unit, and precision contract. | Green/red only when semantically positive/negative; add sign/label/icon as appropriate. | Same meaning in high-contrast narrow layouts. | Treat every positive number as “good” or imply performance from value movement alone. |

## Token direction

Use a compact role-based scale and map existing aliases before migrating values:

- **Surface:** canvas, surface, raised, subtle.
- **Text/border:** primary, secondary, muted; default/strong border.
- **Accent/status:** accent, info, positive, attention, negative; add text/background/border variants only where contrast and use require them.
- **Typography:** approximately `0.75rem`, `0.8125rem`, `0.875rem`, `1rem`, `1.25rem`, `1.5rem`, with explicit roles. Ordinary reading text should generally be at least 12px; visible 6–10px text is presumed a defect unless it is non-reading decoration with no information value.
- **Spacing:** a small rhythm such as 4/8/12/16/24/32px, with documented component exceptions.
- **Radius/elevation:** small/medium/large/pill and two restrained elevation levels.
- **Controls:** 44px minimum clickable target; verify runtime `getBoundingClientRect`, not CSS padding alone.
- **Numbers:** tabular numerals on comparison fields, not prose.

These are target roles, not authorization for a global token rewrite. Dark/light contrast must be checked on actual surfaces. Separate primary text/accent roles where needed rather than changing a valid button/surface color.

## Screen map

| Screen | Primary question | Visual contract |
|---|---|---|
| Dashboard | What deserves attention now? | Primary KPIs → supported evolution → allocation → received-income context → highlights → concise trust/freshness. |
| Ativos | How do holdings compare? | Rich table with explicit field priority; mobile card representation. |
| Dividendos | What income was received, and what is only announced/estimated? | History first; future states separate; consistent date window. |
| Renda Fixa | What fixed-income positions and valuation bases exist? | Instrument, institution, basis, source/as-of and freshness distinguishable. |
| Patrimônio | What do I own and what is it worth? | Current value/composition, not a duplicate return dashboard. |
| Rentabilidade | How did the portfolio perform? | Only data-ready metrics; explicit missing requirements otherwise. |
| Metas | What is the evidence-backed progress and next step? | Status/progress plus actionable context; no invented completion. |
| Aportes | What entered from the investor, and what was internal activity? | External flows, transactions, and provenance remain distinct. |
| Rebalanceamento | What is suggested, not executed? | Consultive status and evidence; no implied order. |
| Análise | What does the comparison/evidence explain? | Explainable context; no arbitrary score. |
| Relatórios | Which evidence/report answers this question? | Grouped report tasks, periods, sources, export. |
| Auditoria/Confiabilidade | What is uncertain, stale, or traceable? | Stable status grammar, filters, provenance. |
| IRPF | What authoritative tax information applies? | Tax-specific contract remains protected; no visual reinterpretation. |
| Import Center | What is previewed, validated, and explicitly accepted? | Progressive workflow and clear confirmation boundary. |
| Settings/Asset Detail | What configuration or one-asset detail is needed? | Secondary settings; detail-only asset fields and contextual actions. |

## Responsive and privacy gates

- Shared shell/components: 390, 430, 768, 1366, 1440, 1536, 1920 as relevant; 1366×768 is the first-class desktop target.
- Validate actual rendered text, touch-target rectangles, table-cell overlap/clipping, focus, theme contrast, reduced motion, empty/error/partial/unknown states, and keyboard access. A passing page-width check is not sufficient for internal tables.
- Do not use the personal browser profile for synthetic QA. Do not claim real-wallet QA from synthetic fixtures.
- Only synthetic, independently public-safe, or explicitly publication-approved images may be committed under `Refs/visual-canon/`. No current image is asserted public-safe by the index. Private portfolio screenshots remain local-only.
