'use strict';

const REQUIRED_KEYS = [
  'QA_FIREBASE_API_KEY',
  'QA_FIREBASE_AUTH_DOMAIN',
  'QA_FIREBASE_PROJECT_ID',
  'QA_FIREBASE_STORAGE_BUCKET',
  'QA_FIREBASE_MESSAGING_SENDER_ID',
  'QA_FIREBASE_APP_ID',
];

function resolvePreviewFirebaseConfig(env = process.env) {
  if (env.VERCEL_ENV !== 'preview') throw new Error('Preview-only Firebase configuration required');

  const hostname = String(env.VERCEL_BRANCH_URL || env.VERCEL_URL || '').toLowerCase().replace(/\.$/, '');
  const allowedHosts = String(env.QA_FIREBASE_PREVIEW_ALLOWED_HOSTS || '')
    .split(',').map(value => value.trim().toLowerCase().replace(/\.$/, '')).filter(Boolean);
  if (!/^[a-z0-9.-]+$/.test(hostname) || !allowedHosts.includes(hostname)) {
    throw new Error('Preview host is not allowlisted');
  }

  for (const key of REQUIRED_KEYS) {
    if (!String(env[key] || '').trim()) throw new Error(`Missing required Preview setting: ${key}`);
  }
  if (!String(env.PRODUCTION_FIREBASE_PROJECT_ID || '').trim()) {
    throw new Error('Production project boundary is required');
  }
  const qaProjectId = env.QA_FIREBASE_PROJECT_ID.trim();
  const productionProjectId = env.PRODUCTION_FIREBASE_PROJECT_ID.trim();
  if (qaProjectId === productionProjectId) {
    throw new Error('QA and production projects must be isolated');
  }
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(qaProjectId)
    || !/^[A-Za-z0-9_-]+$/.test(env.QA_FIREBASE_API_KEY.trim())
    || env.QA_FIREBASE_AUTH_DOMAIN.trim() !== `${qaProjectId}.firebaseapp.com`
    || ![`${qaProjectId}.firebasestorage.app`, `${qaProjectId}.appspot.com`].includes(env.QA_FIREBASE_STORAGE_BUCKET.trim())
    || !/^\d+$/.test(env.QA_FIREBASE_MESSAGING_SENDER_ID.trim())
    || !/^1:\d+:web:[A-Za-z0-9]+$/.test(env.QA_FIREBASE_APP_ID.trim())) {
    throw new Error('Invalid isolated QA Firebase configuration');
  }

  return Object.freeze({
    apiKey: env.QA_FIREBASE_API_KEY.trim(),
    authDomain: env.QA_FIREBASE_AUTH_DOMAIN.trim(),
    projectId: qaProjectId,
    storageBucket: env.QA_FIREBASE_STORAGE_BUCKET.trim(),
    messagingSenderId: env.QA_FIREBASE_MESSAGING_SENDER_ID.trim(),
    appId: env.QA_FIREBASE_APP_ID.trim(),
    previewHost: hostname,
  });
}

module.exports = { resolvePreviewFirebaseConfig };
