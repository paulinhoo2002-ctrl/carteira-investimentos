# Configuracoes Safety Audit

Date: 2026-09-04
Scope: read-only safety audit before Design System adoption.

## Decision

`SETTINGS_VISUAL_ADOPTION=SAFE_WITH_RESTRICTIONS`

This document does not authorize a visual migration. The visual primitives may
be considered for low-risk preference and informational shells only. Backup,
import, restore, cloud synchronization, wallet lifecycle, security and danger
zone flows remain protected and must keep their current handlers, confirmations,
validation and persistence boundaries.

`PRODUCT_CODE_CHANGED_THIS_MISSION=false`
`FINANCE_CORE_CHANGED=false`
`PERSISTENCE_CHANGED=false`
`SCHEMA_CHANGED=false`
`REAL_DATA_CHANGED=false`

## Architecture map

| Contract | Current implementation | Safety classification |
|---|---|---|
| Settings route | `S.tab='settings'` rendered by `settingsTab()` in `index.html` | Read/write shell with protected subsections |
| Local state | `S`, `activeWallet()`, `syncWalletFromState()` | Protected state boundary |
| Local persistence | `save()` to `civ5`; `saveConfig()` to `civ5_cfg` | Protected |
| Theme preference | `toggleTheme()` and `carteira_theme` | Low-risk preference write |
| Value visibility | `toggleHideValues()` and existing state save path | Preference with financial readability impact |
| Backup center | `backupManagerModal()` | Protected data-management modal |
| Backup payload | `backupPayload()` -> `PersistenceCore.createBackupPayload()` | Protected serialization contract |
| Import validation | `backupFromRaw()` -> `PersistenceCore.parseBackupRaw()` | Protected validation boundary |
| Restore write | `applyBackupData()` -> `PersistenceCore.applyStorageTransaction()` | Protected replacement and rollback flow |
| Wallet deletion | `deleteWallet()` | Destructive, identity-confirmed |
| Portfolio reset | `resetPortfolio()` | Destructive, identity/confirmation protected |
| Security | `openAccessSettings()` / `saveAccessSettings()` | Protected access and cloud behavior |

## Section inventory

| Section | Purpose | Read-only | Writes data | Destructive | Reversible | Confirmation | Persistence touched | Visual primitive |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Conta e Carteira | Account status, active wallet and wallet lifecycle | No | Yes | Delete wallet | No for deletion | Exact name plus final confirm for deletion | Wallet state, local/cloud save | Shell only; actions remain screen-owned |
| Aparencia | Theme and value visibility preferences | No | Yes | No | Yes | No | Theme key and state/config save | Safe with preference-specific labels |
| Ambiente de teste | Deterministic in-memory fixture controls | No | Test-only | No real data | Yes | No | No production persistence in test mode | Safe only inside test-mode surface |
| Dados e Backup | Export, import and backup center entry points | Mixed | Yes | Import replaces active data | Not automatically | Yes for restore | `civ5`, `civ5_cfg` | Restricted to shell; no handler changes |
| Seguranca | Access and synchronization controls | No | Yes | Potential access impact | Depends on account operation | Existing flow | Auth/cloud configuration | Restricted; no semantic flattening |
| Zona de risco | Reset active wallet | No | Yes | Yes | No automatic undo | Confirm plus `LIMPAR` | Active wallet state and save/cloud path | Danger shell only; handler protected |
| Sobre | App, PWA and update information | Mostly | Update check only | No | N/A | No | Update/PWA runtime only | Safe informational shell |

## Backup contract

`backupPayload()` obtains state through `backupCurrentState()` and
`PersistenceCore.buildBackupState()`. Configuration is restricted to the
official `divGoal` config path. `PersistenceCore.createBackupPayload()` emits:

- `meta.app`
- `meta.backupVersion` (`BACKUP_VER=1`)
- `meta.exportedAt`
- `meta.origin`
- `meta.storageKeys` (`civ5`, `civ5_cfg`)
- `data` for the normalized state snapshot
- `storage` for the exact restorable storage payload

