# Phase 4 Automation Foundation

Status: `FOUNDATION_READY_FOR_REVIEW`
Date: 2026-09-06

Phase 4A implementation status: `READ_ONLY_IMPORT_FOUNDATION_IMPLEMENTED`
`REAL_IMPORT_WRITE_ENABLED=false`

This document inventories the current automation surface without changing
financial semantics, persistence, schema, backup/import behavior, cloud sync or
frozen screens.

## Capability map

| Capability | Current state | Safe classification | Boundary |
| --- | --- | --- | --- |
| Market quotes | Yahoo endpoint is primary; optional Brapi fallback; `qInFlight`, quote source and update metadata exist | `PARTIALLY_AUTOMATED`, `SAFE_TO_AUTOMATE` for status/retry | No provider migration, silent overwrite or uncontrolled background fetch |
| Dividend history | Existing Yahoo/Brapi retrieval and normalization; duplicate checks exist for imported/generated items | `PARTIALLY_AUTOMATED`, `SAFE_TO_AUTOMATE` for warnings/preview | No automatic persistent insertion or invented dividend data |
| B3/broker imports | Local parsing, normalization, confidence, duplicate detection, preview and explicit confirmation before write | `ALREADY_AUTOMATED`, `SAFE_TO_AUTOMATE` for validation clarity | Parser must not guess unsupported formats; persistence remains explicit |
| Backup/export | Local JSON payload with version, metadata and `exportedAt`; download feedback exists | `ALREADY_AUTOMATED`, protected | Do not alter payload, schema, restore or rollback semantics |
| Backup/restore | Structural validation, version checks, preview, confirmation and transactional rollback exist | `ALREADY_AUTOMATED`, protected | No automatic restore, cloud backup or destructive shortcut |
| Firebase/cloud sync | Optional persistence path with queued/retry behavior and auth gate | `PARTIALLY_AUTOMATED`, protected | No conflict-policy, auth or sync redesign in this wave |
| localStorage | Current state/config persistence and test-mode isolation exist | `ALREADY_AUTOMATED`, protected | No new persistence path |
| IndexedDB | No supported product path found | `UNSUPPORTED`, protected | Do not introduce as a backup workaround |
| Offline/PWA | Service worker registration/update notification exists | `PARTIALLY_AUTOMATED`, protected | No cache or update-policy change |
| RF maturity | `rfIntelligenceSnapshot()`, `assetRfMaturityDate()` and `rfValues()` feed read-only overdue/soon/missing alerts | `ALREADY_AUTOMATED`, `SAFE_TO_AUTOMATE` for contextual navigation | No renewal, movement or investment recommendation |
| Alerts/events | Data-quality/audit snapshot exposes RF and data-quality findings; RF event ledger remains official | `ALREADY_AUTOMATED`, protected | No automatic event creation or repair |
| Duplicate detection | Exact identity/date/value and RF maturity/issuer checks exist in import flows | `ALREADY_AUTOMATED`, `SAFE_TO_AUTOMATE` for warnings | No approximate asset matching |
| Reconciliation/audit | Local data-quality snapshot and safe exact/context/general actions exist | `ALREADY_AUTOMATED`, read-only | No batch repair or silent mutation |
| IRPF import | Existing IRPF report/export and B3-oriented input support; no generic unsupported importer | `MANUAL`/`PARTIALLY_AUTOMATED` | Do not infer tax data or create a new parser by guessing |

## Daily manual work and opportunity ranking

| Rank | Work | Frequency | Effort/risk | Value | Safe next move |
| --- | --- | --- | --- | --- | --- |
| 1 | Refresh prices and inspect stale/partial results | Frequent | Low/medium | High | Make existing status/retry clearer, exact identity only |
| 2 | Review broker/B3 files before recording movements | Periodic | Medium/high | High | Improve read-only preview and validation messages |
| 3 | Review RF maturities | Monthly/near maturity | Low | High | Keep read-only alerts and route context |
| 4 | Enter dividends and review duplicates | Monthly | Medium | Medium/high | Strengthen duplicate warning without automatic write |
| 5 | Export a backup | Periodic | Low | Medium | Keep current explicit export; show age only when a real source exists |
| 6 | Transcribe IRPF information | Annual | High | Medium | Audit/document supported inputs; no guessed import |
| 7 | Edit asset metadata | Occasional | Medium | Medium | Preserve exact identity and official editor |

## Quote pipeline

- Source: Yahoo via `/api/yahoo-quote`; optional Brapi fallback where the
  existing token and flow permit it.
- Trigger: existing automatic/manual refresh path; manual refresh is guarded
  by `S.qInFlight`.
- Cache/state: official asset quote fields and `S.quotes`; source and update
  metadata are retained on the asset.
