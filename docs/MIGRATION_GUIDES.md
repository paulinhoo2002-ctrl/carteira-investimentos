# Migration Guides

## MG-001: Legacy → Modern Analytics (M1401-M1441)
**From:** Inline dashboard calculations  
**To:** Dedicated analytics modules

### Changes
| Old | New |
|-----|-----|
| `dashboardDividendSummaryBlock()` | `PassiveIncomeProjection.calculate()` |
| Inline dividend history | `DividendEvolution.analyze()` |
| Manual asset classification | `AssetClassComparison.compare()` |
| Ad-hoc goal tracking | `WealthGoalsTracking.track()` |
| Scattered alerts | `FinancialInsights.analyze()` |

### Migration Steps
1. Import module: `const { PassiveIncomeProjection } = await import('./analytics-passive-income-projection.js')`
2. Call via CodeSplitter: `const mod = await CodeSplitter.load('passiveIncomeProjection')`
3. Replace inline logic with `mod.calculate(input)`
4. Add tests for new contract

---

## MG-002: Eager → Lazy XLSX Loading (M862)
**From:** `document.write('<script src="xlsx.full.min.js">')`  
**To:** `ensureXLSX()` dynamic import

### Before
```html
<script>
document.write('<script src="xlsx.full.min.js"><\/script>');
</script>
```

### After
```javascript
// In import handler
async function ensureXLSX() {
  if (window.XLSX) return window.XLSX;
  const mod = await import('./xlsx.full.min.js');
  // Verify integrity
  return window.XLSX = mod.default || mod;
}

// Usage
const XLSX = await ensureXLSX();
const wb = XLSX.read(data, { type: 'array' });
```

### Verification
- `xlsxInInitialLoad === 0` (npm run verify:release)
- Cold load < 700KB

---

## MG-003: CSP v1 → CSP v2 with SRI (M1566)
**From:** No CSP / basic CSP  
**To:** CSP with SHA-384 SRI hashes

### Added to vercel.json
```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [{
      "key": "Content-Security-Policy",
      "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.brapi.com.br; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    }]
  }]
}
```

### Added to index.html
```html
<meta http-equiv="Content-Security-Policy" content="...">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter..." integrity="sha384-Yvt2jmTtQFEtXIVH1VgGfieY/D91UJNVwWdiVUirr4Gwov6BPGKdjcxOWDiaZ5wF" crossorigin="anonymous">
```

### SRI Hash Generation
```bash
# Fetch and hash
curl -s https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap | openssl dgst -sha384 -binary | openssl base64 -A
# → sha384-Yvt2jmTtQFEtXIVH1VgGfieY/D91UJNVwWdiVUirr4Gwov6BPGKdjcxOWDiaZ5wF
```

---

## MG-004: SW v250 → v252 (M1461, M1501)
**From:** Basic offline caching  
**To:** Periodic sync + background sync + install prompt + cache warming

### New Features
| Feature | Config |
|---------|--------|
| Periodic data refresh | 24h interval, tag: `data-refresh` |
| Analytics flush | 1h interval, tag: `analytics-flush` |
| Cache cleanup | 7d interval, tag: `cache-cleanup` |
| Background sync (writes) | IndexedDB queue, tag: `pending-writes` |
| Install prompt handling | `beforeinstallprompt` event capture |
| Offline fallback page | `/offline.html` with retry button |
| Cache warming | App shell + 9 analytics modules |

### Version Bump
```javascript
// sw.js line ~10
const SW_VERSION = 'v252.0';
const CACHE_PREFIX = 'carteira-investimentos-';
```

---

## MG-005: Mobile CSS Refactor (M1251-M1380)
**From:** Scattered mobile media queries  
**To:** Consolidated breakpoints + modal viewport fix

### Removed
- Duplicate `@media (max-width: 430px)` block (~line 620)

### Added/Updated
```css
/* Modal viewport fix (M567) */
@media (max-width: 900px) {
  .note-overlay {
    align-items: flex-start;      /* was center */
    padding-bottom: 100px;        /* space for keyboard */
    max-height: min(85dvh, 700px);
  }
}

/* WCAG AA contrast (M1351) */
:root { --muted: #9ab4d6; }  /* was #7d8cad, 3.5:1 → 4.8:1 */
```

### Dashboard Mobile (M1251)
- Compact KPI cards (2×2 grid → single column)
- Reduced spacing (--sp-3 → --sp-2)
- Chart visibility: show sparklines, hide legends

### Dividendos Mobile (M1261)
- KPI cards: 4 → 2 per row
- Filter bar: chips wrap, dropdowns full-width
- Empty state: illustration + CTA

---

## MG-006: Owner-Only Firebase Rules (M595, M831)
**From:** Per-user collections with auth.uid match  
**To:** Hardcoded owner UID + email verification

### Before
```javascript
match /portfolios/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

### After
```javascript
function isOwner(userId) {
  return request.auth != null
    && request.auth.uid == "yaypxiiv7Ye7pwpDZ0nqhG3Yj7E3"
    && request.auth.token.email_verified == true
    && request.auth.token.email == "paulinhoo2002@gmail.com"
    && request.auth.uid == userId;
}

match /portfolios/{userId} {
  allow read, write: if isOwner(userId);
}
```

---

## MG-007: Release Automation (M1581-M1590)
**From:** Manual version bump + changelog + deploy  
**To:** semantic-release + conventional commits + auto-preview

### Setup
```bash
npm i -D semantic-release @semantic-release/{commit-analyzer,release-notes-generator,changelog,npm,git,github}
```

### Config (.releaserc.json)
```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/git",
    "@semantic-release/github"
  ]
}
```

### Commit Convention
| Type | Version Bump |
|------|--------------|
| feat | MINOR |
| fix | PATCH |
| docs | PATCH |
| perf | PATCH |
| BREAKING CHANGE | MAJOR |

---

## MG-008: Dependency Pinning & Audit (M1565)
**From:** Unpinned deps, no audit in CI  
**To:** engines.node, audit:ci, check:lock, dependency-check job

### package.json
```json
{
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "audit:ci": "npm audit --audit-level=high",
    "check:lock": "npm run build && git diff --exit-code package-lock.json"
  }
}
```

### CI Job (.github/workflows/ci.yml)
```yaml
jobs:
  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run audit:ci
      - run: npm run check:lock
```

---

## Rollback Procedures
Each migration has a documented rollback in RUNBOOKS.md:
- MG-001: Revert analytics imports, restore inline logic
- MG-002: Restore document.write XLSX, remove ensureXLSX
- MG-003: Remove CSP headers, remove SRI attributes
- MG-004: Revert sw.js to v250, update test versions
- MG-005: Restore duplicate media queries, revert modal CSS
- MG-006: Revert to per-user rules (requires Firebase deploy)
- MG-007: Disable semantic-release, manual version bump
- MG-008: Remove audit:ci/check:lock, remove CI job