# API Contracts

## Firebase Auth
```typescript
interface AuthConfig {
  apiKey: string;           // redacted in source
  authDomain: string;       // "carteira-de-investimento-16725.firebaseapp.com"
  projectId: string;        // "carteira-de-investimento-16725"
  storageBucket: string;    // "carteira-de-investimento-16725.firebasestorage.app"
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}
```

## Firestore Collections

### /portfolios/{userId}
```typescript
interface Portfolio {
  assets: Asset[];
  accounts: Account[];
  goals: Goal[];
  updatedAt: Timestamp;
}
```

### /users/{userId}
```typescript
interface UserProfile {
  email: string;            // "paulinhoo2002@gmail.com"
  displayName: string;
  createdAt: Timestamp;
  settings: UserSettings;
}
```

### /meta/access
```typescript
interface AccessControl {
  ownerUid: string;         // "yaypxiiv7Ye7pwpDZ0nqhG3Yj7E3"
  ownerEmail: string;       // "paulinhoo2002@gmail.com"
  allowedUids: string[];    // [ownerUid]
}
```

## Asset Schema
```typescript
interface Asset {
  id: string;               // unique identifier
  ticker: string;           // "PETR4", "HGLG11"
  name: string;             // "Petrobras PN"
  type: 'stock' | 'fii' | 'etf' | 'fixed-income' | 'bdr' | 'crypto';
  sector?: string;
  quantity: number;
  avgPrice: number;         // preço médio
  currentPrice?: number;    // cotação atual
  category: 'RV' | 'RF' | 'FII' | 'ETF' | 'BDR' | 'CRYPTO' | 'INTL';
  currency: 'BRL' | 'USD';
  metadata?: Record<string, unknown>;
}
```

## Fixed Income Asset
```typescript
interface FixedIncomeAsset extends Asset {
  type: 'fixed-income';
  subtype: 'CDB' | 'LCI' | 'LCA' | 'CRI' | 'CRA' | 'DEB' | 'TESOURO' | 'LF';
  indexer: 'CDI' | 'IPCA' | 'PREFIXADO' | 'SELIC';
  rate: number;             // % do indexer ou taxa fixa
  maturityDate: string;     // YYYY-MM-DD
  issueDate?: string;
  grossValue: number;       // valor bruto
  netValue?: number;        // valor líquido (após IR)
  taxRate?: number;         // alíquota IR
  isRegressiveTax: boolean;
  dailyLiquidity: boolean;
}
```

## Movement/Transaction
```typescript
interface Movement {
  id: string;
  assetId: string;
  type: 'buy' | 'sell' | 'dividend' | 'jcp' | 'split' | 'merge' | 'subscription' | 'amortization' | 'redemption' | 'tax';
  date: string;             // YYYY-MM-DD
  quantity: number;
  price: number;
  total: number;
  fees?: number;
  taxes?: number;
  source: 'manual' | 'b3' | 'broker' | 'official';
  provenanceHash?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}
```

## Dividend/Provento
```typescript
interface Dividend {
  id: string;
  assetId: string;
  ticker: string;
  type: 'dividend' | 'jcp' | 'interest' | 'amortization' | 'redemption';
  date: string;             // ex-date
  payDate: string;          // payment date
  valuePerShare: number;
  quantity: number;
  grossValue: number;
  netValue: number;
  taxWithheld: number;
  source: 'b3' | 'official' | 'manual';
  status: 'declared' | 'received' | 'cancelled';
}
```

## Goal
```typescript
interface Goal {
  id: string;
  name: string;
  targetValue: number;
  currentValue: number;
  targetDate: string;       // YYYY-MM-DD
  category: 'emergency' | 'retirement' | 'house' | 'education' | 'custom';
  monthlyContribution: number;
  expectedReturn: number;   // % a.a.
  status: 'active' | 'completed' | 'paused';
}
```

## Analytics Module Contracts

### PassiveIncomeProjection (M1401)
```typescript
interface ProjectionInput {
  portfolio: Asset[];
  dividends: Dividend[];
  horizonMonths: number;
  scenarios: {
    base: { reinvestRate: number; taxRate: number };
    optimistic: { reinvestRate: number; taxRate: number };
    pessimistic: { reinvestRate: number; taxRate: number };
  };
}

interface ProjectionOutput {
  monthly: {
    month: string;
    projectedIncome: number;
    reinvested: number;
    cumulative: number;
  }[];
  summary: {
    totalProjected: number;
    totalReinvested: number;
    finalValue: number;
    cagr: number;
  };
  monteCarlo: {
    p10: number;
    p50: number;
    p90: number;
  };
}
```

### DividendEvolution (M1411)
```typescript
interface EvolutionInput {
  dividends: Dividend[];
  groupBy: 'ticker' | 'month' | 'year' | 'type';
}

interface EvolutionOutput {
  timeline: {
    period: string;
    tickers: { ticker: string; total: number; count: number }[];
  }[];
  yoyGrowth: { year: number; growth: number; total: number }[];
  seasonality: { month: number; avgValue: number; frequency: number }[];
  topPayers: { ticker: string; total: number; avgYield: number }[];
}
```

### AssetClassComparison (M1421)
```typescript
interface ComparisonInput {
  assets: Asset[];
  targetAllocation: Record<string, number>;  // % por classe
}

interface ComparisonOutput {
  current: { class: string; value: number; pct: number; count: number }[];
  target: { class: string; targetPct: number; drift: number }[];
  rebalanceActions: {
    class: string;
    action: 'buy' | 'sell';
    amount: number;
    priority: number;
  }[];
  riskScore: number;  // 0-100
}
```

### WealthGoalsTracking (M1431)
```typescript
interface GoalTrackingInput {
  goals: Goal[];
  portfolioValue: number;
  monthlyIncome: number;
}

interface GoalTrackingOutput {
  goals: {
    goal: Goal;
    progress: number;           // 0-100
    monthsToTarget: number;
    requiredMonthly: number;
    monteCarlo: { p10: number; p50: number; p90: number };
    status: 'on-track' | 'at-risk' | 'off-track';
    milestones: { value: number; date: string; achieved: boolean }[];
  }[];
}
```

### FinancialInsights (M1441)
```typescript
interface InsightsOutput {
  healthScore: number;          // 0-100
  alerts: {
    type: 'concentration' | 'drift' | 'stale-dividends' | 'duplicates' | 'missing-prices';
    severity: 'high' | 'medium' | 'low';
    message: string;
    affectedAssets: string[];
    action: string;
  }[];
  anomalies: {
    type: 'duplicate-dividend' | 'missing-price' | 'negative-quantity' | 'orphan-movement';
    details: string;
    severity: 'error' | 'warning';
  }[];
  opportunities: {
    type: 'rebalance' | 'tax-loss-harvest' | 'dividend-reinvest' | 'intl-diversification';
    description: string;
    estimatedImpact: number;
    effort: 'low' | 'medium' | 'high';
  }[];
}
```

## Error Responses
```typescript
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}
```

## Rate Limits (Cloudflare)
| Endpoint | Limit | Window |
|----------|-------|--------|
| /login | 5 req | 1 min |
| /write (mutations) | 30 req | 1 min |
| /read (queries) | 120 req | 1 min |
| /api/* | 200 req | 1 min |