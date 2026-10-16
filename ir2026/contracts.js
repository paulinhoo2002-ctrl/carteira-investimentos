'use strict';
// ============================================================================
// IR2026 — Fiscal domain contracts (Carteira LEGACY)
// Mission: LEGACY_IR2026_FISCAL_FOUNDATION
//
// Protected semantics (governance): UNKNOWN != ZERO, MISSING != ZERO,
// PARTIAL != COMPLETE, EXPECTED != RECEIVED, CURRENT_AVG_COST != FISCAL_COST,
// ANALYTICAL_FIFO != FISCAL_LEDGER, CURRENT_POSITION != HISTORICAL_RECONSTRUCTION.
// This module is a standalone fiscal engine; it does NOT touch finance-core.js,
// persistence-core.js, the SPA or modern/src, and performs no hosted writes.
// ============================================================================

const FISCAL_START_YEAR = 2026;

// --- P6: Fiscal asset classes ----------------------------------------------
const ASSET_CLASSES = [
  'BRAZIL_STOCK',
  'FII',
  'ETF_BR',
  'BDR',
  'RIGHTS_SUBSCRIPTION',
  'FIXED_INCOME_CDB',
  'FIXED_INCOME_CRA',
  'FIXED_INCOME_DEB',
  'FIXED_INCOME_LIG',
  'CASH',
  'OTHER',
];

const RF_ASSET_CLASSES = [
  'FIXED_INCOME_CDB',
  'FIXED_INCOME_CRA',
  'FIXED_INCOME_DEB',
  'FIXED_INCOME_LIG',
];

// --- P7: Normalized fiscal event types -------------------------------------
const EVENT_TYPES = [
  'BUY',
  'SELL',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'CORPORATE_SPLIT',
  'CORPORATE_REVERSE_SPLIT',
  'BONUS',
  'SUBSCRIPTION',
  'RIGHTS_TRANSFER',
  'TICKER_CHANGE',
  'MERGER',
  'SPINOFF',
  'AMORTIZATION',
  'CAPITAL_RETURN',
  'DIVIDEND',
  'JCP',
  'RF_APPLICATION',
  'RF_REDEMPTION',
  'RF_INTEREST',
  'RF_MATURITY',
  'STOCK_LENDING_INCOME',
  'STOCK_LOAN_OUT',
  'STOCK_LOAN_RETURN',
  'UNKNOWN',
];

// Events that change fiscal ownership quantity of the asset itself.
const QTY_AFFECTING_EVENT_TYPES = new Set([
  'BUY',
  'SELL',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'CORPORATE_SPLIT',
  'CORPORATE_REVERSE_SPLIT',
  'BONUS',
  'SUBSCRIPTION',
  'TICKER_CHANGE',
  'MERGER',
  'SPINOFF',
  'RF_APPLICATION',
  'RF_REDEMPTION',
  'RF_MATURITY',
  'STOCK_LOAN_OUT',
  'STOCK_LOAN_RETURN',
]);

// --- Status enums (never coerced; never defaulted silently) ----------------
const OPENING_STATUS = ['CERTIFIED', 'PARTIAL', 'UNKNOWN', 'NOT_APPLICABLE'];
const COST_STATUS = ['CERTIFIED', 'PARTIAL', 'UNKNOWN', 'NOT_APPLICABLE'];
const EVENT_STATUS = ['CERTIFIED', 'PARTIAL', 'UNKNOWN'];
const INCOME_FISCAL_STATUS = ['RECEIVED', 'EXPECTED', 'PROVISIONED', 'EXCLUDED', 'UNKNOWN'];
const CERTIFICATION_STATE = ['READY', 'PARTIAL', 'BLOCKED'];

// --- P2: Historical source classification ----------------------------------
const SOURCE_TYPES = [
  'OFFICIAL_BROKER_STATEMENT',
  'OFFICIAL_MOVEMENT_EXPORT',
  'OFFICIAL_POSITION_EXPORT',
  'OFFICIAL_HOSTED_SNAPSHOT',
  'LEGACY_IMPORT',
  'DERIVED_NORMALIZED_EVENTS',
  'DERIVED_ANALYTICAL_REPLAY',
  'UNKNOWN_LINEAGE',
];

