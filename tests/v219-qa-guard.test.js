'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const markerSource = fs.readFileSync(path.join(root, 'protected-local-cloud-authority.js'), 'utf8');
const markerScript = 'protected-local-cloud-authority.js?v=phase4i-authority-2';

function authorityApi() {
  const sandbox = { TextEncoder, Uint8Array, DataView, Object, JSON, Date, String, Number };
  vm.runInNewContext(markerSource, sandbox, { filename: 'protected-local-cloud-authority.js' });
  return sandbox.ProtectedLocalCloudAuthority;
}

test('versioned QA marker is part of the reproducible page identity contract', () => {
  assert.match(index, new RegExp(`<script src="${markerScript.replace(/[.?]/g, '\\$&')}"></script>`));
  assert.ok(index.indexOf(markerScript) > index.indexOf('<script src="persistence-core.js"></script>'));
});

test('correct project marker passes while a sibling or missing marker fails closed', () => {
  const hasMarker = html => html.includes(markerScript);
  assert.equal(hasMarker(index), true);
  assert.equal(hasMarker('<!doctype html><title>other project</title>'), false);
  assert.equal(hasMarker(index.replace(markerScript, 'protected-local-cloud-authority.js?v=wrong')), false);
});

test('authority marker is read-only and does not contain auth or persistence integration', () => {
  assert.doesNotMatch(markerSource, /firebase|firestore|localStorage|indexedDB|fetch\s*\(|document\.cookie|token|cookie/i);
  assert.doesNotMatch(markerSource, /setItem|removeItem|addDoc|setDoc|updateDoc|deleteDoc|writeBatch/i);
  const api = authorityApi();
  assert.equal(typeof api.decide, 'function');
  assert.equal(typeof api.createMarker, 'function');
});

test('protected marker authority remains fail-closed for missing, invalid and mismatched fingerprints', () => {
  const api = authorityApi();
  const fingerprint = 'a'.repeat(64);
  const otherFingerprint = 'b'.repeat(64);
  const marker = api.createMarker({
    baseCloudFingerprint: fingerprint,
    currentLocalFingerprint: fingerprint,
    operationId: 'qa-proof',
    now: () => '2026-09-19T00:00:00.000Z',
  });
  assert.equal(api.decide({ marker, localFingerprint: fingerprint, cloudFingerprint: fingerprint }).status, api.STATUS.LOCAL_AUTHORITATIVE);
  assert.equal(api.decide({ marker: null, localFingerprint: fingerprint, cloudFingerprint: fingerprint }).status, api.STATUS.CLOUD_AUTHORITATIVE);
  assert.equal(api.decide({ marker: '{bad-json', localFingerprint: fingerprint, cloudFingerprint: fingerprint }).status, api.STATUS.INVALID_PROTECTED_MARKER);
  assert.equal(api.decide({ marker, localFingerprint: otherFingerprint, cloudFingerprint: fingerprint }).status, api.STATUS.INVALID_PROTECTED_MARKER);
  assert.equal(api.decide({ marker, localFingerprint: fingerprint, cloudFingerprint: otherFingerprint }).status, api.STATUS.CONFLICT);
});
