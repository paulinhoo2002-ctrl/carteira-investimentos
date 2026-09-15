# Product Contracts

## Phase 4 automation safety contract (2026-09-06)

- `NO_SILENT_FINANCIAL_WRITE=true`
- `NO_AUTOMATIC_BUY_SELL=true`
- `NO_APPROXIMATE_ASSET_MATCHING=true`
- `IMPORT_REQUIRES_PREVIEW=true`
- `PERSISTENT_CHANGE_REQUIRES_EXPLICIT_USER_ACTION=true`
- `BACKGROUND_EXTERNAL_FETCH_REQUIRES_EXPLICIT_SCOPE=true`
- `FROZEN_SCREENS_MUST_NOT_BE_REDESIGNED=true`

Existing automation may be clarified only through supported sources and
reversible, focused changes. Finance Core, Persistence Core, schema,
backup/import semantics, Firebase/Auth and real data remain protected.

## Personal zero-recurring-cost contract (2026-09-12)

- `NORMAL_OPERATION_RECURRING_COST=ZERO_WHEN_TECHNICALLY_POSSIBLE`
- `PAID_B3_API_REQUIRED=false`
- `PAID_MARKET_DATA_REQUIRED=false`
- `PAID_AI_VALIDATION_REQUIRED=false`
- `UNNECESSARY_PAID_SAAS_ALLOWED=false`
- `PAID_DATABASE_REQUIRED=false` while the approved free tier remains adequate.
- `PAID_HOSTING_REQUIRED=false` without explicit authorization.

Data-source priority is: existing user data; manual broker/B3 exports; approved
free sources; local processing; cache/local persistence; public free sources
when genuinely necessary. No paid source or recurring service may become a
normal operating requirement without a separate explicit decision.

## Project Skills and governance contract (V1)

- `SKILL_DISCOVERY_REQUIRED=true` para missões substanciais.
- `TOKEN_ECONOMY_REQUIRED=true`, sem comprimir valores, datas, IDs, hashes,
  proveniência ou estado de autorização.
- Skills são orientação de processo; não autorizam escrita financeira, cloud,
  recovery, mudança de schema, deploy ou alteração de áreas protegidas.
- O conhecimento operacional deve permanecer nos documentos versionados; o
  histórico de chat é apenas suplementar.

## Phase 4E protected write design contract (2026-09-06)

- `REAL_USER_IMPORT_AUTHORIZED=false`
- `REAL_IMPORT_WRITE_ENABLED=false`
- `WRITE_ENGINE_MODE=TEST_FIXTURE_ONLY`
- `IMPORT_REQUIRES_IMMUTABLE_PREVIEW=true`
- `IMPORT_REQUIRES_EXPLICIT_CONFIRMATION=true`
- `STALE_PREVIEW_BLOCKED=true`
- `SNAPSHOT_VALIDATED_BEFORE_WRITE=true`
- `PRE_WRITE_DEDUP_REVALIDATION=true`
- `IDEMPOTENT_IMPORT_SESSION=true`
- `NO_PARTIAL_SILENT_SUCCESS=true`
- `ROLLBACK_IS_TARGETED_AND_IDEMPOTENT=true`
- `UNRELATED_DATA_MUST_SURVIVE_ROLLBACK=true`
- `CURRENT_POSITION_AUTO_OVERWRITE=false`
- `AVG_PRICE_AUTO_RECALC=false`
- `AUTO_ASSET_CREATION=false`
- `PRINCIPAL_COUNTED_AS_INCOME=0`
- `AMBIGUOUS_RF_EVENT_AUTO_INCLUDED=0`

The Phase 4E coordinator is deliberately outside `persistence-core.js` and
operates only on explicit in-memory fixtures. Readiness for a real user import
requires a separate protected authorization and an independent production
write review.

## Phase 4F dry-run integration contract (2026-09-06)

- `SINGLE_IMPORT_PIPELINE=true`
- `SINGLE_IDENTITY_ENGINE=true`
- `SINGLE_DEDUP_ENGINE=true`
- `SINGLE_RECONCILIATION_ENGINE=true`
- `SINGLE_WRITE_COORDINATOR=true`
- `DRY_RUN_TARGET_ISOLATED=true`
- `SOURCE_STATE_UNCHANGED=true`
- `SAME_ECONOMIC_EVENT_COUNTED_ONCE=true`
- `WRONG_ASSET_LINK=0`
- `REAL_COORDINATOR_EXERCISED=true`
- `IMPORT_REVIEW_UI=NOT_IMPLEMENTED_IN_THIS_WAVE`
- `REAL_USER_IMPORT_ENABLED=false`

The Phase 4F pipeline may produce preview, change-plan, reconciliation and
printable report evidence from sanitized fixtures only. It must not be used as
evidence that a real portfolio import is safe without a new protected gate.

