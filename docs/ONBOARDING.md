# Onboarding Guide

## Prerequisites
- Node.js 20+ (`node --version`)
- Git 2.40+
- Firebase CLI (`npm i -g firebase-tools`)
- Vercel CLI (`npm i -g vercel`)
- Editor: VS Code recommended

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git
cd carteira-investimentos
npm ci
```

### 2. Local Development
```bash
# Start dev server (Vite)
npm run dev

# Or with emulators (Firebase Auth + Firestore)
npm run dev:emulator
```

### 3. Run Tests
```bash
# All tests
npm test

# Specific suites
npm run test:finance
npm run test:backup-restore
node --test tests/security-*.test.js
```

### 4. Build & Deploy Preview
```bash
# Production build
npm run build && npm run build:modern

# Deploy to Vercel preview
vercel --prod=false
```

## Project Structure
```
├── index.html              # Main app (40K+ lines)
├── manifest.json           # PWA Manifest v2
├── sw.js                   # Service Worker v252
├── vercel.json             # Vercel config + CSP
├── firestore.rules         # Owner-only security rules
├── package.json            # Dependencies + scripts
├── analytics-*.js          # 9 analytics modules
├── tests/
│   ├── *.test.js           # Unit/integration tests
│   └── qa-probes/          # QA probes (M1401+)
├── scripts/
│   ├── backup/             # Backup/restore tools
│   ├── rollback.sh         # Emergency rollback
│   ├── release-checklist.js
│   └── dr-drill.sh         # DR drill script
├── docs/                   # Documentation
└── .github/workflows/      # CI/CD pipelines
```

## Key Concepts

### Financial Invariants (NEVER CHANGE)
- `assetAppliedValue` = quantity × avgPrice
- `assetCurrentValue` = quantity × currentPrice
- `assetRentabPct` = (current - applied) / applied × 100
- Fixed income: delegated to `rfValues` adapter
- All calculations: pure functions, deterministic, no side effects

### Security Model
- **Single owner:** UID `yaypxiiv7Ye7pwpDZ0nqhG3Yj7E3`
- **Email verified required:** `request.auth.token.email_verified == true`
- **Email match required:** `request.auth.token.email == "paulinhoo2002@gmail.com"`
- **Fail-closed:** Any rule evaluation error → deny

### PWA Architecture
- **SW v252:** stale-while-revalidate, background sync, periodic sync
- **Manifest v2:** standalone, shortcuts, protocol handlers
- **Offline-first:** App shell cached, data synced when online
- **Cache strategy:** Static assets → cache-first, API → network-first

### Code Splitting
- `CodeSplitter` class loads analytics modules on demand
- Modules registered in `index.html` load handler
- Lazy load: `CodeSplitter.load('moduleName')`
- Preload: `CodeSplitter.preload('moduleName')`

## Development Workflow

### Branching
```
main (protected)
  └── feat/<feature-name>     # Feature branches
  └── fix/<bug-name>          # Bug fixes
  └── release/vX.Y.Z          # Release preparation (semantic-release)
```

### Commits (Conventional)
```
feat: add dividend evolution analytics
fix: correct CLS calculation on mobile
docs: update API contracts for M1411
perf: lazy-load XLSX module
chore: update dependencies
```

### PR Process
1. Create PR from feature branch
2. CI runs: lint, test, build, security audit
3. Vercel preview deploy auto-created
4. Visual regression check (manual)
5. Owner review + approval
6. Squash merge to main
7. Semantic Release auto-triggers

## Testing Standards
- **Unit:** Pure functions, financial formulas
- **Integration:** Module contracts, data flow
- **E2E:** Playwright (headless Chromium/Firefox/WebKit)
- **Security:** 50 regression tests (M1570)
- **Visual:** 32 screenshots baseline (M1111)
- **Performance:** Budgets enforced (M1491)

## Common Tasks

### Add New Analytics Module
1. Create `analytics-<name>.js` with pure functions
2. Register in `index.html` load handler: `CodeSplitter.register('name', () => import('./analytics-name.js'))`
3. Add lazy-load button in target tab
4. Create `tests/qa-probes/m<NNN>-<name>.test.js`
5. Run `npm test` → verify 100% pass

### Modify Financial Formula
1. Edit `finance-core.js` (pure function)
2. Add test case in `tests/finance-core.test.js`
3. Run `npm run test:finance`
4. Verify `npm run verify:release`
5. **Never** change behavior without test

### Update Dependencies
1. `npm outdated` → review
2. `npm update <pkg>` → test
3. `npm run audit:ci` → must pass
4. Commit `package-lock.json`
5. Update `DEPENDENCY_AUDIT_REPORT.md`

### Deploy to Production
1. Merge to main (triggers semantic-release)
2. GitHub Actions: test → build → release
3. Vercel auto-deploys new version
4. Verify production smoke test
5. Monitor error rates 30 min

## Troubleshooting

### "Module not found" in tests
- Check import paths (use relative `./` or absolute from root)
- ES modules: add `.js` extension

### SW not updating
- Bump version in `sw.js` (line ~10)
- Check `Service-Worker-Allowed: /` in vercel.json
- Clear browser cache, unregister SW

### Firebase permission denied
- Verify UID matches `yaypxiiv7Ye7pwpDZ0nqhG3Yj7E3`
- Check `email_verified` is true
- Confirm email is `paulinhoo2002@gmail.com`

### Build fails on Vercel
- Check Node version matches `engines.node` in package.json
- Verify `npm ci` works locally
- Check for missing env vars in Vercel dashboard

## Useful Commands
```bash
# Verify release readiness
npm run verify:release

# Security audit
npm run audit:ci

# Check lockfile
npm run check:lock

# Generate SBOM
npm run sbom:generate

# List backups
npm run backup:list

# Verify backup integrity
npm run backup:verify

# Run DR drill
./scripts/dr-drill.sh
```

## Key Files to Know
| File | Purpose |
|------|---------|
| `finance-core.js` | All financial calculations |
| `persistence-core.js` | IndexedDB/Firestore sync |
| `index.html` | App entry, routing, modules |
| `sw.js` | Service Worker logic |
| `firestore.rules` | Security rules |
| `vercel.json` | CSP, headers, rewrites |