# Apple Pass Wave 3 Readiness Audit

AUDIT_SCOPE=loading + action feedback + async clarity; no implementation

## State

- Branch: feat/visual-product-north-star
- HEAD: d58c00426feb037d253475572673d6bbcdf6e2a0
- origin/main: d3170e9fda8f9a1b9b9746cc950ceb5445c3d3c2
- Wave 1 commit: abe6bdac6ba2d528651a7134ab3fa7dfa33ec7e1
- Wave 2 commit: d58c00426feb037d253475572673d6bbcdf6e2a0
- Product files changed by this audit: false

## Decision

APPLE_PASS_WAVE_3_READINESS=READY_FOR_TARGETED_IMPLEMENTATION

Real asynchronous and variable-duration work exists, but it is concentrated
in a few flows. Most local portfolio interactions are immediate and should
remain quiet. Wave 3 should implement a small busy-state and completion
feedback contract only for external or file-processing operations.

No product code, financial logic, persistence, schema, backup structure, or
real data was changed in this audit.

## Operation Inventory

| Operation | Sync/async | Latency | Current feedback | Double-submit risk | Future direction |
| --- | --- | --- | --- | --- | --- |
| Startup/local hydration | Sync local plus external access gate | Fast/external | Access gate says Verificando acesso; local state loads synchronously | Low | Keep gate; no duplicate skeleton |
| Market quote refresh | Async external | External/variable | qLoad indicator, qInFlight guard, manual success/error toast | Protected | Add visible busy trigger and last-update/partial-failure status |
| Automatic dividend history | Async external | External/variable | Completion/warning/error toast | Medium | Add busy button only after focused confirmation |
| Asset, movement, dividend, RF and goal saves | Sync local, optional queued cloud save | Instant/fast | Local success/error feedback varies | Low | No spinner; normalize only completion messaging |
| Rebalance simulation | Sync local | Instant | Immediate result or empty/error state | Low | No loading |
| Global search, filters, sorting and tabs | Sync local | Instant | Keyboard/selected/pressed states | Low | No loading |
| Reports CSV/JSON | Sync local Blob generation | Fast | Success, empty and error toast | Low | Keep toast only |
| Executive/complete PDF | Local plus CDN library and print | External/variable | Error toast; no busy state | Medium | Disable export while libraries/generation run |
| IRPF CSV | Sync local | Fast | Success toast | Low | Keep toast only |
| IRPF PDF/print | Local generation plus popup/print | Perceptible/variable | Popup warning and opened toast | Low | Optional bounded busy state |
| Backup creation/download | Sync local JSON Blob | Fast | Success toast; test-mode notice | Low | No spinner |
| Backup validation/preview | Async FileReader | Perceptible | Invalid-file toast and preview | Low | Show explicit parsing status |
| Backup restore/import | Sync transaction after confirmation | Fast/protected | Confirmation, success/failure/rollback messages | Medium | Add processing state only if observable delay exists |
| Broker/B3 file parsing | Async local PDF/Excel parsing | Perceptible/slow | Broker PDF has Lendo o PDF localmente; review and confirmation | Medium | Converge status without changing parsing |
| Reset portfolio | Local mutation plus optional cloud upload | External/variable/protected | Confirmation, LIMPAR prompt, completion toast | Medium | Protected processing/result state |
| Cloud sync/upload | Async Firestore | External/variable | Failure toast and scheduled retry; success mostly silent | Medium | Pending state and local/cloud result clarity |
| Security settings save | Async Firestore | External/variable | Success/error toast | Medium | Protected busy state and durable result |
| Data-quality audit/reconciliation | Sync local | Instant/fast | Completion toast | Low | No loading |
| Theme and hide/show values | Sync local | Instant | Immediate render and toast | Low | No loading |
| Local insights generation | Sync local calculations | Fast | ai-loading label during synchronous generation | Low | Avoid artificial spinner |
| PWA update check | Async browser/service worker | External/variable | Atualizando label, success/offline feedback | Protected | Existing pattern is a good reference |

