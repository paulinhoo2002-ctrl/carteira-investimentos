'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { EXPECTED_QA_PROJECT_ID, classifyBrowserGateState, isFirebaseServiceRequest, readSourceProductionProjectId, resolveAuthenticatedBrowserEndpoint, resolvePreviewQaBoundary, unsafeFirebaseRequest } = require('../scripts/qa/preview-provider-browser.cjs');

const qa = { projectId: 'qa-project', productionProjectId: 'prod-project',
  apiKey: 'qa-key', authDomain: 'qa-project.firebaseapp.com' };

test('V316 browser gate distinguishes Vercel auth, Google auth, invalid config and missing descriptor', () => {
  assert.equal(EXPECTED_QA_PROJECT_ID, 'carteira-invest-qa-v316');
  assert.equal(classifyBrowserGateState({ hostname: 'vercel.com', pathname: '/sso-api/login' }), 'VERCEL_AUTH_REQUIRED');
  assert.equal(classifyBrowserGateState({ hostname: 'preview.example.test', title: 'Log in to Vercel' }), 'VERCEL_AUTH_REQUIRED');
  assert.equal(classifyBrowserGateState({ hostname: 'preview.example.test', title: 'Authentication required | Vercel' }), 'VERCEL_AUTH_REQUIRED');
  assert.equal(classifyBrowserGateState({ hostname: 'accounts.google.com' }), 'GOOGLE_AUTH_REQUIRED');
  assert.equal(classifyBrowserGateState({ hostname: 'preview.example.test', providerError: 'Autenticação indisponível neste ambiente' }), 'PREVIEW_CONFIG_INVALID');
  assert.equal(classifyBrowserGateState({ hostname: 'preview.example.test' }), 'DESCRIPTOR_UNAVAILABLE');
  assert.equal(classifyBrowserGateState({ hostname: 'preview.example.test', hasDescriptor: true }), 'PREVIEW_DESCRIPTOR_READY');
});

test('V316 browser reuse only accepts local plain-HTTP CDP endpoints', () => {
  assert.equal(resolveAuthenticatedBrowserEndpoint('http://127.0.0.1:9222'), 'http://127.0.0.1:9222');
  assert.equal(resolveAuthenticatedBrowserEndpoint('http://localhost:9222'), 'http://localhost:9222');
  assert.throws(() => resolveAuthenticatedBrowserEndpoint('https://remote.example.test'), /loopback/);
  assert.throws(() => resolveAuthenticatedBrowserEndpoint('http://127.0.0.1:9222/?token=x'), /loopback/);
  assert.throws(() => resolveAuthenticatedBrowserEndpoint(''), /already-authenticated/);
});

test('V316 protected browser bootstrap blocks Firebase until the QA descriptor is validated', () => {
  assert.equal(isFirebaseServiceRequest('https://firestore.googleapis.com/v1/projects/qa-project/databases/(default)/documents'), true);
  assert.equal(isFirebaseServiceRequest('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp'), true);
  assert.equal(isFirebaseServiceRequest('https://qa-project.firebaseapp.com/__/auth/handler'), true);
  assert.equal(isFirebaseServiceRequest('https://query1.finance.yahoo.com/v8/finance/chart/ABC'), false);
});

test('V316 browser reads the production project boundary only from the stripped public config', () => {
  assert.equal(readSourceProductionProjectId('const firebaseConfig = { projectId: "prod-project" };'), 'prod-project');
  assert.equal(readSourceProductionProjectId('const firebaseConfig = {};'), '');
  assert.equal(readSourceProductionProjectId('const firebaseConfig = { apiKey: "must-not-parse", projectId: "prod-project" };'), '');
});

test('V316 browser derives only an authorized isolated Preview project from its descriptor', () => {
  const deployment = {
    mode: 'preview',
    allowedHosts: ['qa-preview.example.test'],
    productionHosts: ['carteira-investimentos-delta.vercel.app'],
    productionProjectId: 'prod-project',
    config: { ...qa, storageBucket: 'qa-project.firebasestorage.app', messagingSenderId: '123456', appId: '1:123456:web:abc123' },
  };
  assert.deepEqual(resolvePreviewQaBoundary('qa-preview.example.test', deployment, 'prod-project'), { ...deployment.config, productionProjectId: 'prod-project' });
  assert.throws(() => resolvePreviewQaBoundary('unknown.example.test', deployment, 'prod-project'), /not authorized/);
  assert.throws(() => resolvePreviewQaBoundary('qa-preview.example.test', { mode: 'blocked' }, 'prod-project'), /project ID could not be verified/);
  assert.throws(() => resolvePreviewQaBoundary('qa-preview.example.test', deployment, ''), /project ID could not be verified/);
  assert.throws(() => resolvePreviewQaBoundary('qa-preview.example.test', deployment, 'other-prod-project'), /project ID could not be verified/);
  assert.throws(() => resolvePreviewQaBoundary('qa-preview.example.test', { ...deployment, productionProjectId: undefined }, 'prod-project'), /project ID could not be verified/);
  assert.throws(() => resolvePreviewQaBoundary('qa-preview.example.test', deployment, 'prod-project', 'other-qa-project'), /project ID could not be verified/);
  assert.throws(() => resolvePreviewQaBoundary('qa-preview.example.test', { ...deployment, productionProjectId: 'qa-project' }, 'qa-project'), /not isolated/);
});

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
