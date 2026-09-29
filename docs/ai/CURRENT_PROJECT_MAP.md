# Current project map

This map describes repository architecture and public collaboration surfaces.
Machine-specific locations and exact private recovery inventory are
intentionally omitted; consult the private local recovery manifest when
authorized recovery requires them.

## Product and runtime

- The production-facing application is the legacy `index.html` surface.
- `modern/` is a read-only application surface; `modern/dist/` is generated and
  must not be edited or tracked.
- `api/` contains serverless integrations used by the legacy application.
- Financial calculations, persistence, imports, authentication, and tax logic
  are protected domains. Review their contracts before any change.

## Repository layout

| Area | Purpose |
|---|---|
| `docs/ai/` | Current agent bootstrap, state, architecture, and policies |
| `docs/ai/archive/` | Historical evidence; reference-only, not current instructions |
| `scripts/backup/` | Safe source-backup tooling |
| `scripts/maintenance/` | Explicit maintenance utilities |
| `scripts/qa/` | Canonical QA commands and browser lifecycle tooling |
| `tests/` | Unit, integration, architecture, and QA contract tests |
| `Refs/visual-canon/` | Public-safe visual guidance and approved public references only |

## Canonical collaboration rules

- Use the repository's current `AGENTS.md`, `docs/ai/INDEX.md`,
  `PROJECT_STATE.md`, `NEXT_STEP.md`, and this map as the compact bootstrap.
- `scripts/qa/` is the canonical operational QA root. Historical path mentions
  are not active commands.
- Keep private imports, authenticated browser state, personal exports, and
  sensitive backups local-only and outside Git/source snapshots.
- Exact private backup and legacy-history identifiers belong only in the
  private local recovery manifest.
- Create implementation worktrees conservatively and review their lifecycle
  at mission closeout; do not scan all worktrees by default.

## Recovery architecture

- `SOURCE_BACKUP=VALIDATED_PRIVATE_ARTIFACT`.
- `BACKUP_STORAGE=EXTERNAL_PRIVATE_LOCATION`.
- `LEGACY_HISTORY=VERIFIED_PRIVATE_GIT_BUNDLES` when remote recovery is not
  sufficient.
- `RECOVERY_METADATA=PRIVATE_LOCAL_MANIFEST`.
- Git remote history remains the primary source for committed project work.
- A source backup does not contain local-only financial records, credentials,
  dependency installations, worktrees, or authenticated QA profiles.

## Current state

Branch, commit, worktree count, validation results, and active objective are
time-sensitive. Read them from Git and `docs/ai/PROJECT_STATE.md` and
`docs/ai/NEXT_STEP.md`; do not treat a checked-in map as a live status report.

## Worktree inventory — audit 2026-09-29

These are classifications, not deletion instructions. Recheck live Git state,
untracked contents, active processes, and recovery before any retirement.

| Worktree/residue | Classification | Closeout note |
|---|---|---|
| Canonical `main` checkout | `PROTECTED_DIRTY_CANONICAL` | Local checkout is behind `origin/main`; untracked local/import/QA artifacts preserved. Do not reset or clean. |
| `.worktrees/v281-historical-return-truth` | `CLEANUP_PENDING_IGNORED_QA_AND_DEPENDENCIES` | Engine/test semantics are in current main; ignored `.qa-state`, `modern/dist`, and `node_modules` remain. No removal attempted. |
| `v166-corporate-events-official-integration` | `KEEP_LOCAL_QA_EVIDENCE` | Corporate-event modules/tests exist in current main; untracked probes include production/CDP-specific assumptions and remain untouched. |
| `v169a-protected-read-only-qa` | `CLEANUP_PENDING_PROTECTED_QA_STATE` | Protected read-only implementation/docs/tests have current-main equivalents; local `.qa-state` remains. |
| `v275-final-premium-visual-redesign` | `PRIVATE_KEEP_AND_FUTURE_VISUAL_REFERENCE` | Five committed visual commits retained in archive ref. `local-imports/` and local reconciliation artifacts were not opened, moved, or changed. Visual implementation remains deferred. |
| `v278m-safe-integration` | `ARCHIVED_HISTORY_WITH_LOCAL_QA_STATE` | 11-commit history retained by local branch/archive ref; relevant current QA/backup paths exist on main; ignored QA/build/dependency state remains. |
| `v278o-publishable-integration` | `MERGED_HISTORY_WITH_LOCAL_RESIDUES` | V278 release was incorporated; `.interface-design/` and an untracked local test artifact remain untouched. |
| `v263-rf-freshness-valuation-asof` | `UNREGISTERED_PHYSICAL_RESIDUE_PENDING_SAFE_RETIREMENT` | Prior audit found no unique semantic changes among comparable files; unregistered physical tree was not manually deleted. |
| V178 old worktree | `PHYSICAL_PATH_ABSENT_RECOVERABLE_HISTORY` | Local branch and archive ref point to expected commit; standalone bundle was not verified. |
| V284 old worktree | `PHYSICAL_PATH_ABSENT_MERGED_HISTORY` | Expected feature commit is reachable from current `origin/main`; remote-tracking branch remains. |

Counts are time-sensitive. Recheck `git worktree list --porcelain` and each
physical path before lifecycle operations. Ignored QA state, private data, or
untracked artifacts are not disposable solely because Git does not track them.