## Phase 4G professional import center contract (2026-09-06)

- `REAL_USER_IMPORT_ENABLED=false`
- `IMPORT_CENTER_ISOLATED=true`
- `IMPORT_UI_MODE=EPHEMERAL_TESTMODE`
- `IMPORT_ACTION_LABEL=EXECUTAR_SIMULACAO`
- `UNKNOWN_FORMAT_REQUIRES_REVIEW=true`
- `DUPLICATE_AND_CONFLICT_COUNTS_VISIBLE=true`
- `POSITION_RECONCILIATION_VISIBLE=true`
- `INCOME_RECONCILIATION_VISIBLE=true`
- `ROLLBACK_EVIDENCE_VISIBLE=true`
- `IMPORT_HISTORY_PERSISTED=false`
- `REPORT_BOUNDARY=HTML_NATIVE_PRINT`
- `PDF_DEPENDENCY_REQUIRED=false`
- `NO_APPROXIMATE_ASSET_MATCHING=true`
- `RF_DATA_GAP_REQUIRES_MANUAL_REVIEW=true`
- `CORPORATE_EVENT_DATA_GAP_REQUIRES_MANUAL_REVIEW=true`

The route reuses the existing Phase 4 pipeline contract and is not a second
financial, identity, deduplication or persistence engine. Metadata and review
results live only in the current in-memory session. Even a fully supported
source produces a dry-run result with zero writes; partial, unknown or
insufficiently evidenced events remain explicitly review-only.

## Phase 4G.2 import center visual canon (2026-09-06)

- `IMPORT_CENTER_VISUAL=FROZEN`
- `IMPORT_CENTER_INFORMATION_CONTRACT=FROZEN`
- `IMPORT_CENTER_DRY_RUN_INTERACTION=FROZEN`
- `MOBILE_STEPPER_CURRENT_STEP_ALWAYS_VISIBLE=true`
- `MOBILE_STEPPER_CLIPPING=0`
- `IMPORT_PRIMARY_CTA_GLOW=NONE`
- `EMPTY_SESSION_PANEL_COMPACT=true`
- `POSITION_PRESERVED_VISIBLE=true`
- `DRY_RUN_WRITES_VISIBLE=0`
- `SNAPSHOT_AND_ROLLBACK_STATUS_VISIBLE=true`

Desktop retains all eight simulation steps. Mobile uses the equivalent compact
`Etapa N de 8` representation with the active step label, avoiding a long
horizontal strip. The safe result keeps position preserved, zero writes,
validated snapshot and tested rollback immediately scannable without creating a
second financial state or persistence path.

Future changes to this route are limited to bug fixes, regressions, financial or
data correctness and explicit user authorization.

## Phase 4B historical import preview contract (2026-09-06)

- `REAL_IMPORT_WRITE_ENABLED=false`
- `CURRENT_POSITION_IS_CANONICAL=true`
- `NO_SILENT_FINANCIAL_WRITE=true`
- `NO_APPROXIMATE_MATCHING=true`
- `NO_AUTOMATIC_ASSET_CREATION=true`
- `NO_UNKNOWN_EVENT_WRITE=true`
- `IMPORT_PREVIEW_BEFORE_WRITE=true`
- Historical domains remain separated: today position, transaction history,
  income history, custody history and corporate events.
- B3 position files are custody snapshots only; they cannot redefine quantity,
  average price, target allocation or asset metadata.
- Historical reconstruction separates current position, transaction history,
  income history, custody history, corporate events and import audit.
- Only verified BUY/SELL events may contribute to an expected-position model;
  unverified event position impact is zero and all divergences remain review
  only.
- Brokerage-note fees remain at note level unless an existing canonical
  allocation contract exists; invented per-operation fee allocation is
  forbidden.
- B3 and app positions never auto-overwrite one another, and average price is
  never recalculated by reconciliation.
- PDF is a human-readable report, CSV/XLSX is analysis/export and JSON is
  technical backup.

## Phase 3 lifelong usability findings (2026-09-06)

- Critical mobile actions measured at or above 44 px in the audited routes and
  widths. Auxiliary chart/metadata labels are not a reason for blanket sizing.
- Interactive series expose keyboard-focusable points and readable
  labels/tooltips; screens without a supported series use an explicit list or
  empty state instead of invented history.
- The UI may warn that backup export age cannot be confirmed, but must not infer
  or fabricate a timestamp. Backup age remains protected backlog.
- Synthetic render timings are monitoring evidence only, not a new financial or
  persistence behavior and not sufficient alone to justify virtualization.

## Core rule

The UI consumes canonical values. It does not recalculate, approximate or
duplicate the financial engine. A visual change may alter composition, spacing,
labels and disclosure, but not the meaning or source of a value.

