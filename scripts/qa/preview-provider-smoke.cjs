'use strict';

const { resolvePreviewFirebaseConfig } = require('./preview-firebase-config.cjs');
const { selectFirebaseConfig } = require('../../firebase-config-selector.js');

async function runPublicPreviewSmoke(previewUrl, expectedQaProjectId, fetchImpl = fetch) {
  const url = new URL(previewUrl);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash
    || !/^[a-z][a-z0-9-]*[a-z0-9]$/.test(expectedQaProjectId || '')) {
    throw new Error('Exact HTTPS Preview root and QA project ID are required');
  }
  const response = await fetchImpl(url.href, { redirect: 'error' });
  if (!response.ok) throw new Error(`Preview returned HTTP ${response.status}`);
  const html = await response.text();
  const raw = html.match(/window\.__FIREBASE_DEPLOYMENT__=(\{[^;]+\});/)?.[1];
  const productionProjectId = html.match(/const firebaseConfig = \{ projectId: "([a-z][a-z0-9-]*[a-z0-9])" \};/)?.[1];
  if (!raw || !productionProjectId || !html.includes('<script src="firebase-config-selector.js"></script>')) {
    throw new Error('Preview runtime Firebase boundary could not be verified');
  }
  let deployment;
  try { deployment = JSON.parse(raw); } catch { throw new Error('Preview runtime Firebase boundary could not be verified'); }
  if (deployment.mode !== 'preview' || deployment.productionProjectId !== productionProjectId
    || deployment.config?.projectId !== expectedQaProjectId
    || !Array.isArray(deployment.allowedHosts) || !deployment.allowedHosts.includes(url.hostname)
    || /const firebaseConfig = \{[^;]*\bapiKey\s*:/.test(html)) {
    throw new Error('Preview runtime does not use the isolated QA project');
  }
  selectFirebaseConfig(url.hostname, deployment, { projectId: productionProjectId });
  return { status: 'PREVIEW_QA_BOUNDARY_PASS', providerLogin: 'NOT_TESTED', financialWrites: 0 };
}

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
  const smoke = process.argv.length > 2
    ? runPublicPreviewSmoke(process.argv[2], process.argv[3])
    : runPreviewProviderSmoke();
  smoke.then(result => {
    console.log(`Preview provider smoke: ${result.status}; provider login ${result.providerLogin}; financial writes ${result.financialWrites}.`);
  }).catch(error => {
    console.error(`Preview provider smoke blocked: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { runPreviewProviderSmoke, runPublicPreviewSmoke };
