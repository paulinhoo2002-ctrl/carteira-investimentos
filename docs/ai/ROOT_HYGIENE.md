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

## Root Writer Identification

Files that previously generated root clutter (fixed 2026-09-12):

| Writer file | Issue | Fix |
|---|---|---|
| `tools/qa/phase4h-101-recovery-prewrite.js` | Hardcoded `path.join(process.cwd(), '.browser-harness-tmp')` | Now uses `harness-paths.js` → `%TEMP%` |
| `tools/qa/phase4h-preclassc-recovery-prewrite.js` | Spawns `browser-harness.exe` with no BH_HOME/BH_CONFIG_DIR overrides | Now uses `harness-paths.js` → `%TEMP%` |

## Enforcement

- `scripts/root-hygiene-check.js` — run this to verify no harness dirs in root.
- `.gitignore` patterns `.browser-harness-*/`, `.browser-harness-runtime*/` prevent tracking.

## Root Writer Policy

Any new QA tool that uses `browser-harness.exe` must:
1. Import `tools/qa/harness-paths.js` (the central temp-path policy).
2. Use `HarnessPaths.envFor()` to set `BH_HOME`, `BH_TMP_DIR`, `BH_CONFIG_DIR`, `BH_RUNTIME_DIR`.
3. Never default to `process.cwd()` for harness state directories.

## Recovery Workflow

1. `harness-paths.js` resolves temp paths via `os.tmpdir()`.
2. `harness-paths.js envFor()` returns env overrides respecting env var overrides for flexibility.
3. `ensureTempDirs()` creates the temp directory tree on demand.
