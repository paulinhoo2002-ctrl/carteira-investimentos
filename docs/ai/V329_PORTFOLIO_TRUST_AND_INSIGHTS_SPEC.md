# V329 — Portfolio Trust and Insights

**Status:** implementation authorized and in progress in `codex/v329-portfolio-trust-insights`, based on V328 merge `2d79860c9cb3a6faa7c1098119bb6c4e23af46b0`.

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

## Implementation evidence and remaining gates

- Existing freshness uses the product's current three-day quote-staleness
  boundary and actual source timestamps; this phase adds no second threshold.
- Synthetic tests cover distinct complete, partial, unknown, empty, available,
  stale, and not-calculated states. No product status asserts verified or
  unverified without a governed verification source.
- Classification coverage keeps monetary coverage unknown if any position value
  is unavailable; an all-unknown value aggregate remains unavailable, not zero.
- Allocation reuses `PortfolioAllocationIntelligence`; institution grouping
  uses only explicit institution/custodian/broker metadata and never issuer.
  Percentages retain the known-value denominator, disclose position coverage,
  and show a valuation date only when source dates support it.
- Income indicators preserve source provenance and never treat absence as
  confirmed zero income; existing Dividend Intelligence separates received
  from announced/estimated events and remains the authority.
- A11Y passes 19/19, V289 visual/browser passes 12/12, and `qa:all` reports no
  overflow, console errors, page errors, or relevant request errors across the
  390–1920 px synthetic viewport set. Route and theme regression coverage
  includes Dashboard, Ativos, Dividendos, Patrimônio, Rentabilidade and
  Confiabilidade; trust states also have focused synthetic model/UI contracts.
- Review confirms no financial formula, persistence, schema, or write-path
  change; any such change requires its own approved contract and phase.

## Accepted boundaries and open evidence

- Quote freshness is sourced from explicit quote/source timestamps and uses the
  existing three-day rule. Fixed-income valuation freshness continues to use
  its existing authority metadata.
- Institution identity is not complete enough to assert total institutional
  concentration; output is descriptive only and shows coverage from explicit
  metadata.
- The product has no governed asset-verification authority yet; an incidental
  legacy `verified` flag is ignored and the UI says verification is not
  informed.
- Future valuation timestamps and incomplete/missing dates do not establish a
  uniform valuation base; hidden-value mode suppresses institution identity,
  coverage, and valuation date.
- Income-source coverage is not proven by absent events. Existing paid,
  announced, estimated, and unknown distinctions remain authoritative.
- Visual/browser evidence, A11Y, and local release gates pass for this worktree.
  Remote CI and deployed Preview remain pending until an authorized commit and
  push. An internal independent adversarial review found and closed its
  findings; an external Hermes review was not run.

Do not infer the unresolved identity or income-source coverage. Any future
threshold, data-source authority, or financial semantic change requires its
own governed decision.