const AUTHORITY_LEVELS = [
  'OFFICIAL_STATEMENT',      // broker-issued fiscal/tax document
  'OFFICIAL_EXPORT',         // broker-issued movement/position export
  'OFFICIAL_HOSTED_SNAPSHOT',// product-official hosted state (Package 1A)
  'DERIVED',                 // deterministic derivation from official sources
  'HEURISTIC',               // inferred; lowest authority
];

// --- P5: Opening evidence precedence ---------------------------------------
// Lower number wins. Never let FIFO/analytical replay override official
// current/fiscal evidence.
const EVIDENCE_PRECEDENCE = [
  { level: 1, kind: 'OFFICIAL_FISCAL_DOCUMENT' },
  { level: 2, kind: 'OFFICIAL_BROKER_POSITION_COST' },
  { level: 3, kind: 'OFFICIAL_MOVEMENTS_COMPLETE_RECONSTRUCTION' },
  { level: 4, kind: 'DOCUMENTED_PRIOR_SNAPSHOT' },
  { level: 5, kind: 'DERIVED_REPLAY' },
  { level: 6, kind: 'HEURISTIC' },
];

// --- P25: Fiscal certification layers (independent, no global IR_READY) ------
const CERTIFICATION_LAYERS = [
  'OPENING_2026_READY',
  'EVENT_LEDGER_2026_READY',
  'MONTHLY_CLOSE_READY',
  'ANNUAL_CLOSE_READY',
  'LOSS_LEDGER_READY',
  'WITHHOLDING_READY',
  'FISCAL_COST_READY',
  'IR_CALCULATION_READY',
];

// --- P26: Unknown impact model ----------------------------------------------
const UNKNOWN_IMPACT_FLAGS = [
  'AFFECTS_CURRENT_POSITION',
  'AFFECTS_CURRENT_RESULT',
  'AFFECTS_FISCAL_COST',
  'AFFECTS_REALIZED_GAIN',
  'AFFECTS_IR',
  'NO_CURRENT_FISCAL_IMPACT',
];

// --- P18: Tax buckets (categories with distinct tax rules) ------------------
const TAX_BUCKETS = [
  'RV_STOCK_SWING',     // ações, mercado à vista, operações comuns
  'RV_STOCK_DAY_TRADE', // day trade (losses/exemptions incompatible com swing)
  'RV_FII',             // alienação de cotas de FII
  'RV_ETF_BDR',         // ETF / BDR (regras próprias — verificar fonte legal)
  'RF_INCOME',          // renda fixa (IRRF na fonte, regressiva)
  'INCOME_DIVIDEND',
  'INCOME_JCP',
  'INCOME_RF_INTEREST',
  'INCOME_LENDING',
  'OTHER',
];

// Loss carryforward buckets: losses never cross incompatible tax categories.
const LOSS_BUCKETS = ['RV_STOCK_SWING', 'RV_STOCK_DAY_TRADE', 'RV_FII', 'RV_ETF_BDR'];

// --- Asset classification ---------------------------------------------------
// Basis recorded alongside every classification; heuristics are the LAST
// resort and always labeled as such.
function classifyAssetClass(ticker, hints) {
  const t = String(ticker || '').toUpperCase();
  const product = String((hints && hints.product) || '').toUpperCase();
  if (/^CDB/.test(t)) return { assetClass: 'FIXED_INCOME_CDB', basis: 'PREFIX:CDB' };
  if (/^CRA/.test(t)) return { assetClass: 'FIXED_INCOME_CRA', basis: 'PREFIX:CRA' };
  if (/^DEB/.test(t)) return { assetClass: 'FIXED_INCOME_DEB', basis: 'PREFIX:DEB' };
  if (/^LIG/.test(t)) return { assetClass: 'FIXED_INCOME_LIG', basis: 'PREFIX:LIG' };
  if (/^TESOURO|^SELIC|^IPCA|^LTHB|^NTNB/.test(t)) return { assetClass: 'CASH', basis: 'PREFIX:TESOURO' };
  if (/^BDR|^.*34$/.test(t) && /[34]$/.test(t) && !/^[A-Z]{4}(11|12|13)$/.test(t)) {
    // heuristic guard: only non-FII-pattern tickers ending 34 are BDRs
    if (!/^[A-Z]{4}1[1-9]$/.test(t)) return { assetClass: 'BDR', basis: 'HEURISTIC:SUFFIX34' };
  }
  if (/^[A-Z]{4}1[0-5]$/.test(t)) {
    // 11=FII/FIDC, 12/13=units/segments, 14/15=fundos — product name refines DEB
    if (/DEB[NÊ]NCULA|INFRA/.test(product)) return { assetClass: 'FIXED_INCOME_DEB', basis: 'PRODUCT_NAME:DEB' };
    return { assetClass: 'FII', basis: 'PATTERN:FII' };
  }
  if (/[34]$/.test(t) || /^[A-Z]{4,5}\d$/.test(t)) return { assetClass: 'BRAZIL_STOCK', basis: 'PATTERN:BR_SHARE' };
  if (/^(BOVA|SPXI|IVVB|SMAL|HASH|DIVD|NDIV|IMAB|Findo)/.test(t)) return { assetClass: 'ETF_BR', basis: 'PATTERN:ETF' };
  if (product.includes('ET')) return { assetClass: 'ETF_BR', basis: 'PRODUCT_NAME:ETF' };
  return { assetClass: 'OTHER', basis: 'FALLBACK' };
}

