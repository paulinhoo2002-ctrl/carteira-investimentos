const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('V254 carrega o motor fiscal derivado antes da tela de relatórios', () => {
  assert.match(html, /<script src="tax-cost-basis-intelligence\.js"><\/script>/);
  assert.match(html, /function v254FiscalPanel\(\)/);
  assert.match(html, /Inteligência fiscal e custo de aquisição/);
});

test('V254 mantém semântica fail-closed e nenhuma ação de escrita', () => {
  assert.match(html, /Não gera DARF, não transmite declaração e não altera a carteira/);
  assert.match(html, /custo desconhecido, classificação fiscal incompleta/);
  assert.match(html, /Regras oficiais usadas/);
  const panel = html.match(/function v254FiscalPanel\(\)\{([\s\S]*?)\r?\n\}\r?\nfunction reportsTab/);
  assert.ok(panel, 'painel V254 deve existir antes de reportsTab');
  assert.doesNotMatch(panel[1], /onclick|submit|\bsave\s*\(|\bpersist(?:ence|ed|ing)?\s*\(/i);
});
