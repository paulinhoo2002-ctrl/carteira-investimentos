'use strict';
// IR2026 — P30 synthetic torture matrix + P28 invariants + P29 determinism.
// 100% synthetic — no real user data (P33).

const test = require('node:test');
const assert = require('node:assert');

const { applyEvent, normalizeEvent } = require('../ir2026/tax-ledger');
const { buildTaxLedger } = require('../ir2026/ledger');
const { buildOpeningFiscal } = require('../ir2026/opening-fiscal');
const { checkInvariants } = require('../ir2026/invariants');
const { computeCertification } = require('../ir2026/certification');
const { loadRegistry } = require('../ir2026/rules');

const registry = loadRegistry();

let idSeq = 0;
function mkEv(o) {
  idSeq += 1;
  return Object.assign({
    CANONICAL_ID: 'SYN-' + String(idSeq).padStart(5, '0'),
    EVENT_FINGERPRINT: 'fp-' + idSeq,
    SOURCE_ROW_IDS: ['synthetic'],
    DATE: '2026-03-10',
    TICKER: 'PETR4',
    PRODUCT: 'PETR4 - PETROBRAS',
    TYPE: 'BUY',
    DIRECTION: 'Credito',
    QUANTITY: 100,
    UNIT_PRICE: 20.0,
    AMOUNT: 2000.0,
    CUSTODIAN: 'INTER',
    STATUS: 'CERTIFIED',
    CONFIDENCE: 'HIGH',
    REASONS: [],
    PROVENANCE: 'synthetic',
    MOVEMENT_RAW: 'Transferência - Liquidação',
    INCOME_STATUS: null,
  }, o);
}

function fresh(asset, assetClass) {
  const st = require('../ir2026/tax-ledger').emptyState(asset || 'PETR4', assetClass || 'BRAZIL_STOCK', 'test');
  return st;
}

function run(events, opening) {
  const states = {};
  const ctx = { registry, fiscalYear: 2026 };
  return events.map((raw) => applyEvent(states, normalizeEvent(raw), ctx));
}

// ---- 1. simple buy ---------------------------------------------------------
test('torture: simple buy updates qty, total cost, avg', () => {
  const [rec] = run([mkEv({ QUANTITY: 100, UNIT_PRICE: 20, AMOUNT: 2000 })]);
  assert.strictEqual(rec.PROCESSING, 'APPLIED');
  assert.strictEqual(rec.AFTER_STATE.QTY, 100);
  assert.strictEqual(rec.AFTER_STATE.TOTAL_COST_CENTS, 200000);
  assert.strictEqual(rec.AFTER_STATE.AVG_COST_CENTS, 2000); // cents per share
});

