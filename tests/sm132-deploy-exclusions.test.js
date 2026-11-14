'use strict';
// SM132 — guarda de empacotamento: arquivos históricos/internos não podem ser publicados pela Vercel.
// Em produção, /index.m1959-before.html e /.firebaserc respondiam 200 antes desta regra.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const ignored = fs.readFileSync(path.join(root, '.vercelignore'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

test('.vercelignore exclui o índice histórico e o .firebaserc do deploy', () => {
  assert.ok(ignored.includes('index.m1959-before.html'), 'falta index.m1959-before.html em .vercelignore');
  assert.ok(ignored.includes('.firebaserc'), 'falta .firebaserc em .vercelignore');
});

test('os arquivos excluídos existem no repositório (a regra é real, não um nome inventado)', () => {
  for (const file of ignored) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} listado mas ausente`);
  }
});
