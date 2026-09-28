# File ownership and location guide

This is a logical repository map, not a machine-specific filesystem inventory.
Use `git status` and current project state for live checkout details.

| Area | Ownership / role | Handling |
|---|---|---|
| `index.html`, root runtime modules | Legacy application runtime | Preserve behavior; follow architecture and financial contracts |
| `api/` | Serverless integrations | Keep callers paired with implemented endpoints |
| `finance-core.js`, `persistence-core.js` | Protected financial/persistence core | Change only in an explicitly authorized phase |
| `modern/src/` | Read-only modern application | Preserve read-only contract; do not edit generated output |
| `docs/ai/` | Current governance and technical continuity | Keep canonical docs current and public-safe |
| `docs/ai/archive/` | Historical reports | Reference-only; not current instructions |
| `scripts/backup/` | Safe source backup | Fail closed; configure private destination locally |
| `scripts/maintenance/` | Maintenance tooling | Review scope before execution |
| `scripts/qa/` | Canonical QA tooling | Use isolated QA context; never rely on a personal browser profile |
| `tests/` | Automated contracts and regressions | Keep fixtures synthetic and privacy-safe |
| `Refs/visual-canon/` | Public-safe design references | Only synthetic, public-safe, or explicitly approved images may be tracked |
| `.interface-design/` | Local design notes, when present | Do not publish without separate review |
| `local-imports/`, `_backups-seguros/` | Sensitive local financial data | Local-only; never source-backup, auto-track, or auto-delete |
| `.qa-state/` | Local QA/forensic state | Preserve and classify; authenticated state is private |
| `node_modules/`, `dist/`, `modern/dist/`, caches | Generated/dependencies | Regenerable; never treat as canonical source |

## Change and recovery rules

- Prefer minimal, thematic changes and explicit path ownership.
- Do not move runtime modules based on directory aesthetics; verify imports and
  tests first.
- Keep transaction, quote, and tax data separate from source/tooling changes.
- Source recovery comes from Git and validated private source snapshots.
- Sensitive local data and exact recovery metadata use separate private
  processes. Public docs must not identify private storage locations or files.
- When ownership is uncertain, preserve the item and record the uncertainty;
  do not stage or delete it automatically.
