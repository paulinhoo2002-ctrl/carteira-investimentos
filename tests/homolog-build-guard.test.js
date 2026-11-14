'use strict';
// SM132 — testes positivos e negativos do guard de homologação (T3). Fail-closed.
// Não usa configuração real: o SDK de teste é fictício e aponta para o projeto de homologação.
// O SHA é lido do HEAD em tempo de execução (nunca fixo).
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { applyHomologSubstitutions } = require('../scripts/homolog/build-homolog');
const { checkDistribution, validateIdentity, validateSdkConfig, readOwnerIdentifiers, PROD_PROJECT } = require('../scripts/homolog/guard');

// Identidade de produção lida de firestore.rules em tempo de execução: este arquivo não contém cópia literal.
const PROD = readOwnerIdentifiers();

const repo = path.join(__dirname, '..');
const HEAD = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const HOMOLOG = 'carteira-homolog-sm118';
const UID = 'SyntheticUid0000000000001';
const EMAIL = 'homolog-owner@example.com';
const SDK = {
  apiKey: 'AIzaTESTFAKEKEYFORGUARD000000000000', authDomain: `${HOMOLOG}.firebaseapp.com`, projectId: HOMOLOG,
  storageBucket: `${HOMOLOG}.firebasestorage.app`, messagingSenderId: '735653105367', appId: '1:735653105367:web:testfake',
};

function sdkFile(dir, cfg) {
  const file = path.join(dir, 'sdk.json');
  fs.writeFileSync(file, JSON.stringify({ result: { sdkConfig: cfg } }));
  return file;
}

function buildTo(dir, cfg = SDK, uid = UID, email = EMAIL, sha = HEAD) {
  const out = path.join(dir, 'out');
  const args = ['scripts/homolog/build-homolog.js', '--sha', sha, '--out', out, '--sdk-config', sdkFile(dir, cfg), '--uid', uid, '--email', email];
  execFileSync('node', args, { cwd: repo, encoding: 'utf8', stdio: 'pipe' });
  return out;
}

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sm132-guard-')); }

test('positivo: build do HEAD com identidade sintética e configuração de homologação passa no guard', () => {
  const dir = tmpDir();
  const out = buildTo(dir);
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.match(html, new RegExp(`const OWNER_FIREBASE_UID = '${UID}';`));
  assert.match(html, new RegExp(`SHA ${HEAD.slice(0, 12)}`));
  assert.ok(fs.existsSync(out + '.manifest.json'), 'manifesto ao lado do artefato');
  assert.equal(fs.existsSync(path.join(out, 'sdk.json')), false, 'config de teste não pode entrar no artefato');
});

test('negativo: configuração apontando para o projeto de PRODUÇÃO é recusada antes de gerar', () => {
  const dir = tmpDir();
  assert.throws(() => buildTo(dir, { ...SDK, projectId: PROD_PROJECT, authDomain: `${PROD_PROJECT}.firebaseapp.com` }), /PRODUÇÃO|diferente do esperado/);
  assert.equal(fs.existsSync(path.join(dir, 'out')), false);
});

test('negativo: authDomain de outro projeto é recusado', () => {
  assert.throws(() => validateSdkConfig({ ...SDK, authDomain: `${PROD_PROJECT}.firebaseapp.com` }, HOMOLOG), /authDomain|PRODUÇÃO/);
});

test('negativo: configuração Firebase incompleta é recusada', () => {
  const { appId, ...incomplete } = SDK;
  assert.throws(() => validateSdkConfig(incomplete, HOMOLOG), /incompleta \(appId\)/);
});

test('negativo: identidade de produção (UID real do proprietário) é recusada', () => {
  assert.throws(() => validateIdentity(PROD.uid, EMAIL), /produção/);
  assert.throws(() => validateIdentity(UID, PROD.email), /produção/);
});

test('negativo: UID ausente ou inválido e e-mail inválido são recusados', () => {
  assert.throws(() => validateIdentity('', EMAIL), /UID sintético/);
  assert.throws(() => validateIdentity('curto', EMAIL), /UID sintético/);
  assert.throws(() => validateIdentity(UID, 'sem-arroba'), /e-mail/);
});

test('negativo: SHA inexistente não gera artefato', () => {
  const dir = tmpDir();
  assert.throws(() => buildTo(dir, SDK, UID, EMAIL, '0'.repeat(40)));
  assert.equal(fs.existsSync(path.join(dir, 'out')), false);
});

test('negativo: arquivo proibido na distribuição reprova o guard', () => {
  const dir = tmpDir();
  const out = buildTo(dir);
  fs.writeFileSync(path.join(out, '.firebaserc'), '{"projects":{"default":"x"}}');
  const cfg = validateSdkConfig(SDK, HOMOLOG);
  assert.throws(() => checkDistribution(out, { sha: HEAD, shortSha: HEAD.slice(0, 12), projectId: HOMOLOG, uid: UID, email: EMAIL, cfg, manifestPath: out + '.manifest.json' }), /proibido|fora do manifesto/);
});

