# Troubleshooting Guide

## Quick Diagnosis Matrix

| Symptom | Likely Cause | Check First |
|---------|--------------|-------------|
| App won't load | SW caching old version | `navigator.serviceWorker.controller` |
| Blank screen | JS error in console | DevTools Console |
| Firebase permission denied | UID/email mismatch | `request.auth.uid`, `email_verified` |
| Charts not rendering | Canvas blocked by CSP | CSP `script-src`, `connect-src` |
| XLSX import fails | Lazy load not triggered | `ensureXLSX()` called? |
| Tests flaky | Headless browser timing | Increase timeouts, check selectors |
| Build fails on Vercel | Node version mismatch | `engines.node` in package.json |
| Offline not working | SW not registered | `navigator.serviceWorker.ready` |
| Slow cold load | Bundle too large | `npm run verify:release` → check sizes |
| Mobile layout broken | Missing viewport CSS | `@media (max-width: 390px)` |

---

## Common Issues

### 1. Service Worker Issues

**SW not updating**
```bash
# Check version
console.log('SW version:', await caches.keys());

# Force update
navigator.serviceWorker.getRegistration().then(r => r?.update());

# Nuclear: unregister + clear
navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
location.reload();
```

**SW install prompt not showing**
- Check `beforeinstallprompt` event fired
- Verify `manifest.json` has `display: standalone`
- Ensure HTTPS (or localhost)
- Check `Service-Worker-Allowed: /` header

**Offline fallback not working**
- Verify `/offline.html` in precache manifest
- Check `navigateFallback: '/offline.html'` in SW
- Test: DevTools → Application → Offline checkbox

---

### 2. Firebase/Auth Issues

**Permission denied on read/write**
```javascript
// Debug in console
const user = firebase.auth().currentUser;
console.log('UID:', user?.uid);
console.log('Email:', user?.email);
console.log('Verified:', user?.emailVerified);
// Must match:
// UID: yaypxiiv7Ye7pwpDZ0nqhG3Yj7E3
// Email: paulinhoo2002@gmail.com
// Verified: true
```

**Auth emulator not connecting**
- Check `window.__LOCAL_AUTH_EMULATOR_MODE__ === true`
- Verify emulator ports: 9099 (Auth), 8080 (Firestore)
- Ensure `qaAuthEmulator=1` AND `qaFirestoreEmulator=1` in URL

**Token refresh failing**
- Force re-auth: `firebase.auth().signOut()` → login again
- Check clock sync (system time)
- Verify API key not expired/rotated

---

### 3. Build/Deploy Issues

**Vercel build fails**
```bash
# Local reproduction
npm ci
npm run build
npm run build:modern
# Check Node version
node --version  # Must be >=20
```

**TypeScript errors in modern build**
- Check `modern/tsconfig.json` extends root
- Verify all imports have `.js` extension (ESM)
- Check `readonly-report-page-contract.js` has `type="module"`

**Bundle size regression**
```bash
# Analyze
npx vite-bundle-analyzer dist
# Check budgets
node --test tests/qa-probes/m1491-performance-budgets.test.js
```

---

### 4. Test Failures

**Flaky E2E tests (Playwright)**
- `v84-asset-detail`: Increase timeout, check selector `.premium-rf-position-row`
- `service-worker-update-reliability`: 60s timeout → check network idle
- Run with `QA_BROWSER=firefox` for cross-browser

**Unit test syntax errors**
- ES modules: ensure `.js` extension in imports
- `node:test` requires `--experimental-test-coverage` for coverage
- Check `package.json` has `"type": "module"` (or use `.mjs`)

**Security regression test failures**
- CSP header test: verify `vercel.json` matches `index.html` meta tag
- SRI test: regenerate hashes if Google Fonts CSS changed
- Secrets test: exclude test files from scan

---

### 5. Financial Calculation Issues

**NaN in portfolio values**
```javascript
// Debug
assets.forEach(a => {
  console.log(a.ticker, {
    qty: a.quantity,
    avg: a.avgPrice,
    curr: a.currentPrice,
    applied: assetAppliedValue(a),
    current: assetCurrentValue(a)
  });
});
// Check: quantity/avgPrice must be numbers, not strings
```

**RF position showing wrong value**
- Verify `rfValues` adapter called with correct benchmark series
- Check `asOfDate` is valuation date, not snapshot date
- Confirm `subtype`/`indexer` classification correct

**Dividend YTD mismatch**
- Only `status: 'received'` counts in YTD
- Check `promoteExpectedToRealized` ran for period
- Verify `dividendMonthlyHistory` source is canonical

---

### 6. Mobile/Layout Issues

**Modal cut off on mobile**
- Check `.note-overlay` has `align-items: flex-start`
- Verify `padding-bottom: 100px` for keyboard
- Ensure `max-height: min(85dvh, 700px)`

**Touch targets too small**
- Minimum 44px: `--control-min-h: 44px`
- Check buttons/inputs have `min-height: var(--control-min-h)`

**Horizontal scroll on mobile**
- Check `overflow-x: hidden` on body
- Verify tables have `overflow-x: auto` wrapper
- Check `--sp-*` spacing not causing overflow

---

### 7. Performance Issues

**LCP > 2.5s**
- Check hero image preload: `<link rel="preload" as="image">`
- Verify critical CSS inlined
- Reduce blocking JS: defer non-critical scripts

**CLS > 0.1**
- Reserve space for ads/images: `aspect-ratio` or explicit dimensions
- Avoid inserting content above existing content
- Font loading: `font-display: swap` + preconnect

**JS Heap > 50MB**
- Check for memory leaks: detached DOM nodes, uncleared intervals
- Use `analytics-memory-profiler` (M1471)
- Profile in DevTools → Memory → Heap snapshot

---

### 8. Data Sync Issues

**Cloud sync stuck**
- Check `FB.sync.status` in console
- Verify Firestore rules allow read/write
- Check network: `https://firestore.googleapis.com` reachable
- Look for `unconfirmed cloud state` blocking financial screens

**Backup verification failing**
```bash
# Check integrity
npm run backup:verify --backup=backup-20261025-020000
# Verify SHA-256 matches
# Check document counts per collection
```

---

## Debug Commands

```bash
# Full test suite
npm run verify:release

# Security only
node --test tests/security-*.test.js

# Financial only
npm run test:finance

# Backup lifecycle
npm run test:backup-restore

# Performance budgets
node --test tests/qa-probes/m1491-performance-budgets.test.js

# Visual regression baseline
node tests/qa-probes/m1111-qa-visual-screenshots.js

# DR drill
./scripts/dr-drill.sh
```

---

## Log Analysis

### Key Log Patterns
```bash
# SW lifecycle
grep "SW_VERSION\|cache\|sync" console.log

# Auth flow
grep "FB.auth\|signIn\|token" console.log

# Sync state
grep "cloudSync\|FB.sync\|offline" console.log

# Financial mutations
grep "saveMovement\|saveAsset\|persist" console.log
```

---

## Escalation

| Level | Trigger | Action |
|-------|---------|--------|
| L1 | Test failure, build error | Fix locally, re-run CI |
| L2 | Production bug, data mismatch | Hotfix branch, emergency deploy |
| L3 | Security incident, data loss | RB-004, RB-001, notify owner |
| L4 | Infrastructure outage | Vercel/Firebase status, failover |