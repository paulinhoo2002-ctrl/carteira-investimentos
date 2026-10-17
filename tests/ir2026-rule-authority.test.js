'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadRegistry, officialRule, getTaxRate, getExemption, taxDueCalculationAllowed } = require('../ir2026/rules');
const { assessMonth } = require('../ir2026/fiscal-product');
const { renderSummaryCards } = require('../ir2026/ui/product');

const asOf = '2026-06-30';
const registry = loadRegistry();
const copy = () => structuredClone(registry);
const rule = (r, id) => r.RULES.find((item) => item.RULE_ID === id);
const swing = (r = registry) => assessMonth({ registry: r, bucket: 'RV_STOCK_SWING', asOf,
  monthGrossCents: 2100000, monthNetCents: 10000, dataStatus: 'PARTIAL' });

test('only effective primary official rules with reviewed semantics can supply fiscal numbers', () => {
  assert.equal(getTaxRate(registry, 'RULE_RV_SWING_RATE', asOf).RATE_BPS, 1500);
  assert.equal(getExemption(registry, 'RULE_RV_SWING_EXEMPTION_THRESHOLD', asOf).EXEMPTION_LIMIT_CENTS, 2000000);
  assert.equal(getTaxRate(registry, 'RULE_JCP_IRRF', asOf).RATE_BPS, 1750);
  assert.equal(officialRule(registry, 'RULE_STOCK_LENDING_NO_OWNERSHIP_CHANGE', asOf), null);
  assert.equal(taxDueCalculationAllowed(registry, ['RULE_STOCK_LENDING_NO_OWNERSHIP_CHANGE'], asOf), false);
  assert.equal(taxDueCalculationAllowed(registry, ['RULE_RV_SWING_RATE'], '2025-12-31'), false);
  assert.equal(taxDueCalculationAllowed(registry, [], asOf), false);
  assert.equal(taxDueCalculationAllowed(registry, ['RULE_MONEY_INTEGER_CENTS'], asOf), false);
  assert.equal(taxDueCalculationAllowed(registry, ['RULE_RV_SWING_RATE']), false);
  assert.equal(taxDueCalculationAllowed(registry, ['RULE_RV_SWING_RATE'], '2026-02-30'), false);
});

test('provisional swing result follows registry rate and threshold, with deterministic ruleset hash', () => {
  const first = swing();
  assert.equal(first.PROVISIONAL_TAX_CENTS, 1500);
  assert.equal(first.TAX_DUE, 'NOT_CALCULATED_DATA_UNCERTIFIED');
  assert.equal(first.RULES.length, 3);
  assert.equal(first.RULESET_HASH, swing().RULESET_HASH);
  const changedRate = copy();
  rule(changedRate, 'RULE_RV_SWING_RATE').RATE_BPS = 2000;
  assert.equal(swing(changedRate).PROVISIONAL_TAX_CENTS, 2000);
  assert.notEqual(swing(changedRate).RULESET_HASH, first.RULESET_HASH);
  const changedLimit = copy();
  rule(changedLimit, 'RULE_RV_SWING_EXEMPTION_THRESHOLD').EXEMPTION_LIMIT_CENTS = 2200000;
  assert.equal(swing(changedLimit).PROVISIONAL_TAX_CENTS, 0);
});

test('missing, secondary, future, conflicting or unstructured rules block calculation', () => {
  for (const mutate of [
    (r) => { r.RULES = r.RULES.filter((x) => x.RULE_ID !== 'RULE_RV_SWING_RATE'); },
    (r) => { rule(r, 'RULE_RV_SWING_RATE').STATUS = 'VERIFIED_SECONDARY_SUPPORT'; },
    (r) => { rule(r, 'RULE_RV_SWING_RATE').SOURCE_AUTHORITY = 'BROKER'; },
    (r) => { rule(r, 'RULE_RV_SWING_RATE').SOURCE_URL = 'https://example.com/rule'; },
    (r) => { rule(r, 'RULE_RV_SWING_RATE').SEMANTICS_VERIFIED = false; },
    (r) => { delete rule(r, 'RULE_RV_SWING_RATE').RATE_BPS; },
    (r) => { rule(r, 'RULE_RV_SWING_RATE').EFFECTIVE_FROM = '2027-01-01'; },
  ]) {
    const r = copy(); mutate(r);
    assert.equal(swing(r).PROVISIONAL_TAX_CENTS, null);
    assert.equal(swing(r).TAX_DUE, 'NOT_CALCULATED_RULES_UNVERIFIED');
  }
  const conflict = copy();
  conflict.RULES.push({ ...rule(conflict, 'RULE_RV_SWING_RATE'), RULE_VERSION: 99 });
  assert.throws(() => swing(conflict), /overlapping effective ranges/);
});

test('invalid or incomplete inputs and mixed ETF/BDR never create a tax amount', () => {
  assert.equal(assessMonth({ registry, bucket: 'RV_STOCK_SWING', monthGrossCents: 2100000,
    monthNetCents: 10000, dataStatus: 'CERTIFIED' }).PROVISIONAL_TAX_CENTS, null);
  assert.equal(assessMonth({ registry, bucket: 'RV_STOCK_SWING', asOf,
    monthGrossCents: null, monthNetCents: 10000, dataStatus: 'CERTIFIED' }).TAX_DUE, 'NOT_CALCULATED_RULES_UNVERIFIED');
  assert.equal(assessMonth({ registry, bucket: 'RV_ETF_BDR', asOf,
    monthGrossCents: 10000, monthNetCents: 1000, dataStatus: 'CERTIFIED' }).PROVISIONAL_TAX_CENTS, null);
});

test('fiscal product has no literal tax rates or exemption threshold', () => {
  const source = fs.readFileSync(path.join(__dirname, '../ir2026/fiscal-product.js'), 'utf8');
  assert.doesNotMatch(source, /monthNetCents\s*\*\s*0\.\d+|const limit\s*=\s*\d+/);
});

test('unknown realized result is not displayed as confirmed zero', () => {
  const html = renderSummaryCards({ OPENING_COVERAGE: { OPENING_HELD_CANDIDATES: 2, OPENING_CERTIFIED: 0 },
    SALES_2026: { TOTAL: 1 }, TAX_PAYABLE_STATUS: 'NOT_CALCULATED' });
  assert.match(html, /Resultado realizado certificado/);
  assert.match(html, /Não certificado/);
  assert.doesNotMatch(html, /R\$ 0,00/);
});
