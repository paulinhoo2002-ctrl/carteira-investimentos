'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { annualCloseState } = require('../ir2026/fiscal-product');

test('annualCloseState returns BLOCKED when any monthly state is BLOCKED', () => {
  assert.strictEqual(annualCloseState({ monthlyStates: ['BLOCKED', 'PARTIAL', 'PROVISIONAL'] }), 'BLOCKED');
  assert.strictEqual(annualCloseState({ monthlyStates: ['CERTIFIED', 'BLOCKED', 'CERTIFIED'] }), 'BLOCKED');
});

test('annualCloseState returns PARTIAL when any monthly state is PARTIAL and no BLOCKED', () => {
  assert.strictEqual(annualCloseState({ monthlyStates: ['PARTIAL', 'PROVISIONAL', 'CERTIFIED'] }), 'PARTIAL');
  assert.strictEqual(annualCloseState({ monthlyStates: ['CERTIFIED', 'PARTIAL', 'CERTIFIED'] }), 'PARTIAL');
});

test('annualCloseState returns BLOCKED when openingCostStatus is not CERTIFIED', () => {
  assert.strictEqual(annualCloseState({ monthlyStates: ['CERTIFIED', 'CERTIFIED', 'CERTIFIED'], openingCostStatus: 'PARTIAL' }), 'BLOCKED');
  assert.strictEqual(annualCloseState({ monthlyStates: ['CERTIFIED', 'CERTIFIED', 'CERTIFIED'], openingCostStatus: 'UNKNOWN' }), 'BLOCKED');
});

test('annualCloseState returns PROVISIONAL when any monthly state is PROVISIONAL and no BLOCKED or PARTIAL, and opening cost is certified', () => {
  assert.strictEqual(annualCloseState({ monthlyStates: ['PROVISIONAL', 'PROVISIONAL', 'CERTIFIED'], openingCostStatus: 'CERTIFIED' }), 'PROVISIONAL');
  assert.strictEqual(annualCloseState({ monthlyStates: ['CERTIFIED', 'PROVISIONAL', 'CERTIFIED'], openingCostStatus: 'CERTIFIED' }), 'PROVISIONAL');
});

test('annualCloseState returns CERTIFIED when all monthly states are CERTIFIED and opening cost is certified', () => {
  assert.strictEqual(annualCloseState({ monthlyStates: ['CERTIFIED', 'CERTIFIED', 'CERTIFIED'], openingCostStatus: 'CERTIFIED' }), 'CERTIFIED');
});

test('annualCloseState returns EMPTY when all monthly states are EMPTY and opening cost is certified', () => {
  assert.strictEqual(annualCloseState({ monthlyStates: ['EMPTY', 'EMPTY', 'EMPTY'], openingCostStatus: 'CERTIFIED' }), 'EMPTY');
});

test('annualCloseState returns PROVISIONAL when there is a mix of EMPTY and CERTIFIED and opening cost is certified', () => {
  assert.strictEqual(annualCloseState({ monthlyStates: ['EMPTY', 'CERTIFIED', 'EMPTY'], openingCostStatus: 'CERTIFIED' }), 'PROVISIONAL');
});

test('annualCloseState does not allow annual close to be CERTIFIED when opening cost is not certified', () => {
  assert.strictEqual(annualCloseState({ monthlyStates: ['CERTIFIED', 'CERTIFIED', 'CERTIFIED'], openingCostStatus: 'PARTIAL' }), 'BLOCKED');
});