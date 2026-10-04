'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { selectFirebaseConfig } = require('../firebase-config-selector.js');

const production = Object.freeze({
  apiKey: 'synth-prod-key',
  authDomain: 'carteira-de-investimento-16725.firebaseapp.com',
  projectId: 'carteira-de-investimento-16725',
  storageBucket: 'carteira-de-investimento-16725.firebasestorage.app',
  messagingSenderId: '194762472851',
  appId: '1:194762472851:web:1285e351b2dcc80f147c66',
});

const qa = Object.freeze({
  apiKey: 'synth-qa-key',
  authDomain: 'isolated-qa-project.firebaseapp.com',
  projectId: 'isolated-qa-project',
  storageBucket: 'isolated-qa-project.firebasestorage.app',
  messagingSenderId: '987654',
  appId: '1:987654:web:def456',
});

function makeDeployment(mode, overrides = {}) {
  const base = {
    production,
    qa,
    mode,
    allowedHosts: [],
    productionHosts: ['carteira-investimentos-delta.vercel.app'],
    productionProjectId: production.projectId,
    config: qa,
  };
  return { ...base, ...overrides };
}

test('V316B production host selects production config', () => {
  const deployment = makeDeployment('production', {
    allowedHosts: ['carteira-investimentos-delta.vercel.app'],
  });
  const result = selectFirebaseConfig('carteira-investimentos-delta.vercel.app', deployment, production);
  assert.deepEqual(result, production);
});

test('V316B approved Preview host selects QA config', () => {
  const deployment = makeDeployment('preview', {
    allowedHosts: ['carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app'],
  });
  const result = selectFirebaseConfig('carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app', deployment, production);
  assert.deepEqual(result, qa);
});

test('V316B unauthorized Preview host fails closed', () => {
  const deployment = makeDeployment('preview', {
    allowedHosts: ['carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app'],
  });
  assert.throws(
    () => selectFirebaseConfig('evil-host.vercel.app', deployment, production),
    /Firebase host is not authorized/
  );
});

test('V316B localhost is rejected in production mode', () => {
  const deployment = makeDeployment('production', {
    allowedHosts: ['carteira-investimentos-delta.vercel.app'],
  });
  assert.throws(
    () => selectFirebaseConfig('localhost', deployment, production),
    /Firebase host is not authorized/
  );
});

test('V316B 127.0.0.1 is rejected in production mode', () => {
  const deployment = makeDeployment('production', {
    allowedHosts: ['carteira-investimentos-delta.vercel.app'],
  });
  assert.throws(
    () => selectFirebaseConfig('127.0.0.1', deployment, production),
    /Firebase host is not authorized/
  );
});

test('V316B unknown host fails closed', () => {
  const deployment = makeDeployment('production', {
    allowedHosts: ['carteira-investimentos-delta.vercel.app'],
  });
  assert.throws(
    () => selectFirebaseConfig('unknown.example.com', deployment, production),
    /Firebase host is not authorized/
  );
});

test('V316B missing deployment config fails closed', () => {
  assert.throws(
    () => selectFirebaseConfig('carteira-investimentos-delta.vercel.app', null, production),
    /Firebase deployment is not configured/
  );
});

test('V316B Preview on production host fails closed', () => {
  const deployment = makeDeployment('preview', {
    allowedHosts: ['carteira-investimentos-delta.vercel.app'],
    productionHosts: ['carteira-investimentos-delta.vercel.app'],
  });
  assert.throws(
    () => selectFirebaseConfig('carteira-investimentos-delta.vercel.app', deployment, production),
    /QA Firebase cannot run on a production host/
  );
});

test('V316B QA config missing required field fails closed', () => {
  const deployment = makeDeployment('preview', {
    allowedHosts: ['carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app'],
    config: { ...qa, appId: '' },
  });
  assert.throws(
    () => selectFirebaseConfig('carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app', deployment, production),
    /QA Firebase configuration is invalid/
  );
});

test('V316B QA config with production projectId fails closed', () => {
  const deployment = makeDeployment('preview', {
    allowedHosts: ['carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app'],
    config: production,
  });
  assert.throws(
    () => selectFirebaseConfig('carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app', deployment, production),
    /QA Firebase project is not isolated/
  );
});

test('V316B QA config with production apiKey fails closed', () => {
  const deployment = makeDeployment('preview', {
    allowedHosts: ['carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app'],
    config: { ...qa, apiKey: production.apiKey },
  });
  assert.throws(
    () => selectFirebaseConfig('carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app', deployment, production),
    /QA Firebase project is not isolated/
  );
});

test('V316B malformed QA config fails closed', () => {
  const deployment = makeDeployment('preview', {
    allowedHosts: ['carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app'],
    config: { ...qa, authDomain: 'wrong.firebaseapp.com' },
  });
  assert.throws(
    () => selectFirebaseConfig('carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app', deployment, production),
    /QA Firebase configuration is invalid/
  );
});

test('V316B QA config with production storageBucket fails closed', () => {
  const deployment = makeDeployment('preview', {
    allowedHosts: ['carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app'],
    config: { ...qa, storageBucket: production.storageBucket },
  });
  assert.throws(
    () => selectFirebaseConfig('carteira-investimentos-abc123-paulinhoo2002-ctrls-projects.vercel.app', deployment, production),
    /QA Firebase configuration is invalid/
  );
});

test('V316B production config validation rejects invalid projectId', () => {
  const invalidProduction = { ...production, projectId: 'Invalid_Project' };
  const deployment = makeDeployment('production', {
    allowedHosts: ['carteira-investimentos-delta.vercel.app'],
    productionProjectId: 'Invalid_Project',
  });
  assert.throws(
    () => selectFirebaseConfig('carteira-investimentos-delta.vercel.app', deployment, invalidProduction),
    /Production Firebase configuration is invalid/
  );
});