- Failure: toast/error path and per-symbol missing-price reporting; existing
  values are not silently replaced by guessed values.
- Offline/stale: last known official value remains visible with source/update
  metadata; no new quote is fabricated.
- Identity: ticker/symbol resolution is exact; approximate matching is banned.

Safe improvements for a later focused wave: explicit stale-age wording,
retry affordance using the existing provider, and partial-failure summary.

## Dividend and import gaps

- Dividend history can be retrieved through existing provider paths, but the
  product must keep explicit duplicate warnings and partial-failure feedback.
- Imported records already pass through parse/normalize/duplicate/preview and
  explicit confirmation before persistence.
- Highest-value future import is B3/broker statement because the repository
  already contains parsing and review infrastructure. Generic PDF/IRPF parsing
  remains unsupported unless a real format contract is supplied.
- Historical corrections remain user-confirmed; no automatic deletion or
  replacement is allowed.

## Backup, restore and sync safety

The backup payload includes version and export metadata, and restore validates
shape/version before the protected transaction. Rollback behavior is already
covered by PersistenceCore tests. There is no supported IndexedDB or cloud
backup product path. Automatic backup feasibility is therefore:

- reminder only: `SAFE_NOW` as read-only UI guidance;
- local snapshot: `NEEDS_PROTECTED_AUTHORIZATION`;
- IndexedDB copy: `NOT_RECOMMENDED` for this architecture;
- file export reminder: `SAFE_NOW` without changing export semantics;
- cloud backup: `NEEDS_PROTECTED_AUTHORIZATION`.

Firebase/Auth/sync/conflict handling remain protected and unchanged.

## Phase 4 waves

### Phase 4A — safe automation

Goal: clarify existing quote, RF maturity, duplicate and read-only navigation
signals. Risk: low if no provider, formula, persistence or frozen screen is
changed. Rollback: revert the focused UI/test commit.

### Phase 4B — imports

Goal: strengthen preview, validation and confidence messaging for supported
B3/broker inputs. Prerequisites: exact fixture contracts and explicit write
gate. Rollback: revert parser/preview changes; never bypass confirmation.

### Phase 4C — backup resilience

Goal: improve diagnostics around existing export/restore without changing the
payload or transaction. Prerequisites: protected safety review. Rollback:
revert UI-only diagnostics.

### Phase 4D — cloud sync

Goal: only after explicit authorization, clarify pending/success/conflict state.
Risk: high because Auth/Firebase/persistence are protected. Rollback: isolated
commit and provider-specific verification.

### Phase 4E — dividend automation

Goal: only after a real supported source and duplicate contract are approved.
Risk: high due historical semantics and persistent writes. Rollback: disable
the feature before any migration or automatic insertion.

## Durable safety contract

`NO_SILENT_FINANCIAL_WRITE=true`

`NO_AUTOMATIC_BUY_SELL=true`

`NO_APPROXIMATE_ASSET_MATCHING=true`

`IMPORT_REQUIRES_PREVIEW=true`

`PERSISTENT_CHANGE_REQUIRES_EXPLICIT_USER_ACTION=true`

`BACKGROUND_EXTERNAL_FETCH_REQUIRES_EXPLICIT_SCOPE=true`

`FROZEN_SCREENS_MUST_NOT_BE_REDESIGNED=true`

## Phase 4A read-only implementation

`import-foundation.js` now provides deterministic, pure helpers for exact
identity resolution, date/money/quantity normalization, source/event
fingerprints, duplicate classification and position reconciliation. It does
not parse files, mutate the portfolio, call external providers or persist
anything. The existing B3/broker parser remains the only product parser.

The reconciliation result is ephemeral and reports `MATCH` or
`QUANTITY_DIFFERENCE` with explicit identities; it never creates an expected
state in storage.

## Durable roadmap

| Wave | Goal | State |
| --- | --- | --- |
| 4A | Professional read-only import preview, exact identity and dedup foundation | `IMPLEMENTED_READ_ONLY` |
| 4B | Historic dividend preview and dedup | `PROTECTED_BACKLOG` |
| 4C | B3 movement reconstruction | `PROTECTED_BACKLOG` |
| 4D | Brokerage-note maturity and reconciliation | `PROTECTED_BACKLOG` |
| 4E | Current-position reconciliation | `PROTECTED_BACKLOG` |
| 4F | Protected write, snapshot and rollback | `AUTHORIZATION_REQUIRED` |
| 4G | Professional PDF/report exports | `BACKLOG` |
| 4H | Backup/cloud resilience | `AUTHORIZATION_REQUIRED` |

## Phase 4B historical B3 preview

