#!/usr/bin/env node
'use strict';
// SM132 — build reproduzível da HOMOLOGAÇÃO (carteira-homolog-sm118). Não é build de produção.
// Uso:
//   node scripts/homolog/build-homolog.js --sha <sha-40> --out <dir-novo> --sdk-config <json-publico> \
//        --uid <uid-sintetico> --email <email-de-homologacao>
// O --sdk-config é a configuração PÚBLICA do app web de homologação (não é segredo). Nunca use a de produção.
// O script não grava nada no repositório. Gera o artefato em --out e um manifesto ao lado (<out>.manifest.json),
// fora do artefato publicado. Roda o guard antes de considerar o build válido (fail-closed).
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkDistribution, validateIdentity, validateSdkConfig, sha256, walk, validateLoginHint } = require('./guard');

const HOMOLOG_PROJECT = 'carteira-homolog-sm118';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
  for (const k of ['sha', 'out', 'sdk-config', 'uid', 'email']) if (!args[k]) throw new Error(`uso: falta --${k}`);
  return args;
}

function repoRoot() {
  return path.resolve(__dirname, '..', '..');
}

// Rastreia dependências locais a partir de index.html, sw.js e manifest.json (mesma regra do build anterior).
function crawl(src, dst) {
  const EXT = /\.(js|mjs|css|json|png|svg|ico|webmanifest|woff2?|ttf|wasm|html)$/i;
  const seen = new Set();
  const unresolved = new Set();
  const queue = ['index.html', 'sw.js', 'manifest.json'];
  const norm = p => p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '').split('?')[0].split('#')[0];
  while (queue.length) {
    const rel = norm(queue.shift());
    if (!rel || seen.has(rel)) continue;
    const abs = path.join(src, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { unresolved.add(rel); continue; }
    seen.add(rel);
    if (!/\.(html|js|mjs|css|json|webmanifest)$/i.test(rel)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    const found = new Set();
    for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"'#?:][^"']*)["']/gi)) found.add(m[1]);
    for (const m of text.matchAll(/import\s+(?:[^'"]*?from\s*)?["']([^"']+)["']/g)) found.add(m[1]);
    for (const m of text.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) found.add(m[1]);
    for (const m of text.matchAll(/importScripts\(\s*["']([^"']+)["']/g)) found.add(m[1]);
    for (const m of text.matchAll(/["'](\.{0,2}\/?[A-Za-z0-9_\-\/.]+\.(?:js|mjs|css|json|png|svg|ico|woff2?|wasm))["']/g)) found.add(m[1]);
    for (const f of found) {
      if (/^(https?:|data:|blob:|mailto:|\/\/)/i.test(f)) continue;
      const base = path.posix.dirname(rel);
      const cand = f.startsWith('/') ? norm(f) : norm(path.posix.normalize(path.posix.join(base, f)));
      if (EXT.test(cand)) queue.push(cand);
    }
  }
  for (const rel of seen) {
    const d = path.join(dst, rel);
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.copyFileSync(path.join(src, rel), d);
  }
  return { files: [...seen].sort(), unresolved: [...unresolved].sort() };
}

// Substituições da homologação. Cada âncora deve existir exatamente o número de vezes esperado (fail-closed).
function applyHomologSubstitutions(text, { sdk, uid, email, shortSha, loginHint = null }) {
  // Dica de e-mail do login: SOMENTE na homologação, passada por argumento de build (não versionada).
  // Preenche o campo, que continua editável. Nunca preenche senha.
  const hintAttr = loginHint ? ` value="${validateLoginHint(loginHint)}"` : '';
  // Independente de plataforma: o git archive entrega CRLF no Windows e LF no Linux (CI).
  // Trabalha em LF e devolve no fim de linha original, para o artefato ser o mesmo em qualquer máquina.
  const hadCrlf = text.includes('\r\n');
  let t = text.replace(/\r\n/g, '\n');
  const rep = (oldS, newS, n = 1) => {
    const c = t.split(oldS).length - 1;
    if (c !== n) throw new Error(`âncora inesperada (${c} ocorrências): ${oldS.slice(0, 60)}`);
    t = t.split(oldS).join(newS);
  };
  // Substitui a constante do proprietário sem copiar seu valor neste arquivo. Exige uma ocorrência; o guard
  // depois confirma que o valor de produção (lido de firestore.rules) não restou no artefato (fail-closed).
  const ownerConst = (name, value) => {
    if (/['\\\r\n]/.test(value)) throw new Error(`valor inseguro para ${name}`);
    const rx = new RegExp(`const ${name} = '[^'\\n]*';`, 'g');
    const c = (t.match(rx) || []).length;
    if (c !== 1) throw new Error(`âncora inesperada (${c} ocorrências): ${name}`);
    t = t.replace(rx, () => `const ${name} = '${value}';`);
  };
  ownerConst('OWNER_FIREBASE_UID', uid);
  ownerConst('OWNER_FIREBASE_EMAIL', String(email).trim().toLowerCase()); // SM165: normalizado como o gate do app (isAccessAdmin)
  const pat = /(apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId)(\s*:\s*)"[^"]*"/g;
  const found = t.match(pat) || [];
  if (found.length < 6) throw new Error('bloco de configuração Firebase não encontrado');
  t = t.replace(pat, (m, key, sep) => `${key}${sep}"${sdk[key]}"`);
  // Troca ocorrências do projeto de produção pelo de homologação; o guard confirma que nenhuma permaneceu.
  t = t.split('carteira-de-investimento-16725').join(sdk.projectId);
  const bodyIdx = t.indexOf('<body>');
  if (bodyIdx < 0) throw new Error('<body> ausente');
  const banner = '<div id="homolog-banner" role="status" style="position:fixed;top:0;left:0;right:0;z-index:99999;' +
    'background:#b45309;color:#fff;font:700 12px system-ui;padding:4px 8px;text-align:center">' +
    `HOMOLOGAÇÃO — NÃO É A CARTEIRA DE PRODUÇÃO · SHA ${shortSha}</div>`;
  t = t.slice(0, bodyIdx) + '<body>' + banner + t.slice(bodyIdx + '<body>'.length);
  rep('Seus dados ficam na sua conta Google. Nenhuma senha é armazenada.', 'Seus dados ficam na sua conta. Nenhuma senha é armazenada pelo aplicativo.');
  const CRLF = '\n'; // inserções em LF; convertidas no fim
  const fn = [
    "/* HOMOLOG-ONLY: login por e-mail/senha existe somente na distribuição de homologação. */",
    'async function signInEmailHomolog(){',
    "  if(!FB.ready){ alert('Firebase não carregou. Verifique a internet.'); return; }",
    "  const em=String(document.getElementById('homolog-email')?.value||'').trim();",
    "  const pw=String(document.getElementById('homolog-pass')?.value||'');",
    "  if(!em||!pw){ alert('Informe e-mail e senha.'); return; }",
    '  try{',
    '    await firebaseAuthPersistenceReady;',
    '    await FB.auth.signInWithEmailAndPassword(em,pw);',
    '  }catch(e){',
    '    debugWarn(e);',
    '    alert(homologAuthErrorMessage(e));',
    '  }',
    '}',
    '/* SM144: mensagem em português para erros do Firebase Auth. Não expõe código nem detalhe técnico. */',
    'function homologAuthErrorMessage(e){',
    "  const code=String(e?.code||'');",
    "  if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-email'].includes(code)) return 'E-mail ou senha incorretos.';",
    "  if(code==='auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';",
    "  if(code==='auth/network-request-failed') return 'Sem conexão com o servidor de autenticação. Verifique sua internet e tente novamente.';",
    "  if(code==='auth/user-disabled') return 'Esta conta está desabilitada. Fale com o responsável pela carteira.';",
    "  return 'Não foi possível entrar agora. Tente novamente em instantes.';",
    '}'].join(CRLF) + CRLF;
  const fa = 'async function signInGoogle(){';
  rep(fa, fn + fa);
  const btn = '<span>Entrar com Google</span>' + CRLF + '            </button>';
  // âncora: a linha do botão precisa existir exatamente como no commit
  rep(btn, [btn,
    '            <!-- homolog-email-form: HOMOLOG-ONLY -->',
    '            <div id="homolog-email-form" style="margin-top:10px;display:grid;gap:6px">',
    '              <input id="homolog-email" type="email" autocomplete="username"' + hintAttr + ' placeholder="E-mail" aria-label="E-mail" style="min-height:40px;border-radius:10px;padding:8px 10px;border:1px solid #334155;background:#0b1220;color:#f5f8ff">',
    '              <input id="homolog-pass" type="password" autocomplete="current-password" placeholder="Senha" aria-label="Senha" style="min-height:40px;border-radius:10px;padding:8px 10px;border:1px solid #334155;background:#0b1220;color:#f5f8ff">',
    '              <button type="button" class="btn bgh" onclick="signInEmailHomolog()" style="min-height:40px;border-radius:12px">Entrar com e-mail e senha</button>',
    '            </div>'].join(CRLF));
  return hadCrlf ? t.replace(/\n/g, '\r\n') : t;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sha = args.sha;
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('--sha deve ter 40 caracteres hexadecimais');
  const out = path.resolve(args.out);
  if (fs.existsSync(out)) throw new Error('destino já existe: não sobrescreve');
  const sdkRaw = JSON.parse(fs.readFileSync(args['sdk-config'], 'utf8'));
  const sdk = validateSdkConfig(sdkRaw.result ? sdkRaw.result.sdkConfig : (sdkRaw.sdkConfig || sdkRaw), HOMOLOG_PROJECT);
  const { uid, email } = validateIdentity(args.uid, args.email);
  const resolved = execFileSync('git', ['-C', repoRoot(), 'rev-parse', '--verify', `${sha}^{commit}`], { encoding: 'utf8' }).trim();
  if (resolved !== sha) throw new Error('SHA não resolvido de forma exata');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'homolog-src-'));
  const tar = path.join(tmp, 'src.tar');
  const src = path.join(tmp, 'src');
  try {
    execFileSync('git', ['-C', repoRoot(), 'archive', '-o', tar, sha]);
    fs.mkdirSync(src);
    // caminhos relativos ao cwd: o tar do Windows trata "C:" como host remoto se receber caminho absoluto
    execFileSync('tar', ['-xf', 'src.tar', '-C', 'src'], { cwd: tmp });
    const crawled = crawl(src, out + '.stage');
    const indexOriginal = fs.readFileSync(path.join(out + '.stage', 'index.html'), 'utf8');
    const shortSha = sha.slice(0, 12);
    const loginHint = args['login-hint'] ? validateLoginHint(args['login-hint']) : null;
    const indexHomolog = applyHomologSubstitutions(indexOriginal, { sdk, uid, email, shortSha, loginHint });
    fs.writeFileSync(path.join(out + '.stage', 'index.html'), indexHomolog, 'utf8');
    fs.renameSync(out + '.stage', out);
    const files = walk(out).sort().map(p => ({ path: p, sha256: sha256(fs.readFileSync(path.join(out, p))) }));
    const manifest = { sha, shortSha, project: HOMOLOG_PROJECT, identity: { uid, email }, unresolved: crawled.unresolved, files };
    const manifestPath = out + '.manifest.json';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
    const result = checkDistribution(out, { sha, shortSha, projectId: HOMOLOG_PROJECT, uid, email, cfg: sdk, manifestPath, loginHint });
    console.log(`build homolog ok: ${files.length} arquivos, SHA ${shortSha}, guard ${result.checks.length} verificações PASS`);
    console.log(`manifesto: ${manifestPath}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exit(1); }
}

module.exports = { applyHomologSubstitutions, crawl };