## Feedback Findings

SKELETON_CANDIDATES:

- Startup/access shell only when a real external session blocks first content.
- An externally refreshed report or data-quality surface only when structure is
  unavailable for a perceptible interval.
- Existing Ativos skeleton where its real refresh contract already requires it.

SKELETON_REJECTED:

- Local filters, sorting, tabs, search, simulations and simple saves.
- Confirmation dialogs, backup dialogs and destructive prompts.
- Synchronous backup, CSV and JSON generation.
- Any duplicated financial skeleton that can create layout shift.

BUSY_BUTTON_CANDIDATES:

1. Market refresh.
2. Automatic dividend history.
3. Executive and complete PDF generation.
4. Broker/B3 file parsing and import preview.
5. Cloud sync and security settings save.
6. Protected restore/reset, only during an observable write.

DOUBLE_SUBMIT_PROTECTIONS_CURRENT:

- Market refresh has qInFlight.
- Quick movement save has quickMovementSaving.
- Backup import requires preview and explicit confirmation.
- PWA update reuses a shared promise and throttles checks.

DOUBLE_SUBMIT_GAPS:

- Automatic dividend history has no button-level busy guard.
- PDF exports can be invoked repeatedly while libraries load.
- Cloud sync and security save have no visible pending state.
- Reset waits for optional cloud upload without a protected processing label.

SUCCESS_FEEDBACK_GAPS:

- Some goal target shortcuts save silently.
- Cloud sync success is usually silent, so local saved and cloud synchronized
  are not always distinguishable.
- PDF exports have error feedback but no processing-to-completed transition.
- File parsing status is strong for broker PDF but not uniform across B3 flows.

ERROR_FEEDBACK_GAPS:

- Cloud/security failures lose durable context when the toast expires.
- PDF failure does not distinguish dependency loading from generation failure.
- Automatic dividend partial failures have no explicit retry affordance.
- Reset/import rollback messaging is strong and must remain protected.

## Protected Flow Contracts

DESTRUCTIVE_FEEDBACK_PATTERN:

Confirmation -> exact target/scope -> processing state while active -> success
or failure -> rollback status when applicable. Never replace this with a
generic spinner or transient success toast alone.

IMPORT_STAGE_FEEDBACK:

File selected -> parsing/validation -> preview/counts -> explicit confirmation
-> processing -> success/failure. Backup and broker-note flows are current
anchors; B3 variants need careful convergence.

RESTORE_STAGE_FEEDBACK:

The current PersistenceCore transaction and rollback messages are correct.
Add only a visible processing state if the transaction becomes perceptible.

ROLLBACK_FEEDBACK:

Current rollback and incomplete-recovery messages are explicit and
safety-oriented; keep them persistent enough to read.

BACKUP_FEEDBACK_GAPS:

No busy state is needed for current export. Restore has no visible processing
phase if storage/cloud work takes longer. Backup must remain distinct from
analytical report export.

EXPORT_FEEDBACK_MATRIX:

- CSV/JSON and IRPF CSV: fast local generation, success/error toast, no loading.
- Executive/complete PDF: variable because jsPDF may load from CDN; targeted
  busy state is justified.
- PDF preview opening: local and fast; no spinner.

MARKET_REFRESH_FEEDBACK:

fetchQuotes sets qInFlight/qLoad, calls Yahoo with optional Brapi fallback,
saves updated values, renders and shows a manual success/error toast.
Automatic refreshes remain quiet. The main gap is clearer inline
last-update/partial-failure status and disabled manual re-entry.

## Startup, Accessibility, Motion and Risk

STARTUP_LOADING_STATUS:

Local hydration is synchronous. Authentication/access validation is genuinely
asynchronous and already exposes Verificando acesso before releasing the
protected shell.

STARTUP_SKELETON_JUSTIFIED=PARTIAL

Only an actual external first-content wait justifies one; localStorage
hydration and a duplicated generic shell do not.

