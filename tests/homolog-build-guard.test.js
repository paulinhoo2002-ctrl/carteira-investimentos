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
const { checkDistribution, validateIdentity, validateSdkConfig, PROD_PROJECT } = require('../scripts/homolog/guard');

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
  assert.throws(() => validateIdentity('yaypxiiv7Ye7pwpDZ0nqhG3Yj7E3', EMAIL), /produção/);
  assert.throws(() => validateIdentity(UID, 'paulinhoo2002@gmail.com'), /produção/);
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

test('substituições falham fechado quando uma âncora não existe', () => {
  assert.throws(() => applyHomologSubstitutions('sem nada', { sdk: SDK, uid: UID, email: EMAIL, shortSha: 'abc' }), /âncora|configuração Firebase/);
});
