const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `snippet not found: ${startMarker}`);
  return source.slice(start, end);
}

function makeContext(mode = 'resumo') {
  const context = {
    S: { tab: 'dashboard', tabSeq: 0, aportesViewMode: mode, mobileMenuOpen: true, mobileTopMenuOpen: true, assetsInnerTab: 'patrimonio', activeDividendSection: '' },
    save() {},
    render() {},
    runAutoProventosGratis() {},
  };
  vm.runInNewContext(`${extract('function go(t){', 'function clA(){')}\n${extract('function setAportesViewMode(mode){', 'function setAportesFilter(filter){')}`, context);
  return context;
}

test('first entry and invalid state use the official resumo default', () => {
  assert.match(source, /aportesViewMode:'resumo'/);
  const apTabSource = extract('function apTab(){', 'function frmD(){');
  assert.match(apTabSource, /: 'resumo'/);
  const context = makeContext('invalid');
  context.go('aportes');
  assert.equal(context.S.aportesViewMode, 'invalid', 'go must not overwrite a session mode');
  assert.match(apTabSource, /S\.aportesViewMode=mode/);
  context.setAportesViewMode('invalid');
  assert.equal(context.S.aportesViewMode, 'resumo');
});

test('valid mode survives leaving and returning to Aportes during the session', () => {
  const context = makeContext();
  for (const mode of ['extrato', 'ativo', 'categorias', 'resumo']) {
    context.setAportesViewMode(mode);
    context.go('dashboard');
    context.go('aportes');
    assert.equal(context.S.aportesViewMode, mode);
  }
});

test('session mode is not part of the persisted storage contract', () => {
  const persistence = fs.readFileSync(path.join(__dirname, '..', 'persistence-core.js'), 'utf8');
  assert.doesNotMatch(persistence, /aportesViewMode/);
});
