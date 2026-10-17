'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { monthlyCloseState } = require('../ir2026/fiscal-product');

test('monthlyCloseState returns BLOCKED when there are sell events and all are unknown', () => {
  assert.strictEqual(monthlyCloseState({ close: { EVENTS: 5, UNKNOWN_BLOCKERS: 5 }, dataStatus: 'PARTIAL' }), 'BLOCKED');
});

test('monthlyCloseState returns PARTIAL when there are some unknown blockers', () => {
  assert.strictEqual(monthlyCloseState({ close: { EVENTS: 5, UNKNOWN_BLOCKERS: 2 }, dataStatus: 'PARTIAL' }), 'PARTIAL');
});

test('monthlyCloseState returns EMPTY when there are no events', () => {
  assert.strictEqual(monthlyCloseState({ close: { EVENTS: 0 }, dataStatus: 'PARTIAL' }), 'EMPTY');
});

test('monthlyCloseState returns PROVISIONAL when there are events, no unknown blockers, and data is not certified', () => {
  assert.strictEqual(monthlyCloseState({ close: { EVENTS: 5, UNKNOWN_BLOCKERS: 0 }, dataStatus: 'PARTIAL' }), 'PROVISIONAL');
});

test('monthlyCloseState returns CERTIFIED when there are events, no unknown blockers, and data is certified', () => {
  assert.strictEqual(monthlyCloseState({ close: { EVENTS: 5, UNKNOWN_BLOCKERS: 0 }, dataStatus: 'CERTIFIED' }), 'CERTIFIED');
});

test('monthlyCloseState does not allow illegal jump from BLOCKED to CERTIFIED', () => {
  const blockedState = { close: { EVENTS: 5, UNKNOWN_BLOCKERS: 5 }, dataStatus: 'PARTIAL' };
  assert.strictEqual(monthlyCloseState({ ...blockedState, dataStatus: 'CERTIFIED' }), 'BLOCKED');
});

test('monthlyCloseState does not allow illegal jump from PARTIAL to CERTIFIED without data being certified', () => {
  const partialState = { close: { EVENTS: 5, UNKNOWN_BLOCKERS: 2 }, dataStatus: 'PARTIAL' };
  assert.strictEqual(monthlyCloseState({ ...partialState, dataStatus: 'CERTIFIED' }), 'PARTIAL');
});

test('monthlyCloseState does not allow illegal jump from PROVISIONAL to CERTIFIED without data being certified', () => {
  const provisionalState = { close: { EVENTS: 5, UNKNOWN_BLOCKERS: 0 }, dataStatus: 'PARTIAL' };
  assert.strictEqual(monthlyCloseState({ ...provisionalState, dataStatus: 'CERTIFIED' }), 'CERTIFIED');
});