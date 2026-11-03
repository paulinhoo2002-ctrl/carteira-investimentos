# Financial Invariants

## Core Principle
**All financial calculations are pure, deterministic functions with explicit contracts. No side effects, no hidden state, no approximations.**

---

## Asset Valuation (finance-core.js)

### Normal Assets (Stocks, FIIs, ETFs, BDRs, Crypto)
```javascript
// Applied value (cost basis)
assetAppliedValue(asset) = asset.quantity * asset.avgPrice

// Current value (market value)
assetCurrentValue(asset) = asset.quantity * asset.currentPrice

// Return percentage
assetRentabPct(asset) = 
  asset.currentPrice && asset.avgPrice > 0
    ? ((asset.currentPrice - asset.avgPrice) / asset.avgPrice) * 100
    : null

// Income (dividends/JCP) - only for RV/FII/ETF
assetJurosValue(asset) = asset.type === 'fixed-income' ? 0 : asset.dividendsYTD || 0
```

### Fixed Income Assets (CDB, LCI, LCA, CRI, CRA, Debêntures, Tesouro)
**Delegated to `rfValues` adapter (rf-engine.js)**
```javascript
// Returns: { applied, current, profit, rentab, gross, net, tax }
rfValues(asset, benchmarkSeries, asOfDate)
```

**Invariants:**
- `applied` = principal invested (never changes unless buy/sell)
- `current` = mark-to-market using benchmark curve
- `profit` = current - applied (can be negative)
- `rentab` = profit / applied × 100
- `gross` = current before tax
- `net` = current after tax (if taxable)
- **Never** invent principal basis for open positions

---

## Portfolio Aggregation

### Total Applied (Cost Basis)
```javascript
portfolioApplied = sum(assetAppliedValue(a) for a in assets)
```

### Total Current (Market Value)
```javascript
portfolioCurrent = sum(assetCurrentValue(a) for a in assets)
```

### Total Return (Unrealized)
```javascript
portfolioRentabPct = portfolioApplied > 0
  ? ((portfolioCurrent - portfolioApplied) / portfolioApplied) * 100
  : null
```

### Total Income (Received)
```javascript
portfolioIncomeYTD = sum(assetJurosValue(a) for a in assets)
```

---

## Dividend/Provento Contracts

### Declared vs Received
```typescript
interface Dividend {
  status: 'declared' | 'received' | 'cancelled';
  // ONLY 'received' counts in portfolioIncomeYTD
}
```

### Normalization Rules
1. **JCP** → tax withheld at source (15%), net = gross × 0.85
2. **Dividendos** → tax exempt for PF, net = gross
3. **Amortização** → return of capital, reduces avgPrice
4. **Resgate** → return of capital, reduces quantity
5. **Split/Grupamento** → adjust quantity, avgPrice inversely

---

## Fixed Income Specifics

### Benchmark Curve (CDI/IPCA)
```typescript
interface BenchmarkPoint {
  date: string;       // YYYY-MM-DD (business day)
  value: number;      // % a.a. (CDI) or index value (IPCA)
}
```

### Mark-to-Market
- **PREFIXADO:** Discount future cash flows at current curve
- **CDI:** Accrue daily CDI factor × (rate/100)
- **IPCA:** Accrue inflation index × (rate/100)
- **SELIC:** Accrue daily SELIC factor

### Tax Treatment
| Type | Tax Rate | Regressive? |
|------|----------|-------------|
| CDB/LCI/LCA (≤180d) | 22.5% | Yes |
| CDB/LCI/LCA (181-360d) | 20% | Yes |
| CDB/LCI/LCA (361-720d) | 17.5% | Yes |
| CDB/LCI/LCA (>720d) | 15% | Yes |
| CRI/CRA | 15% | No (isento PF) |
| Debêntures | 15-22.5% | Yes |
| Tesouro Direto | 15-22.5% | Yes |

---

## Invariants Checklist (CI Gate)

### M567 - Functional Coverage
- [ ] `assetAppliedValue` deterministic for all input types
- [ ] `assetCurrentValue` handles missing price → null
- [ ] `assetRentabPct` handles zero cost basis → null
- [ ] RF delegation preserves all 6 return fields

### M595 - Owner-Only Security
- [ ] Firestore rules: `request.auth.uid == OWNER_UID`
- [ ] `request.auth.token.email_verified == true`
- [ ] `request.auth.token.email == OWNER_EMAIL`

### M862 - XLSX Lazy Load
- [ ] `xlsxInInitialLoad === 0` (not in initial bundle)
- [ ] `ensureXLSX()` loads on demand with integrity check
- [ ] Cold load < 700KB (was 1026KB)

### M1401 - Passive Income Projection
- [ ] Monte Carlo uses explicit scenarios (base/optimistic/pessimistic)
- [ ] Reinvestment rate configurable per scenario
- [ ] Tax impact calculated per scenario
- [ ] DRIP modeled as compound growth

### M1411 - Dividend Evolution
- [ ] Timeline grouped by ticker/month/year/type
- [ ] YoY growth: (yearN - yearN-1) / yearN-1
- [ ] Seasonality: 12-month average per month
- [ ] Top payers: by total received, not yield

### M1421 - Asset Class Comparison
- [ ] Classification: RF/RV/FII/ETF/Intl/Crypto (deterministic)
- [ ] Drift = current% - target%
- [ ] Rebalance actions: prioritize largest drift
- [ ] Risk score: concentration + credit + liquidity

### M1431 - Wealth Goals
- [ ] Progress = current / target × 100
- [ ] Months to target: (target - current) / monthlyContribution
- [ ] Monte Carlo: 1000 simulations, report P10/P50/P90
- [ ] Status: on-track (>90%), at-risk (70-90%), off-track (<70%)

### M1441 - Financial Insights
- [ ] Health score: weighted (concentration 30%, drift 25%, dividends 20%, duplicates 15%, stale 10%)
- [ ] Alerts: actionable, specific asset, severity
- [ ] Anomalies: evidence-based, not heuristic
- [ ] Opportunities: quantified impact, effort estimate

---

## Prohibited Patterns

| Pattern | Why | Alternative |
|---------|-----|-------------|
| `|| 0` on financial values | Masks missing data | Return `null`, handle explicitly |
| `Math.round()` in formulas | Precision loss | Round only at display layer |
| Mutating input assets | Breaks referential transparency | Return new object |
| Implicit type coercion | `"" * 5 === 0` hides bugs | Explicit `Number()` + validation |
| Hardcoded tax rates | Regulatory changes | Config in `tax-rules.js` |
| Estimating missing prices | False precision | Mark `unavailable`, don't guess |

---

## Versioning
| Formula | Version | Changed | Author |
|---------|---------|---------|--------|
| assetAppliedValue | v1.0 | - | Original |
| assetCurrentValue | v1.0 | - | Original |
| assetRentabPct | v1.1 | null on zero basis | M567 |
| rfValues | v2.0 | Delegation pattern | M940 |
| rfValues | v2.1 | 6-field return | M1040 |

---

## Audit Trail
Every financial result must carry:
```typescript
interface Provenance {
  source: 'manual' | 'b3' | 'broker' | 'official' | 'engine';
  timestamp: string;
  version: string;
  hash?: string;           // SHA-256 of input
}
```