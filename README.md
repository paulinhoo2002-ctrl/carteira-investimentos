# Carteira de Investimentos LEGACY

> **Single-user, offline-first PWA for investment portfolio management.**  
> Built with vanilla ES modules, Firebase Auth/Firestore, Vercel hosting.

---

## Status

| Metric | Value |
|--------|-------|
| **Version** | 1.4.0 |
| **Node** | `>=22.14.0` (from `package.json`) |
| **Current phase** | See `docs/ai/PROJECT_STATE.md` and `docs/ai/NEXT_STEP.md`; validate against live Git state |

Old test counts, audit totals, bundle sizes and release labels are historical
snapshots. They are not current certification results.

## For maintainers and agents

- Read [`AGENTS.md`](AGENTS.md) before working in this repository.
- Follow the verified workflow and environment boundaries in
  [`docs/DEVELOPMENT_PLAYBOOK.md`](docs/DEVELOPMENT_PLAYBOOK.md).
- The single canonical Skill Router is
  [`.agents/SKILL_ROUTER.md`](.agents/SKILL_ROUTER.md).
- Architecture, financial contracts, testing/release gates and next action are
  linked from the Playbook. Confirm current branch, SHA and state before acting.

---

## Quick Start

```powershell
# Windows PowerShell. Install dependencies only in an authorized worktree.
npm.cmd ci

# Legacy app with local synthetic QA fixture
npm.cmd run qa:local-synthetic

# Focused checks
npm.cmd run test:local-synthetic
npm.cmd run test:finance
npm.cmd run test:skills-routing

# Build
npm.cmd run build
npm.cmd run build:modern

# Full local suites (see the Playbook for scope and prerequisites)
npm.cmd test
npm.cmd run test:modern
```

The synthetic server uses loopback and does not certify hosted Firebase. Do not
use a production deployment command as a development shortcut.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     index.html (SPA)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Dashboard│ │ Dividendos│ │  Ativos  │ │  Metas   │ ...   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│  CodeSplitter → analytics-*.js (9 modules, lazy-loaded)    │
├─────────────────────────────────────────────────────────────┤
│  finance-core.js → Pure financial functions (invariants)   │
│  persistence-core.js → IndexedDB ↔ Firestore sync          │
├─────────────────────────────────────────────────────────────┤
│  Service Worker v252 → Offline, Background Sync, Periodic  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 📊 Dashboard
- Executive KPIs (portfolio value, return, income YTD)
- Asset performance overview
- Package 2 certified RV results

### 💰 Dividendos
- Monthly/annual matrix view
- Distribution panel with filters
- Declared vs received tracking

### 📈 Ativos (Premium)
- KPI cards (total, return, income, count)
- Search + 7 type chips + sector/class/performance filters
- 15-column sortable table (ticker, sector, type, qty, PM, current, P&L, rentab%, target, total, %portfolio, %ideal, div/month, DY, actions)
- Accordion grouping by class (RF auto-expanded)
- 3 action buttons per row (Comprar, Vender, Mais)
- Mobile cards with `<details>/<summary>`
- Financial precision colors (green/red)

### 🎯 Metas
- Goal progress tracking
- Milestone timeline
- Monte Carlo projections
- Passive income projection (M1401)
- Dividend evolution (M1411)
- Asset class comparison (M1421)
- Wealth goals tracking (M1431)
- Financial insights engine (M1441)

### ⚙️ Config
- Theme (dark/light)
- Hide values mode
- Backup/restore
- Import center (B3/Inter)

---

## Analytics Modules (M1401-M1441)

| Module | Purpose | Input | Output |
|--------|---------|-------|--------|
| `passiveIncomeProjection` | DRIP + Monte Carlo | Portfolio, dividends, horizon | Monthly projection, scenarios |
| `dividendEvolution` | Timeline + seasonality | Dividends | YoY, heatmap, top payers |
| `assetClassComparison` | Allocation + drift + rebalance | Assets, targets | Current/target, actions, risk |
| `wealthGoalsTracking` | Goal progress + Monte Carlo | Goals, portfolio value | Progress, months, status |
| `financialInsights` | Health score + alerts | Portfolio | Score, alerts, anomalies, opportunities |

---

## Security

- Firestore authorization is defined in `firestore.rules`; review and test the
  current rules before changing authentication or data access.
- Test access with local synthetic identities and emulators. Do not copy owner
  identifiers, credentials or historical security claims into fixtures/docs.
- `npm.cmd run audit:ci` is the production-dependency audit command declared
  for CI; its current result must be checked on the target branch/SHA.
- Never commit administrative Firebase credentials, passwords, tokens, cookies
  or private financial data. Public client configuration is not an admin
  credential and does not prove that Preview uses QA.

---

## PWA Features