## Financial sources

| Concern | Canonical source/path | UI rule |
|---|---|---|
| Portfolio/patrimony | `patrimonySnapshot()` and official aggregate helpers in `index.html` | Do not rebuild totals in markup |
| Invested/current/result | `assetAppliedValue()`, `assetCurrentValue()`, `assetAnalysisRows()` and FinanceCore paths | Preserve sign, zero and missing semantics |
| Asset return | `assetRentabPct()` / official asset analysis rows | Do not derive a second percentage |
| Fixed income | `rfValues()`, `rfIntelligenceSnapshot()`, `rfEvents` and official RF handlers | Preserve identity, event and maturity contracts |
| Dividends | `proventoStats()` and official dividend/history builders | Preserve type filters, history and links |
| Goals | `passiveIncomeGoalStats()`, goal helpers and `metasTab()` | No invented targets or metrics |
| Contributions | Aportes state, movement contracts and official summary helpers | Preserve session mode and movement meaning |
| Returns/benchmarks | `rentabilidadeTab()` and official benchmark paths | No parallel contribution or benchmark calculation |

## Identity and actions

- Asset identity is stable `asset.id` where available.
- A unique ticker is not a substitute for an ambiguous or stale ID.
- `go()` is the canonical route mechanism; `edA(id)` and existing RF editors are
  canonical action handlers.
- Related routes must use the accepted current contract, including
  `renda-fixa` rather than the historical alias `rendaFixa`.

## Persistence and data

- `persistence-core.js` owns serialization and storage boundaries.
- Default legacy keys are `civ5` and `civ5_cfg`; theme is `carteira_theme`.
- Firebase, localStorage, backups, imports and migration compatibility are
  protected contracts.
- `testMode` is deterministic in-memory behavior, not proof of production
  persistence.
- Never mix fixture data with real user data or silently repair records in UI.

## Feature preservation matrix

| Area | Must preserve |
|---|---|
| Ativos | buy/sell, edit, expand, search/filter, result sign and asset identity |
| Renda Fixa | events, maturity, applied/current/result, edit/redemption flows |
| Dividendos | official types, history, review queue, RF links, filters and actions |
| Aportes | movement contracts, official summaries and session mode behavior |
| Metas | goal values, progress, dates and contribution actions |
| Rentabilidade | datasets, order, scale, benchmarks and contextual asset actions |
| Rebalancear | drift sign, target and canonical contribution priority |
| Auditoria | findings, severity, selectors, filters and review actions |
| Reports | readonly contracts, exports, session context and asset rows |

## Safe visual scope

Allowed without a financial phase: CSS, layout, typography, spacing, semantic
labels, accessible focus, responsive disclosure and rendering of existing
values. Not allowed: new formulas, inferred identities, new persistence,
schema changes, write handlers, or changes to zero-versus-absence behavior.

## Ativos canonical information and action contract

The Ativos rich experience is frozen. Any future visual refactor must preserve
the following fields in expanded desktop variable-asset rows:

- Ticker, Tipo, Setor, Qtd, PM, Atual;
- Resultado R$, Resultado %, Rentab., Alvo and Valor total;
- % carteira, % ideal, Div. est./mês and DY;
- Comprar, Vender and Mais/Editar.

The action contract requires explicit `asset.id` identity. Editing must keep
sector, target price, `ideal_pct` and all other existing asset fields. Matching
an asset approximately by label or ticker is not allowed:
`APPROXIMATE_ASSET_MATCHING=false`.

Result presentation is semantic and preserves the distinction between
accumulated portfolio result and daily quote variation: positive is green,
negative is red, zero is neutral and missing is `—`.

Grouped Ativos retains a rich Renda Fixa overview with title, type/indexer,
application, maturity, applied/current value, result, rentability, portfolio
share and Movimentar/Resgatar/Mais. Full RF management remains exclusively on
the dedicated `renda-fixa` route:
`RF_DEDICATED_ROUTE=true`, `RF_RICH_OVERVIEW_IN_ASSETS=true`,
`RF_FULL_MANAGEMENT_IN_ASSETS=false`.

Mobile is a progressive disclosure contract, not a reduced data contract. Rich
cards preserve ticker, name, value, result, result %, quantity, PM, current,
share, sector, target, ideal %, dividend/month, DY and Comprar/Vender/Editar.

## Phase 4H real pilot readiness contract (2026-09-06)

`REAL_PILOT_SOURCE=B3_DIVIDENDS_XLSX` and the recommended first pilot is one
calendar month selected only after a real export is inspected. The allowed
first-pilot income types are `EQUITY_DIVIDEND`, `JCP` and `FII_INCOME`.
Explicit RF interest/coupon can be classified read-only, but RF is excluded
from the first pilot. Principal, amortization without explicit evidence,
redemption, maturity, application, transfer, unknown and unresolved corporate
events never enter automatically.

