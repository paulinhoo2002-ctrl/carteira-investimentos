# V273 — Reporting data quality and operational polish

## Status and scope

- Status: approved architecture implemented and locally certified; PR/remote CI/preview pending.
- Base: `origin/main` at `75e77a7e98ef0768a5d4a6855b684432f09493b4`.
- Branch: `feature/v273-reporting-data-quality-ops`.
- Product surface: existing legacy Reports page; no new route and no global redesign.
- Data contract: read-only, derived only from canonical application models passed as input.

## Problem

Reports combines current portfolio values and historical performance readiness, but its operational picture is fragmented. Existing sections do not consistently explain when evidence is absent, partial, stale, unscoped, or fixture-dependent. In particular, V76 snapshots and flows without `walletId` cannot be attributed to the active wallet. The reporting layer must expose that fact rather than imply performance readiness.

## Architecture

### Canonical aggregator

Add `portfolio-report-readiness.js` as a deterministic pure function. It accepts an explicit snapshot of already-derived evidence; it must not read globals, storage, network, current time, or mutate inputs. The caller owns adaptation from V271/V272/history, current price coverage/freshness, import capability/quality, income ledger coverage, and backup/restore validation when those values genuinely exist.

The result has a version, `readOnly: true`, `engineAvailable`, `dataReady`, sections, stable reason codes with human-readable descriptions, and evidence summaries. Section state communicates availability without an arbitrary aggregate score or fabricated severity. It contains no recommendation, raw financial rows, or invented timestamp/value. Missing input stays unknown/unavailable. Freshness and coverage remain separate dimensions.

### State vocabulary

Sections use `AVAILABLE`, `PARTIAL`, `UNAVAILABLE`, or `TRACKING_STARTED`. A section may be `AVAILABLE` only if its source contract explicitly supports that status. `PARTIAL` never upgrades to `AVAILABLE` from counts alone. `ENGINE_AVAILABLE` describes computation capability only; `DATA_READY` additionally requires all wallet-scoped history, flow, valuation, provenance, and coverage prerequisites. Missing wallet identity yields `WALLET_ID_UNAVAILABLE` and blocks real-wallet TWR/XIRR readiness.

Stable reasons include applicable existing V271/V272 requirements and `NO_HISTORY`, `PARTIAL_PRICE_COVERAGE`, `UNKNOWN_PRICE_COVERAGE`, `NO_TRUSTWORTHY_EXTERNAL_FLOWS`, `INSUFFICIENT_FLOW_PROVENANCE`, `WALLET_ID_UNAVAILABLE`, `IMPORT_SOURCE_INCOMPLETE`, `STALE_SOURCE`, and `SOURCE_FRESHNESS_UNKNOWN`. Human labels are a presentation mapping; business logic depends only on codes.

### Evidence inputs and boundaries

- History/performance: consume the existing V271/V272 readiness assessment and V248 engine capability. Never calculate a second TWR/XIRR engine here.
- Price coverage and freshness: consume separate explicit status fields. Do not derive freshness from coverage or use current wall-clock time in the pure aggregator.
- Cash flows: summarize the V272 canonical classifier/readiness outputs. Only wallet-scoped, HIGH-confidence trusted external flows count as trusted. Ambiguous/unscoped events remain diagnostic evidence, not external flows.
- Income/proventos: use observed ledger coverage/count/source/freshness only. An empty array does not prove zero received or zero missing-period activity.
- Import health: report known parser/capability states, including XP/BTG `FIXTURE_REQUIRED`, without claiming import completeness or triggering import actions.
- Backup/recovery: expose compatibility/warnings only when an explicit validation result is supplied. No “last backup” is shown unless an authoritative timestamp is supplied by an existing contract. No restore or write is invoked.
- Fixed income: preserve manual value authority, source-as-of versus financial-as-of, confidence, and unsupported exact IPCA valuation semantics; no valuation logic is added.

