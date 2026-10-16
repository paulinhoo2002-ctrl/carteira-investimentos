'use strict';
// IR2026 — contracts, hashing, rule registry and source inventory tests.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const contracts = require('../ir2026/contracts');
const hashlib = require('../ir2026/hash');
const rulesMod = require('../ir2026/rules');
const fs = require('fs');

test('FISCAL_START_YEAR is 2026 (P3 coverage boundary)', () => {
  assert.strictEqual(contracts.FISCAL_START_YEAR, 2026);
});

test('P6 asset class taxonomy is complete', () => {
  for (const c of ['BRAZIL_STOCK', 'FII', 'ETF_BR', 'BDR', 'RIGHTS_SUBSCRIPTION',
    'FIXED_INCOME_CDB', 'FIXED_INCOME_CRA', 'FIXED_INCOME_DEB', 'FIXED_INCOME_LIG',
    'CASH', 'OTHER']) {
    assert.ok(contracts.ASSET_CLASSES.includes(c), c);
  }
});

test('P7 event model covers the required fiscal event types', () => {
  for (const t of ['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT', 'CORPORATE_SPLIT',
    'CORPORATE_REVERSE_SPLIT', 'BONUS', 'SUBSCRIPTION', 'RIGHTS_TRANSFER', 'TICKER_CHANGE',
    'MERGER', 'SPINOFF', 'AMORTIZATION', 'CAPITAL_RETURN', 'DIVIDEND', 'JCP',
    'RF_APPLICATION', 'RF_REDEMPTION', 'RF_INTEREST', 'RF_MATURITY',
    'STOCK_LENDING_INCOME', 'UNKNOWN']) {
    assert.ok(contracts.EVENT_TYPES.includes(t), t);
  }
});

test('classifyAssetClass: CDB variants map to FIXED_INCOME_CDB', () => {
  for (const t of ['CDB', 'CDBA26651FF', 'CDB3268B1NR', 'CDB6267OC9K']) {
    assert.strictEqual(contracts.classifyAssetClass(t).assetClass, 'FIXED_INCOME_CDB', t);
  }
});

test('classifyAssetClass: FII pattern, debênture fund, stock, BDR', () => {
  assert.strictEqual(contracts.classifyAssetClass('BRCO11').assetClass, 'FII');
  assert.strictEqual(
    contracts.classifyAssetClass('SNID11', { product: 'SNID11 - SUNO INFRA DEBÊNTURES' }).assetClass,
    'FIXED_INCOME_DEB'
  );
  assert.strictEqual(contracts.classifyAssetClass('VALE3').assetClass, 'BRAZIL_STOCK');
  assert.strictEqual(contracts.classifyAssetClass('AAPL34').assetClass, 'BDR');
  assert.strictEqual(contracts.classifyAssetClass('BOVA11').assetClass, 'FII'); // pattern FII — 4 letras + 11
});

test('normalizeEventType never guesses into BUY/SELL', () => {
  assert.strictEqual(contracts.normalizeEventType('CORPORATE_ACTION', 'Leilão de Fração'), 'RIGHTS_TRANSFER');
  assert.strictEqual(contracts.normalizeEventType('CORPORATE_ACTION', 'Bonificação em Ativos'), 'BONUS');
  assert.strictEqual(contracts.normalizeEventType('STOCK_LOAN', 'Empréstimo'), 'STOCK_LOAN_OUT');
  assert.strictEqual(contracts.normalizeEventType('MARKET_EVENT', 'Atualização'), 'TICKER_CHANGE');
  assert.strictEqual(contracts.normalizeEventType('FEE', 'RETIRADA DE CUSTÓDIA'), 'UNKNOWN');
  assert.strictEqual(contracts.normalizeEventType('TRANSFER_CANDIDATE', 'Transferência'), 'UNKNOWN');
  assert.strictEqual(contracts.normalizeEventType('BIZARRO', 'qualquer'), 'UNKNOWN');
  assert.strictEqual(contracts.normalizeEventType('RF_REDEMPTION', 'RESGATE ANTECIPADO/'), 'RF_REDEMPTION');
});

