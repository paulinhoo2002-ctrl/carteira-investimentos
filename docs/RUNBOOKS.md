# Runbooks

## RB-001: Firestore Backup Restore
**Trigger:** Data loss, corruption, accidental deletion  
**RTO Target:** < 30 min  
**RPO Target:** < 5 min

### Steps
1. **Identify scope** - Which collections affected?
2. **Stop writes** - Deploy `allow write: if false` to firestore.rules
3. **Find valid backup** - `npm run backup:list` → pick latest verified
4. **Dry-run** - `npm run backup:restore --backup=<id> --dry-run`
5. **Restore** - `npm run backup:restore --backup=<id>`
6. **Verify** - `npm run backup:verify --backup=<id>`
7. **Re-enable writes** - Deploy normal firestore.rules
8. **Post-restore tests** - `npm test`

### Validation Checklist
- [ ] Document counts match per collection
- [ ] Portfolio values sum correctly
- [ ] SHA-256 hash matches backup manifest
- [ ] All tests pass

---

## RB-002: Firebase Credential Rotation
**Trigger:** Credential leak, service account compromise  
**RTO Target:** < 15 min  
**RPO Target:** 0

### Steps
1. **Revoke leaked key** - Firebase Console → Service Accounts → Revoke
2. **Rotate all related** - Firebase, Vercel, GitHub secrets
3. **Force global logout** - `firebase auth revokeRefreshTokens <uid>`
4. **Audit access logs** - Firebase, Cloudflare, Vercel
5. **Update CI/CD** - New secrets in GitHub/Vercel
6. **Test auth flow** - Login, verify data access

---

## RB-003: Vercel Deploy Rollback
**Trigger:** Broken production deploy  
**RTO Target:** < 15 min  
**RPO Target:** 0

### Steps
1. **Identify last good** - Vercel Dashboard → Deployments
2. **Rollback CLI** - `vercel rollback <deployment-url> --token=$VERCEL_TOKEN`
3. **Or Git revert** - `git revert HEAD && git push origin main`
4. **Verify** - Smoke test production URL

---

## RB-004: Security Incident Response
**Trigger:** P0/P1 security event  
**Classification:**
- **P0:** Active breach, data exfiltration, ransomware
- **P1:** Vulnerability exploited, unauthorized access
- **P2:** Suspicious activity, failed exploit attempts
- **P3:** Policy violation, misconfiguration

### P0 Response (< 30 min)
1. Activate Cloudflare "Under Attack Mode"
2. Block attacker IPs (Cloudflare Firewall)
3. Enable aggressive rate limiting
4. Revoke compromised credentials (RB-002)
5. Notify owner (Telegram + Email)
6. Preserve logs for forensics

### Communication Template
```
🚨 P0: [Summary] - Iniciado as HH:MM
Acao: [Containment action]
ETA: XX min
Proximo update: HH:MM
```

---

## RB-005: Dependency Vulnerability Response
**Trigger:** `npm audit` reports high/critical  
**RTO Target:** < 1 hour

### Steps
1. `npm audit --json` → identify affected packages
2. Check if direct or transitive dependency
3. If direct: `npm update <pkg>` → test → commit
4. If transitive: check if `npm audit fix` resolves
5. If no fix: assess risk, consider fork/patch
6. Document in DEPENDENCY_AUDIT_REPORT.md

---

## RB-006: Service Worker Update Failure
**Trigger:** SW not updating, users on stale version  
**RTO Target:** < 30 min

### Steps
1. Check SW version in console: `caches.keys()`
2. Verify `Service-Worker-Allowed: /` header
3. Force update: `registration.update()` in console
4. If cache corruption: unregister SW, clear cache
5. Deploy new SW version (bump version in sw.js)

---

## RB-007: Build Failure in CI
**Trigger:** GitHub Actions build fails  
**RTO Target:** < 30 min

### Steps
1. Check logs for specific error
2. Common fixes:
   - `npm ci` failure → check package-lock.json
   - Build failure → check TypeScript/ESLint errors
   - Test failure → run locally, fix flaky test
3. If env issue: check Node version, cache
4. Re-run workflow after fix

---

## RB-008: Offline Mode / PWA Issues
**Trigger:** Users report offline not working  
**RTO Target:** < 1 hour

### Steps
1. Check SW registration: `navigator.serviceWorker.controller`
2. Verify cache: `caches.open('carteira-investimentos-v252')`
3. Check manifest: `/manifest.json` loads correctly
4. Verify SW scope covers all routes
5. Test install prompt: `beforeinstallprompt` event

---

## Contact Matrix
| Role | Channel | P0 | P1 | P2/P3 |
|------|---------|----|-----|-------|
| Owner | Telegram @paulinhoo2002 | ✅ | ✅ | ❌ |
| DevOps | Internal log | ✅ | ✅ | ✅ |

---

## Postmortem Template
**Incident:** [ID] - [Title]  
**Date:** YYYY-MM-DD HH:MM  
**Duration:** XX min  
**Severity:** P0/P1/P2/P3  

**Root Cause:** [5 Whys analysis]  
**Impact:** [Users affected, data lost, downtime]  
**Resolution:** [Steps taken]  

**Action Items:**
- [ ] Fix: [description] - Owner: [name] - Due: [date]
- [ ] Prevent: [description] - Owner: [name] - Due: [date]
- [ ] Detect: [description] - Owner: [name] - Due: [date]

**Lessons Learned:** [What worked, what didn't]