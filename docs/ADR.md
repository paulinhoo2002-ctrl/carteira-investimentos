# Architecture Decision Records (ADR)

## ADR-001: Single-Page Application with Vanilla JS
**Date:** 2024-10-01  
**Status:** Accepted  
**Context:** Need offline-first PWA for investment portfolio management  
**Decision:** Use vanilla ES modules + Vite, no framework  
**Consequences:** Small bundle (~350KB gzipped), full control, no framework lock-in

## ADR-002: Firebase Auth + Firestore (Owner-Only)
**Date:** 2024-10-15  
**Status:** Accepted  
**Context:** Secure single-user financial data  
**Decision:** Hardcoded UID + email_verified + email match in Firestore rules  
**Consequences:** Zero multi-tenant complexity, fail-closed by default

## ADR-003: Service Worker v252 with Periodic Sync
**Date:** 2024-10-25  
**Status:** Accepted  
**Context:** Offline support + background data refresh  
**Decision:** SW with stale-while-revalidate, background sync (IndexedDB queue), periodic sync (24h data, 1h analytics, 7d cleanup)  
**Consequences:** Works offline, auto-syncs when online, no user action needed

## ADR-004: XLSX Lazy Loading (M862)
**Date:** 2024-10-20  
**Status:** Accepted  
**Context:** 269KB xlsx.full.min.js blocking cold load  
**Decision:** Dynamic import with integrity check, load on demand  
**Consequences:** -26% cold load (1026KB → 675KB), xlsxInInitialLoad=0

## ADR-005: Code Splitting via CodeSplitter (M1451)
**Date:** 2024-10-25  
**Status:** Accepted  
**Context:** 9 analytics modules loading eagerly  
**Decision:** CodeSplitter class with lazy load, cache, preload, bundle registration  
**Consequences:** Analytics modules load on tab activation, not at startup

## ADR-006: Financial Invariants as Pure Functions
**Date:** 2024-10-01  
**Status:** Accepted  
**Context:** Regulatory compliance, auditability  
**Decision:** All calculations in finance-core.js as pure, deterministic functions  
**Consequences:** Testable, reproducible, no side effects, versioned formulas

## ADR-007: CSP with SRI for External Resources
**Date:** 2024-10-25  
**Status:** Accepted  
**Context:** Supply chain security for Google Fonts/APIs  
**Decision:** SHA-384 hashes in CSP header + meta tag + integrity attributes  
**Consequences:** Tamper-proof CDN resources, defense-in-depth

## ADR-008: Manifest v2 + SW v252 PWA Foundation
**Date:** 2024-10-25  
**Status:** Accepted  
**Context:** Installable, offline-capable app  
**Decision:** Manifest v2 (standalone, shortcuts, protocol handlers) + SW v252  
**Consequences:** Native-like experience, background sync, install prompts

## ADR-009: Security Regression Test Suite (M1570)
**Date:** 2024-10-25  
**Status:** Accepted  
**Context:** Prevent security regressions  
**Decision:** 50 automated tests covering CSP, headers, SRI, Firebase rules, secrets, deps  
**Consequences:** CI gate for security, documented baseline

## ADR-010: Release Automation with Semantic Release
**Date:** 2024-10-25  
**Status:** Accepted  
**Context:** Manual releases error-prone  
**Decision:** semantic-release + conventional commits + Vercel preview + auto-rollback  
**Consequences:** Zero-touch releases, traceable versions, rollback <5min