test('transferSemantics keeps direction evidence explicit (P13)', () => {
  assert.strictEqual(contracts.transferSemantics({ DIRECTION: 'Credito' }), 'TRANSFER_IN');
  assert.strictEqual(contracts.transferSemantics({ DIRECTION: 'Debito' }), 'TRANSFER_OUT');
  assert.strictEqual(contracts.transferSemantics({ DIRECTION: '' }), 'TRANSFER_DIRECTION_UNKNOWN');
});

test('hash: canonicalize sorts keys — same content, any order, same SHA (Firestore map-order lesson)', () => {
  const a = { z: 1, a: { y: 2, b: [3, { q: 4, c: 5 }] } };
  const b = { a: { b: [3, { c: 5, q: 4 }], y: 2 }, z: 1 };
  assert.strictEqual(hashlib.sha256Json(a), hashlib.sha256Json(b));
});

test('hash: toCents/toQty preserve UNKNOWN as null, never coerce to zero', () => {
  assert.strictEqual(hashlib.toCents(null), null);
  assert.strictEqual(hashlib.toCents(undefined), null);
  assert.strictEqual(hashlib.toCents(''), null);
  assert.strictEqual(hashlib.toCents('abc'), null);
  assert.strictEqual(hashlib.toCents('12.345'), 1235); // deterministic rounding at boundary
  assert.strictEqual(hashlib.toCents(0), 0); // real zero is real data
  assert.strictEqual(hashlib.toQty('0.100000004'), 0.1);
  assert.strictEqual(hashlib.toQty(null), null);
});

test('rules registry: loads, unique ids, valid statuses (P21)', () => {
  const reg = rulesMod.loadRegistry();
  assert.ok(reg.RULES.length >= 25);
  assert.ok(reg.REGISTRY_SHA256.length === 64);
});

