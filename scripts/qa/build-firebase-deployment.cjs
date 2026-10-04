'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePreviewFirebaseConfig } = require('./preview-firebase-config.cjs');

const PRODUCTION_HOSTS = [
  'carteira-investimentos-delta.vercel.app',
  'carteira-investimentos-paulinhoo2002-ctrls-projects.vercel.app',
  'carteira-investimentos-git-main-paulinhoo2002-ctrls-projects.vercel.app',
];
const QA_KEYS = [
  'QA_FIREBASE_API_KEY', 'QA_FIREBASE_AUTH_DOMAIN', 'QA_FIREBASE_PROJECT_ID',
  'QA_FIREBASE_STORAGE_BUCKET', 'QA_FIREBASE_MESSAGING_SENDER_ID', 'QA_FIREBASE_APP_ID',
  'QA_FIREBASE_PREVIEW_ALLOWED_HOSTS',
];

function host(value) {
  const normalized = String(value || '').toLowerCase().replace(/\.$/, '');
  if (normalized && !/^[a-z0-9.-]+$/.test(normalized)) throw new Error('Invalid deployment host');
  return normalized;
}

function renderFirebaseDeployment(html, env = process.env) {
  const configMatch = html.match(/const firebaseConfig = \{[\s\S]*?\n\};/);
  const projectId = configMatch?.[0].match(/\bprojectId:\s*["']([^"']+)["']/)?.[1];
  const productionApiKey = configMatch?.[0].match(/\bapiKey:\s*["']([^"']+)["']/)?.[1];
  const start = '/* V316_FIREBASE_DEPLOYMENT_START */';
  const end = '/* V316_FIREBASE_DEPLOYMENT_END */';
  if (!projectId || !productionApiKey || html.split(start).length !== 2 || html.split(end).length !== 2) {
    throw new Error('Firebase deployment marker or production boundary is missing');
  }

  const productionHosts = [...new Set([
    ...PRODUCTION_HOSTS,
    host(env.VERCEL_PROJECT_PRODUCTION_URL),
  ].filter(Boolean))];
  let descriptor;
  if (env.VERCEL_ENV === 'production') {
    descriptor = {
      mode: 'production',
      allowedHosts: [...new Set([...productionHosts, host(env.VERCEL_URL)].filter(Boolean))],
      productionProjectId: projectId,
    };
  } else if (env.VERCEL_ENV === 'preview') {
    if (QA_KEYS.some(key => String(env[key] || '').trim())) {
      const qa = resolvePreviewFirebaseConfig({ ...env, PRODUCTION_FIREBASE_PROJECT_ID: projectId });
      if (productionHosts.includes(qa.previewHost) || qa.apiKey === productionApiKey) {
        throw new Error('Preview Firebase project is not isolated from production');
      }
      const { previewHost, ...config } = qa;
      descriptor = {
        mode: 'preview', allowedHosts: [previewHost], productionHosts,
        productionProjectId: projectId, config,
      };
    } else {
      descriptor = { mode: 'blocked' };
    }
    html = html.replace(configMatch[0], `const firebaseConfig = { projectId: ${JSON.stringify(projectId)} };`);
  } else {
    throw new Error('Unknown deployment environment');
  }

  const serialized = JSON.stringify(descriptor).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const before = html.slice(0, html.indexOf(start) + start.length);
  const after = html.slice(html.indexOf(end));
  return `${before}\nwindow.__FIREBASE_DEPLOYMENT__=${serialized};\n${after}`;
}

if (require.main === module) {
  const filename = path.join(process.cwd(), 'index.html');
  fs.writeFileSync(filename, renderFirebaseDeployment(fs.readFileSync(filename, 'utf8')));
  console.log('Firebase deployment boundary generated.');
}

module.exports = { renderFirebaseDeployment };
