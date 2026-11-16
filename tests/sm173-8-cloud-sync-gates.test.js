'use strict';
// SM173.8 — regressão: a nuvem nunca inicializa a carteira sozinha, e o upload passa pelo gate de escopo do civ5.
// Verificação estática do index.html (padrão do repositório para caminhos inline).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('documento ausente na nuvem não dispara upload inicial sem aprovação explícita', () => {
  const start = html.indexOf('if(!snap.exists){');
  assert.ok(start >= 0, 'ramo de documento ausente existe');
  const branch = html.slice(start, start + 900);
  assert.match(branch, /FB\.initialCloudUploadApproved===true\) await uploadLocalToCloud/);
  assert.doesNotMatch(branch, /if\(!readOnlyOnly && hasLocalData\(\)\) await uploadLocalToCloud/);
});

test('nenhum caminho define a aprovação de upload inicial automaticamente', () => {
  assert.equal(/initialCloudUploadApproved\s*=\s*true/.test(html), false);
});

test('upload para a nuvem verifica o escopo do civ5 antes de gravar', () => {
  const start = html.indexOf('const civ5Status=civ5Gate();');
  assert.ok(start >= 0, 'gate de escopo no upload existe');
  const before = html.indexOf('await ref.set(payload, {merge:true});', start);
  assert.ok(before > start, 'gravação ocorre após o gate');
  assert.match(html.slice(start, before), /civ5Status!=='ok'/);
});

test('guarda contra apagamento de lista na nuvem continua presente', () => {
  assert.match(html, /CLOUD_WRITE_BLOCKED_EMPTY_/);
});

test('a aplicação da nuvem local só grava o civ5 com escopo ok', () => {
  assert.match(html, /if\(civ5Gate\(\)==='ok'\)\{\s*localStorage\.setItem\(STOR, JSON\.stringify/);
});
