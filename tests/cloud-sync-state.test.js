'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const CloudSyncState = require('../cloud-sync-state.js');

test('successful sync with assets becomes connected', () => {
  const state = CloudSyncState.resolve(CloudSyncState.begin(), { exists: true, hasData: true });
  assert.equal(state.status, CloudSyncState.STATES.CONNECTED);
  assert.equal(CloudSyncState.isDataConfirmed(state), true);
});

test('successful sync with truly empty cloud becomes empty confirmed', () => {
  const state = CloudSyncState.resolve(CloudSyncState.begin(), { exists: false, hasData: false });
  assert.equal(state.status, CloudSyncState.STATES.EMPTY_CONFIRMED);
  assert.equal(CloudSyncState.isDataConfirmed(state), true);
});

test('unresolved sync becomes timeout without confirming zero', () => {
  const state = CloudSyncState.timeout(CloudSyncState.begin());
  assert.equal(state.status, CloudSyncState.STATES.TIMEOUT);
  assert.equal(CloudSyncState.isDataConfirmed(state), false);
  assert.equal(CloudSyncState.displayValue(state, 0), '—');
});

test('rejected sync becomes an explicit error', () => {
  const state = CloudSyncState.fail(CloudSyncState.begin(), { code: 'permission-denied' });
  assert.equal(state.status, CloudSyncState.STATES.ERROR);
  assert.equal(state.errorCode, 'PERMISSION_DENIED');
});

test('offline sync is classified separately', () => {
  const state = CloudSyncState.fail(CloudSyncState.begin(), { code: 'unavailable' });
  assert.equal(state.status, CloudSyncState.STATES.OFFLINE);
});

test('retry after timeout starts a fresh attempt', () => {
  const timedOut = CloudSyncState.timeout(CloudSyncState.begin());
  const retry = CloudSyncState.retry(timedOut);
  assert.equal(retry.status, CloudSyncState.STATES.SYNCING);
  assert.equal(retry.attempt, 2);
});

test('retry after error starts a fresh attempt', () => {
  const failed = CloudSyncState.fail(CloudSyncState.begin(), new Error('network unavailable'));
  const retry = CloudSyncState.retry(failed);
  assert.equal(retry.status, CloudSyncState.STATES.SYNCING);
  assert.equal(retry.attempt, 2);
});

test('confirmed connected values render while unknown values remain unavailable', () => {
  const state = CloudSyncState.resolve(CloudSyncState.begin(), { exists: true, hasData: true });
  assert.equal(CloudSyncState.displayValue(state, 0), 0);
  assert.equal(CloudSyncState.displayValue(CloudSyncState.timeout(CloudSyncState.begin()), 0), '—');
});

test('multiple retries do not create a new attempt from an active sync', () => {
  const syncing = CloudSyncState.begin();
  assert.equal(CloudSyncState.retry(syncing), syncing);
});

test('delayed authentication does not confirm an empty portfolio', () => {
  const authPending = CloudSyncState.initial('AUTHENTICATING');
  assert.equal(CloudSyncState.isDataConfirmed(authPending), false);
  assert.equal(CloudSyncState.displayValue(authPending, 0), '—');
});

