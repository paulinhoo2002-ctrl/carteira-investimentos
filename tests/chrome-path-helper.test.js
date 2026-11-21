'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { resolveChromePath, candidatesFor } = require('./helpers/chrome-path');

test('CHROME_PATH configurado é obrigatório e tem prioridade', () => {
  const chosen = resolveChromePath({ env: { CHROME_PATH: '/opt/chrome' }, platform: 'linux', exists: file => file === '/opt/chrome' });
  assert.equal(chosen, '/opt/chrome');
});

test('CHROME_PATH inexistente falha alto, sem cair em outro navegador', () => {
  assert.throws(
    () => resolveChromePath({ env: { CHROME_PATH: '/nao/existe' }, platform: 'linux', exists: file => file === '/usr/bin/chromium' }),
    /CHROME_PATH aponta para um arquivo inexistente/,
  );
});

test('sem CHROME_PATH usa o primeiro candidato existente em Linux, macOS e Windows', () => {
  assert.equal(resolveChromePath({ env: {}, platform: 'linux', exists: file => file === '/usr/bin/google-chrome' }), '/usr/bin/google-chrome');
  assert.equal(resolveChromePath({ env: {}, platform: 'darwin', exists: file => file.endsWith('Chromium') }), '/Applications/Chromium.app/Contents/MacOS/Chromium');
  const windows = candidatesFor('win32');
  assert.ok(windows.length > 0);
  assert.equal(resolveChromePath({ env: {}, platform: 'win32', exists: file => file === windows[windows.length - 1] }), windows[windows.length - 1]);
});

test('sem navegador disponível a resolução falha com mensagem clara (não pula nem aprova)', () => {
  assert.throws(() => resolveChromePath({ env: {}, platform: 'linux', exists: () => false }), /Chrome\/Chromium não encontrado \(linux\).*CHROME_PATH/);
});
