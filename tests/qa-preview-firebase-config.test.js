'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolvePreviewFirebaseConfig } = require('../scripts/qa/preview-firebase-config.cjs');
const { runPreviewProviderSmoke, runPublicPreviewSmoke } = require('../scripts/qa/preview-provider-smoke.cjs');
const { renderFirebaseDeployment } = require('../scripts/qa/build-firebase-deployment.cjs');

const validEnv = () => ({
  VERCEL_ENV: 'preview',
  VERCEL_URL: 'qa-preview.example.test',
  QA_FIREBASE_PREVIEW_ALLOWED_HOSTS: 'qa-preview.example.test,qa-next.example.test',
  QA_FIREBASE_API_KEY: 'synthetic-api-key',
  QA_FIREBASE_AUTH_DOMAIN: 'isolated-qa-project.firebaseapp.com',
  QA_FIREBASE_PROJECT_ID: 'isolated-qa-project',
  QA_FIREBASE_STORAGE_BUCKET: 'isolated-qa-project.firebasestorage.app',
  QA_FIREBASE_MESSAGING_SENDER_ID: '987654',
  QA_FIREBASE_APP_ID: '1:987654:web:def456',
  PRODUCTION_FIREBASE_PROJECT_ID: 'production-project',
});

test('V315 Preview config accepts complete synthetic isolated config without mutating env', () => {
  const env = validEnv();
  const before = { ...env };
  const config = resolvePreviewFirebaseConfig(env);
  assert.equal(config.projectId, 'isolated-qa-project');
  assert.equal(config.previewHost, 'qa-preview.example.test');
  assert.deepEqual(env, before);
  assert.equal(Object.isFrozen(config), true);
});

test('V316 Preview config prefers an explicitly allowed stable branch domain', () => {
  const env = validEnv();
  env.VERCEL_URL = 'unique-deployment.example.test';
  env.VERCEL_BRANCH_URL = 'qa-preview.example.test';
  assert.equal(resolvePreviewFirebaseConfig(env).previewHost, 'qa-preview.example.test');
});

for (const [name, change] of [
  ['production environment', env => { env.VERCEL_ENV = 'production'; }],
  ['missing required setting', env => { delete env.QA_FIREBASE_APP_ID; }],
  ['non-allowlisted host', env => { env.VERCEL_URL = 'attacker.example.test'; }],
  ['same QA and production project', env => { env.PRODUCTION_FIREBASE_PROJECT_ID = env.QA_FIREBASE_PROJECT_ID; }],
  ['same normalized QA and production project', env => { env.PRODUCTION_FIREBASE_PROJECT_ID = ` ${env.QA_FIREBASE_PROJECT_ID} `; }],
  ['missing production boundary', env => { delete env.PRODUCTION_FIREBASE_PROJECT_ID; }],
  ['production Auth domain mixed into QA', env => { env.QA_FIREBASE_AUTH_DOMAIN = 'production-project.firebaseapp.com'; }],
  ['production Storage bucket mixed into QA', env => { env.QA_FIREBASE_STORAGE_BUCKET = 'production-project.firebasestorage.app'; }],
  ['invalid sender ID', env => { env.QA_FIREBASE_MESSAGING_SENDER_ID = 'not-numeric'; }],
]) {
  test(`V315 Preview config fails closed for ${name}`, () => {
    const env = validEnv();
    change(env);
    assert.throws(() => resolvePreviewFirebaseConfig(env));
  });
}

test('V315 provider smoke confirms only public runtime project boundary and never leaks config values', async () => {
  const env = validEnv();
  let requestedUrl;
  const result = await runPreviewProviderSmoke(env, async url => {
    requestedUrl = url;
    return { ok: true, status: 200, text: async () => previewHtml(env) };
  });
  assert.equal(requestedUrl, 'https://qa-preview.example.test/');
  assert.deepEqual(result, { status: 'PREVIEW_QA_BOUNDARY_PASS', providerLogin: 'NOT_TESTED', financialWrites: 0 });
  assert.equal(JSON.stringify(result).includes(env.QA_FIREBASE_API_KEY), false);
});

test('V315 provider smoke refuses current production runtime config', async () => {
  await assert.rejects(runPreviewProviderSmoke(validEnv(), async () => ({
    ok: true, status: 200, text: async () => previewHtml(validEnv()).replace('"projectId":"isolated-qa-project"', '"projectId":"production-project"'),
  })), /does not use the isolated QA project/);
});

test('V315 provider smoke refuses unverifiable runtime config', async () => {
  await assert.rejects(runPreviewProviderSmoke(validEnv(), async () => ({
    ok: true, status: 200, text: async () => '<html>login</html>',
  })), /could not be verified/);
});

test('V316 public smoke verifies QA boundary from the public descriptor without a project ID argument', async () => {
  const env = validEnv();
  const result = await runPublicPreviewSmoke('https://qa-preview.example.test/',
    async () => ({ ok: true, status: 200, text: async () => previewHtml(env) }));
  assert.equal(result.status, 'PREVIEW_QA_BOUNDARY_PASS');
  assert.equal(result.providerLogin, 'NOT_TESTED');
});

test('V316 public smoke rejects wrong project, wrong host and blocked mode', async () => {
  const env = validEnv();
  const fetchPreview = async () => ({ ok: true, status: 200, text: async () => previewHtml(env) });
  await assert.rejects(runPublicPreviewSmoke('https://qa-preview.example.test/', 'wrong-qa-project', fetchPreview));
  await assert.rejects(runPublicPreviewSmoke('https://unlisted.example.test/', env.QA_FIREBASE_PROJECT_ID, fetchPreview));
  await assert.rejects(runPublicPreviewSmoke('http://qa-preview.example.test/', env.QA_FIREBASE_PROJECT_ID, fetchPreview));
  await assert.rejects(runPublicPreviewSmoke('https://qa-preview.example.test/', env.QA_FIREBASE_PROJECT_ID,
    async () => ({ ok: true, status: 200, text: async () => previewHtml(env).replace('"mode":"preview"', '"mode":"blocked"') })));
});

function previewHtml(env) {
  const source = '<script src="firebase-config-selector.js"></script>\n'
    + 'const firebaseConfig = { apiKey: "synthetic-production-key", authDomain: "production-project.firebaseapp.com", projectId: "production-project", storageBucket: "production-project.firebasestorage.app", messagingSenderId: "123456", appId: "1:123456:web:abc123"\n};\n'
    + '/* V316_FIREBASE_DEPLOYMENT_START */\nwindow.__FIREBASE_DEPLOYMENT__={"mode":"blocked"};\n/* V316_FIREBASE_DEPLOYMENT_END */';
  return renderFirebaseDeployment(source, { ...env, VERCEL_BRANCH_URL: env.VERCEL_URL });
}
