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
