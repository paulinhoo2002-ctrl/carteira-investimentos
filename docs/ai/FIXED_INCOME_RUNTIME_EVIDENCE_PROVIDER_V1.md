# Fixed income runtime evidence provider V1

The provider reads only the authenticated portfolio state already held in `S`. It does not fetch, persist, repair, or write financial history. The legacy Renda Fixa values and dashboard formulas remain unchanged.

## Runtime sources and proof limits

| Source | Runtime shape | Owner/auth scope | Period coverage | Opening position | Duplicate proof |
|---|---|---|---|---|---|
| Current RF positions | `S.assets`, valued by `rfValues()` and `assetRfCurrentValueMeta()` | Active portfolio after `FB.user`, `FB.access.allowed`, and cloud load checks | Current snapshot only; not a historical period | Cannot prove when a holding began | Asset identity can be ambiguous when stable IDs are absent |
| RF ledger | `S.rfEvents`, normalized from the active wallet's `rfEvents` | Same active authenticated portfolio | No manifest or completeness interval is retained | A migration baseline explicitly marks opening position unknown | Loader removes duplicate fingerprints and may generate IDs, so the normalized list cannot certify source-level duplicate resolution |
| Legacy contributions | `S.aportes` | Same active authenticated portfolio | No complete RF-specific period manifest | Can include historical purchases without a safe link to RF ledger events | Cross-source overlap with `S.rfEvents` cannot be resolved from equal amounts alone |
| Linked income mirrors | `S.proventos` rows with `sourceEventKind: 'rf'` | Same active authenticated portfolio | Not a complete cash-history source | Not applicable | Mirrors are not aggregated as a second receipt; orphan or repeated links block completeness |

The RF event normalizer currently defaults missing amount fields to numeric zero, supplies an `outro` type, and generates IDs when missing. It also removes rows with matching fingerprints before the provider receives them. It does not retain explicit paid/received status. The provider therefore treats normalized history as partial: generated IDs, absent status, unresolved source completeness, and absent period proof cannot be promoted to certified evidence.

## Evidence rules

- Only exact product names `Trend DI FIC RF Simples RL` and `Trend DI II FIC RF Simples RL` with RF asset type are eligible.
- Event type comes only from the explicit type field; missing or unsupported types remain `UNKNOWN`.
- Contributions require confirmed status, stable ID, date, and known amount. Receipts require received status and an explicit gross/net basis. Taxes require paid status, a known amount, and a linked receipt.
- Redemptions and amortizations remain capital-return events. They are never counted as income.
- A complete history requires an explicit valid period, all events represented, resolved duplicates, and usable contributions. Opening state may be `NONE`, or `KNOWN` only with a provenance-backed position snapshot that has stable source/asset identity, authority, positive quantity and unit, a date before the covered period, and an explicit compatibility assertion. Unknown or incompatible opening state stays partial. The production call currently supplies no such history manifest, so runtime totals remain conservative.
- No current runtime field is trusted as remaining cost basis. `valor aplicado` is not reinterpreted as remaining cost basis.
- MOVIDA and CRA are unsupported by this Trend-only provider and retain their existing partial UI state.

## Provenance and historical coverage layer

`financial-evidence-provenance.js` records source/event identity and explicit authority, date, amount basis, duplicate/conflict state, and period membership without copying amounts into a second registry. Every in-period event needs an explicit `IN_PERIOD` result with a date and record interval matching the aggregate history interval. The coverage engine also requires every relevant row to match the exact asset identity being evaluated. `historical-coverage-engine.js` evaluates each component independently and marks history `COMPLETE` only with a valid explicit period, `NONE` or provenance-backed compatible `KNOWN` opening state, complete contributions, all-events proof, resolved duplicates and source overlap, and complete event provenance. The economic-result engine remains stricter: it does not derive total economic result when an opening position is `KNOWN`, because opening capital is not yet modeled in its equation. The runtime call has no history manifest, so both Trend products remain `PARTIAL`; a current-position observation does not promote historical coverage. `S.aportes` rows without a stable link to `S.rfEvents` remain an unresolved overlap and are not deduplicated.

Synthetic unit tests may supply a proof manifest to test the engine adapter. That manifest is not a production source and contains no personal account data.
