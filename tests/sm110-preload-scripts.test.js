'use strict';
// SM110: preload dos scripts locais do index.html. O preload só antecipa o download; a execução continua
// síncrona e na mesma ordem. Este teste garante que todo script local tem preload com o mesmo href exato
// (incluindo ?v=) e que nenhum preload aponta para arquivo inexistente.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const localScripts = [...html.matchAll(/<script src="((?!https?:)[^"]+)"/g)].map(m => m[1]);
const preloads = [...html.matchAll(/<link rel="preload" as="script" href="([^"]+)">/g)].map(m => m[1]);

test('todo script local tem preload com href idêntico', () => {
  for (const src of new Set(localScripts)) assert.ok(preloads.includes(src), `falta preload de ${src}`);
});

test('preloads apontam para arquivos existentes', () => {
  for (const href of preloads) {
    const file = href.split('?')[0];
    assert.ok(fs.existsSync(path.join(__dirname, '..', file)), `arquivo inexistente: ${file}`);
  }
});

test('preloads ficam antes da primeira tag de script síncrona', () => {
  const firstScript = html.indexOf('<script src="');
  const lastPreload = html.lastIndexOf('<link rel="preload" as="script"');
  assert.ok(lastPreload >= 0 && lastPreload < firstScript, 'preloads devem vir antes dos scripts');
});
