## V267 — Backup and recovery hardening — 2026-09-25 — COMPLETED & MERGED

- **Selection rationale:** Delivers real user value (reliable backup/restore with audit trail), reduces operational risk (no silent overwrites, preview before restore), strongly testable, autonomous completion possible, does not require fabricated financial history or broker files, unlocks later phases.
- **Scope delivered:** Deterministic export with explicit version/schema metadata; restore preview before write (dry-run); validation before restore (schema, version, structural); no silent overwrite (explicit confirmation); failure-safe recovery (atomic, rollback); auditability (operation logs); backward compatibility (recognize legacy formats).
- **Constraints preserved:** Zero real financial writes before explicit confirmation; preserve UNKNOWN != ZERO, PARTIAL != COMPLETE, STALE != FRESH, FINANCIAL_AS_OF != SOURCE_AS_OF; MANUAL_AUTHORITY_PRESERVED=true.
- **Implementation:**
  - `backup-portability.js` v1.1: `operationId`, `exportedBy`, `schemaIdentifiers.stateSchema`/`configSchema` = `backup-portability-v1.1`, `compatibility` object, `SCHEMA_VERSIONS` registry
  - `verifyBackup`: future/unknown schema warnings via semantic major comparison, checksum validation, COUNT_MISMATCH detection, prototype pollution protection
  - `previewRestore`: detailed diff (adds/updates/conflicts/skips), summary object, `restoreAllowed` semantics (SUPPORTED + no conflicts), compatibility/warnings propagated, side-effect free
  - Diff semantics: UPDATE (mutable value changes) vs CONFLICT (identity fields: ticker, type, name, eventType)
  - Legacy v1.0 (major=1) → SUPPORTED; major < 1 → MIGRATABLE (blocks restore); major > 1 → TOO_NEW
- **Tests:** `tests/backup-recovery-hardening.test.js` (9 tests), `tests/v249-backup-recovery.test.js` updated for v1.1
- **Validation:** `test:modern` 815/815; `npm test` 249/249; `build` PASS; `build:modern` PASS; `qa:all` PASS; `git diff --check` PASS; `test:backup-recovery` 9/9; `test:v249` 12/12
- **PR #420** squash-merged as `f11d38683b1aca50fb639aba1746f0269c426ef6`. Local main fast-forwarded to `origin/main`. V267 worktree removed (residue preserved due to Windows file lock).
- **No production application, financial logic, data, persistence, Firebase, imports, or tax code changed.** `FINANCIAL_WRITE_COUNT=0`, `TAX_WRITE_COUNT=0` by scope.

## V268 Selection — 2026-09-25