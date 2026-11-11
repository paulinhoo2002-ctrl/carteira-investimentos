# Carteira de Investimentos LEGACY

> **Single-user, offline-first PWA for investment portfolio management.**  
> Built with vanilla ES modules, Firebase Auth/Firestore, Vercel hosting.

---

## Status

| Metric | Value |
|--------|-------|
| **Version** | 1.4.0 |
| **Node** | ≥20.0.0 |
| **Tests** | 273/275 pass (2 flaky E2E) |
| **Security** | 0 vulnerabilities, 50 regression tests |
| **PWA** | Manifest v2, SW v252, installable |
| **Bundle** | 358KB gzipped (modern) |
| **Coverage** | Financial invariants 100% tested |

---

## Quick Start

```bash
# Install
npm ci

# Development
npm run dev              # Vite dev server
npm run dev:emulator     # With Firebase emulators

# Test
npm test                 # Full suite
npm run test:finance     # Financial formulas
node --test tests/security-*.test.js  # Security regression

# Build
npm run build && npm run build:modern

# Deploy preview
vercel --prod=false
```

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

- **Owner-only:** UID `yaypxiiv7Ye7pwpDZ0nqhG3Yj7E3` + `email_verified` + email match
- **CSP + SRI:** SHA-384 hashes for Google Fonts/APIs
- **Headers:** HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Permissions-Policy
- **Secrets:** Zero hardcoded (apiKey redacted)
- **Dependencies:** `npm audit --audit-level=high` in CI, 0 vulns
- **Rate Limiting:** Cloudflare rules (login 5/min, writes 30/min, reads 120/min)

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

```bash
# All
npm run verify:release

# Suites
npm run test:finance           # 100+ financial formula tests
npm run test:backup-restore    # 17 backup lifecycle tests
npm run test:load              # Performance benchmarks
npm run test:ui                # Visual regression (32 screenshots)
npm run test:functional-e2e    # Playwright E2E

# Security
node --test tests/security-*.test.js  # 50 tests

# Analytics
node --test tests/qa-probes/m14*.test.js  # 400+ tests
```

---

## Deployment

### Production (Vercel)
- Auto-deploy on merge to `main`
- semantic-release creates a versioned tag and GitHub Release with generated notes. It does not commit package or changelog updates to protected `main`.
- Vercel preview on every PR

### Firebase
- `firestore.rules` deployed via `firebase deploy --only firestore:rules`
- Owner-only rules enforced server-side

### CI/CD (GitHub Actions)
```yaml
# .github/workflows/ci.yml
jobs:
  dependency-check:  # npm audit, lockfile validation
  build-and-test:    # lint, test, build (needs: dependency-check)
  security-regression: # 50 security tests
```

---

## Documentation

| Doc | Purpose |
|-----|---------|
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

1. **Pure functions only** — No side effects, no mutations
2. **Deterministic** — Same input = same output, always
3. **Explicit nulls** — Missing data → `null`, never `0` or `NaN`
4. **RF delegation** — Fixed income → `rfValues` adapter
5. **Provenance** — Every result carries source + timestamp + version
6. **Versioned formulas** — Changes require test + ADR

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run dev:emulator` | With Firebase emulators |
| `npm test` | Full test suite (verify:release) |
| `npm run build` | Legacy build validation |
| `npm run build:modern` | Vite production build |
| `npm run verify:release` | All gates (test, build, audit) |
| `npm run audit:ci` | Security audit (high+) |
| `npm run check:lock` | Lockfile integrity |
| `npm run backup:list` | List Firestore backups |
| `npm run backup:verify` | Verify backup integrity |
| `npm run backup:restore` | Restore from backup |
| `./scripts/rollback.sh` | Emergency Git/Vercel rollback |
| `./scripts/dr-drill.sh` | Disaster recovery drill |
| `node scripts/release-checklist.js` | Pre-release validation |

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

*Generated from M1571-M1580 Docs Overhaul • Last updated: 2026-10-25*