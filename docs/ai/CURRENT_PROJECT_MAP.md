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
