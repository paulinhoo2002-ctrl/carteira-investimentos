# V329 — Portfolio Trust and Insights

**Status:** specification only; implementation requires a separately authorized phase.

## Goal

Make the quality, age, completeness, and concentration basis of portfolio
information visible, while preserving existing financial calculations and
authority rules. The interface reports evidence and data limitations; it does
not recommend investments.

## Candidate scope

- Confidence badges tied to explicit source/provenance and completeness.
- Source freshness using the source's actual as-of timestamp; stale warnings
  must not imply a value changed or is wrong.
- Completeness states that distinguish complete, partial, unknown, unavailable,
  and empty where the underlying contract supports each state.
- Descriptive portfolio and institution concentration, with denominator,
  coverage, and valuation timestamp visible. Unknown values cannot silently be
  excluded while presenting the result as complete.
- Income consistency indicators that compare recorded evidence only; they must
  not infer missing income as zero or replace source authority.
- Asset status limited to data quality, availability, and freshness. No buy,
  sell, suitability, or investment-health recommendation.
- Clear visibility for unknown, partial, stale, and unavailable data.

## Protected boundaries

- No financial advice or strategy recommendation.
- No change to formulas, financial semantics, historical records, persistence,
  schema, or writer authority in this specification.
- Preserve `UNKNOWN != ZERO`, `PARTIAL != COMPLETE`, and source/provenance.
- Missing price, movement, cost basis, or source coverage remains explicit; do
  not fabricate a zero or a complete portfolio result.
- The modern frontend remains read-only; no production writes.

## Acceptance evidence for a future implementation phase

- Synthetic tests cover fresh/stale, complete/partial/unknown/unavailable, and
  missing-source states without coercion to zero.
- Concentration outputs disclose numerator, denominator, coverage, and as-of
  basis; incomplete inputs cannot produce a falsely complete total.
- Income indicators preserve source provenance and never treat absence as
  confirmed zero income.
- Accessibility and responsive review cover semantic labels, keyboard use,
  supported viewport widths, and no horizontal overflow.
- Review confirms no financial formula, persistence, schema, or write-path
  change; any such change requires its own approved contract and phase.

## Open decisions

- Which existing source timestamps are reliable enough to drive freshness.
- Whether institution identity and income-source coverage are complete enough
  for concentration/consistency outputs.
- Thresholds for stale warnings and the presentation of unavailable states.

Resolve these from current product contracts and synthetic evidence before
implementation. Do not guess missing authority or thresholds.
