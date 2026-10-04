'use strict';

const { resolvePreviewFirebaseConfig } = require('./preview-firebase-config.cjs');

async function runPreviewProviderSmoke(env = process.env, fetchImpl = fetch) {
  const qa = resolvePreviewFirebaseConfig(env);
  const response = await fetchImpl(`https://${qa.previewHost}/`, { redirect: 'error' });
  if (!response.ok) throw new Error(`Preview returned HTTP ${response.status}`);
  const html = await response.text();
  const raw = html.match(/window\.__FIREBASE_DEPLOYMENT__=(\{[^;]+\});/)?.[1];
  if (!raw || !html.includes('<script src="firebase-config-selector.js"></script>')) {
    throw new Error('Preview runtime Firebase project could not be verified');
  }
  let deployment;
  try { deployment = JSON.parse(raw); } catch { throw new Error('Preview runtime Firebase project could not be verified'); }
  if (deployment.mode !== 'preview'
    || !Array.isArray(deployment.allowedHosts)
    || !deployment.allowedHosts.includes(qa.previewHost)
    || deployment.productionProjectId !== env.PRODUCTION_FIREBASE_PROJECT_ID
    || deployment.config?.projectId !== qa.projectId
    || deployment.config?.apiKey !== qa.apiKey) {
    throw new Error('Preview runtime does not use the isolated QA project');
  }
  const sourceConfig = html.match(/const firebaseConfig = \{([^;]+)\};/)?.[1];
  if (!sourceConfig || /\bapiKey\s*:/.test(sourceConfig)) {
    throw new Error('Preview artifact still contains production Firebase config');
  }
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
