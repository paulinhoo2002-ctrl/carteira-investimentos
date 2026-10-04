'use strict';

const { resolvePreviewFirebaseConfig } = require('./preview-firebase-config.cjs');

async function runPreviewProviderSmoke(env = process.env, fetchImpl = fetch) {
  const qa = resolvePreviewFirebaseConfig(env);
  const response = await fetchImpl(`https://${qa.previewHost}/`, { redirect: 'error' });
  if (!response.ok) throw new Error(`Preview returned HTTP ${response.status}`);
  const html = await response.text();
  const projectId = html.match(/\bprojectId\s*:\s*["']([^"']+)["']/)?.[1];
  if (!projectId) throw new Error('Preview runtime Firebase project could not be verified');
  if (projectId !== qa.projectId) throw new Error('Preview runtime does not use the isolated QA project');
  if (projectId === env.PRODUCTION_FIREBASE_PROJECT_ID) throw new Error('Preview runtime points to production');
  return { status: 'PREVIEW_QA_BOUNDARY_PASS', providerLogin: 'NOT_TESTED', financialWrites: 0 };
}

if (require.main === module) {
  runPreviewProviderSmoke().then(result => {
    console.log(`Preview provider smoke: ${result.status}; provider login ${result.providerLogin}; financial writes ${result.financialWrites}.`);
  }).catch(error => {
    console.error(`Preview provider smoke blocked: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { runPreviewProviderSmoke };
