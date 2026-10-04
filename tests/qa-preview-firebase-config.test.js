'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolvePreviewFirebaseConfig } = require('../scripts/qa/preview-firebase-config.cjs');
const { runPreviewProviderSmoke } = require('../scripts/qa/preview-provider-smoke.cjs');

const validEnv = () => ({
  VERCEL_ENV: 'preview',
  VERCEL_URL: 'qa-preview.example.test',
  QA_FIREBASE_PREVIEW_ALLOWED_HOSTS: 'qa-preview.example.test,qa-next.example.test',
  QA_FIREBASE_API_KEY: 'synthetic-api-key',
  QA_FIREBASE_AUTH_DOMAIN: 'qa-project.firebaseapp.com',
  QA_FIREBASE_PROJECT_ID: 'isolated-qa-project',
  QA_FIREBASE_STORAGE_BUCKET: 'isolated-qa-project.appspot.test',
  QA_FIREBASE_MESSAGING_SENDER_ID: 'synthetic-sender',
  QA_FIREBASE_APP_ID: 'synthetic-app',
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

for (const [name, change] of [
  ['production environment', env => { env.VERCEL_ENV = 'production'; }],
  ['missing required setting', env => { delete env.QA_FIREBASE_APP_ID; }],
  ['non-allowlisted host', env => { env.VERCEL_URL = 'attacker.example.test'; }],
  ['same QA and production project', env => { env.PRODUCTION_FIREBASE_PROJECT_ID = env.QA_FIREBASE_PROJECT_ID; }],
  ['same normalized QA and production project', env => { env.PRODUCTION_FIREBASE_PROJECT_ID = ` ${env.QA_FIREBASE_PROJECT_ID} `; }],
  ['missing production boundary', env => { delete env.PRODUCTION_FIREBASE_PROJECT_ID; }],
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
    return { ok: true, status: 200, text: async () => '<script>projectId:"isolated-qa-project"</script>' };
  });
  assert.equal(requestedUrl, 'https://qa-preview.example.test/');
  assert.deepEqual(result, { status: 'PREVIEW_QA_BOUNDARY_PASS', providerLogin: 'NOT_TESTED', financialWrites: 0 });
  assert.equal(JSON.stringify(result).includes(env.QA_FIREBASE_API_KEY), false);
});

test('V315 provider smoke refuses current production runtime config', async () => {
  await assert.rejects(runPreviewProviderSmoke(validEnv(), async () => ({
    ok: true, status: 200, text: async () => '<script>projectId:"production-project"</script>',
  })), /does not use the isolated QA project/);
});

test('V315 provider smoke refuses unverifiable runtime config', async () => {
  await assert.rejects(runPreviewProviderSmoke(validEnv(), async () => ({
    ok: true, status: 200, text: async () => '<html>login</html>',
  })), /could not be verified/);
});
