# Documentation index

Start an agent session in this order:

1. `AGENTS.md`
2. `docs/ai/INDEX.md`
3. `docs/ai/PROJECT_STATE.md`
4. `docs/ai/NEXT_STEP.md`
5. `docs/ai/CURRENT_PROJECT_MAP.md`

Then read only task-specific contracts. `docs/ai/archive/` is reference-only;
canonical current documents override historical reports. Do not recursively
scan archives, local imports, or every worktree by default.

## Current and operational documents

- State and continuity: `PROJECT_STATE.md`, `NEXT_STEP.md`, `PROJECT_MEMORY.md`,
  `CURRENT_PROJECT_MAP.md`, `OPEN_WORK.md`.
- Architecture and product: `ARCHITECTURE.md`, `ARCHITECTURE_MAP.md`,
  `PRODUCT_CONTRACTS.md`, `FINANCIAL_RULES.md`, `FINANCIAL_SEMANTICS.md`.
- Data and imports: `DATA_SOURCES_AND_PROVIDERS.md`,
  `MONTHLY_IMPORT_RUNBOOK.md`, `BROKERAGE_NOTE_IMPORT.md`,
  `EXTERNAL_CASH_FLOWS.md`.
- Performance and reporting: `PORTFOLIO_PERFORMANCE_CONTRACT.md`,
  `TWR_XIRR_METHODOLOGY.md`, `PORTFOLIO_REPORTING_INTELLIGENCE.md`.
- QA and release: `TESTING_AND_RELEASE.md`, `QA_HARNESS.md`, `QA_PLAYBOOK.md`,
  `RELEASE_PLAYBOOK.md`.
- Backup and storage: `BACKUP_MANIFEST.md`,
  `STORAGE_AND_WORKTREE_POLICY.md`, `LEGACY_ARCHIVE_INDEX.md`.
- Visual work: `VISUAL_CANON.md` and `Refs/visual-canon/README.md`.
- Agent routing: `SKILLS.md`, `SKILL_ROUTER.md`, `SKILL_ROUTING.md`,
  `AGENT_ROUTER.md`, `AGENT_AUTONOMY.md`.

## Local-only and private data

Local imports, authenticated QA state, private backups, credentials, and
personal financial records remain outside Git and source backups. Exact
recovery identifiers are maintained only in a private local recovery manifest.
Never publish private visual references or local filesystem inventories.

## Canonical tooling roots

- QA: `scripts/qa/`.
- Tests: `tests/`.
- Source backup: `scripts/backup/` (fail-closed policy; private destination is
  configured locally).
- Maintenance: `scripts/maintenance/`.
