#!/usr/bin/env node
'use strict';
// SM132 — guard de isolamento da homologação (T3). Fail-closed: qualquer falha lança erro antes da publicação.
// Não contém credenciais nem configuração real de produção. Os valores esperados chegam por parâmetro.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PROD_PROJECT = 'carteira-de-investimento-16725';
const PROD_IDENTIFIERS = [PROD_PROJECT, 'paulinhoo2002@gmail.com', 'yaypxiiv7Ye7pwpDZ0nqhG3Yj7E3'];
const PROD_HOSTS = /controle-financeiro|investidor10|carteira-2\b/;
const SDK_FIELDS = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const FORBIDDEN_FILES = [/^\.firebaserc$/, /^\.env/, /^\.vercel(\/|$)/, /^\.git(\/|$)/, /^\.gitignore$/, /^node_modules(\/|$)/,
  /^index\.m1959-before\.html$/, /^tests?(\/|$)/, /^docs?(\/|$)/, /\.test\.[cm]?js$/, /^firestore(\.[\w-]+)?\.rules$/, /^firebase(\.[\w-]+)?\.json$/,
  /(^|\/)backup[^/]*\.json$/i, /\.(log|pem|key|p12)$/i, /(^|\/)local-imports(\/|$)/, /(^|\/)Refs(\/|$)/, /(^|\/)output(\/|$)/];
const SECRET_PATTERNS = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /ghp_[A-Za-z0-9]{20,}/, /sk_live_[A-Za-z0-9]{10,}/, /AKIA[0-9A-Z]{16}/];

const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

// Valida a configuração pública do projeto de homologação. Lança erro se faltar campo ou se for de produção.
function validateSdkConfig(cfg, expectedProject) {
  if (!cfg || typeof cfg !== 'object') throw new Error('GUARD: configuração Firebase ausente');
  for (const field of SDK_FIELDS) {
    if (typeof cfg[field] !== 'string' || !cfg[field].trim()) throw new Error(`GUARD: configuração Firebase incompleta (${field})`);
  }
  if (cfg.projectId === PROD_PROJECT || String(cfg.authDomain).startsWith(PROD_PROJECT)) throw new Error('GUARD: configuração aponta para o projeto de PRODUÇÃO');
  if (cfg.projectId !== expectedProject) throw new Error(`GUARD: projectId ${cfg.projectId} diferente do esperado ${expectedProject}`);
  if (cfg.authDomain !== `${expectedProject}.firebaseapp.com`) throw new Error('GUARD: authDomain não corresponde ao projeto de homologação');
  return cfg;
}

// Valida a identidade sintética autorizada. Lança erro se ausente, inválida ou igual à identidade de produção.
function validateIdentity(uid, email) {
  if (!/^[A-Za-z0-9]{20,40}$/.test(String(uid || ''))) throw new Error('GUARD: UID sintético ausente ou inválido');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ''))) throw new Error('GUARD: e-mail de homologação ausente ou inválido');
  for (const id of PROD_IDENTIFIERS) if (uid === id || email === id) throw new Error('GUARD: identidade de produção informada');
  return { uid, email };
}

// Verifica o diretório gerado. `expected` = { sha, shortSha, projectId, uid, email, cfg }.
function checkDistribution(dir, expected) {
  const failures = [];
  const fail = msg => failures.push(msg);
  const indexPath = path.join(dir, 'index.html');
  if (!fs.existsSync(indexPath)) throw new Error('GUARD: index.html ausente na distribuição');
  const html = fs.readFileSync(indexPath, 'utf8');
  const cfg = expected.cfg;

  if (!html.includes(`projectId: "${expected.projectId}"`)) fail('projectId de homologação ausente no index.html');
  for (const id of [PROD_PROJECT, ...PROD_IDENTIFIERS.slice(1)]) if (html.includes(id)) fail(`identificador de produção presente: ${id.slice(0, 6)}…`);
  if (PROD_HOSTS.test(html)) fail('referência a host operacional de outro projeto');
  if (!html.includes(`const OWNER_FIREBASE_UID = '${expected.uid}';`)) fail('UID autorizado não corresponde ao build');
  if (!html.includes(`const OWNER_FIREBASE_EMAIL = '${expected.email}';`)) fail('e-mail autorizado não corresponde ao build');
  if (!html.includes('NÃO É A CARTEIRA DE PRODUÇÃO')) fail('banner de homologação ausente');
  if (!html.includes(`SHA ${expected.shortSha}`)) fail('SHA do banner não corresponde à origem');
  if (cfg && !html.includes(`apiKey: "${cfg.apiKey}"`)) fail('apiKey de homologação ausente no index.html');

  const manifestPath = expected.manifestPath;
  if (!manifestPath || !fs.existsSync(manifestPath)) fail('manifesto de build ausente');
  else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.sha !== expected.sha) fail('SHA do manifesto não corresponde à origem');
    const listed = new Set(manifest.files.map(f => f.path));
    for (const f of manifest.files) {
      const abs = path.join(dir, f.path);
      if (!fs.existsSync(abs)) { fail(`arquivo do manifesto ausente: ${f.path}`); continue; }
      if (sha256(fs.readFileSync(abs)) !== f.sha256) fail(`conteúdo divergente do manifesto: ${f.path}`);
    }
    for (const rel of walk(dir)) if (!listed.has(rel)) fail(`arquivo fora do manifesto: ${rel}`);
  }

  for (const rel of walk(dir)) {
    if (FORBIDDEN_FILES.some(rx => rx.test(rel))) fail(`arquivo proibido na distribuição: ${rel}`);
    if (/\.(html|js|mjs|css|json|webmanifest|svg|md|txt)$/i.test(rel)) {
      const text = fs.readFileSync(path.join(dir, rel), 'utf8');
      for (const rx of SECRET_PATTERNS) if (rx.test(text)) fail(`padrão de segredo em ${rel}`);
    }
  }
  if (failures.length) throw new Error('GUARD FALHOU (fail-closed; nada publicado):\n- ' + failures.join('\n- '));
  return { ok: true, checks: ['projectId', 'authDomain', 'identidade', 'banner', 'SHA', 'manifesto', 'proibidos', 'segredos', 'produção'] };
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs).split(path.sep).join('/');
    if (entry.isDirectory()) out.push(...walk(abs, base));
    else out.push(rel);
  }
  return out;
}

module.exports = { checkDistribution, validateSdkConfig, validateIdentity, PROD_PROJECT, sha256, walk };