`historical-import-preview.js` is the read-only orchestration layer for B3
income history, movement classification, custody snapshots, brokerage-note
cross-checks and import reconciliation. It reuses `import-foundation.js` for
exact identity and deterministic fingerprints; it does not parse private files,
write the portfolio, create assets, infer unsupported events or alter current
position data.

The preview separates `POSITION_TODAY`, `TRANSACTION_HISTORY`,
`INCOME_HISTORY`, `CUSTODY_HISTORY` and `CORPORATE_EVENTS`. Duplicate states,
unsupported rows, conflicts and review-required records remain visible in the
model. `WHAT_WILL_CHANGE=0` and `REAL_IMPORT_WRITE_ENABLED=false` are durable
contracts for this wave.

`IMPORT_REPORT_MODEL=READY` is an ephemeral reconciliation report foundation;
PDF export remains a readiness matrix only and is not enabled by this phase.

## Phase 4C historical reconstruction

`historical-reconstruction.js` composes only read-only models from the Phase 4A
identity/fingerprint engine and the Phase 4B preview layer. It keeps current
position, transaction, income, custody, corporate-event and audit domains
separate. Only verified BUY/SELL events contribute to the analytical expected
position; transfers, lending, unknown events, unsupported corporate events and
unconfirmed subscriptions have zero position impact.

Three-way comparison (`expected history` vs `B3 custody snapshot` vs `app
position`) exposes explicit statuses and human-readable review causes. No
conflict is silently resolved and no current quantity, average price, target or
metadata is replaced.

## Phase 4D professional brokerage and reporting foundation

`brokerage-professional.js` provides a canonical read-only note model,
operation-level identity, note/content idempotency, note-level fee safety,
financial cross-checks, position protection, cross-source event graph,
severity-aware review, professional summaries and report contracts. Inter is
the tested supported brokerage-note format; B3 is partial and other brokers
remain explicitly unknown until validated.

PDF remains a human-readable report, CSV/XLSX remains analysis/export and JSON
remains technical backup. The recommended implementation is existing
HTML/CSS print layout plus browser-native PDF; no heavy dependency or write path
was introduced.

## Phase 4E protected import transaction foundation

`protected-import-transaction.js` is an isolated, in-memory coordinator for
test fixtures only. It provides an immutable preview plan, explicit confirmation,
stale-state protection, targeted snapshots, snapshot validation, exact
pre-write deduplication, idempotent session/source handling, failure injection,
targeted rollback and post-write reconciliation. It never opens localStorage,
Firebase, backup storage or a real user profile.

The coordinator protects current position and average price by design:
`AUTO_ASSET_CREATION=false`, `CURRENT_POSITION_AUTO_OVERWRITE=false` and
`AVG_PRICE_AUTO_RECALC=false`. RF interest and coupon events can be represented
as passive-income candidates only when explicitly classified; principal,
redemption, maturity, application, transfer and ambiguous events are excluded.

Import audit records retain source fingerprints, snapshot identity, duplicate
counts, write counts, reconciliation and rollback status. The printable report
foundation is HTML/CSS with native browser print/PDF support; no PDF dependency
or persistent write path was introduced.

Durable boundary: `REAL_USER_IMPORT_AUTHORIZED=false`,
`REAL_IMPORT_WRITE_ENABLED=false`, `NO_PARTIAL_SILENT_SUCCESS=true`,
`INVALID_SNAPSHOT_BLOCKS_WRITE=true`, `PRIVATE_DATA_IN_FIXTURES=0`.

## Phase 4F protected integration and dry-run

`protected-import-pipeline.js` composes the Phase 4A--4E modules into one
fixture-only flow: deterministic source detection, parser selection, exact
identity, cross-source economic deduplication, preview/change plan, isolated
state execution, post-write reconciliation, targeted rollback and printable
report output. It does not add a second identity, finance, reconciliation or
persistence engine.

Supported source classification is deliberately conservative:

- B3 position XLSX: `FULLY_SUPPORTED` for dry-run reconciliation;
- B3 dividends XLSX: `FULLY_SUPPORTED` for dry-run preview;
- B3 movements XLSX: `PARTIALLY_SUPPORTED` because corporate/unknown events
  remain review-only;
- brokerage-note PDF: `PARTIALLY_SUPPORTED` through sanitized structured note
  fixtures; arbitrary PDF extraction is not claimed;
- unknown formats: `REVIEW_REQUIRED`, never silently reassigned.

`REAL_USER_IMPORT_AUTHORIZED=false` remains absolute. The import history,
review and report models are ephemeral; no new user schema or frozen-screen UI
was introduced. A future pilot must be small, manually verifiable, free of
identity conflicts and unresolved corporate/unknown events, with a user backup
and explicit approval before any production write design is considered.

## Phase 4G professional import center and reporting

