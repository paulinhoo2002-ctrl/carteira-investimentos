'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { darfSafety, assessMonth } = require('../ir2026/fiscal-product');
const { loadRegistry } = require('../ir2026/rules');

const verified = { registry: loadRegistry(), ruleIds: ['RULE_RV_SWING_RATE'], asOf: '2026-06-30' };
const assessment = assessMonth({ registry: verified.registry, bucket: 'RV_STOCK_SWING', asOf: verified.asOf,
  monthGrossCents: 2100000, monthNetCents: 10000, dataStatus: 'CERTIFIED' });
const complete = { ...verified, ruleIds: assessment.RULES.map((r) => r.RULE_ID), assessment };

test('DARF gate rejects caller-supplied boolean and missing/secondary rules', () => {
  const base = { dataCertified: true, monthlyState: 'CERTIFIED' };
  assert.equal(darfSafety({ ...base, rulesVerified: true }).CAN_GENERATE_DARF, false);
  assert.equal(darfSafety({ ...base, ...verified, ruleIds: ['RULE_STOCK_LENDING_NO_OWNERSHIP_CHANGE'] }).CAN_GENERATE_DARF, false);
  assert.equal(darfSafety({ ...base, ...verified, asOf: '2025-12-31' }).CAN_GENERATE_DARF, false);
});

test('DARF gate requires certified data and monthly state as well as official rules', () => {
  assert.equal(darfSafety({ ...verified, dataCertified: false, monthlyState: 'BLOCKED' }).CAN_CALCULATE_TAX, false);
  assert.equal(darfSafety({ ...verified, dataCertified: false, monthlyState: 'BLOCKED' }).CAN_DISPLAY_PROVISIONAL_TAX, true);
  for (const state of ['BLOCKED', 'PARTIAL']) {
    assert.equal(darfSafety({ ...verified, dataCertified: true, monthlyState: state }).CAN_CALCULATE_TAX, false);
  }
  assert.equal(darfSafety({ ...verified, dataCertified: true, monthlyState: 'CERTIFIED' }).CAN_GENERATE_DARF, false);
  assert.equal(darfSafety({ ...complete, dataCertified: true, monthlyState: 'PROVISIONAL' }).CAN_CALCULATE_TAX, true);
  assert.equal(darfSafety({ ...complete, dataCertified: true, monthlyState: 'PROVISIONAL' }).CAN_GENERATE_DARF, false);
  assert.equal(darfSafety({ ...complete, dataCertified: true, monthlyState: 'CERTIFIED' }).CAN_GENERATE_DARF, true);
  assert.equal(darfSafety({ ...complete, assessment: { ...assessment, RULESET_HASH: 'tampered' },
    dataCertified: true, monthlyState: 'CERTIFIED' }).CAN_GENERATE_DARF, false);
});
