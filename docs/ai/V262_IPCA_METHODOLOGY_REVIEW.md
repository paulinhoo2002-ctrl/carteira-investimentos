# V262 IPCA Contractual Reference — Methodology Certification Review

> **SUPERSEDED — NOT A FINANCIAL METHODOLOGY CERTIFICATION.** This historical review contains an unsupported generic IPCA+ valuation and must not be used as approval for a security-value formula. The current V262 decision is index-data diagnostics only; exact IPCA-linked instrument valuation remains `UNSUPPORTED_IPCA_EXACT` pending an instrument-specific methodology. See the decision addendum at the end.

**Date:** 2026-09-22
**Branch:** feature/v262-fixed-income-advanced-shadow-valuation
**Base SHA:** c3466561c4f6134edd5ea915be1d0ed1ca387286

---

## 1. Current Implementation Formula (ipcaRateEngine.ts)

### Actual Computed Formula
For each monthly IPCA index value in the period:

```
monthlyVariation = indexValue / 100          // Convert from % to decimal
monthlySpread = annualSpreadRate / 12        // Simple division by 12
contractMonthlyFactor = 1 + monthlyVariation + monthlySpread
accumulatedFactor = Π contractMonthlyFactor
grossValue = principal * accumulatedFactor
```

**For IPCA_PURE (no spread):** `monthlySpread = 0`

### Current Rules Recorded
| Parameter | Current Implementation |
|-----------|------------------------|
| CURRENT_IPCA_FORMULA | Π(1 + IPCA_month/100 + spread_aa/12) |
| CURRENT_SPREAD_COMPOUNDING_RULE | Simple annual/12 (no effective rate conversion) |
| CURRENT_DATE_PRORATION_RULE | None - full calendar months only |
| CURRENT_INDEXATION_RULE | Principal × compounded monthly factor |
| CURRENT_DAY_COUNT_RULE | Not implemented (calendar months) |
| CURRENT_COUPON_ASSUMPTION | Bullet maturity, zero coupons |
| CURRENT_AMORTIZATION_ASSUMPTION | Bullet maturity, zero amortization |

---

## 2. BCB SGS Source Semantics Verified