test('negativo: referência ao projeto de produção no HTML reprova o guard', () => {
  const dir = tmpDir();
  const out = buildTo(dir);
  const file = path.join(out, 'index.html');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8') + `\n<!-- ${PROD_PROJECT} -->`);
  // o manifesto precisa refletir o conteúdo alterado para isolar a checagem de produção
  const manifest = JSON.parse(fs.readFileSync(out + '.manifest.json', 'utf8'));
  manifest.files = manifest.files.map(f => f.path === 'index.html' ? { ...f, sha256: require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex') } : f);
  fs.writeFileSync(out + '.manifest.json', JSON.stringify(manifest));
  const cfg = validateSdkConfig(SDK, HOMOLOG);
  assert.throws(() => checkDistribution(out, { sha: HEAD, shortSha: HEAD.slice(0, 12), projectId: HOMOLOG, uid: UID, email: EMAIL, cfg, manifestPath: out + '.manifest.json' }), /produção/);
});

test('negativo: arquivo alterado após o build diverge do manifesto', () => {
  const dir = tmpDir();
  const out = buildTo(dir);
  fs.appendFileSync(path.join(out, 'sw.js'), '\n// alterado');
  const cfg = validateSdkConfig(SDK, HOMOLOG);
  assert.throws(() => checkDistribution(out, { sha: HEAD, shortSha: HEAD.slice(0, 12), projectId: HOMOLOG, uid: UID, email: EMAIL, cfg, manifestPath: out + '.manifest.json' }), /divergente/);
});

test('negativo: SHA diferente do manifesto reprova o guard', () => {
  const dir = tmpDir();
  const out = buildTo(dir);
  const cfg = validateSdkConfig(SDK, HOMOLOG);
  assert.throws(() => checkDistribution(out, { sha: '1'.repeat(40), shortSha: '111111111111', projectId: HOMOLOG, uid: UID, email: EMAIL, cfg, manifestPath: out + '.manifest.json' }), /SHA/);
});

test('substituições independem do fim de linha: blob com LF (CI Linux) e CRLF (Windows) geram o mesmo conteúdo', () => {
  const lf = execFileSync('git', ['-C', repo, 'show', 'HEAD:index.html'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(lf.includes('\r'), false, 'blob do git deve estar em LF');
  const fromLf = applyHomologSubstitutions(lf, { sdk: SDK, uid: UID, email: EMAIL, shortSha: 'abc123' });
  assert.match(fromLf, /homolog-email-form/);
  assert.equal(fromLf.includes('\r'), false, 'entrada LF gera saída LF');
  const fromCrlf = applyHomologSubstitutions(lf.replace(/\n/g, '\r\n'), { sdk: SDK, uid: UID, email: EMAIL, shortSha: 'abc123' });
  assert.equal(fromCrlf.replace(/\r\n/g, '\n'), fromLf, 'mesmo conteúdo, independentemente do fim de linha');
  assert.equal(fromCrlf.includes('\r\n'), true, 'entrada CRLF gera saída CRLF');
});

test('substituições falham fechado quando uma âncora não existe', () => {
  assert.throws(() => applyHomologSubstitutions('sem nada', { sdk: SDK, uid: UID, email: EMAIL, shortSha: 'abc' }), /âncora|configuração Firebase/);
});

test('fail-closed: firestore.rules sem identidade do proprietário impede o guard de validar', () => {
  const dir = tmpDir();
  const rules = path.join(dir, 'firestore.rules');
  fs.writeFileSync(rules, 'rules_version = "2";\n');
  assert.throws(() => readOwnerIdentifiers(rules), /fail-closed/);
  assert.throws(() => readOwnerIdentifiers(path.join(dir, 'ausente.rules')));
});

test('negativo: distribuição que ainda contém o e-mail de produção é reprovada pelo guard', () => {
  const dir = tmpDir();
  const out = buildTo(dir);
  const indexPath = path.join(out, 'index.html');
  fs.appendFileSync(indexPath, `\n<!-- ${PROD.email} -->\n`);
  assert.throws(() => checkDistribution(out, { sha: HEAD, shortSha: HEAD.slice(0, 12), projectId: HOMOLOG, uid: UID, email: EMAIL, cfg: SDK, manifestPath: out + '.manifest.json' }), /GUARD FALHOU/);
});

test('arquivos de homologação não repetem o UID nem o e-mail do proprietário de produção', () => {
  const files = ['scripts/homolog/build-homolog.js', 'scripts/homolog/guard.js', 'tests/homolog-build-guard.test.js'];
  for (const rel of files) {
    const text = fs.readFileSync(path.join(repo, rel), 'utf8');
    assert.equal(text.includes(PROD.uid), false, `UID de produção literal em ${rel}`);
    assert.equal(text.includes(PROD.email), false, `e-mail de produção literal em ${rel}`);
  }
});