### Integration

Extend the existing `PortfolioReportModel` contract with the V273 readiness view, preserving existing fields for compatibility. The existing Reports surface renders a compact “Saúde dos dados” diagnostic section and reason-specific next requirements. Existing navigation, report exports, source authority, and interactions remain unchanged. No direct `localStorage`, Firebase, backup write, import confirmation, portfolio mutation, or tax mutation is allowed.

### Presentation

Use the established Reports hierarchy and visual tokens. Present descriptive states and evidence counts only; no aggregate grade/score. Keep explanations compact, disclose details progressively, and ensure mobile cards do not create horizontal overflow. Do not fabricate a “ready” all-sections state from sparse inputs.

## Acceptance criteria

1. Aggregator is pure, deterministic, read-only, defensive against malformed/missing inputs, and has no storage/network/time dependency.
2. `ENGINE_AVAILABLE` can be true while `DATA_READY` is false; missing wallet identity blocks wallet-scoped real TWR/XIRR and emits `WALLET_ID_UNAVAILABLE`.
3. `UNKNOWN != ZERO`, `PARTIAL != AVAILABLE`, and `STALE != FRESH`; no missing metric is rendered as numeric zero.
4. Coverage and freshness are independent. Missing freshness is unknown, not fresh.
5. Cash-flow readiness uses only canonical V272 trustworthy scoped external evidence; BUY/SELL/dividend/JCP/fee/tax do not become external flows.
6. Import, income, backup, recovery, and fixed-income statements are limited to explicitly supplied evidence; missing metadata stays unavailable/unknown.
7. Stable reason codes map to human-facing copy without business logic depending on the copy.
8. Existing Reports UI is enhanced in place, with no new route or broad redesign; the panel works at 390/430/768/1366/1440/1536/1920 with no horizontal overflow or critical clipping.
9. Accessibility checks report zero critical/serious findings; keyboard/focus and semantic status remain usable.
10. Focused tests, V271/V272/V248 regressions, required project suites, builds, QA, diff audit, exact-head CI and preview pass before merge-readiness; no merge is performed.
11. Financial and tax writes remain zero; no schema, persistence, import, Firebase, or backup-write behavior changes.

## Explicit non-goals

- No TWR/XIRR calculation-engine implementation or independent engine.
- No wallet-ID fabrication or persistence/schema migration.
- No historical interpolation or reconstruction.
- No purchase/sale recommendation, financial advice, or remediation action.
- No synthetic “last backup”, import-completion, provento-zero, freshness, or market value.
- No global visual redesign, new route, or changes to protected financial/persistence modules.

## Risk and invariant matrix

| Risk | Required invariant / mitigation |
|---|---|
| Engine capability mistaken for real readiness | Separate booleans; tests force engine=true/dataReady=false when prerequisites fail. |
| Unscoped V76 records attributed to selected wallet | Never infer identity; emit `WALLET_ID_UNAVAILABLE`; block real TWR/XIRR. |
| Missing numeric fields rendered as zero | Preserve null/unknown; test null and absent values. |
| Partial coverage or stale sources silently promoted | Independent status dimensions; explicit downgrade tests. |
| Import capability mistaken for actual import completeness | Report parser capability/fixture state only, not transaction coverage absent evidence. |
| Empty ledger interpreted as no income | Empty/unknown coverage remains unavailable unless source contract explicitly proves covered zero. |
| Backup UI implies backup exists | Only render supplied compatibility/metadata; never invent last-backup time. |
| Diagnostics accidentally mutate data | Pure modules and read-only UI tests; zero financial/tax writes. |
| Existing Reports regressions | Preserve model fields and add focused plus full suite regressions. |

## Review constraints

Hermes/NVIDIA, GLM-5.3 and Kimi K3 are unavailable in this session. Codex will perform a separately recorded code-review pass and visual-review pass; neither is represented as independent-model review.