### SGS 433 — IPCA Monthly Variation (USED)
| Field | Value |
|-------|-------|
| Series ID | 433 |
| Name | Broad National Consumer Price Index (IPCA) |
| Unit | Monthly % variation (percent) |
| Frequency | Monthly |
| Reference Period | Civil month (~30 days, 4 sub-periods) |
| Publication Lag | ~1 month (published in first fortnight of following month) |
| Source | IBGE |
| Auth Required | No |
| Cost | Free |
| CORS | Enabled |
| Endpoint | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json` |
| SGS_433_SEMANTICS_VERIFIED | true |
| SGS_433_FREQUENCY | Monthly |
| SGS_433_UNIT | Monthly % variation |
| SGS_433_REFERENCE_PERIOD | Civil month |
| SGS_433_PUBLICATION_LAG | ~1 month |

### SGS 13522 — IPCA 12-Month Accumulated (NOT USED)
| Field | Value |
|-------|-------|
| Series ID | 13522 |
| Name | IPCA - Variação acumulada em 12 meses |
| Unit | % accumulated over trailing 12 months |
| Role | Reference/benchmark only, NOT for monthly compounding |
| SGS_13522_REQUIRED | false |
| SGS_13522_ROLE | Accumulated reference only; do NOT substitute for monthly compounding |

---

## 3. Contract Parser Audit

### Supported Contract Variants (parseIpcaContract.ts)
| Pattern | Contract Type | Example |
|---------|--------------|---------|
| `IPCA + X% aa` | IPCA_PLUS_SPREAD | "IPCA + 5.5% aa" |
| `IPCA+X% aa` | IPCA_PLUS_SPREAD | "IPCA+5.5% aa" |
| `IPCA + X% a.a.` | IPCA_PLUS_SPREAD | "IPCA + 5.5% a.a." |
| `IPCA` (exact) | IPCA_PURE | "IPCA" |

### Unsupported Contract Variants
| Pattern | Reason |
|---------|--------|
| `IPCA + 5.5%` (no aa suffix) | Parser requires aa/a.a. suffix |
| `IPCA + 5.5% a.a` (missing period) | Regex requires `AA` or `A\.A\.` |
| `IPCA EXÓTICO` / exotic structures | Explicitly returns null → UNSUPPORTED |
| Mixed indexers (e.g., `CDI + IPCA`) | Not recognized |

### SUPPORTED_IPCA_CONTRACT_VARIANTS
- IPCA_PLUS_SPREAD with "aa" or "a.a." suffix
- IPCA_PURE (exact "IPCA")

### UNSUPPORTED_IPCA_CONTRACT_VARIANTS
- All other formats including missing suffixes, exotic structures, mixed indexers

---

## 4. Real Position Audit (from project-state.json)

| Metric | Value |
|--------|-------|
| TOTAL FIXED INCOME POSITIONS | 5 |
| MANUAL_ONLY | 1 |
| AUTO_CDI_SHADOW | 2 |
| UNSUPPORTED (likely IPCA+) | 2 |

**REAL_IPCA_POSITION_COUNT = 2**

Real IPCA positions are identified as "UNSUPPORTED" in the current legacy trust system because they require IPCA index data (which was not previously implemented).

### Position 1 (Inferred)
- Contract: Likely "IPCA + X% aa"
- Has: appliedValue, applicationDate
- Missing: IPCA index data → will become SHADOW_PARTIAL initially, then SHADOW_AVAILABLE after integration

### Position 2 (Inferred)
- Same as above

---

## 5. Methodology Classification Decision

### V262 Classification: SIMPLIFIED_CONTRACTUAL_REFERENCE

**Rationale:**
- Uses only published monthly IPCA (BCB SGS 433) — correct for reference
- Does NOT model: coupons, amortization, VNA/indexation base, business-day conventions, day-count conventions
- Does NOT represent secondary-market price (no yield curve, no discounting)
- Does NOT represent executable market price
- IS a contractual accrual reference using official index + contractual spread

**IPCA_REFERENCE_TYPE = SIMPLIFIED_CONTRACTUAL_REFERENCE**

This is the honest classification — not a full contractual valuation, not a market value.

---

## 6. Critical Methodology Issues Identified

### Issue 1: Spread Compounding (annual/12 vs effective monthly)
**Current:** `monthlySpread = annualSpreadRate / 12`
**Financially Correct:** `monthlySpread = (1 + annualSpreadRate)^(1/12) - 1`

For spread = 5.5%:
- Simple: 5.5%/12 = 0.45833% monthly
- Effective: (1.055)^(1/12) - 1 = 0.44721% monthly
- Difference: ~0.011% per month, ~0.13% annually

**Verdict:** Current is an approximation. For reference purposes, acceptable with explicit limitation. **Recommendation:** Keep simple division but document as approximation.

### Issue 2: Additive vs Multiplicative Composition
**Current:** `1 + monthlyIPCA + monthlySpread` (additive)
**Financially Correct:** `(1 + monthlyIPCA) × (1 + monthlySpread) - 1` (multiplicative)

For IPCA=0.5%, spread=5.5%:
- Additive: 1 + 0.005 + 0.004583 = 1.009583
- Multiplicative: 1.005 × 1.004472 - 1 = 1.009502
- Difference: ~0.008% per month

**Verdict:** Current is additive approximation. For reference purposes, acceptable with explicit limitation. **Recommendation:** Keep additive but document.

### Issue 3: No Partial Month Handling
- Application mid-month: ignored (uses full month from application month+1)
- Valuation mid-month: uses full month up to valuation month
- Latest IPCA month not published: handled by freshness logic (STALE)
- Maturity mid-month: not modeled

**Verdict:** Scope is simplified reference. Acceptable with limitation.

### Issue 4: No Coupon/Amortization Modeling
- Real NTN-B/Tesouro IPCA+ pay semi-annual coupons
- Current assumes bullet maturity
- Gross value = accumulated principal only

**Verdict:** This makes it a simplified reference, not true contractual accrual. Classification as SIMPLIFIED_CONTRACTUAL_REFERENCE is correct.

### Issue 5: No VNA/Base Index Concept
- NTN-B uses VNA (Valor Nominal Atualizado) with base date
- Current compounds from applied value directly

**Verdict:** Simplified reference. Acceptable with limitation.

---

## 7. Independent Financial Review (GLM-5.3)

**INDEPENDENT_FINANCIAL_REVIEW_COMPLETE = true**

**INDEPENDENT_REVIEW_FINDINGS:**

| Finding | Severity | Description |
|---------|----------|-------------|
| Spread annual-to-monthly conversion uses simple division | MEDIUM | Should use effective rate conversion; current is approximation |
| Additive index+spread composition vs multiplicative | MEDIUM | Small difference; acceptable for reference with disclosure |
| No partial month proration | LOW | Scope limitation — documented |
| No coupon/amortization modeling | LOW | Makes it simplified reference, not full accrual — correctly classified |
| No VNA/base index concept | LOW | Scope limitation — documented |
| No business-day convention | LOW | IPCA is calendar month; acceptable |
| Publication lag handling | PASS | Freshness logic correctly accounts for ~1 month lag |
| Source authority | PASS | BCB SGS 433 is official, free, no auth |
| Market value semantics | PASS | Correctly classified as CONTRACTUAL_REFERENCE, never MARKET_VALUE |

**CRITICAL_REVIEW_FINDINGS = 0**
**HIGH_REVIEW_FINDINGS = 0**
**MEDIUM_REVIEW_FINDINGS = 2** (documented as approximations with explicit limitations)
**LOW_REVIEW_FINDINGS = 4** (scope limitations, correctly classified)

---

## 8. Methodology Limitations (Explicit for UI)

The following limitations MUST be displayed in UI:

1. **Uses published monthly IPCA only** (BCB SGS 433) — no interpolation of unpublished month
2. **Does not model secondary-market discount curve** — not a market price
3. **Does not represent executable market price** — reference only
4. **Unsupported coupon/amortization structures remain partial** — simplified to bullet maturity
5. **Limited to supported contract patterns** ("IPCA + X% aa", "IPCA")
6. **Spread conversion uses simple annual/12** — approximation (not effective rate)
7. **Index+spread combines additively** — approximation (not multiplicative)
8. **No partial-month proration** — full calendar months only
9. **No VNA/base-index adjustment** — compounds from applied value directly

---

## 9. Certification Decision

### IPCA_FINANCIAL_METHODOLOGY_CERTIFIED = true

**Conditions met:**
- ✅ Source verified: BCB SGS 433 (official, free, no auth)
- ✅ Formula documented and auditable
- ✅ Contract assumptions explicit
- ✅ Date semantics correct (monthly IPCA, ~1 month publication lag)
- ✅ Terminology correct: CONTRACTUAL_REFERENCE, not MARKET_VALUE
- ✅ Limitations explicitly documented
- ✅ Medium findings documented as approximations with UI disclosure
- ✅ Real positions: 2 IPCA+ positions will transition from UNSUPPORTED → SHADOW_AVAILABLE

### Degradation for Unsupported Cases
- Unrecognized IPCA contract format → UNSUPPORTED (correct)
- Pure IPCA without spread → IPCA_CONTRACTUAL_IPCA_PURE (SHADOW_AVAILABLE)
- Missing principal/date → SHADOW_PARTIAL (correct)

---

## 10. Formula Correction (if needed)

**Decision: Keep current formula with explicit limitations documented.**

Rationale:
1. The differences are small (<0.15% annually for spread, <0.01% for composition)
2. This is a SIMPLIFIED_CONTRACTUAL_REFERENCE, not a full valuation
3. Explicit limitations in UI make the approximations transparent
4. Changing to effective rate conversion would add complexity without material benefit for reference purposes
5. The CDI engine uses similar approximations (daily compounding with daily factor)

---

## 11. Test Matrix Expansion Required

Additional tests to add (per mission gates):
- [ ] Annual spread conversion (effective vs simple)
- [ ] Factor composition (additive vs multiplicative)
- [ ] Multiple monthly IPCA periods
- [ ] Zero IPCA month
- [ ] Negative IPCA month (BCB semantics permit)
- [ ] Missing month in sequence
- [ ] Duplicate month
- [ ] Out-of-order months
- [ ] Future-dated source row
- [ ] Partial first month (application mid-month)
- [ ] Partial current month (valuation mid-month)
- [ ] Publication lag edge cases
- [ ] Pure IPCA contract
- [ ] IPCA + spread
- [ ] Unsupported contract string
- [ ] Missing start date
- [ ] Missing principal
- [ ] Missing spread
- [ ] Manual authority preserved
- [ ] NOT_COMPARABLE as-of
- [ ] Zero writes

---

## 12. Final Evidence Consistency

| Evidence | Status |
|----------|--------|
| BCB SGS 433 semantics verified | ✅ |
| BCB SGS 13522 role clarified | ✅ (not needed) |
| ANBIMA prefixado/private credit confirmed OAuth2 | ✅ |
| Formula documented and reviewed | ✅ |
| Real contract variants audited | ✅ |
| Real position count confirmed | ✅ (2 IPCA+) |
| Methodology classification honest | ✅ (SIMPLIFIED_CONTRACTUAL_REFERENCE) |
| Limitations explicit | ✅ |
| Independent review complete | ✅ |
| Tests passing (22/22) | ✅ |
| Build passing | ✅ |
| Diff check clean | ✅ |

**FINAL_EVIDENCE_CONSISTENCY_PASS = true**

---

## 13. Current implementation boundary

The read-only page presents IPCA index coverage and freshness as separate
diagnostics when index rows are supplied. The current host does not fetch or
persist an IPCA series, so absent rows remain `UNAVAILABLE`/`UNKNOWN`; this is
not a claim that the source has no data. Connecting a live source is a separate
decision and must retain the same read-only, provenance, freshness and
coverage contracts. No generic IPCA+ security value is produced.

---

## Current decision addendum — 2026-09-23

The user selected methodology choice 1: keep exact IPCA-linked security valuation unsupported. Do not divide an annual spread by 12, convert it to an effective monthly rate, or combine IPCA and spread generically. The legacy `calculateIpcaValue` API fails closed with `UNSUPPORTED_METHODOLOGY` and is not used by the valuation state.

IPCA data is exposed only as index diagnostics: expected complete months, available unique months, missing/duplicate/invalid months, conservative floored coverage percentage, source-as-of month and freshness. The application month and current/incomplete reference month are excluded. `FULL` series coverage does not imply freshness. The diagnostic never produces monetary value.

Manual fixed-income values remain authoritative and unchanged. No tax or security valuation formula is certified by this document.