The purpose is persistence backup/restore, not analysis, reporting or
recommendation. The UI explicitly says that the backup is not an analytical
report. `BACKUP_SEMANTICS_VALID=true` and
`BACKUP_NOT_PRESENTED_AS_ANALYTICAL_REPORT=true`.

## Import and restore safety

The current flow is:

1. File selection parses JSON locally.
2. `parseBackupRaw()` rejects non-object payloads, invalid envelopes, invalid
   app metadata, unsupported `backupVersion`, malformed known arrays/objects
   and payloads without recognized data.
3. The UI creates a preview draft with filename, import date and data counts.
4. The user confirms replacement of the active wallet with explicit scope and
   a warning that automatic undo is unavailable.
5. `applyBackupData()` writes only through
   `PersistenceCore.applyStorageTransaction()`.
6. A write failure attempts to restore both prior storage values and reports
   incomplete recovery when rollback itself fails.

`IMPORT_MODE=REPLACE_ACTIVE_WALLET`
`IMPORT_PREVIEW=true`
`IMPORT_SCHEMA_VALIDATION=true`
`IMPORT_ROLLBACK=true`
`IMPORT_REAL_DATA_USED_IN_AUDIT=false`

The backup parser preserves legitimate legacy envelopes without inventing a
migration. Unsupported versions are rejected rather than silently upgraded.

## Destructive and protected actions

| Action | Level | Target protection | Current confirmation |
|---|---|---|---|
| Reset active wallet | Destructive/protected | Active wallet name is shown; action requires exact `LIMPAR` | Yes, two-step |
| Delete wallet | Destructive/protected | Exact wallet name must be typed; active wallet id is re-resolved before mutation | Yes, two-step |
| Import backup | Destructive/protected | Active wallet scope, filename, date and counts are shown before replacement | Yes |
| Restore test fixture | Test-only | Explicitly labeled in-memory fixture | No production data path |
| Export backup | Read-only from product data perspective | No mutation of portfolio state | No |
| Theme/value visibility | Preference | No record targeting | No |
| Security/cloud actions | Protected | Existing auth and permission handlers | Existing flow |

`DESTRUCTIVE_ACTIONS_MAPPED=true`
`WRONG_RECORD_RISK=LOW_WITH_CURRENT_GUARDS`
`REPORT_EXPORT_NOT_PRESENTED_AS_BACKUP=true`

The current reset implementation explicitly clears `S.rfEvents` and RF editor
state. Existing tests also verify that cancellation and an incorrect
confirmation word leave the state untouched. No approximate record matching or
index-only target is used by the settings destructive flows reviewed here.

## Persistence and failure map

- State key: `civ5`.
- Configuration key: `civ5_cfg`.
- Theme key: `carteira_theme`.
- Cloud synchronization is reached through existing save/upload handlers.
- Test mode uses deterministic in-memory state and disables backup/import
  operations; it is not evidence of production persistence.
- Storage read failure stops before writing.
- State write or config write failure invokes rollback.
- Rollback failure is surfaced as incomplete recovery rather than hidden.

No schema change, migration, alternate serialization shape or second backup
engine was found in this audit.

## Design System adoption boundary

### Safe candidates

- `Aparencia` section shell and non-destructive preference rows.
- `Sobre` informational rows and status badges.
- Read-only account/cloud status presentation, without changing auth handlers.
- Existing panel, button, badge and empty-state visual primitives where the
  current semantics remain explicit.
- Test-mode fixture presentation, only behind the existing test-mode guard.

### Restricted candidates

- `Conta e Carteira`: shared shell may be used, but wallet actions and active
  wallet identity stay local to this screen.
- `Dados e Backup`: panel/button primitives may be reused, but labels,
  warnings, preview, confirmation and file flow remain local.
- `Seguranca`: visual shell only after preserving access semantics and status
  meaning.
- `Zona de risco`: danger panel styling may be reused, but never infer safety
  from a CSS class and never change confirmation behavior.

### Do not use as generic primitives

- Backup/import/restore behavior.
- Destructive confirmation dialogs.
- Wallet deletion/reset handlers.
- Cloud/auth persistence controls.
- Any primitive that hides target identity, replacement scope, rollback state or
  the distinction between zero and missing data.

## Visual and responsive risk map