`REAL_PILOT_WRITE_ENABLED=false`, `REAL_USER_DATA_WRITE=false` and
`CAN_EXECUTE_REAL_PILOT_WRITE=false` are hard contracts for Phase 4H. A future
gate also requires exact identities, no possible duplicates or identity
conflicts, no unsupported rows, valid backup and targeted snapshot, stale=false,
manual review complete, zero position/average-price impact and explicit user
authorization. The pilot snapshot is limited to income/dividend ledger,
import-audit metadata and exact asset identities; positions and average prices
must remain unchanged.

The confirmation contract must state additions, ignored exact duplicates,
conflicts, pending review, zero position impact, zero average-price impact,
validated snapshot and rollback availability. Same-file reimport must produce
zero new records, all exact duplicates and zero financial-total change.

## Phase 4I August KNUQ evidence contract (2026-09-12)

- `AUGUST_PROVIDER_VERSION=phase4i-august-provider-v2`
- `AUGUST_SOURCE_ACCOUNTING=20_LINKED+1_NEW+2_EXCLUDED+1_DEFERRED_AMBIGUOUS`
- `AUGUST_SOURCE_ROWS_TOTAL=24`
- `KNUQ_POLICY=DEFERRED_AMBIGUOUS_NO_OP`
- `KNUQ_MUTATION_COUNT=0`
- `KNUQ_FINANCIAL_DELTA_CENTS=0`
- `KNUQ_UNIQUE_LINK_PROVEN=false`

The historical 21-link expectation originated in a synthetic fixture and is
not a financial source-of-truth. KNUQ11 source `2026-08-12 / 8970 cents` must
not link to the Yahoo candidate `2026-08-03 / 8964 cents` using ticker, date
proximity or amount proximity. It remains explicitly visible and unresolved.
A later resolution requires independent identity evidence such as a matching
provider/corporate-action ID or an immutable documented mapping. The defer is
allowed only while it remains outside every mutation, persistence and financial
delta path and while TEPP11 remains independently executable.

## V49 local/cloud authority and zero-cost contract

- `ZERO_RECURRING_COST_BY_DEFAULT=true`: local files, user-provided exports and
  already-approved free sources remain preferred; paid B3, market-data, banking,
  AI, SaaS, database or hosting services are not runtime requirements.
- Protected local writes store `civ5_authority` as schema 2 with canonical
  SHA-256 fingerprints (64 lowercase hex characters) only. Local and cloud use
  the same six-field canonicalization (`wallets`, `assets`, `aportes`,
  `proventos`, `rfEvents`, `goals`). Raw portfolio JSON is never marker data.
- A valid marker keeps local authoritative when cloud matches its base hash;
  changed cloud is `CONFLICT`, and malformed/legacy markers fail closed.
- Canonical QA identity: `%LOCALAPPDATA%\\CarteiraInvestimentos\\qa-browser-authenticated`,
  profile `Default`, origin `http://127.0.0.1:4173`, CDP `9233`.

### Recovery authorization stages (V49B)

- PREAUTH proves the current prestate, cloud base, trusted source, target and
  plan hashes, rollback source, marker serialization, profile/origin identity,
  failure matrix and disposable full-process restart durability. It must not
  require the real target or marker to exist before authorization.
- POSTWRITE is mandatory after the one authorized local restore: immediate
  target/marker readback, storage flush, graceful `Browser.close`, complete
  process exit, same-profile/same-origin restart, stale-cloud blocking, a
  second full restart, three-tab parity, unchanged cloud and queue/sync false.
- Authorization is single-use and consumed immediately before the only local
  restore. A partial immediate failure may use the bound rollback once in the
  same transaction. A failure after successful immediate persistence never
  triggers an automatic second recovery or automatic post-restart rollback.
- The executable contract is `protected-recovery-authorization-contract.js`,
  version `protected-local-recovery-postwrite-v1`. Cloud writes remain
  prohibited throughout recovery and validation.

### V50 boot and persistence ordering

- O boot authoritative registra o fingerprint cloud lido em modo somente
  leitura antes de qualquer persistência local protegida.
- Save protegido exige runtime da autoridade V2 e fingerprint cloud válido;
  sem isso falha antes de escrever `civ5`.
- Estado e marcador V2 usam o mesmo estado canônico. Marcador V1/raw-state é
  inválido e não concede autoridade local.
- A identidade QA permanece no perfil externo `qa-browser-authenticated`,
  `Default`, origem `http://127.0.0.1:4173`, CDP `9233`; restart integral é
  obrigatório para certificar durabilidade.