function isRfAssetClass(assetClass) {
  return RF_ASSET_CLASSES.includes(assetClass);
}

// Map raw canonical movement types + raw labels to fiscal event types.
// Anything unmappable stays UNKNOWN — never guessed into BUY/SELL.
function normalizeEventType(rawType, rawMovement) {
  const raw = String(rawMovement || '').toUpperCase();
  switch (rawType) {
    case 'BUY': return 'BUY';
    case 'SELL': return 'SELL';
    case 'DIVIDEND': return 'DIVIDEND';
    case 'JCP': return 'JCP';
    case 'AMORTIZATION': return raw.includes('CAPITAL') ? 'CAPITAL_RETURN' : 'AMORTIZATION';
    case 'RF_APPLICATION': return 'RF_APPLICATION';
    case 'RF_REDEMPTION': return /MATUR|VENCIMENTO/.test(raw) ? 'RF_MATURITY' : 'RF_REDEMPTION';
    case 'FEE': return 'UNKNOWN'; // custody/fee rows carry no fiscal qty semantics by themselves
    case 'STOCK_LOAN':
      if (/RETORN|DEVOLU/.test(raw)) return 'STOCK_LOAN_RETURN';
      return 'STOCK_LOAN_OUT';
    case 'TRANSFER_CANDIDATE': return 'UNKNOWN'; // direction is inferred → handled by caller with evidence
    case 'CORPORATE_ACTION':
      if (/LEIL/.test(raw)) return 'RIGHTS_TRANSFER';       // fraction auction (cash out of fractional rights)
      if (/BONIFICA/.test(raw)) return 'BONUS';
      return 'UNKNOWN';
    case 'MARKET_EVENT':
      // quota update / ticker migration (e.g. IRIM11 → IRIM15); handler keeps
      // STATUS=PARTIAL — fiscal effect requires per-case evidence.
      if (/ATUALIZA/.test(raw)) return 'TICKER_CHANGE';
      return 'UNKNOWN';
    default:
      return 'UNKNOWN';
  }
}

// Direction evidence → transfer semantics. PARTIAL direction is NOT promoted
// to a confirmed transfer without SOURCE_EXPLICIT evidence (P13).
function transferSemantics(event) {
  const dir = String(event.DIRECTION || '').toUpperCase();
  if (dir === 'CREDITO' || dir === 'CREDIT') return 'TRANSFER_IN';
  if (dir === 'DEBITO' || dir === 'DEBIT') return 'TRANSFER_OUT';
  return 'TRANSFER_DIRECTION_UNKNOWN';
}

module.exports = {
  FISCAL_START_YEAR,
  ASSET_CLASSES,
  RF_ASSET_CLASSES,
  EVENT_TYPES,
  QTY_AFFECTING_EVENT_TYPES,
  OPENING_STATUS,
  COST_STATUS,
  EVENT_STATUS,
  INCOME_FISCAL_STATUS,
  CERTIFICATION_STATE,
  SOURCE_TYPES,
  AUTHORITY_LEVELS,
  EVIDENCE_PRECEDENCE,
  CERTIFICATION_LAYERS,
  UNKNOWN_IMPACT_FLAGS,
  TAX_BUCKETS,
  LOSS_BUCKETS,
  classifyAssetClass,
  isRfAssetClass,
  normalizeEventType,
  transferSemantics,
};
