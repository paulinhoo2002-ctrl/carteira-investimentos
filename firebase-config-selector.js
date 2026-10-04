'use strict';

function validFirebaseConfig(config) {
  if (!config || typeof config !== 'object') return false;
  const fields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  if (fields.some(key => typeof config[key] !== 'string' || !config[key] || config[key] !== config[key].trim())) return false;
  const id = config.projectId;
  return /^[a-z][a-z0-9-]*[a-z0-9]$/.test(id)
    && /^[A-Za-z0-9_-]+$/.test(config.apiKey)
    && config.authDomain === `${id}.firebaseapp.com`
    && [`${id}.firebasestorage.app`, `${id}.appspot.com`].includes(config.storageBucket)
    && /^\d+$/.test(config.messagingSenderId)
    && /^1:\d+:web:[A-Za-z0-9]+$/.test(config.appId);
}

function selectFirebaseConfig(hostname, deployment, productionConfig) {
  if (!deployment || !['production', 'preview'].includes(deployment.mode)) {
    throw new Error('Firebase deployment is not configured');
  }
  const host = String(hostname || '').toLowerCase();
  if (!host || !Array.isArray(deployment.allowedHosts) || !deployment.allowedHosts.includes(host)) {
    throw new Error('Firebase host is not authorized');
  }
  if (!productionConfig || deployment.productionProjectId !== productionConfig.projectId) {
    throw new Error('Production Firebase boundary is invalid');
  }
  if (deployment.mode === 'production') {
    if (!validFirebaseConfig(productionConfig)) throw new Error('Production Firebase configuration is invalid');
    return productionConfig;
  }
  if (!Array.isArray(deployment.productionHosts) || deployment.productionHosts.includes(host)) {
    throw new Error('QA Firebase cannot run on a production host');
  }
  if (!validFirebaseConfig(deployment.config)) throw new Error('QA Firebase configuration is invalid');
  if (deployment.config.projectId === productionConfig.projectId
    || (productionConfig.apiKey && deployment.config.apiKey === productionConfig.apiKey)) {
    throw new Error('QA Firebase project is not isolated');
  }
  return deployment.config;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { selectFirebaseConfig };
if (typeof window !== 'undefined') window.FirebaseConfigSelector = { selectFirebaseConfig };
