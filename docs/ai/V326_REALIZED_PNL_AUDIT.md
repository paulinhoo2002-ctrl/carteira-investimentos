# V326 Realized P&L audit

Status: audit and synthetic fail-closed boundary corrections; no financial
return formula or persisted financial state changed.

## Existing metric contracts at the audited base

| Surface | Current evidence-backed calculation | Coverage / denominator |
| --- | --- | --- |
| Listed-asset applied capital | `qty × avg_price` (`finance-core.js`) | Current holding only; not cumulative external contributions |
| Listed-asset market value | `qty × current_price` (`finance-core.js`) | Requires quantity and quote |
| RF applied/current value | Explicit RF fields and established priority rules (`rfValues`) | Manual and source authority are preserved |
| Open result | Complete current market value minus complete current applied capital (`performance-intelligence.js`) | Suppressed unless every asset row is complete |
| Cash flow | Contributions minus withdrawals (`performance-intelligence.js`) | Separate from current holdings |
| Received income | Paid income ledger only (`performance-intelligence.js`) | Announced/projected income excluded |
| Explicit realized result | Sum of supplied sale result fields (`performance-intelligence.js`) | Missing explicit result remains unavailable |
| Tax-oriented realized gain | Net sale proceeds minus allocated weighted-average cost (`tax-cost-basis-intelligence.js`) | Requires transaction history; missing fees/source lower status |
| Pure asset total return | Realized capital gain + (current value − cost basis) + received income (`portfolio-performance.js`) | Percent denominator is `costBasis`; closed-position interpretation is unresolved |
| Historical TWR/XIRR | Dated valuations and external cash flows (`portfolio-performance.js`) | Insufficient or missing data fails closed |

## Supported sale and cost-basis behavior

- Known buy fees are added to acquisition basis; known sale fees reduce net
  proceeds. Unknown fees are not inferred.
- Weighted-average basis supports the audited simple BUY/SELL path. Transfers,
  corporate events, unsupported asset classes, and tax due remain review-only
  or unavailable.
- Sale entry validates quantity against the current holding. The derived tax
  engine also rejects an over-sale as a usable realized gain and emits
  `SELL_EXCEEDS_AVAILABLE_QUANTITY` with `NEEDS_REVIEW`; its transaction row is
  also marked `PARTIAL`, with confidence below `HIGH`.
- Quantity replay uses exact decimal coefficients and scales derived from the
  normalized numeric input. Fractional quantity comparisons use no arbitrary
  epsilon; currency and weighted-cost formulas are unchanged.
- The engine is derived/read-only. This audit did not change persistence,
  imports, sale writers, or `index.html`.

## Unresolved semantics and evidence gates

1. Define whether `costBasis` in `PortfolioPerformance.assetReturn` means the
   original invested basis or remaining open-position basis. The current
   closed-position test produces a negative total return by subtracting the
   full basis after current value reaches zero, while separately adding realized
   gain. Do not change this formula until sale proceeds, remaining basis, and
   portfolio cash treatment are specified without double counting.
2. Define whether total return includes received income and how that income is
   attributed across partial/full sales and closed positions.
3. Define accepted source fields for taxes/withholding versus broker fees.
   Existing code does not prove tax treatment in the realized-gain calculation.
4. Historical return percentages require a governed denominator and aligned
   valuation/cash-flow coverage. Current-price snapshots are not a substitute
   for dated history.
5. A position quantity conflict cannot be resolved from code or synthetic
   fixtures. It requires an explicitly authorized structured source statement
   and a matching, privacy-safe comparison; do not infer missing quantities.

Required future synthetic regressions include partial/full/multiple buys and
sales, exact and excess quantity, missing basis, missing fees, known fee fields,
corrections, transfers, corporate events, and reopened positions. Tax, fees, and event semantics remain `REVIEW_REQUIRED`
until source evidence or an explicit product decision establishes them.

## Validation recorded

- Focused V326 gates: 38/38 PASS across tax cost basis, asset detail, and V259
  historical reconstruction tests.
- Final `verify:release`: PASS after the review corrections. It includes legacy,
  modern, both builds, `qa:all`, seven-width smoke, and V289 visual/axe (4/4).
  Final `git diff --check`: PASS.
- No real account, personal source file, or portfolio values were inspected.
- `REAL_WRITES=0`; `REAL_IMPORT=false`; `REAL_RESTORE=false`.

## Independent review follow-up (2026-10-06)

Adversarial review findings were reproduced and closed with synthetic tests:

- A sale after an over-sale or other accumulated position uncertainty remains
  `NEEDS_REVIEW`; no realized amount is emitted from an uncertain basis.
- Missing/unknown asset type remains `UNKNOWN` and is routed to review rather
  than inferred as `Ação`.
- Internal exact-quantity `BigInt` metadata is removed from public unsupported
  rows; the full result is JSON serializable.
- Duplicate transaction IDs are quarantined together, not counted twice, and
  keep the aggregate cost-basis status `PARTIAL`.

The remaining financial decision is the product definition of total return for
closed positions, treatment of realized proceeds and received income, and the
appropriate denominator. No formula is changed pending that decision. Currency
basis/realized calculations remain `Number`; quantity comparisons alone use
exact decimal parsing. Corrections, transfer/reopen behavior and full import
source idempotency are not claimed as certified by these tests.

Additional fail-closed cases from the second independent review:

- Unknown transaction operations are retained as unsupported, make realized
  coverage partial, and invalidate current quantity/cost-basis state for the
  affected position instead of silently disappearing.
- Whitespace-only fees normalize to missing; a zero fee is accepted only when
  explicitly supplied as numeric or numeric text.
- A buy after an unknown operation inherits the affected position's review
  state; its running quantity/cost and row coverage cannot claim `COMPLETE`.