- **Installable:** `display: standalone`, shortcuts, protocol handlers
- **Offline:** App shell cached, stale-while-revalidate
- **Background Sync:** IndexedDB queue for mutations
- **Periodic Sync:** 24h data refresh, 1h analytics flush, 7d cache cleanup
- **Install Prompt:** Custom UI, deferred prompt handling
- **Offline Fallback:** `/offline.html` with retry button

---

## Testing

```powershell
# Full repository verification
npm.cmd run verify:full

# Focused suites
npm.cmd run test:finance
npm.cmd run test:backup-restore
npm.cmd run test:local-synthetic
npm.cmd run test:local-synthetic:browser
npm.cmd run test:visual-regression
npm.cmd run test:skills-routing

# Builds
npm.cmd run build
npm.cmd run build:modern
```

See `package.json` and the Playbook for the current full test chain, required
Node version, browser prerequisites and Firebase emulator commands. Test counts
are not maintained here as permanent facts.

---

## Deployment

`vercel.json` defines build/output and routing. The checked-in
`.github/workflows/preview.yml` validates a build and explicitly does not deploy
to Vercel. Provider-side project association and environment variables must be
verified in the authorized Vercel project; repository files alone do not prove
runtime configuration.

Production release or deployment is a separate authorized gate. Confirm the
deployment SHA, Firebase project, domain, CI checks and rollback path before
publication; see the Development Playbook and release checklist.

### Firebase

`firestore.rules` is the tracked rules source. Publishing rules is a hosted
write; use only the explicitly authorized project and the rules procedure.

### CI/CD (GitHub Actions)

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for the current
jobs and commands. Its main jobs currently select Node 20, while
`package.json` requires `>=22.14.0`; see the Playbook's pending items.

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [Development Playbook](docs/DEVELOPMENT_PLAYBOOK.md) | Safe workflow, environments, tests and maintenance checklist |
| [ADR.md](docs/ADR.md) | Architecture decisions |
| [API_CONTRACTS.md](docs/API_CONTRACTS.md) | Firestore, Firebase, Analytics contracts |
| [RUNBOOKS.md](docs/RUNBOOKS.md) | Incident response procedures |
| [ONBOARDING.md](docs/ONBOARDING.md) | New developer guide |
| [FINANCIAL_INVARIANTS.md](docs/FINANCIAL_INVARIANTS.md) | Calculation rules + invariants |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, components, accessibility |
| [MIGRATION_GUIDES.md](docs/MIGRATION_GUIDES.md) | Version upgrade procedures |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues + fixes |
| [GLOSSARY.md](docs/GLOSSARY.md) | Term definitions |

---

## Financial Invariants (Non-Negotiable)

Follow [`docs/FINANCIAL_INVARIANTS.md`](docs/FINANCIAL_INVARIANTS.md),
`docs/ai/PRODUCT_CONTRACTS.md` and the relevant domain tests. Preserve unknown,
partial and expected states; do not replace them with zero, complete or received.

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm.cmd run qa:local-synthetic` | Local synthetic server at `127.0.0.1:8765` |
| `npm.cmd test` | Main test chain declared in `package.json` (also runs its `pretest`) |
| `npm.cmd run test:modern` | Modern frontend test suite |
| `npm.cmd run test:finance` | Financial calculation and semantic tests |
| `npm.cmd run build` | Static application validation |
| `npm.cmd run build:modern` | Modern Vite build; writes generated `modern/dist` |
| `npm.cmd run verify:full` | Full verification sequence in `scripts/verify.js` |
| `npm.cmd run audit:ci` | Production dependency audit used by CI |
| `npm.cmd run check:lock` | Production dependency/lockfile check |

This list is a navigation aid. `package.json` is the source of truth for
commands; the Playbook documents test and environment boundaries.

---

## Branching Model

```
main (protected, semantic-release)
├── feat/<name>     # New features
├── fix/<name>      # Bug fixes
├── docs/<name>     # Documentation
├── perf/<name>     # Performance
├── security/<name> # Security fixes
└── release/vX.Y.Z  # Release prep (auto)
```

**Commit Convention:**
```
feat: add dividend evolution analytics
fix: correct CLS calculation on mobile
perf: lazy-load XLSX module (-269KB)
chore: update dependencies
BREAKING CHANGE: new asset schema v2
```

---

## License

Proprietary — Single owner (paulinhoo2002@gmail.com).  
All financial data local-first, encrypted at rest (Firebase), owner-only access.

---

## Support

- **Owner:** Telegram @paulinhoo2002
- **Issues:** GitHub Issues (private repo)
- **Runbooks:** See [RUNBOOKS.md](docs/RUNBOOKS.md)
- **Onboarding:** See [ONBOARDING.md](docs/ONBOARDING.md)

---

*Originally generated from M1571-M1580 • Maintenance guidance updated: 2026-11-21*