| Risk | Evidence | Classification | Boundary |
|---|---|---|---|
| Destructive action appears equivalent to ordinary preference | Reset is in its own `Zona de risco`, while wallet delete is in wallet actions | Controlled | Keep danger grouping and explicit copy |
| Import can be mistaken for analysis/export | Settings copy says backup is restorable and not analytical; backup modal separates export/import | Low | Preserve labels and separation |
| Long wallet/file identity on mobile | Wallet name and imported filename are user-controlled strings | Medium | Wrap safely; never hide critical identity with ellipsis in protected confirmation |
| Many settings rows on small screens | Existing responsive smoke covers 390 and 430 | Controlled | Keep stacked rows and 44px controls |
| Test-mode controls mistaken for production controls | Environment section is conditional and labeled | Low | Keep `isLocalTestMode()` boundary |
| Shared danger styling implies generic behavior | Design System classes are visual only | Medium | Handler and confirmation remain screen-owned |

## Accessibility and current coverage

Observed/covered:

- settings route renders at 390, 430, 768, 1366 and 1920;
- no horizontal overflow or financial placeholder text in the settings page;
- keyboard-capable value visibility toggle uses `role="switch"`, `aria-checked`,
  `tabindex` and Space/Enter handling;
- controls use the existing 44px touch-target rules;
- reset and import confirmations remain explicit;
- test-mode browser fixtures avoid real persistence.

Focused current tests passed: `18/18` across settings layout/navigation,
preference toggles, reset safety and backup transaction/rollback behavior.
The focused suite does not prove every authenticated cloud/security path or
every browser-native file-picker behavior; those remain review gaps, not reasons
to alter protected flows in this visual audit.

## Recommendation

`GO_NO_GO=SAFE_WITH_RESTRICTIONS`

The settings surface is safe for a later, narrow visual pass on preference and
informational shells. It is not safe for a generic migration of all rows,
buttons or modals because backup/import, reset, wallet deletion, cloud sync and
security controls carry persistence and safety semantics that must stay local.

`DESIGN_SYSTEM_ADOPTION_THIS_MISSION=NOT_IMPLEMENTED`
`SETTINGS_VISUAL_FREEZE=NOT_REQUESTED`

## Pilot 04 boundary

The subsequent controlled pilot adopted only visual classes in safe sections:

- `Aparência`: panel shell, icon container and ghost button;
- `Ambiente de teste`: panel shell, icon container and secondary button;
- `Sobre`: panel shell, icon container, informational badges and ghost buttons.

No KPI or empty-state primitive was introduced because those semantics do not
exist naturally in this screen. Backup/import, restore, reset, wallet deletion,
security and synchronization remained untouched.

`PILOT_04_SAFE_SECTIONS=APARENCIA;AMBIENTE_DE_TESTE;SOBRE`
`PILOT_04_PROTECTED_SECTIONS=BACKUP_IMPORT;RESTORE;RESET;DELETE;SECURITY;SYNC`
`HIGH_RISK_FLOWS_UNTOUCHED=true`
`DESTRUCTIVE_SEMANTICS_PRESERVED=true`
`BUTTON_HIERARCHY_PRESERVED=true`
`BACKUP_SEMANTICS_CHANGED=false`
`IMPORT_SEMANTICS_CHANGED=false`
`IMPORT_ROLLBACK_CHANGED=false`
`RESET_SEMANTICS_CHANGED=false`
`RF_EVENTS_RESET_BEHAVIOR_PRESERVED=true`
`SCHEMA_VALIDATION_CHANGED=false`
`PILOT_04_VISUAL_PARITY_OR_IMPROVEMENT=true`
`PILOT_04_FUNCTIONAL_PARITY=true`
`PILOT_04_COUPLING_INCREASED=false`

## Audit evidence

- Source of truth reviewed: `index.html`, `persistence-core.js`, settings,
  backup/restore and settings-focused tests.
- Browser/settings validation: existing focused smoke at 390x844, 430x932,
  768x1024, 1366x768 and 1920x1080; all 18 focused tests passed.
- No product file was modified by this mission. Existing unrelated dirty files,
  including the prior `index.html` worktree changes, were preserved untouched.
