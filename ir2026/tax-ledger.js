'use strict';
// ============================================================================
// IR2026 — Deterministic tax ledger engine (P8-P14)
//
// OPENING_FISCAL_2026 + CERTIFIED_EVENTS_2026 → TAX_LEDGER_2026
// Replayable from scratch; every processing record carries
// BEFORE_STATE / EVENT / RULE_VERSION / AFTER_STATE / SOURCE_PROVENANCE.
//
// Fiscal cost basis: weighted average (PM) per asset — ANALYTICAL_FIFO is a
// separate concept and never used here (RULE_ANALYTICAL_FIFO_NOT_FISCAL).
// Money: integer cents (toCents boundary); quantity: 1e-8 quantized.
// UNKNOWN is never coerced to zero; blocked events stay blocked.
// ============================================================================

const { classifyAssetClass, normalizeEventType, transferSemantics } = require('./contracts');
const { toCents, toQty, sha256Json } = require('./hash');

// ---------------------------------------------------------------------------
// Event normalization (canonical UPPERCASE row → fiscal event)
// ---------------------------------------------------------------------------
function normalizeEvent(raw) {
  const cls = classifyAssetClass(raw.TICKER, { product: raw.PRODUCT, movement: raw.MOVEMENT_RAW });
  return {
    EVENT_ID: raw.CANONICAL_ID,
    EVENT_SHA256: raw.EVENT_FINGERPRINT || null,
    SOURCE: raw.PROVENANCE || null,
    SOURCE_ROW_IDS: raw.SOURCE_ROW_IDS || null,
    RAW_TYPE: raw.TYPE,
    RAW_MOVEMENT: raw.MOVEMENT_RAW || null,
    TYPE: normalizeEventType(raw.TYPE, raw.MOVEMENT_RAW),
    DATE: raw.DATE,
    YEAR_MONTH: String(raw.DATE || '').slice(0, 7),
    TICKER: raw.TICKER,
    ASSET: raw.TICKER,
    ASSET_CLASS: cls.assetClass,
    CLASSIFICATION_BASIS: cls.basis,
    DIRECTION: raw.DIRECTION || null,
    QTY: toQty(raw.QUANTITY),
    UNIT_CENTS: toCents(raw.UNIT_PRICE),
    GROSS_CENTS: toCents(raw.AMOUNT),
    FEES_CENTS: null,
    FEES_STATUS: 'UNKNOWN',          // no per-event fee evidence in canonical export
    WITHHOLDING_CENTS: null,
    WITHHOLDING_STATUS: 'UNKNOWN',   // P20: never inferred from percentages
    INCOME_STATUS: raw.INCOME_STATUS || null,
    EVIDENCE_STATUS: raw.STATUS || 'UNKNOWN', // CERTIFIED | PARTIAL | UNKNOWN
    CONFIDENCE: raw.CONFIDENCE || null,
    CUSTODIAN: raw.CUSTODIAN || null,
    // corporate-action parameters must be explicit (synthetic/explicit input);
    // never inferred from ambiguous rows
    CORP_RATIO: raw.CORP_RATIO || null,
    CORP_NEW_ASSET: raw.CORP_NEW_ASSET || null,
    CORP_DAY_TRADE: raw.CORP_DAY_TRADE === true, // explicit day-trade overlay only
  };
}

// ---------------------------------------------------------------------------
// Asset fiscal state
// ---------------------------------------------------------------------------
function emptyState(asset, assetClass, basis) {
  return {
    ASSET: asset,
    ASSET_CLASS: assetClass,
    CLASSIFICATION_BASIS: basis,
    QTY: 0,
    QTY_STATUS: 'CERTIFIED',       // starts CERTIFIED-from-zero; downgraded by evidence
    TOTAL_COST_CENTS: 0,
    COST_STATUS: 'CERTIFIED',
    AVG_COST_CENTS: null,
    FEES_STATUS: 'CERTIFIED',      // downgraded to UNKNOWN at first fee-unknown trade
    OPEN_LOAN_QTY: 0,
    LENDING_CHAIN_INCOMPLETE: false,
    FLAGS: {
      HAD_TRANSFER: false,
      HAD_UNKNOWN_EVENT: false,
      HAD_LENDING: false,
      HAD_CORPORATE_PARTIAL: false,
      PRE_COVERAGE_NEGATIVE: false,
      COST_UNKNOWN_TRANSFER: false,
    },
  };
}

