# Root Hygiene Policy

**Last updated:** 2026-09-12 (Step 16, PROJECT_ROOT_HYGIENE_V5R)

## Allowed Root Categories

The project root (`C:\Projetos\carteira-investimentos`) must contain only:

| Category | Allowed entries |
|---|---|
| **Source files** | `index.html`, `sw.js`, `manifest.json`, `finance-core.js`, `persistence-core.js`, `package.json`, `package-lock.json`, `.firebaserc`, `firebase.json`, `firestore.rules`, `.gitignore` |
| **Project directories** | `api/`, `scripts/`, `tools/`, `tests/`, `docs/`, `legacy/`, `modern/`, `dist/`, `Refs/`, `local-imports/` |
| **Recovery artifacts** | Protected recovery files (`protected-*.js`), investigation summaries |
| **UI assets** | Icon files (`icon-*.png`, `icon.svg`) |
| **Git internals** | `.git/` (managed by git) |
| **QA evidence at root** | Allowed but tracked separately; patterns controlled by `.gitignore` |

## Prohibited at Root

Runtime-generated browser-harness directories MUST NOT accumulate in root:

- `.browser-harness-home-*` → `%TEMP%\CarteiraInvestimentos\browser-harness\home\`
- `.browser-harness-tmp-*` → `%TEMP%\CarteiraInvestimentos\browser-harness\tmp\`
- `.browser-harness-config-*` → `%TEMP%\CarteiraInvestimentos\browser-harness\config\`
- `.browser-harness-runtime*` → `%TEMP%\CarteiraInvestimentos\browser-harness\runtime\`

## Root Writer Identification — historical V5R evidence

The `tools/qa/` file paths below are historical paths from the 2026-09-12
investigation. The current QA root is `scripts/qa/`; do not treat these old
writer paths as existing operational files.

Files that previously generated root clutter (fixed 2026-09-12):

| Writer file | Issue | Fix |
|---|---|---|
| `tools/qa/phase4h-101-recovery-prewrite.js` | Hardcoded `path.join(process.cwd(), '.browser-harness-tmp')` | Now uses `harness-paths.js` → `%TEMP%` |
| `tools/qa/phase4h-preclassc-recovery-prewrite.js` | Spawns `browser-harness.exe` with no BH_HOME/BH_CONFIG_DIR overrides | Now uses `harness-paths.js` → `%TEMP%` |

## Enforcement

- `scripts/maintenance/root-hygiene-check.js` — current check for harness dirs in root.
- `.gitignore` patterns `.browser-harness-*/`, `.browser-harness-runtime*/` prevent tracking.

## Root Writer Policy

Any new QA tool that uses `browser-harness.exe` must keep all harness state
outside the repository, under `%TEMP%\CarteiraInvestimentos\browser-harness\`,
and must not default state directories to `process.cwd()`. The old helper
`tools/qa/harness-paths.js` is historical and absent; do not import it.

## Recovery Workflow

1. Resolve the temp root from the OS temp directory and validate containment.
2. Respect explicit QA environment overrides only after validation.
3. Create only the required QA temp subdirectories.
