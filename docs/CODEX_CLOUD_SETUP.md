# Codex Cloud — carteira-investimentos

## PROJECT
**carteira-investimentos** — Personal investment tracking application (legacy + modern dual architecture)

## INSTALL
```bash
npm ci
```

## CORE VALIDATION
```bash
npm test
```
Runs legacy (252) + modern (815) = 1067 tests total

## MODERN VALIDATION
```bash
npm run test:modern
```
Runs modern test suite (815 tests)

## BUILD
```bash
npm run build
npm run build:modern
```
- `build`: Validates static app (index.html, manifest.json, sw.js, runtime files)
- `build:modern`: TypeScript compilation + Vite bundling for modern host

## PREFLIGHT
```powershell
scripts/codex/project-identity-gate.ps1
```
Validates repository identity, branch, remote, and worktree safety.

## FAST CHECK (TIER 1) — <10 seconds
```powershell
scripts/codex/quick-check.ps1
```
Runs:
- PROJECT_IDENTITY_GATE
- Git status + diff check
- Merge conflict markers detection
- package.json validity
- Required governance files presence
- Forbidden project access check

Optional: `--IncludeSmokeTest` to run official `test:smoke` script if defined.

## FULL CHECK (TIER 3) — Comprehensive
```powershell
scripts/codex/full-check.ps1
```
Runs:
1. PROJECT_IDENTITY_GATE
2. QUICK_CHECK (TIER 1)
3. All officially defined package.json scripts:
   - `npm test` (full suite)
   - `npm run test:modern`
   - `npm run build`
   - `npm run build:modern`
   - `npm run lint` (if defined)
   - `npm run typecheck` (if defined)
   - `npm run test:integration` (if defined)
   - `npm run qa:smoke` (if defined)
4. Validation cache awareness (HEAD + diff hash tracking)

Options: `--Force` to bypass cache, `--SkipCache` to disable caching.

## CLOUD CHECK
```powershell
scripts/codex/cloud-health-check.ps1
```
Validates cloud environment readiness:
- Node.js + npm availability
- package.json + package-lock.json
- Dependencies installable (`npm ci`)
- Required scripts defined
- Build/test commands valid
- Environment variables (Firebase = optional for tests)
- Network dependencies (GitHub = required, others optional)
- Browser requirements (optional, headless Chromium if needed)

## NODE REQUIREMENT
- **Node.js**: 18+ (MINIMUM_SUPPORTED=18)
- **OBSERVED_VALIDATION_RUNTIME**: Node v26.7.0 / npm 11.19.0

## PACKAGE-LOCK
- `package-lock.json` committed for deterministic installs
- Run `npm ci` in clean environments

## ENVIRONMENT VARIABLES

### Required for Cloud Environment
| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` / `GH_TOKEN` | Yes | GitHub API access for PR/CI |

### Optional (Firebase - for real portfolio sync)
| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_API_KEY` | No | Firebase config |
| `FIREBASE_AUTH_DOMAIN` | No | Firebase config |
| `FIREBASE_PROJECT_ID` | No | Firebase config |
| `FIREBASE_STORAGE_BUCKET` | No | Firebase config |
| `FIREBASE_MESSAGING_SENDER_ID` | No | Firebase config |
| `FIREBASE_APP_ID` | No | Firebase config |

**Note**: Tests use mocks and do NOT require Firebase credentials. Core test suite passes without any env vars set.

## NETWORK REQUIREMENTS

| Service | Host | Required | Purpose |
|---------|------|----------|---------|
| GitHub | github.com | **Yes** | Repository clone, CI, PR |
| Firebase | firebase.googleapis.com | No | Auth, Firestore, Hosting (real portfolio) |
| BCB SGS | api.bcb.gov.br | No | CDI benchmark data |
| Yahoo Finance | query1.finance.yahoo.com | No | Quote/dividend data |

**Minimum**: Internet access to `github.com` only.

## BROWSER REQUIREMENTS
- **Optional**: Playwright/Chromium for browser validation
- **Viewports**: 390, 430, 768, 1366, 1440, 1536, 1920
- **Tests**: V84 asset detail smoke, QA smoke (7 viewports)
- **Only runs** when explicitly invoked via `npm run qa:smoke` or `npm run qa:all`

## WHAT IS OPTIONAL
- Firebase credentials (tests mock everything)
- BCB/Yahoo network access (data providers are graceful)
- Browser tests (headless Chromium only if QA explicitly run)
- Lint/typecheck (not currently defined in package.json)

## WHAT IS MANDATORY
- Node.js 18+, npm 9+
- `package-lock.json` for deterministic `npm ci`
- GitHub access for repository operations
- Git (for worktree operations)

## VALIDATE NEW INSTALLATION
```bash
# 1. Clone
git clone https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git
cd carteira-investimentos

# 2. Install
npm ci

# 3. Preflight
powershell -File scripts/codex/project-identity-gate.ps1

# 4. Fast check
powershell -File scripts/codex/quick-check.ps1

# 5. Core validation
npm test
```

Expected: `PROJECT_IDENTITY=PASS`, `QUICK_CHECK=PASS`, `1067 tests pass`

## TROUBLESHOOTING

| Issue | Resolution |
|-------|------------|
| `vite` CJS deprecation warning | Cosmetic only — build succeeds, exit code 0 |
| `modern/dist` missing for browser tests | Run `npm run build:modern` first |
| `ERR_HTTP_HEADERS_SENT` in QA server | Fixed in V265 — ensure latest main |
| Firebase auth errors in tests | Tests mock Firebase — no real creds needed |
| Worktree path errors on Windows | Use forward slashes or `Join-Path` in scripts |
| Merge conflict markers in diff | `git diff --check` catches; resolve before check |

## POST-MIGRATION (Legacy → New Cloud)

1. **Verify identity**: Run `project-identity-gate.ps1` in new environment
2. **Run fast check**: `quick-check.ps1` should pass in <10s
3. **Run full check**: `full-check.ps1` validates entire pipeline
4. **Check cloud health**: `cloud-health-check.ps1` → `CLOUD_READY=YES`
5. **Validate tests**: `npm test` → 1067 pass
6. **Validate builds**: Both `build` and `build:modern` exit 0
7. **Confirm no carteira-2.0 access**: Identity gate enforces this

## KEY FILES
| File | Purpose |
|------|---------|
| `AGENTS.md` | Governance rules, identity gate, protected areas |
| `docs/ai/PROJECT_MEMORY.md` | Canonical project history & decisions |
| `docs/ai/SKILLS_ROUTING.md` | Skill routing table for all agents |
| `scripts/codex/*.ps1` | Automation scripts (identity, bootstrap, checks) |
| `.codex-local/last-full-check.json` | Validation cache (gitignored) |

## GIT WORKFLOW
- Branch prefix: `codex/`
- PR default: DRAFT
- Force push: OFF
- Auto-merge: OFF
- Merge method: SQUASH
- Main branch: PROTECTED

## SUPPORT
- Main repo: https://github.com/paulinhoo2002-ctrl/carteira-investimentos
- Issues: GitHub Issues (for bugs/feature requests)
- Governance: AGENTS.md + docs/ai/*.md