function avgCost(state) {
  if (state.TOTAL_COST_CENTS === null || !state.QTY || state.QTY === 0) return null;
  return Math.round(state.TOTAL_COST_CENTS / state.QTY);
}

function downgradeQty(state, status) {
  const order = { CERTIFIED: 0, PARTIAL: 1, UNKNOWN: 2, NOT_APPLICABLE: 0 };
  if (order[status] > order[state.QTY_STATUS]) state.QTY_STATUS = status;
}

function downgradeCost(state, status) {
  const order = { CERTIFIED: 0, PARTIAL: 1, UNKNOWN: 2, NOT_APPLICABLE: 0 };
  if (order[status] > order[state.COST_STATUS]) state.COST_STATUS = status;
}

function summary(state) {
  return {
    QTY: state.QTY,
    QTY_STATUS: state.QTY_STATUS,
    TOTAL_COST_CENTS: state.TOTAL_COST_CENTS,
    COST_STATUS: state.COST_STATUS,
    AVG_COST_CENTS: avgCost(state),
    OPEN_LOAN_QTY: state.OPEN_LOAN_QTY,
    FEES_STATUS: state.FEES_STATUS,
    RF_PRINCIPAL_CENTS: state.RF_PRINCIPAL_CENTS !== undefined ? state.RF_PRINCIPAL_CENTS : null,
    RF_NOMINAL_UNIT_CENTS: state.RF_NOMINAL_UNIT_CENTS || null,
    FLAGS: { ...state.FLAGS },
  };
}

// Tax bucket for a realized sale (P18) — single bucket, by asset class.
// Day-trade detection requires intraday buy+sell evidence; without it,
// everything is swing. Day-trade classification is an explicit event overlay.
function saleBucket(assetClass, isDayTrade) {
  if (isDayTrade) return 'RV_STOCK_DAY_TRADE';
  switch (assetClass) {
    case 'BRAZIL_STOCK': return 'RV_STOCK_SWING';
    case 'FII': return 'RV_FII';
    case 'ETF_BR': return 'RV_ETF_BDR';
    case 'BDR': return 'RV_ETF_BDR';
    default: return 'OTHER';
  }
}

// ---------------------------------------------------------------------------
// Unknown impact model (P26)
// ---------------------------------------------------------------------------
function classifyUnknownImpact(ev, fiscalYear) {
  const raw = String(ev.RAW_MOVEMENT || '').toUpperCase();
  const inFiscalYear = Number(String(ev.DATE).slice(0, 4)) >= fiscalYear;
  const flags = new Set();
  if (/SUBSCRI|CESS[AÃ]O|REEMBOLSO|COMPRA \/ VENDA/.test(raw)) {
    flags.add('AFFECTS_CURRENT_POSITION');
    flags.add('AFFECTS_FISCAL_COST');
    flags.add('AFFECTS_REALIZED_GAIN');
  }
  if (/JUROS|RENDIMENT/.test(raw)) flags.add('AFFECTS_IR');
  if (!inFiscalYear) {
    // historical unknowns affect only the opening reconstruction
    return ['AFFECTS_FISCAL_COST'];
  }
  if (flags.size === 0) flags.add('AFFECTS_IR');
  return [...flags];
}

