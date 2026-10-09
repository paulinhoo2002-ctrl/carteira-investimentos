# Visual Canon

> **Current consolidated system:** [`VISUAL_CANON_V2.md`](VISUAL_CANON_V2.md).
>
> **Evidence, screen-by-screen audit, and implementation sequence:** [`V279B_VISUAL_PRODUCT_AUDIT.md`](V279B_VISUAL_PRODUCT_AUDIT.md).

V2 supersedes this document's earlier high-level guidance where it is more
specific. Existing product and financial contracts remain authoritative.

`VISUAL_DIRECTION=PREMIUM_DARK_EXECUTIVE`.
`UI_WORK_MUST_READ_VISUAL_CANON=true`.

This public document preserves structural design intent. Private visual
references may exist locally and must not be committed. Only synthetic,
public-safe, or explicitly approved-for-publication images may be tracked under
`Refs/visual-canon/`.

## Durable visual principles

- Strong KPI hierarchy and clear typographic hierarchy.
- Dense but comfortable layout combining charts, tables, and textual context.
- Consistent sidebar and restrained borders and shadows.
- Controlled blue/indigo structural accents; green, red, and amber are reserved
  for semantic meaning and must not be the only signal.
- No gaming/neon aesthetic, excessive glow, giant empty areas, or microcard
  overload.
- Readable at 1366x768; adapt mobile layouts rather than squeezing desktop
  tables into a narrow viewport.
- Preserve existing product structure, financial semantics, accessibility,
  and behavior. Screenshots do not override source contracts.
- Use existing design tokens and tabular numerals where they improve financial
  comparison. Maintain visible keyboard focus, readable contrast, and practical
  touch targets.

## Screen-specific guidance

- **DASHBOARD:** executive summary first; principal KPIs, composition, evolution,
  passive income, and approved highlights. Do not invent metrics.
- **ATIVOS:** preserve a rich comparison surface, explicit values and actions;
  mobile should use readable cards rather than a compressed desktop table.
  `ATIVOS_INFORMATION_DENSITY_RULE=true`: desktop preserves every useful
  portfolio field; mobile may recompose fields but must not silently omit them.
- **DIVIDENDOS:** emphasize monthly and annual history, official KPIs, review
  states, filters, tooltips, and existing actions.
- **PATRIMONIO:** communicate current composition and value without conflating
  it with performance.
- **RENTABILIDADE:** show only metrics whose data-readiness contract is met;
  engine availability alone is not data readiness.
- **METAS:** preserve goal progress, missing-data distinctions, and existing
  actions without inventing completion.
- **APORTES:** distinguish investor cash flows from internal portfolio
  activity and show provenance where available.
- **ANALISE:** provide explanatory context and evidence, not arbitrary scores.
- **REBALANCEAMENTO:** keep recommendations distinct from executed financial
  operations; do not imply a trade occurred.
- **AUDITORIA:** favor traceability, source, date, and explicit uncertainty.
- **IRPF:** preserve tax semantics and authoritative values; visual work must
  not change tax calculations or records.

## Responsive and reference policy

`PRIMARY_RESPONSIVE_TARGETS`: notebook 1366x768 and 1440x900; mobile 390x844,
with 360x800 and 430x932 also covered. Validate relevant screens at 768, 1024,
1280x800, and 1920x1080 as applicable, plus the project's full QA matrix when
required. Check overflow, clipping, focus, console/runtime errors, and relevant
interactions. Private portfolio screenshots are local-only. New public images
require provenance and privacy review before tracking.

Use `Refs/visual-canon/README.md` and `CANON_INDEX.md` for public reference
handling rules. They do not promise that private reference images are present
in a clone.
