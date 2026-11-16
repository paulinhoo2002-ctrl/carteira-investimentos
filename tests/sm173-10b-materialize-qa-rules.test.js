'use strict';
// SM173.10B — materialização temporária das regras QA: positivo (hash igual), negativos (hash, base64 ausente,
// destino existente). Usa o arquivo de regras publicadas local quando disponível; caso contrário, pula o positivo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { materialize } = require('../scripts/homolog/materialize-qa-rules');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm173-10b-'));
const REAL = process.env.SM173_QA_RULES || 'C:/Projetos/_mission-logs/sm173-3/qa-published-post-deploy.rules';

test('negativo: Base64 ausente é recusado', () => {
  assert.throws(() => materialize(path.join(tmp, 'a.rules'), ''), /ausente/);
  assert.equal(fs.existsSync(path.join(tmp, 'a.rules')), false);
});

test('negativo: conteúdo com hash divergente é recusado sem gravar nada', () => {
  const dest = path.join(tmp, 'b.rules');
  assert.throws(() => materialize(dest, Buffer.from('regras alteradas').toString('base64')), /diverge/);
  assert.equal(fs.existsSync(dest), false);
});

test('negativo: destino existente não é sobrescrito', () => {
  const dest = path.join(tmp, 'c.rules');
  fs.writeFileSync(dest, 'original');
  assert.throws(() => materialize(dest, Buffer.from('x').toString('base64')), /diverge|existe/);
  assert.equal(fs.readFileSync(dest, 'utf8'), 'original');
});

test('negativo: destino não informado é recusado', () => {
  assert.throws(() => materialize('', 'AAAA'), /destino/);
});

test('positivo: regras publicadas (hash aprovado) são materializadas', { skip: !fs.existsSync(REAL) && 'regras QA publicadas ausentes localmente' }, () => {
  const dest = path.join(tmp, 'ok.rules');
  materialize(dest, fs.readFileSync(REAL).toString('base64'));
  assert.equal(fs.readFileSync(dest).equals(fs.readFileSync(REAL)), true);
});

test('build: HOMOLOG_QA_RULES_B64 com conteúdo errado falha antes de qualquer saída', () => {
  const { spawnSync } = require('node:child_process');
  const out = path.join(tmp, 'saida-nao-criada');
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'homolog', 'build-homolog.js'),
    '--sha', 'a'.repeat(40), '--out', out, '--sdk-config', path.join(tmp, 'sdk.json'),
    '--uid', 'SyntheticQaOwnerSm1736B01', '--email', 'paulinhoo2002@gmail.com', '--mode', 'authenticated'],
  { env: { ...process.env, HOMOLOG_QA_RULES_B64: Buffer.from('regras alteradas').toString('base64') }, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /diverge/);
  assert.equal(fs.existsSync(out), false);
});
