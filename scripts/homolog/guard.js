#!/usr/bin/env node
'use strict';
// SM132 — guard de isolamento da homologação (T3). Fail-closed: qualquer falha lança erro antes da publicação.
// Não contém credenciais nem configuração real de produção. Os valores esperados chegam por parâmetro.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PROD_PROJECT = 'carteira-de-investimento-16725';
// Identidade do proprietário de produção: lida de firestore.rules (fonte canônica), sem cópia literal neste arquivo.
const RULES_PATH = path.join(__dirname, '..', '..', 'firestore.rules');
let prodOwner = null;
function readOwnerIdentifiers(rulesPath = RULES_PATH) {
  const text = fs.readFileSync(rulesPath, 'utf8'); // ausente = erro (fail-closed)
  const uid = (text.match(/request\.auth\.uid\s*==\s*"([A-Za-z0-9]{20,40})"/) || [])[1];
  const email = (text.match(/request\.auth\.token\.email\s*==\s*"([^"\s@]+@[^"\s@]+)"/) || [])[1];
  if (!uid || !email) throw new Error('GUARD: identidade do proprietário não encontrada em firestore.rules (fail-closed)');
  return { uid, email };
}
function prodIdentifiers(qaException = false) {
  if (!prodOwner) prodOwner = readOwnerIdentifiers();
  // Exceção QA (SM173.6B): o e-mail do proprietário é permitido na homologação; o UID e o projeto de produção não.
  return qaException ? [PROD_PROJECT, prodOwner.uid] : [PROD_PROJECT, prodOwner.email, prodOwner.uid];
}
// Exceção QA explícita: só o projeto de homologação, só a conta proprietária definitiva, só o UID autorizado pelas
// regras QA publicadas (com e-mail verificado). SHA-256 das regras owner-only publicadas no QA na SM173.4.
const QA_PROJECT = 'carteira-homolog-sm118';
const QA_RULES_SHA256 = 'ba88b2f00227b274834d91e7087f0e95412e64eaa2799c0e7a0e31ddb597b786';
function readQaOwnerRules(rulesPath, expectedSha256 = QA_RULES_SHA256) {
  const bytes = fs.readFileSync(rulesPath); // ausente = erro (fail-closed)
  if (sha256(bytes) !== expectedSha256) throw new Error('GUARD: regras QA não correspondem às regras owner-only publicadas (SHA-256)');
  const text = bytes.toString('utf8');
  const uids = new Set([...text.matchAll(/request\.auth\.uid\s*==\s*"([A-Za-z0-9]{20,40})"/g)].map(m => m[1]));
  if (uids.size !== 1) throw new Error('GUARD: regras QA devem autorizar exatamente um UID proprietário');
  if (!/request\.auth\.token\.email_verified\s*==\s*true/.test(text)) throw new Error('GUARD: regras QA sem exigência de e-mail verificado');
  return { uid: [...uids][0] };
}
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

// Dica de e-mail do login da homologação (opcional, via --login-hint). Só caracteres de e-mail simples: sem aspas,
// espaços ou marcação, para não quebrar o atributo HTML. Não pode ser a identidade de produção.
function validateLoginHint(hint) {
  const h = String(hint || '');
  if (!/^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(h)) throw new Error('GUARD: dica de e-mail de login inválida');
  const owner = readOwnerIdentifiers().email.toLowerCase();
  if (h.toLowerCase() === owner) throw new Error('GUARD: dica de login não pode ser o e-mail de produção');
  return h;
}

// Valida a identidade sintética autorizada. Lança erro se ausente, inválida ou igual à identidade de produção.
// `qa` (opcional) = { projectId, rulesPath }: exceção QA explícita. Sem ele, vale a regra estrita (produção recusada).
function validateIdentity(uid, email, qa = null) {
  if (!/^[A-Za-z0-9]{20,40}$/.test(String(uid || ''))) throw new Error('GUARD: UID sintético ausente ou inválido');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ''))) throw new Error('GUARD: e-mail de homologação ausente ou inválido');
  // SM165: o app compara o e-mail normalizado (minúsculas, sem espaços) em isAccessAdmin. A constante gravada no build
  // precisa estar normalizada; caso contrário o proprietário nunca passa no gate.
  const normalized = String(email).trim().toLowerCase();
  if (!qa) {
    for (const id of prodIdentifiers()) if (uid === id || normalized === String(id).toLowerCase()) throw new Error('GUARD: identidade de produção informada');
    return { uid, email: normalized, qaException: false };
  }
  if (qa.projectId !== QA_PROJECT) throw new Error('GUARD: exceção QA recusada: projeto diferente do QA autorizado');
  if (!prodOwner) prodOwner = readOwnerIdentifiers();
  if (normalized !== prodOwner.email.toLowerCase()) throw new Error('GUARD: exceção QA só vale para a conta proprietária definitiva');
  if (uid === prodOwner.uid) throw new Error('GUARD: UID de produção não pode substituir o UID QA');
  if (uid !== readQaOwnerRules(qa.rulesPath).uid) throw new Error('GUARD: UID não corresponde ao autorizado pelas regras QA publicadas');
  return { uid, email: normalized, qaException: true };
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
  for (const id of prodIdentifiers(expected.qaException === true)) if (html.includes(id)) fail(`identificador de produção presente: ${id.slice(0, 6)}…`);
  if (expected.loginHint) {
    // Dica presente, editável (sem readonly/disabled) e sem senha preenchida.
    const emailTag = /<input id="homolog-email"[^>]*>/.exec(html);
    const passTag = /<input id="homolog-pass"[^>]*>/.exec(html);
    if (!emailTag || !emailTag[0].includes(` value="${expected.loginHint}"`)) fail('dica de e-mail de login ausente no campo homolog-email');
    if (emailTag && /\b(readonly|disabled)\b/.test(emailTag[0])) fail('campo de e-mail de login não pode ser somente leitura');
    if (passTag && /\svalue=/.test(passTag[0])) fail('campo de senha não pode ser preenchido');
  }
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

module.exports = { checkDistribution, validateSdkConfig, validateIdentity, validateLoginHint, readOwnerIdentifiers, readQaOwnerRules, QA_PROJECT, QA_RULES_SHA256, PROD_PROJECT, sha256, walk };