// ---------------------------------------------------------------------------
// Event application. Returns a processing record (P8). Never throws on bad
// data — blocked events are recorded, state is left untouched.
// ---------------------------------------------------------------------------
function applyEvent(states, ev, ctx) {
  const st = states[ev.ASSET] || emptyState(ev.ASSET, ev.ASSET_CLASS, ev.CLASSIFICATION_BASIS);
  states[ev.ASSET] = st;
  const before = summary(st);
  const rec = {
    EVENT_ID: ev.EVENT_ID,
    DATE: ev.DATE,
    ASSET: ev.ASSET,
    TYPE: ev.TYPE,
    RAW_TYPE: ev.RAW_TYPE,
    EVIDENCE_STATUS: ev.EVIDENCE_STATUS,
    BEFORE_STATE: before,
    RULES: [],
    PROCESSING: null,           // APPLIED | BLOCKED_UNKNOWN | BLOCKED_RULE_UNCERTIFIED | BLOCKED_INSUFFICIENT_EVIDENCE
    IMPACT_FLAGS: [],
    REALIZED: null,             // cents or null(UNKNOWN) — only for sale-like events
    COST_REMOVED_CENTS: null,
    GROSS_CENTS: ev.GROSS_CENTS,
    BUCKET: null,
    PROVENANCE: { SOURCE: ev.SOURCE, EVENT_SHA256: ev.EVENT_SHA256, RAW_MOVEMENT: ev.RAW_MOVEMENT },
  };

  const rule = (id) => {
    const r = ctx.registry ? require('./rules').resolveRule(ctx.registry, id, ev.DATE) : null;
    rec.RULES.push({ RULE_ID: id, RULE_VERSION: r ? r.RULE_VERSION : null, STATUS: r ? r.STATUS : 'UNKNOWN' });
    return r;
  };

  const blocked = (reason, flags) => {
    rec.PROCESSING = 'BLOCKED_UNKNOWN';
    rec.BLOCK_REASON = reason;
    rec.IMPACT_FLAGS = flags || classifyUnknownImpact(ev, ctx.fiscalYear);
    if (rec.IMPACT_FLAGS.includes('AFFECTS_FISCAL_COST')) st.FLAGS.HAD_UNKNOWN_EVENT = true;
    rec.AFTER_STATE = summary(st);
    return rec;
  };

  // An UNKNOWN opening quantity can never receive arithmetic — null+x in JS
  // silently coerces; blocked instead so unknown never becomes certified.
  const QTY_AFFECTING = ['BUY', 'SELL', 'RIGHTS_TRANSFER', 'TRANSFER_IN', 'TRANSFER_OUT', 'BONUS',
    'CORPORATE_SPLIT', 'CORPORATE_REVERSE_SPLIT', 'SUBSCRIPTION'];
  if (QTY_AFFECTING.includes(ev.TYPE) && st.QTY === null) {
    st.FLAGS.HAD_UNKNOWN_EVENT = true;
    return blocked('OPENING_STATE_UNKNOWN', ['AFFECTS_FISCAL_COST', 'AFFECTS_REALIZED_GAIN', 'AFFECTS_IR']);
  }
  if ((ev.TYPE === 'RF_REDEMPTION' || ev.TYPE === 'RF_MATURITY') && st.RF_PRINCIPAL_CENTS == null) {
    st.FLAGS.HAD_UNKNOWN_EVENT = true;
    return blocked('RF_PRINCIPAL_UNKNOWN', ['AFFECTS_IR']);
  }

  switch (ev.TYPE) {
    case 'BUY': {
      if (ev.QTY === null || ev.QTY <= 0 || ev.GROSS_CENTS === null) {
        st.FLAGS.HAD_UNKNOWN_EVENT = true;
        return blocked('BUY_MISSING_QTY_OR_AMOUNT', ['AFFECTS_CURRENT_POSITION', 'AFFECTS_FISCAL_COST', 'AFFECTS_REALIZED_GAIN']);
      }
      if (ev.EVIDENCE_STATUS !== 'CERTIFIED') {
        downgradeQty(st, 'PARTIAL'); downgradeCost(st, 'PARTIAL');
        rec.PROCESSING = 'APPLIED_PARTIAL_EVIDENCE';
      } else rec.PROCESSING = 'APPLIED';
      rule('RULE_COST_BASIS_WEIGHTED_AVERAGE');
      rule('RULE_FEES_INCLUDED_IN_COST');
      const feeAdd = ev.FEES_CENTS === null ? 0 : ev.FEES_CENTS;
      if (ev.FEES_CENTS === null) { st.FEES_STATUS = 'UNKNOWN'; }
      st.QTY = toQty(st.QTY + ev.QTY);
      // a first buy on a NOT_APPLICABLE (zero) opening legitimately starts a
      // certified fiscal basis for the asset
      if (st.QTY_STATUS === 'NOT_APPLICABLE') st.QTY_STATUS = 'CERTIFIED';
      if (st.COST_STATUS === 'NOT_APPLICABLE') st.COST_STATUS = 'CERTIFIED';
      // cost arithmetic only when cost is known — never coerce null into a number
      if (st.TOTAL_COST_CENTS !== null) st.TOTAL_COST_CENTS += ev.GROSS_CENTS + feeAdd;
      st.AVG_COST_CENTS = avgCost(st);
      rec.AFTER_STATE = summary(st);
      rec.IMPACT_FLAGS = ['NO_CURRENT_FISCAL_IMPACT'];
      return rec;
    }
    case 'SELL':
    case 'RIGHTS_TRANSFER': { // fraction auction = sale of fractional shares at fiscal avg cost
      const origin = ev.TYPE === 'RIGHTS_TRANSFER' ? 'FRACTION_AUCTION' : 'DIRECT';
      if (ev.QTY === null || ev.QTY <= 0 || ev.GROSS_CENTS === null) {
        st.FLAGS.HAD_UNKNOWN_EVENT = true;
        return blocked('SELL_MISSING_QTY_OR_AMOUNT', ['AFFECTS_REALIZED_GAIN', 'AFFECTS_IR']);
      }
      if (ev.QTY > st.QTY + 1e-9) {
        // would go negative: pre-coverage holding or data anomaly — never apply
        st.FLAGS.PRE_COVERAGE_NEGATIVE = true;
        downgradeQty(st, 'UNKNOWN'); downgradeCost(st, 'UNKNOWN');
        return blocked('QUANTITY_UNDERFLOW', ['AFFECTS_CURRENT_POSITION', 'AFFECTS_FISCAL_COST', 'AFFECTS_REALIZED_GAIN', 'AFFECTS_IR']);
      }
      if (st.COST_STATUS === 'UNKNOWN' || st.AVG_COST_CENTS === null || st.QTY_STATUS === 'UNKNOWN') {
        st.FLAGS.HAD_UNKNOWN_EVENT = true;
        return blocked('FISCAL_COST_UNKNOWN', ['AFFECTS_REALIZED_GAIN', 'AFFECTS_IR']);
      }
      rule('RULE_SALE_COST_REMOVAL_AVERAGE');
      rule('RULE_FEES_INCLUDED_IN_COST');
      const feeSub = ev.FEES_CENTS === null ? 0 : ev.FEES_CENTS;
      if (ev.FEES_CENTS === null) st.FEES_STATUS = 'UNKNOWN';
      const costRemoved = Math.round(st.AVG_COST_CENTS * ev.QTY);
      const net = ev.GROSS_CENTS - feeSub;
      st.QTY = toQty(st.QTY - ev.QTY);
      st.TOTAL_COST_CENTS -= costRemoved;
      st.AVG_COST_CENTS = avgCost(st);
      rec.PROCESSING = ev.EVIDENCE_STATUS === 'CERTIFIED' ? 'APPLIED' : 'APPLIED_PARTIAL_EVIDENCE';
      rec.REALIZED = net - costRemoved;
      rec.COST_REMOVED_CENTS = costRemoved;
      rec.ORIGIN = origin;
      rec.NET_CENTS = net;
      rec.BUCKET = saleBucket(st.ASSET_CLASS, ev.CORP_DAY_TRADE === true);
      rec.IMPACT_FLAGS = ['AFFECTS_REALIZED_GAIN'];
      rec.AFTER_STATE = summary(st);
      return rec;
    }
    case 'TRANSFER_IN':
    case 'TRANSFER_OUT': {
      // P13: transfers never produce realized result.
      if (ev.QTY === null || ev.QTY <= 0) {
        st.FLAGS.HAD_UNKNOWN_EVENT = true;
        return blocked('TRANSFER_MISSING_QTY', ['AFFECTS_CURRENT_POSITION', 'AFFECTS_FISCAL_COST']);
      }
      if (ev.EVIDENCE_STATUS !== 'CERTIFIED') { downgradeQty(st, 'PARTIAL'); }
      st.FLAGS.HAD_TRANSFER = true;
      rule('RULE_TRANSFER_NO_REALIZED_RESULT');
      const dir = ev.TYPE === 'TRANSFER_IN' ? +1 : -1;
      if (dir === -1 && ev.QTY > st.QTY + 1e-9) {
        st.FLAGS.PRE_COVERAGE_NEGATIVE = true;
        downgradeQty(st, 'UNKNOWN'); downgradeCost(st, 'UNKNOWN');
        return blocked('QUANTITY_UNDERFLOW', ['AFFECTS_CURRENT_POSITION', 'AFFECTS_FISCAL_COST', 'AFFECTS_IR']);
      }
      if (dir === 1) {
        // cost carried only with explicit per-unit cost evidence
        if (ev.UNIT_CENTS !== null && ev.UNIT_CENTS > 0) {
          if (st.TOTAL_COST_CENTS !== null) st.TOTAL_COST_CENTS += Math.round(ev.UNIT_CENTS * ev.QTY);
          rule('RULE_TRANSFER_NO_REALIZED_RESULT');
        } else {
          rule('RULE_TRANSFER_COST_UNKNOWN');
          st.FLAGS.COST_UNKNOWN_TRANSFER = true;
          downgradeCost(st, 'UNKNOWN');
        }
        st.QTY = toQty(st.QTY + ev.QTY);
      } else {
        if (st.AVG_COST_CENTS !== null && st.COST_STATUS !== 'UNKNOWN') {
          st.TOTAL_COST_CENTS -= Math.round(st.AVG_COST_CENTS * ev.QTY);
        } else {
          st.FLAGS.COST_UNKNOWN_TRANSFER = true;
          downgradeCost(st, 'UNKNOWN');
        }
        st.QTY = toQty(st.QTY - ev.QTY);
      }
      st.AVG_COST_CENTS = avgCost(st);
      rec.PROCESSING = ev.EVIDENCE_STATUS === 'CERTIFIED' ? 'APPLIED' : 'APPLIED_PARTIAL_EVIDENCE';
      rec.REALIZED = 0; // transfers NEVER realize — invariant-tested
      rec.IMPACT_FLAGS = ['NO_CURRENT_FISCAL_IMPACT'];
      rec.AFTER_STATE = summary(st);
      return rec;
    }
    case 'STOCK_LOAN_OUT': {
      st.FLAGS.HAD_LENDING = true;
      if (ev.QTY !== null && ev.QTY > 0) {
        st.OPEN_LOAN_QTY = toQty(st.OPEN_LOAN_QTY + ev.QTY);
        st.LENDING_CHAIN_INCOMPLETE = st.OPEN_LOAN_QTY > 0;
        rec.PROCESSING = 'APPLIED';
        rec.IMPACT_FLAGS = ['NO_CURRENT_FISCAL_IMPACT'];
      } else if (ev.GROSS_CENTS !== null && ev.GROSS_CENTS > 0) {
        // fee income row (qty 0, amount > 0)
        rec.TYPE = 'STOCK_LENDING_INCOME';
        rec.PROCESSING = 'APPLIED';
        rec.IMPACT_FLAGS = ['AFFECTS_IR'];
        rec.BUCKET = 'INCOME_LENDING';
      } else {
        return blocked('LENDING_ROW_AMBIGUOUS', ['AFFECTS_IR']);
      }
      rule('RULE_STOCK_LENDING_NO_OWNERSHIP_CHANGE');
      rec.AFTER_STATE = summary(st);
      return rec;
    }
    case 'STOCK_LOAN_RETURN': {
      st.FLAGS.HAD_LENDING = true;
      st.OPEN_LOAN_QTY = toQty(Math.max(0, st.OPEN_LOAN_QTY - (ev.QTY || 0)));
      st.LENDING_CHAIN_INCOMPLETE = st.OPEN_LOAN_QTY > 0;
      rec.PROCESSING = 'APPLIED';
      rec.IMPACT_FLAGS = ['NO_CURRENT_FISCAL_IMPACT'];
      rule('RULE_STOCK_LENDING_NO_OWNERSHIP_CHANGE');
      rec.AFTER_STATE = summary(st);
      return rec;
    }
    case 'BONUS': {
      if (ev.EVIDENCE_STATUS !== 'CERTIFIED' || ev.QTY === null || ev.QTY <= 0) {
        st.FLAGS.HAD_CORPORATE_PARTIAL = true;
        downgradeQty(st, 'PARTIAL'); downgradeCost(st, 'UNKNOWN');
        return blocked('CORPORATE_BONUS_INSUFFICIENT_EVIDENCE', ['AFFECTS_CURRENT_POSITION', 'AFFECTS_FISCAL_COST']);
      }
      rule('RULE_BONUS_NO_COST_INFLATION');
      // IN RFB 1.585 art. 58 §1: stock bonus cost can equal capitalized profits/reserves.
      // Canonical events do not carry that evidence, so changing the average here is unsafe.
      st.FLAGS.HAD_CORPORATE_PARTIAL = true;
      downgradeQty(st, 'PARTIAL'); downgradeCost(st, 'UNKNOWN');
      return blocked('CORPORATE_BONUS_COST_BASIS_UNKNOWN', ['AFFECTS_CURRENT_POSITION', 'AFFECTS_FISCAL_COST', 'AFFECTS_REALIZED_GAIN', 'AFFECTS_IR']);
    }
    case 'CORPORATE_SPLIT':
    case 'CORPORATE_REVERSE_SPLIT': {
      if (!ev.CORP_RATIO || ev.CORP_RATIO <= 0) {
        st.FLAGS.HAD_CORPORATE_PARTIAL = true;
        return blocked('CORPORATE_RATIO_MISSING', ['AFFECTS_CURRENT_POSITION', 'AFFECTS_FISCAL_COST']);
      }
      rule('RULE_SPLIT_TOTAL_COST_PRESERVED');
      st.QTY = toQty(ev.TYPE === 'CORPORATE_SPLIT' ? st.QTY * ev.CORP_RATIO : st.QTY / ev.CORP_RATIO);
      st.AVG_COST_CENTS = avgCost(st);
      rec.PROCESSING = 'APPLIED';
      rec.IMPACT_FLAGS = ['AFFECTS_FISCAL_COST'];
      rec.AFTER_STATE = summary(st);
      return rec;
    }
    case 'SUBSCRIPTION': {
      if (ev.EVIDENCE_STATUS !== 'CERTIFIED' || ev.QTY === null || ev.GROSS_CENTS === null) {
        st.FLAGS.HAD_CORPORATE_PARTIAL = true;
        return blocked('SUBSCRIPTION_INSUFFICIENT_EVIDENCE', ['AFFECTS_CURRENT_POSITION', 'AFFECTS_FISCAL_COST', 'AFFECTS_REALIZED_GAIN']);
      }
      rule('RULE_SUBSCRIPTION_COST_MODEL');
      st.QTY = toQty(st.QTY + ev.QTY);
      if (st.TOTAL_COST_CENTS !== null) st.TOTAL_COST_CENTS += ev.GROSS_CENTS;
      st.AVG_COST_CENTS = avgCost(st);
      rec.PROCESSING = 'APPLIED';
      rec.IMPACT_FLAGS = ['AFFECTS_FISCAL_COST'];
      rec.AFTER_STATE = summary(st);
      return rec;
    }
    case 'TICKER_CHANGE':
    case 'MERGER':
    case 'SPINOFF': {
      // needs explicit mapping evidence (new asset + carried cost)
      st.FLAGS.HAD_CORPORATE_PARTIAL = true;
      rule('RULE_TICKER_CHANGE_COST_CARRYOVER');
      return blocked('CORPORATE_MAPPING_REQUIRES_EVIDENCE', ['AFFECTS_CURRENT_POSITION', 'AFFECTS_FISCAL_COST', 'AFFECTS_IR']);
    }
    case 'AMORTIZATION': {
      // income category; possible cost-reduction treatment is rule-gated (NEEDS)
      rule('RULE_AMORTIZATION_TREATMENT');
      rec.PROCESSING = 'APPLIED';
      rec.BUCKET = 'INCOME_AMORTIZATION';
      rec.IMPACT_FLAGS = ['AFFECTS_IR'];
      rec.AFTER_STATE = summary(st);
      return rec;
    }
    case 'CAPITAL_RETURN': {
      rule('RULE_CAPITAL_RETURN_TREATMENT');
      st.FLAGS.HAD_CORPORATE_PARTIAL = true;
      return blocked('CAPITAL_RETURN_RULE_UNCERTIFIED', ['AFFECTS_FISCAL_COST', 'AFFECTS_IR']);
    }
    case 'DIVIDEND':
    case 'JCP': {
      rec.PROCESSING = 'APPLIED';
      rec.BUCKET = ev.TYPE === 'DIVIDEND' ? 'INCOME_DIVIDEND' : 'INCOME_JCP';
      rec.IMPACT_FLAGS = ['AFFECTS_IR'];
      rec.AFTER_STATE = summary(st);
      return rec;
    }
    case 'RF_APPLICATION': {
      if (ev.GROSS_CENTS === null || ev.QTY === null) {
        st.FLAGS.HAD_UNKNOWN_EVENT = true;
        return blocked('RF_APPLICATION_MISSING_DATA', ['AFFECTS_FISCAL_COST', 'AFFECTS_IR']);
      }
      // principal tracked in cents; per-instrument nominal unit from evidence
      st.RF_PRINCIPAL_CENTS = (st.RF_PRINCIPAL_CENTS || 0) + ev.GROSS_CENTS;
      if (ev.UNIT_CENTS !== null && ev.UNIT_CENTS > 0) st.RF_NOMINAL_UNIT_CENTS = ev.UNIT_CENTS;
      if (!st.RF_NOMINAL_UNIT_CENTS) st.RF_NOMINAL_UNIT_CENTS = 1; // R$0.01 default, basis recorded
      st.RF_UNIT_BASIS = st.RF_UNIT_BASIS || 'RF_NOMINAL_UNIT_001';
      rec.PROCESSING = 'APPLIED';
      rec.IMPACT_FLAGS = ['NO_CURRENT_FISCAL_IMPACT'];
      rec.AFTER_STATE = summary(st);
      return rec;
    }
    case 'RF_REDEMPTION':
    case 'RF_MATURITY': {
      if (ev.GROSS_CENTS === null || ev.QTY === null) {
        st.FLAGS.HAD_UNKNOWN_EVENT = true;
        return blocked('RF_REDEMPTION_MISSING_DATA', ['AFFECTS_IR']);
      }
      const unit = st.RF_NOMINAL_UNIT_CENTS || 1;
      const principalRemoved = Math.min(st.RF_PRINCIPAL_CENTS || 0, Math.round(unit * ev.QTY));
      const interest = ev.GROSS_CENTS - principalRemoved;
      st.RF_PRINCIPAL_CENTS = (st.RF_PRINCIPAL_CENTS || 0) - principalRemoved;
      rule('RULE_RF_IRRF_AT_SOURCE');
      rec.PROCESSING = 'APPLIED';
      rec.RF_PRINCIPAL_REMOVED_CENTS = principalRemoved;
      rec.RF_INTEREST_CENTS = interest >= 0 ? interest : null; // negative → data anomaly, stays UNKNOWN
      if (interest < 0) { rec.PROCESSING = 'BLOCKED_UNKNOWN'; rec.BLOCK_REASON = 'RF_REDEMPTION_BELOW_PRINCIPAL'; }
      rec.BUCKET = 'RF_INCOME';
      rec.IMPACT_FLAGS = ['AFFECTS_IR'];
      rec.AFTER_STATE = summary(st);
      return rec;
    }
    case 'STOCK_LENDING_INCOME': {
      rec.PROCESSING = 'APPLIED';
      rec.BUCKET = 'INCOME_LENDING';
      rec.IMPACT_FLAGS = ['AFFECTS_IR'];
      rec.AFTER_STATE = summary(st);
      return rec;
    }
    default: {
      st.FLAGS.HAD_UNKNOWN_EVENT = true;
      return blocked(`UNMAPPED_EVENT_TYPE_${ev.TYPE}`, classifyUnknownImpact(ev, ctx.fiscalYear));
    }
  }
}

module.exports = {
  normalizeEvent,
  emptyState,
  avgCost,
  summary,
  saleBucket,
  applyEvent,
  classifyUnknownImpact,
  sha256Json,
};