test('official 2026 review covers each pending rule once without enabling tax calculation', () => {
  const registry = rulesMod.loadRegistry();
  const review = JSON.parse(fs.readFileSync(path.join(__dirname, '../ir2026/rules/legal-review-2026.json'), 'utf8'));
  assert.strictEqual(review.TAX_YEAR, 2026);
  assert.strictEqual(review.REVIEWS.length, 26);
  const pending = new Set(rulesMod.rulesNeedingExternalVerification(registry));
  const allowed = new Set(['CERTIFIED_BY_OFFICIAL_SOURCE', 'PARTIAL_LEGAL_EVIDENCE',
    'CONFLICTING_OFFICIAL_EVIDENCE', 'NEEDS_MORE_SOURCE', 'NOT_APPLICABLE']);
  for (const [id, sourceIds, section, summary, behavior, cases, confidence, status] of review.REVIEWS) {
    assert.ok(pending.delete(id), `duplicate or non-pending review: ${id}`);
    assert.ok(allowed.has(status), id);
    assert.ok(summary && behavior && cases && confidence, id);
    for (const sourceId of sourceIds.split(',').filter(Boolean)) {
      const source = review.SOURCES[sourceId];
      assert.ok(source && source[0] && source[1] && /^https:\/\//.test(source[2]), `${id}: ${sourceId}`);
      assert.ok(section, `${id}: official section missing`);
    }
    if (status === 'CERTIFIED_BY_OFFICIAL_SOURCE') assert.ok(sourceIds && section, id);
  }
  assert.strictEqual(pending.size, 0);
  assert.strictEqual(rulesMod.taxDueCalculationAllowed(registry, ['RULE_RV_SWING_RATE']), false);
  assert.strictEqual(rulesMod.taxDueCalculationAllowed(registry, ['RULE_FII_ALIENATION_EXEMPT_PF']), false);
  const bonus = rulesMod.resolveRule(registry, 'RULE_BONUS_NO_COST_INFLATION', '2026-10-16');
  assert.strictEqual(bonus.RULE_VERSION, 2);
  assert.strictEqual(bonus.LEGAL_STATUS, 'PARTIAL_LEGAL_EVIDENCE');
  assert.strictEqual(bonus.STATUS, 'NEEDS_CURRENT_LEGAL_SOURCE');
});

test('rules registry: legal-sensitive rules flagged NEEDS_CURRENT_LEGAL_SOURCE (P22)', () => {
  const reg = rulesMod.loadRegistry();
  const need = rulesMod.rulesNeedingExternalVerification(reg);
  for (const id of ['RULE_RV_SWING_RATE', 'RULE_RV_SWING_EXEMPTION_THRESHOLD', 'RULE_RF_REGRESSIVE_TABLE',
    'RULE_FII_DISTRIBUTION_EXEMPT_PF', 'RULE_DAY_TRADE_RATE', 'RULE_LOSS_CARRYFORWARD_SAME_CATEGORY']) {
    assert.ok(need.includes(id), id);
  }
});

test('rules: TAX_DUE calculation blocked while swing rules are uncertified (P17/P22)', () => {
  const reg = rulesMod.loadRegistry();
  const ok = rulesMod.taxDueCalculationAllowed(reg, [
    'RULE_MONEY_INTEGER_CENTS', 'RULE_UNKNOWN_NOT_ZERO',
  ]);
  const blocked = rulesMod.taxDueCalculationAllowed(reg, [
    'RULE_MONEY_INTEGER_CENTS', 'RULE_RV_SWING_RATE',
  ]);
  assert.strictEqual(ok, true);
  assert.strictEqual(blocked, false);
});

test('rules: resolveRule respects EFFECTIVE ranges and fails closed', () => {
  const reg = rulesMod.loadRegistry();
  const r = rulesMod.resolveRule(reg, 'RULE_RV_SWING_RATE', '2026-05-10');
  assert.ok(r && r.RULE_VERSION === 1);
  assert.strictEqual(rulesMod.resolveRule(reg, 'RULE_RV_SWING_RATE', '2015-05-10'), null);
  assert.strictEqual(rulesMod.resolveRule(reg, 'RULE_DOES_NOT_EXIST', '2026-05-10'), null);
});

test('source inventory: derived artifacts are not independent evidence (P2)', () => {
  const inv = JSON.parse(fs.readFileSync(path.join(__dirname, '../ir2026/sources/source-inventory.json'), 'utf8'));
  assert.strictEqual(inv.FISCAL_START_YEAR, 2026);
  assert.ok(inv.SOURCES.length >= 10);
  for (const s of inv.SOURCES) {
    assert.ok(s.SOURCE_ID && s.SOURCE_TYPE, s.SOURCE_ID);
    assert.ok(contracts.SOURCE_TYPES.includes(s.SOURCE_TYPE), s.SOURCE_TYPE);
    if (s.SOURCE_TYPE.startsWith('DERIVED')) {
      assert.strictEqual(s.INDEPENDENT_EVIDENCE, false, s.SOURCE_ID);
    }
  }
  assert.ok(inv.GAPS.length >= 3);
});

test('certification layers: 8 independent layers, no global IR_READY (P25)', () => {
  assert.strictEqual(contracts.CERTIFICATION_LAYERS.length, 8);
  assert.ok(!contracts.CERTIFICATION_LAYERS.includes('IR_READY'));
});

test('unknown impact flags cover fiscal and current impact (P26)', () => {
  assert.ok(contracts.UNKNOWN_IMPACT_FLAGS.includes('AFFECTS_IR'));
  assert.ok(contracts.UNKNOWN_IMPACT_FLAGS.includes('NO_CURRENT_FISCAL_IMPACT'));
});