Phase 4G adds an isolated `Importar dados` route over the existing Phase 4A--4F
foundations. The route is a test-mode/ephemeral review center: it accepts file
metadata, shows conservative source detection, exposes the simulation steps and
reports zero writes, preserved position and tested rollback. It intentionally
uses `Executar simulação`, never an import action, while
`REAL_USER_IMPORT_ENABLED=false` remains absolute.

The supported-source contract is explicit rather than optimistic: B3 position
and B3 dividends are fully supported by the dry-run pipeline; B3 movements and
brokerage-note PDFs remain partial/review-only where the existing parser cannot
prove the event. Unknown formats are never reassigned. Insufficient evidence
for fixed-income or corporate events stays in manual review and is never
classified as income automatically.

The center surfaces duplicate/conflict counts, position/income reconciliation
status, snapshot/rollback evidence and an ephemeral simulation history. The
existing HTML/CSS and browser-native print foundation remains the reporting
boundary; no PDF dependency, persistent import history, real portfolio write or
new financial engine was introduced. A future real pilot still requires a
separate protected authorization, sanitized fixtures, backup proof and a
manual reconciliation gate.

## Phase 4H first real pilot preparation (2026-09-06)

Phase 4H defines a read-only readiness contract for a future small pilot using
one calendar month of `B3_DIVIDENDS_XLSX`. No live file was selected and no
real import was executed. The first pilot accepts only explicit
`EQUITY_DIVIDEND`, `JCP` and `FII_INCOME`; fixed-income interest/coupon remains
excluded unless explicitly classified in a later authorized scope. Principal,
application, transfer, redemption, maturity, ambiguous amortization, unknown
and unresolved corporate events block the pilot.

The required manual review row is date, exact asset identity, income type,
gross amount, source, existing match, duplicate state and proposed action.
Existing import preview/identity engines remain authoritative; the Phase 4H
module only evaluates readiness and produces an audit contract. Position and
average price impact are required to be zero. The targeted snapshot covers the
income/dividend ledger, import-audit metadata and exact asset identities, while
positions, average prices, targets and real user data are excluded.

The future sequence is backup, backup validation, targeted snapshot, snapshot
validation, read-only preview, manual review, two explicit confirmations,
protected write, post-write reconciliation, same-file reimport and rollback
verification. Same-file reimport must yield zero new records, all exact
duplicates and zero financial-total change. `CAN_EXECUTE_REAL_PILOT_WRITE`
remains hard-disabled in Phase 4H and requires explicit authorization plus all
readiness checks before a future phase may consider opening it.

## Phase 4H.8 additive source linkage test-mode (2026-09-06)

Phase 4H.8 is complete in an isolated test-mode layer. The model adds
deterministic canonical income event IDs and source evidence while preserving
all legacy provento fields and readers. It proves one canonical financial
amount for multiple evidences, B3 payment-date/amount preference, Yahoo-only
history preservation, backup roundtrip compatibility, idempotent insertion
and rollback to the legacy snapshot.

The August financial interpretation is fixed: `R$ 2.488,47` is already
represented value, `R$ 85,37` is the only new canonical increment, and
`R$ 60,52` remains ETF review. Never label the linked value as a financial
increment. No production UI, persistence, schema, sync or real pilot write is
enabled.

`df9daa3` remains unchanged and is recorded as a partial H8 commit because it
registered the H8 test in `package.json` while the implementation and test
were still untracked. Its inaccurate historical Phase 4H.7 message is not
rewritten.

## Phase 4H.7 canonical income source linkage shadow (2026-09-06)

The canonical income policy is `ONE_ECONOMIC_INCOME_EVENT`: B3 payment data
is the financial evidence of record and Yahoo is reference evidence. The
current ledger audit found 329 B3-origin records and 99 Yahoo-origin records;
the existing Dividendos totals currently include both groups, so a future
migration must link evidence before changing totals.

The shadow proof in `tests/phase-4h7-shadow-source-linkage.test.js` is
ephemeral, sanitized and read-only. It requires exact asset identity and
cent-normalized value, preserves repeated monthly events, blocks ambiguous
one-to-many/many-to-one matches, and never promotes an unknown Yahoo date
semantic to an exact economic link. That historical synthetic shadow produced
21 candidate pairs, but V39 proved that KNUQ11 has no independent immutable
identity. The executable contract therefore has 20 links, one visible KNUQ11
deferred no-op and TEPP11 as a B3-only candidate.

Durable linkage is not implemented. A future additive model may carry a
canonical event id and source-evidence metadata, but schema/persistence
changes, migration preview, manual review, reconciliation and rollback need a
separate authorization. Existing Yahoo rows must be preserved and source
evidence must never be counted as extra income.