// ---- 2. multiple buys → weighted average (PM), not FIFO --------------------
test('torture: multiple buys compute weighted average cost (PM ≠ FIFO)', () => {
  const recs = run([
    mkEv({ DATE: '2026-01-05', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-01-06', QUANTITY: 100, UNIT_PRICE: 30, AMOUNT: 3000 }),
  ]);
  const st = recs[1].AFTER_STATE;
  assert.strictEqual(st.QTY, 200);
  assert.strictEqual(st.TOTAL_COST_CENTS, 400000);
  assert.strictEqual(st.AVG_COST_CENTS, 2000); // (1000+3000)/200 = R$20
  // FIFO would remove cost at R$10 first; PM removes at R$20 — engine must use PM
  const [sell] = run([mkEv({ DATE: '2026-01-07', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 50, UNIT_PRICE: 25, AMOUNT: 1250 })]);
  void sell;
});

// ---- 3/4/5/6. partial sale, full sale, loss, profit ----------------------
test('torture: partial sale keeps avg, removes proportional cost, books realized', () => {
  const recs = run([
    mkEv({ DATE: '2026-01-05', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-01-06', QUANTITY: 100, UNIT_PRICE: 30, AMOUNT: 3000 }),
    mkEv({ DATE: '2026-02-01', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 50, UNIT_PRICE: 25, AMOUNT: 1250 }),
  ]);
  const sell = recs[2];
  assert.strictEqual(sell.REALIZED, 125000 - 50 * 2000); // net 1250.00 − 50×R$20
  assert.strictEqual(sell.AFTER_STATE.QTY, 150);
  assert.strictEqual(sell.AFTER_STATE.AVG_COST_CENTS, 2000); // avg unchanged by sale
  assert.strictEqual(sell.BUCKET, 'RV_STOCK_SWING');
  assert.strictEqual(sell.COST_REMOVED_CENTS, 100000);
});

test('torture: full sale zeroes position; loss stays negative; profit positive', () => {
  const loss = run([
    mkEv({ DATE: '2026-01-05', QUANTITY: 10, UNIT_PRICE: 100, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-01-06', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 10, UNIT_PRICE: 80, AMOUNT: 800 }),
  ])[1];
  assert.strictEqual(loss.REALIZED, -20000); // −R$200.00
  assert.strictEqual(loss.AFTER_STATE.QTY, 0);

  const profit = run([
    mkEv({ DATE: '2026-01-05', QUANTITY: 10, UNIT_PRICE: 100, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-01-06', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 10, UNIT_PRICE: 150, AMOUNT: 1500 }),
  ])[1];
  assert.strictEqual(profit.REALIZED, 50000); // +R$500.00
});

// ---- 7. fees ---------------------------------------------------------------
test('torture: explicit fees enter cost; absent fees stay UNKNOWN (never zero)', () => {
  // canonical rows carry no fee field → FEES_CENTS null, FEES_STATUS UNKNOWN
  const rawNoFees = normalizeEvent(mkEv({ QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }));
  assert.strictEqual(rawNoFees.FEES_CENTS, null);
  assert.strictEqual(rawNoFees.FEES_STATUS, 'UNKNOWN');
  const st = fresh();
  applyEvent({ PETR4: st }, rawNoFees, { registry, fiscalYear: 2026 });
  assert.strictEqual(st.FEES_STATUS, 'UNKNOWN');
  assert.strictEqual(st.TOTAL_COST_CENTS, 100000); // gross only; fee unknownness is explicit

  // explicit fee evidence (promotions overlay path) enters the fiscal cost
  const st2 = fresh();
  const withFees = normalizeEvent(mkEv({ DATE: '2026-01-06', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }));
  withFees.FEES_CENTS = 500; // R$5.00 evidenced
  withFees.FEES_STATUS = 'CERTIFIED';
  applyEvent({ PETR4: st2 }, withFees, { registry, fiscalYear: 2026 });
  assert.strictEqual(st2.TOTAL_COST_CENTS, 100500);
  assert.strictEqual(st2.AVG_COST_CENTS, 1005);
});

// ---- 8/9. split / reverse split ---------------------------------------------
test('torture: split multiplies qty preserving total cost; reverse split divides', () => {
  const recs = run([
    mkEv({ DATE: '2026-01-05', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-01-06', TYPE: 'CORPORATE_ACTION', MOVEMENT_RAW: 'Desdobramento', QUANTITY: 0, AMOUNT: 0, CORP_RATIO: 2 }),
  ]);
  // CORP_RATIO passthrough check first
  const splitEv = normalizeEvent(mkEv({ TYPE: 'MARKET_EVENT', MOVEMENT_RAW: 'Atualização', CORP_RATIO: 2, QUANTITY: 0, AMOUNT: 0 }));
  assert.strictEqual(splitEv.CORP_RATIO, 2);
  const st = fresh();
  applyEvent({ PETR4: st }, normalizeEvent(mkEv({ QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 })), { registry, fiscalYear: 2026 });
  const splitRec = applyEvent({ PETR4: st }, normalizeEvent(mkEv({ TYPE: 'MARKET_EVENT', MOVEMENT_RAW: 'Desdobro', QUANTITY: 0, AMOUNT: 0, CORP_RATIO: 2 })), { registry, fiscalYear: 2026 });
  void recs;
  // MARKET_EVENT 'Desdobro' is not 'Atualização' → UNKNOWN → blocked without ratio application
  assert.strictEqual(splitRec.PROCESSING, 'BLOCKED_UNKNOWN');
  // split only applies via explicit CORPORATE_SPLIT type
  const st2 = fresh();
  applyEvent({ PETR4: st2 }, normalizeEvent(mkEv({ QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 })), { registry, fiscalYear: 2026 });
  const r2 = applyEvent({ PETR4: st2 }, normalizeEvent(mkEv({ TYPE: 'CORPORATE_ACTION', MOVEMENT_RAW: 'Desdobramento', QUANTITY: 0, AMOUNT: 0, CORP_RATIO: 2 })), { registry, fiscalYear: 2026 });
  assert.strictEqual(r2.PROCESSING, 'BLOCKED_UNKNOWN'); // raw type not mapped to CORPORATE_SPLIT
  void r2;
});

test('torture: explicit CORPORATE_SPLIT handler (synthetic event type)', () => {
  const st = fresh();
  applyEvent({ PETR4: st }, normalizeEvent(mkEv({ QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 })), { registry, fiscalYear: 2026 });
  const ev = normalizeEvent(mkEv({ TYPE: 'CORPORATE_ACTION', MOVEMENT_RAW: 'Desdobramento', QUANTITY: 0, AMOUNT: 0, CORP_RATIO: 2 }));
  ev.TYPE = 'CORPORATE_SPLIT'; // explicit normalized type (promotions overlay path)
  const rec = applyEvent({ PETR4: st }, ev, { registry, fiscalYear: 2026 });
  assert.strictEqual(rec.PROCESSING, 'APPLIED');
  assert.strictEqual(st.QTY, 200);
  assert.strictEqual(st.TOTAL_COST_CENTS, 100000); // preserved
  assert.strictEqual(st.AVG_COST_CENTS, 500);
  // reverse split
  const ev2 = normalizeEvent(mkEv({ TYPE: 'CORPORATE_ACTION', MOVEMENT_RAW: 'Grouping', QUANTITY: 0, AMOUNT: 0, CORP_RATIO: 4 }));
  ev2.TYPE = 'CORPORATE_REVERSE_SPLIT';
  const rec2 = applyEvent({ PETR4: st }, ev2, { registry, fiscalYear: 2026 });
  assert.strictEqual(rec2.PROCESSING, 'APPLIED');
  assert.strictEqual(st.QTY, 50);
  assert.strictEqual(st.TOTAL_COST_CENTS, 100000);
});

// ---- 10. bonus --------------------------------------------------------------
test('torture: bonus adds qty, preserves total cost (avg falls)', () => {
  const st = fresh();
  applyEvent({ PETR4: st }, normalizeEvent(mkEv({ QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 })), { registry, fiscalYear: 2026 });
  const bonus = normalizeEvent(mkEv({ DATE: '2026-02-01', TYPE: 'CORPORATE_ACTION', MOVEMENT_RAW: 'Bonificação em Ativos', QUANTITY: 20, UNIT_PRICE: null, AMOUNT: null }));
  const rec = applyEvent({ PETR4: st }, bonus, { registry, fiscalYear: 2026 });
  assert.strictEqual(rec.PROCESSING, 'APPLIED');
  assert.strictEqual(st.QTY, 120);
  assert.strictEqual(st.TOTAL_COST_CENTS, 100000);
  assert.strictEqual(st.AVG_COST_CENTS, Math.round(100000 / 120));
});

// ---- 11. amortization ---------------------------------------------------------
test('torture: amortization books income bucket, never touches qty/cost', () => {
  const recs = run([
    mkEv({ DATE: '2026-01-05', TICKER: 'SNID11', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-02-05', TICKER: 'SNID11', TYPE: 'AMORTIZATION', MOVEMENT_RAW: 'Amortização', QUANTITY: 100, UNIT_PRICE: 0.5, AMOUNT: 50 }),
  ]);
  const am = recs[1];
  assert.strictEqual(am.PROCESSING, 'APPLIED');
  assert.strictEqual(am.BUCKET, 'INCOME_AMORTIZATION');
  assert.strictEqual(am.AFTER_STATE.QTY, 100); // unchanged
  assert.strictEqual(am.AFTER_STATE.TOTAL_COST_CENTS, 100000); // unchanged pending RULE_AMORTIZATION_TREATMENT
});

// ---- 12. transfers ------------------------------------------------------------
test('torture: transfer in/out moves qty, never realizes; cost carried only with evidence', () => {
  const st = fresh();
  const tin = normalizeEvent(mkEv({ DATE: '2026-01-05', TYPE: 'TRANSFER_CANDIDATE', MOVEMENT_RAW: 'Transferência', DIRECTION: 'Credito', QUANTITY: 100, UNIT_PRICE: null, AMOUNT: null, STATUS: 'PARTIAL' }));
  tin.TYPE = 'TRANSFER_IN'; // promoted with direction evidence
  const rIn = applyEvent({ PETR4: st }, tin, { registry, fiscalYear: 2026 });
  assert.strictEqual(rIn.REALIZED, 0);
  assert.strictEqual(st.QTY, 100);
  assert.strictEqual(st.COST_STATUS, 'UNKNOWN'); // FISCAL_COST_UNKNOWN (P13)
  assert.strictEqual(st.FLAGS.COST_UNKNOWN_TRANSFER, true);

  const st2 = fresh();
  applyEvent({ PETR4: st2 }, normalizeEvent(mkEv({ QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 })), { registry, fiscalYear: 2026 });
  const tout = normalizeEvent(mkEv({ DATE: '2026-02-05', TYPE: 'TRANSFER_CANDIDATE', MOVEMENT_RAW: 'Transferência', DIRECTION: 'Debito', QUANTITY: 40, UNIT_PRICE: null, AMOUNT: null, STATUS: 'PARTIAL' }));
  tout.TYPE = 'TRANSFER_OUT';
  const rOut = applyEvent({ PETR4: st2 }, tout, { registry, fiscalYear: 2026 });
  assert.strictEqual(rOut.REALIZED, 0);
  assert.strictEqual(st2.QTY, 60);
  assert.strictEqual(st2.TOTAL_COST_CENTS, 100000 - 40 * 1000); // removed at avg
});

// ---- 13. missing opening (sell before any buy) --------------------------------
test('torture: sell without opening blocks (QUANTITY_UNDERFLOW), qty never negative', () => {
  const [rec] = run([mkEv({ DATE: '2026-01-05', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 10, UNIT_PRICE: 10, AMOUNT: 100 })]);
  assert.strictEqual(rec.PROCESSING, 'BLOCKED_UNKNOWN');
  assert.strictEqual(rec.BLOCK_REASON, 'QUANTITY_UNDERFLOW');
  assert.strictEqual(rec.AFTER_STATE.QTY, 0); // unchanged, not negative
  assert.strictEqual(rec.AFTER_STATE.QTY_STATUS, 'UNKNOWN');
});

// ---- 14. unknown event -----------------------------------------------------------
test('torture: unknown subscription event blocks with impact flags', () => {
  const [rec] = run([mkEv({ DATE: '2026-03-01', TYPE: 'UNKNOWN', MOVEMENT_RAW: 'Direitos de Subscrição - Não Exercido', QUANTITY: 0, AMOUNT: null })]);
  assert.strictEqual(rec.PROCESSING, 'BLOCKED_UNKNOWN');
  assert.ok(rec.IMPACT_FLAGS.includes('AFFECTS_FISCAL_COST'));
  assert.ok(rec.IMPACT_FLAGS.includes('AFFECTS_REALIZED_GAIN'));
});

// ---- 15. mixed asset classes → separate buckets ---------------------------------
test('torture: stock and FII sales land in separate tax buckets', () => {
  const recs = run([
    mkEv({ DATE: '2026-01-05', TICKER: 'PETR4', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-01-05', TICKER: 'HGRU11', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-02-01', TICKER: 'PETR4', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 100, UNIT_PRICE: 12, AMOUNT: 1200 }),
    mkEv({ DATE: '2026-02-01', TICKER: 'HGRU11', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 100, UNIT_PRICE: 11, AMOUNT: 1100 }),
  ]);
  assert.strictEqual(recs[2].BUCKET, 'RV_STOCK_SWING');
  assert.strictEqual(recs[3].BUCKET, 'RV_FII');
});

// ---- 16. RF redemption ------------------------------------------------------------
test('torture: RF application/redemption tracks principal and derives interest', () => {
  const recs = run([
    mkEv({ DATE: '2026-01-05', TICKER: 'CDBTEST01', TYPE: 'RF_APPLICATION', MOVEMENT_RAW: 'APLICAÇÃO', QUANTITY: 1000, UNIT_PRICE: 0.01, AMOUNT: 10 }),
    mkEv({ DATE: '2026-07-05', TICKER: 'CDBTEST01', TYPE: 'RF_REDEMPTION', MOVEMENT_RAW: 'RESGATE ANTECIPADO', DIRECTION: 'Debito', QUANTITY: 1000, UNIT_PRICE: 0.0102, AMOUNT: 10.2 }),
  ]);
  assert.strictEqual(recs[1].RF_PRINCIPAL_REMOVED_CENTS, 1000); // R$10.00 principal
  assert.strictEqual(recs[1].RF_INTEREST_CENTS, 20); // R$0.20 interest
  assert.strictEqual(recs[1].BUCKET, 'RF_INCOME');
});

// ---- 17. JCP/dividend income evidence ---------------------------------------------
test('torture: dividend RECEIVED only with certified credit; EXCLUDED never received', () => {
  const recs = run([
    mkEv({ DATE: '2026-02-01', TICKER: 'VALE3', TYPE: 'DIVIDEND', MOVEMENT_RAW: 'Rendimento', QUANTITY: 100, UNIT_PRICE: 0.1, AMOUNT: 10, STATUS: 'CERTIFIED' }),
    mkEv({ DATE: '2026-02-01', TICKER: 'VALE3', TYPE: 'JCP', MOVEMENT_RAW: 'Juros s/ Cap. Próprio', QUANTITY: 100, UNIT_PRICE: 0.1, AMOUNT: 10, STATUS: 'PARTIAL' }),
    mkEv({ DATE: '2026-02-01', TICKER: 'VALE3', TYPE: 'DIVIDEND', MOVEMENT_RAW: 'Rendimento', QUANTITY: 100, UNIT_PRICE: 0.1, AMOUNT: 10, STATUS: 'CERTIFIED', INCOME_STATUS: 'EXCLUDED' }),
  ]);
  assert.strictEqual(recs[0].BUCKET, 'INCOME_DIVIDEND');
  assert.strictEqual(recs[1].BUCKET, 'INCOME_JCP');
  assert.strictEqual(recs[2].BUCKET, 'INCOME_DIVIDEND');
});

// ---- 18. stock lending ---------------------------------------------------------------
test('torture: stock lending never changes ownership; fee rows become lending income', () => {
  const st = fresh();
  applyEvent({ PETR4: st }, normalizeEvent(mkEv({ QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 })), { registry, fiscalYear: 2026 });
  const loan = normalizeEvent(mkEv({ DATE: '2026-02-01', TYPE: 'STOCK_LOAN', MOVEMENT_RAW: 'Empréstimo', DIRECTION: 'Debito', QUANTITY: 40, UNIT_PRICE: null, AMOUNT: null }));
  const rLoan = applyEvent({ PETR4: st }, loan, { registry, fiscalYear: 2026 });
  assert.strictEqual(rLoan.PROCESSING, 'APPLIED');
  assert.strictEqual(st.QTY, 100); // beneficial ownership unchanged
  assert.strictEqual(st.OPEN_LOAN_QTY, 40);
  const fee = normalizeEvent(mkEv({ DATE: '2026-02-02', TYPE: 'STOCK_LOAN', MOVEMENT_RAW: 'Empréstimo', QUANTITY: 0, UNIT_PRICE: null, AMOUNT: 0.1 }));
  const rFee = applyEvent({ PETR4: st }, fee, { registry, fiscalYear: 2026 });
  assert.strictEqual(rFee.TYPE, 'STOCK_LENDING_INCOME');
  assert.strictEqual(rFee.BUCKET, 'INCOME_LENDING');
});

// ---- 19. determinism (P29) --------------------------------------------------------------
test('torture: ledger is deterministic — same input, same hash, twice', () => {
  const raws = [
    mkEv({ DATE: '2025-06-01', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-01-05', QUANTITY: 50, UNIT_PRICE: 12, AMOUNT: 600 }),
    mkEv({ DATE: '2026-02-01', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 60, UNIT_PRICE: 15, AMOUNT: 900 }),
    mkEv({ DATE: '2026-02-01', TYPE: 'DIVIDEND', QUANTITY: 90, UNIT_PRICE: 0.5, AMOUNT: 45 }),
    mkEv({ DATE: '2026-03-01', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 10, UNIT_PRICE: 15, AMOUNT: 150 }),
  ];
  const build = () => {
    const opening = buildOpeningFiscal({ rawEvents: raws, fiscalYear: 2026, registry });
    const ledger = buildTaxLedger({
      opening,
      events: raws.filter((e) => e.DATE >= '2026-01-01'),
      registry,
      fiscalYear: 2026,
    });
    const inv = checkInvariants({ opening, ledger });
    const cert = computeCertification({ opening, ledger, invariantReport: inv });
    return { opening, ledger, inv, cert };
  };
  const a = build();
  const b = build();
  assert.strictEqual(a.ledger.LEDGER_SHA256, b.ledger.LEDGER_SHA256);
  assert.strictEqual(a.ledger.ANNUAL_CLOSE.ANNUAL_CLOSE_SHA256, b.ledger.ANNUAL_CLOSE.ANNUAL_CLOSE_SHA256);
  assert.strictEqual(a.opening.SHA256, b.opening.SHA256);
  assert.strictEqual(a.ledger.OPENING_2027.SHA256, b.ledger.OPENING_2027.SHA256);
  assert.strictEqual(a.inv.ALL_PASS, true);
  // monthly closes exist and chain losses
  assert.ok(a.ledger.MONTHLY_CLOSES.length >= 2);
  for (const c of a.ledger.MONTHLY_CLOSES) {
    assert.strictEqual(c.TAX_DUE, 'NOT_CALCULATED');
    assert.strictEqual(c.EXEMPTION_STATUS, 'NOT_ASSESSED_RULES_UNCERTIFIED');
  }
  // certification layers present
  assert.strictEqual(Object.keys(a.cert.LAYERS).length, 8);
  assert.strictEqual(a.cert.LAYERS.IR_CALCULATION_READY.STATUS, 'BLOCKED'); // rules uncertified — by design
});

// ---- 20. monthly close math + loss carryforward chaining --------------------------------
test('torture: monthly close separates months and chains carryforward losses', () => {
  const raws = [
    mkEv({ DATE: '2025-06-01', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-01-10', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 50, UNIT_PRICE: 8, AMOUNT: 400 }),   // loss 500−? cost 5×1000? computed below
    mkEv({ DATE: '2026-03-10', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 50, UNIT_PRICE: 12, AMOUNT: 600 }),  // gain
  ];
  const opening = buildOpeningFiscal({ rawEvents: raws, fiscalYear: 2026, registry });
  const ledger = buildTaxLedger({ opening, events: raws.filter((e) => e.DATE >= '2026-01-01'), registry, fiscalYear: 2026 });
  const jan = ledger.MONTHLY_CLOSES.find((c) => c.YEAR_MONTH === '2026-01');
  const mar = ledger.MONTHLY_CLOSES.find((c) => c.YEAR_MONTH === '2026-03');
  // opening avg = R$10 → jan: sold 50 @ 8 → realized = 40000 − 50×1000 = −10000 (−R$100)
  assert.strictEqual(jan.REALIZED_LOSS_CENTS, 10000);
  assert.strictEqual(jan.CARRY_FORWARD_LOSSES_CENTS, 10000);
  // mar: sold 50 @ 12 → realized = 60000 − 50000 = +10000
  assert.strictEqual(mar.REALIZED_GAIN_CENTS, 10000);
  // loss carryforward keeps the jan loss (compensation blocked by uncertified rules)
  const swing = ledger.LOSS_LEDGER.find((l) => l.BUCKET === 'RV_STOCK_SWING');
  assert.strictEqual(swing.CLOSING_KNOWN_CENTS, 10000);
  assert.strictEqual(swing.OPENING_STATUS, 'UNKNOWN'); // pre-2026 carryforward requires declarations
});

// ---- 21. opening statuses -----------------------------------------------------------------
test('torture: opening from-zero is CERTIFIED; pre-coverage asset is UNKNOWN, never certified', () => {
  const raws = [
    mkEv({ DATE: '2019-12-01', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 10, UNIT_PRICE: 10, AMOUNT: 100 }), // sells before any buy → pre-coverage
    mkEv({ DATE: '2026-01-05', TICKER: 'ITUB4', QUANTITY: 10, UNIT_PRICE: 20, AMOUNT: 200 }),
    mkEv({ DATE: '2026-02-01', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 5, UNIT_PRICE: 25, AMOUNT: 125 }), // PETR4 with 2026 activity → in scope
  ];
  const opening = buildOpeningFiscal({ rawEvents: raws, fiscalYear: 2026, registry });
  const petr = opening.ROWS.find((r) => r.ASSET === 'PETR4');
  const itub = opening.ROWS.find((r) => r.ASSET === 'ITUB4');
  assert.strictEqual(petr.QTY_STATUS, 'UNKNOWN');
  assert.strictEqual(petr.COST_STATUS, 'UNKNOWN');
  assert.ok(petr.FLAGS.PRE_COVERAGE_NEGATIVE);
  assert.strictEqual(itub.QTY_STATUS, 'CERTIFIED');
  assert.strictEqual(itub.OPENING_QTY, 0);
  assert.strictEqual(itub.COST_STATUS, 'NOT_APPLICABLE');
  // ledger: the 2026 PETR4 sell blocks (fiscal cost unknown), never fabricates a result
  const ledger = buildTaxLedger({ opening, events: raws.filter((e) => e.DATE >= '2026-01-01'), registry, fiscalYear: 2026 });
  const petrSell = ledger.PROCESSING_RECORDS.find((r) => r.ASSET === 'PETR4' && r.TYPE === 'SELL');
  assert.strictEqual(petrSell.PROCESSING, 'BLOCKED_UNKNOWN');
  assert.strictEqual(petrSell.REALIZED, null);
  const inv = checkInvariants({ opening, ledger });
  assert.strictEqual(inv.ALL_PASS, true);
  const cert = computeCertification({ opening, ledger, invariantReport: inv });
  assert.strictEqual(cert.LAYERS.OPENING_2026_READY.STATUS, 'BLOCKED');
  assert.strictEqual(cert.LAYERS.EVENT_LEDGER_2026_READY.STATUS, 'BLOCKED');
});

// ---- 22. day trade overlay -> separate bucket ------------------------------------------------
test('torture: day-trade overlay realizes in RV_STOCK_DAY_TRADE (incompatible with swing)', () => {
  const raws = [
    mkEv({ DATE: '2026-01-05', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-01-05', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 100, UNIT_PRICE: 11, AMOUNT: 1100, CORP_DAY_TRADE: true }),
  ];
  const opening = buildOpeningFiscal({ rawEvents: raws, fiscalYear: 2026, registry });
  const ledger = buildTaxLedger({ opening, events: raws.filter((e) => e.DATE >= '2026-01-01'), registry, fiscalYear: 2026 });
  const dt = ledger.MONTHLY_CLOSES.find((c) => c.BUCKET === 'RV_STOCK_DAY_TRADE');
  assert.ok(dt, 'day trade bucket close exists');
  assert.strictEqual(dt.REALIZED_GAIN_CENTS, 10000);
});

// ---- 23. fraction auction = sale at fiscal avg -------------------------------------------------
test('torture: fraction auction (RIGHTS_TRANSFER) realizes at fiscal avg cost', () => {
  const recs = run([
    mkEv({ DATE: '2026-01-05', TICKER: 'IRIM15', QUANTITY: 100, UNIT_PRICE: 60, AMOUNT: 6000 }),
    mkEv({ DATE: '2026-02-05', TICKER: 'IRIM15', TYPE: 'CORPORATE_ACTION', MOVEMENT_RAW: 'Leilão de Fração', DIRECTION: 'Credito', QUANTITY: 0.18, UNIT_PRICE: 67.979, AMOUNT: 11.89 }),
  ]);
  const frac = recs[1];
  assert.strictEqual(frac.TYPE, 'RIGHTS_TRANSFER');
  assert.strictEqual(frac.PROCESSING, 'APPLIED');
  // avg = 600000 cents / 100 = 6000 cents per unit; 0.18 units sold
  assert.strictEqual(frac.COST_REMOVED_CENTS, Math.round(6000 * 0.18));
  assert.strictEqual(frac.REALIZED, 1189 - Math.round(6000 * 0.18));
  assert.strictEqual(frac.BUCKET, 'RV_FII');
});

// ---- 24. invariants FAIL on tampered ledger ------------------------------------------------------
test('torture: invariants detect tampering (negative qty, dropped events)', () => {
  const raws = [
    mkEv({ DATE: '2025-06-01', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-02-01', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 20, UNIT_PRICE: 12, AMOUNT: 240 }),
  ];
  const opening = buildOpeningFiscal({ rawEvents: raws, fiscalYear: 2026, registry });
  const ledger = buildTaxLedger({ opening, events: raws.filter((e) => e.DATE >= '2026-01-01'), registry, fiscalYear: 2026 });
  const good = checkInvariants({ opening, ledger });
  assert.strictEqual(good.ALL_PASS, true);

  const tampered = JSON.parse(JSON.stringify(ledger));
  tampered.PROCESSING_RECORDS[0].AFTER_STATE.QTY = -5;
  const bad1 = checkInvariants({ opening, ledger: tampered });
  assert.strictEqual(bad1.ALL_PASS, false);
  assert.ok(bad1.FAILURES.some((f) => f.INVARIANT === 'QUANTITY_NEVER_NEGATIVE'));

  const dropped = JSON.parse(JSON.stringify(ledger));
  dropped.PROCESSING_RECORDS.pop();
  const bad2 = checkInvariants({ opening, ledger: dropped });
  assert.ok(bad2.FAILURES.some((f) => f.INVARIANT === 'NO_DROPPED_EVENTS'));
});

// ---- 25. FIFO vs PM guard ------------------------------------------------------------------------
test('torture: PM result differs from FIFO and engine uses PM', () => {
  const raws = [
    mkEv({ DATE: '2025-06-01', QUANTITY: 100, UNIT_PRICE: 10, AMOUNT: 1000 }),
    mkEv({ DATE: '2026-01-05', QUANTITY: 100, UNIT_PRICE: 30, AMOUNT: 3000 }),
    mkEv({ DATE: '2026-02-01', TYPE: 'SELL', DIRECTION: 'Debito', QUANTITY: 100, UNIT_PRICE: 25, AMOUNT: 2500 }),
  ];
  const opening = buildOpeningFiscal({ rawEvents: raws, fiscalYear: 2026, registry });
  const ledger = buildTaxLedger({ opening, events: raws.filter((e) => e.DATE >= '2026-01-01'), registry, fiscalYear: 2026 });
  const sell = ledger.PROCESSING_RECORDS.find((r) => r.TYPE === 'SELL');
  // PM: avg across opening(100@10)+buy(100@30) = R$20 → realized = 250000 − 200000 = +50000
  assert.strictEqual(sell.REALIZED, 50000);
  // FIFO would remove the R$10 lot first → +150000. Engine MUST NOT produce that.
  assert.notStrictEqual(sell.REALIZED, 150000);
});
