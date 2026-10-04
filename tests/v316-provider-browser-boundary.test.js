'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { unsafeFirebaseRequest } = require('../scripts/qa/preview-provider-browser.cjs');

const qa = { projectId: 'qa-project', productionProjectId: 'prod-project',
  apiKey: 'qa-key', authDomain: 'qa-project.firebaseapp.com' };

test('V316 browser boundary permits QA Auth and Firestore reads', () => {
  assert.equal(unsafeFirebaseRequest('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=qa-key', qa), null);
  assert.equal(unsafeFirebaseRequest('https://qa-project.firebaseapp.com/__/auth/handler', qa), null);
  assert.equal(unsafeFirebaseRequest('https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?database=projects%2Fqa-project%2Fdatabases%2F(default)', qa), null);
});

test('V316 browser boundary blocks production/other Firebase projects and writes', () => {
  assert.equal(unsafeFirebaseRequest('https://firestore.googleapis.com/v1/projects/prod-project/databases/(default)/documents', qa), 'PRODUCTION_PROJECT_REQUEST');
  assert.equal(unsafeFirebaseRequest('https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?database=projects%2Fother-project%2Fdatabases%2F(default)', qa), 'OTHER_FIRESTORE_PROJECT');
  assert.equal(unsafeFirebaseRequest('https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?database=projects%2Fqa-project%2Fdatabases%2F(default)', qa), 'FIRESTORE_WRITE');
  assert.equal(unsafeFirebaseRequest('https://firestore.googleapis.com/v1/projects/qa-project/databases/(default)/documents/portfolios/one', qa, 'PATCH'), 'FIRESTORE_WRITE');
  assert.equal(unsafeFirebaseRequest('https://firestore.googleapis.com/v1/projects/qa-project/databases/(default)/documents/portfolios', qa, 'POST'), 'FIRESTORE_WRITE');
  assert.equal(unsafeFirebaseRequest('https://firebasestorage.googleapis.com/v0/b/qa-project.firebasestorage.app/o', qa, 'POST'), 'UNEXPECTED_FIREBASE_DATA_REQUEST');
  assert.equal(unsafeFirebaseRequest('https://storage.googleapis.com/production-bucket/private', qa), 'UNEXPECTED_FIREBASE_DATA_REQUEST');
  assert.equal(unsafeFirebaseRequest('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp', qa, 'POST'), 'OTHER_FIREBASE_API_KEY');
  assert.equal(unsafeFirebaseRequest('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=prod-key', qa), 'OTHER_FIREBASE_API_KEY');
  assert.equal(unsafeFirebaseRequest('https://prod-project.firebaseapp.com/__/auth/handler', qa), 'PRODUCTION_PROJECT_REQUEST');
});