LOADING_A11Y_REQUIREMENTS:

- Use aria-busy only on the affected region during real work.
- Keep initiating focus; do not move focus for background operations.
- Disable repeatable controls semantically while writes or duplicate exports run.
- Use concise live-region start/completion announcements where needed.
- Keep errors persistent and associated with the affected control/region.
- Preserve dialog focus return and Escape behavior.

REDUCED_MOTION_LOADING_RULE:

Spinners may be static under prefers-reduced-motion. Skeleton shimmer must
stop or become a non-animated tone. Never animate financial values, balances,
returns or destructive transitions.

LOADING_PERFORMANCE_RISKS:

- Duplicated financial markup increases layout and memory cost.
- Continuous shimmer competes with financial reading.
- Global overlays can hide the exact record/action being processed.
- Toast-only async failures disappear too quickly.
- Unbounded retries/listeners can trigger repeated refreshes.

## Quiet Operations

NO_LOADING_OPERATION_LIST:

Search, filters, sector/performance filters, sorting, tabs, local calculations,
rebalance simulation, theme, hide/show values, simple local CRUD saves, backup
JSON creation, CSV/JSON generation, and local audit/reconciliation should not
receive artificial spinners or skeletons.

## Proposed Wave 3 Scope

WAVE_3_TARGET_OPERATIONS:

1. Market refresh: busy state, repeat protection, last-update and partial-failure clarity.
2. PDF generation: disabled action while libraries/generation are pending.
3. File import parsing: shared status for broker/B3 review flows.
4. Cloud sync/security save: pending state and durable local/cloud result clarity.
5. Protected restore/reset only if an observable processing interval exists.

This is intentionally a five-operation maximum. Automatic dividend history
should enter the first wave only if focused browser testing confirms repeated
click risk.

TEST_STRATEGY:

- Use controlled deferred promises to test busy state without arbitrary sleeps.
- Assert duplicate requests/writes are blocked.
- Assert controls re-enable after success and failure.
- Assert success/error text and aria-busy semantics.
- Assert focus retention and reduced-motion behavior.
- Avoid brittle screenshot-pixel and timer-only assertions.

APPLE_PASS_WAVE_3_IMPLEMENTED_AT_AUDIT=false
PRODUCT_FILES_CHANGED_AT_AUDIT=false
DOCUMENTATION_ONLY=true
COMMIT=false
PUSH=false
PR=false
MERGE=false
DEPLOY=false

## Wave 3 Targeted Implementation

The implementation is intentionally contextual and limited to real work:

- market refresh now disables the refresh action while `qInFlight` is true;
- PDF generation and print flows prevent duplicate actions and distinguish
  dependency loading from generation failure;
- broker-note PDF parsing keeps its existing staged validation and exposes a
  busy status with `aria-busy`;
- cloud sync and security save now prevent duplicate submissions and expose
  contextual busy labels;
- backup-file validation and protected reset expose processing state without
  changing validation, rollback, `rfEvents`, or confirmation semantics.

The following remain intentionally unchanged: search, filters, sorting, tabs,
rebalance simulation, local CRUD, CSV/JSON export, backup JSON creation, theme,
privacy controls, and local audit/reconciliation.

WAVE_3_TARGETED_LOADING_ONLY=true
DOUBLE_SUBMIT_GAPS_REDUCED=true
ASYNC_FEEDBACK_CLARITY_IMPROVED=true
INSTANT_OPERATIONS_UNCHANGED=true
PROTECTED_SEMANTICS_PRESERVED=true
REDUCED_MOTION_LOADING_SAFE=true
GLOBAL_LOADING_OVERLAY=false
ARTIFICIAL_DELAY=false
FAKE_PROGRESS=false
SKELETON_SYSTEM_ADDED=false
PRODUCT_FILES_CHANGED=true
DOCUMENTATION_ONLY=false
NEXT_RECOMMENDED_ACTION=final user review of targeted Wave 3 behavior
