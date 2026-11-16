'use strict';
// Portões fail-closed do Preview QA (15/11/2026): o build de homologação precisa ser o que a Vercel publica.
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repo = path.join(__dirname, '..');
const SHA = '0'.repeat(40);

function runBuild(extra) {
  const args = ['scripts/homolog/build-homolog.js', '--sha', SHA, '--out', path.join(os.tmpdir(), 'gate-nao-existe-' + Date.now()),
    '--sdk-config', path.join(os.tmpdir(), 'gate-sem-config.json'), '--email', 'x@example.invalid', ...extra];
  return spawnSync('node', args, { cwd: repo, encoding: 'utf8' });
}

test('vercel.json não define buildCommand nem outputDirectory (o dashboard decide o build de homologação)', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(repo, 'vercel.json'), 'utf8'));
  assert.equal(cfg.buildCommand, undefined, 'buildCommand em vercel.json sobrescreve o build de homologação');
  assert.equal(cfg.outputDirectory, undefined, 'outputDirectory "." publica o index.html fonte com configuração de produção');
});

test('UID placeholder de bootstrap é recusado em build autenticado', () => {
  const r = runBuild(['--uid', 'BootstrapGoogleLoginQaUid0001', '--mode', 'authenticated']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /bootstrap \(placeholder\) não pode entrar em build autenticado/);
});

test('modo ausente ou inválido é recusado (fail-closed)', () => {
  const r = runBuild(['--uid', 'ReproSyntheticUid0000000001']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /--mode deve ser bootstrap ou authenticated/);
});

test('build de homologação grava o marcador homolog-build.json com SHA e modo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm175-marker-'));
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  const sdk = path.join(dir, 'sdk.json');
  // configuração pública de teste (projeto de homologação, chaves fictícias)
  fs.writeFileSync(sdk, JSON.stringify({ projectId: 'carteira-homolog-sm118', appId: '1:735653105367:web:abc', storageBucket: 'carteira-homolog-sm118.firebasestorage.app', apiKey: 'AIzaTestOnlyKey0000000000000000000000', authDomain: 'carteira-homolog-sm118.firebaseapp.com', messagingSenderId: '735653105367', projectNumber: '735653105367', version: '2' }));
  const out = path.join(dir, 'out');
  const r = spawnSync('node', ['scripts/homolog/build-homolog.js', '--sha', head, '--out', out, '--sdk-config', sdk,
    '--uid', 'SyntheticGateUid00000000000001', '--email', 'gate@example.invalid', '--mode', 'authenticated'], { cwd: repo, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const marker = JSON.parse(fs.readFileSync(path.join(out, 'homolog-build.json'), 'utf8'));
  assert.equal(marker.sha, head);
  assert.equal(marker.mode, 'authenticated');
  assert.equal(marker.project, 'carteira-homolog-sm118');
});

// CSP do artefato QA: só o domínio de autenticação de homologação, nunca o de produção.
function cspOf(rule) {
  return rule.headers.find(h => h.key === 'Content-Security-Policy').value;
}
function directive(csp, name) {
  return csp.split(';').map(s => s.trim()).find(s => s.startsWith(name + ' ')) || '';
}
const QA_RULES = () => JSON.parse(fs.readFileSync(path.join(repo, 'vercel.json'), 'utf8')).headers
  .filter(h => h.has && h.has.some(c => c.type === 'host' && c.value && c.value.pre === 'carteira-homolog-c5785e'));
const PROD_RULES = () => JSON.parse(fs.readFileSync(path.join(repo, 'vercel.json'), 'utf8')).headers
  .filter(h => h.headers && h.headers.some(x => x.key === 'Content-Security-Policy') && !(h.has));

test('CSP QA: frame-src aceita o domínio de homologação e não herda o de produção', () => {
  const rules = QA_RULES();
  assert.equal(rules.length, 2, 'esperava as regras QA de /index.html e /(.*)');
  for (const r of rules) {
    const fs_ = directive(cspOf(r), 'frame-src');
    assert.match(fs_, /https:\/\/carteira-homolog-sm118\.firebaseapp\.com/);
    assert.doesNotMatch(fs_, /16725/, 'frame-src QA herdou domínio de produção');
  }
});

test('CSP QA: connect-src libera vercel.com somente para o host QA (Vercel Authentication)', () => {
  for (const r of QA_RULES()) assert.match(directive(cspOf(r), 'connect-src'), /https:\/\/vercel\.com/);
});

test('CSP de produção: regras inalteradas e sem domínio QA', () => {
  const rules = PROD_RULES();
  assert.equal(rules.length, 2);
  for (const r of rules) {
    const csp = cspOf(r);
    assert.match(directive(csp, 'frame-src'), /https:\/\/carteira-de-investimento-16725\.firebaseapp\.com/);
    assert.doesNotMatch(csp, /carteira-homolog-sm118/, 'produção não pode receber domínio QA');
    assert.doesNotMatch(directive(csp, 'connect-src'), /vercel\.com/, 'produção não recebe vercel.com em connect-src');
    assert.equal(JSON.stringify(r.missing), JSON.stringify([{ type: 'host', value: { pre: 'carteira-homolog-c5785e' } }]));
  }
});
