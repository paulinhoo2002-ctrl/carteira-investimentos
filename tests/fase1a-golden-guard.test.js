'use strict';
// SM189.64 (A4): prova que o comparador do golden FALHA diante de regressões financeiras reais.
// Sem navegador: a lista "atual" é adulterada para simular uma regressão e o comparador precisa rejeitá-la.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { applyTokenChanges, expectedRouteTokens } = require('./helpers/golden-token-changes');

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fase1a-golden.json'), 'utf8'));
const compare = (actual, state, route) => assert.deepEqual(actual, expectedRouteTokens(golden, state, route));
const without = (list, token) => { const copy = [...list]; copy.splice(copy.indexOf(token), 1); return copy; };

test('mudança declarada exige contagem de partida exata (from); divergência é recusada', () => {
  assert.throws(
    () => applyTokenChanges(['%+5.87%', '%+5.87%'], [{ id: 'X', state: 'rich', route: 'relatorios', token: '%+5.87%', from: 3, to: 2 }], 'rich/relatorios'),
    /declara from=3/
  );
});

test('toda mudança declarada tem from/to inteiros, diferentes, e tokens não vazios', () => {
  golden.intentionalDifferences.forEach(item => (item.tokenChanges || []).forEach(change => {
    assert.ok(Number.isInteger(change.from) && Number.isInteger(change.to), `${item.id}: from/to inteiros`);
    assert.notEqual(change.from, change.to, `${item.id}: mudança sem efeito`);
    assert.ok(change.token && change.token.length > 1, `${item.id}: token obrigatório`);
  }));
});

test('regressão: perda de um "+5,87%" real em Relatórios (rich) causa FAIL', () => {
  const expected = expectedRouteTokens(golden, 'rich', 'relatorios');
  const actual = without(expected, '%+5.87%'); // a remoção "barata" de uma ocorrência não declarada
  assert.throws(() => compare(actual, 'rich', 'relatorios'), AssertionError());
});

test('regressão: valor de rentabilidade alterado (+5,87% → +5,97%) causa FAIL', () => {
  const expected = expectedRouteTokens(golden, 'rich', 'relatorios');
  const actual = expected.map(token => (token === '%+5.87%' ? '%+5.97%' : token)).sort();
  assert.throws(() => compare(actual, 'rich', 'relatorios'), AssertionError());
});

test('regressão: perda de um "+5,02%" real em Relatórios (partial) causa FAIL', () => {
  const expected = expectedRouteTokens(golden, 'partial', 'relatorios');
  assert.throws(() => compare(without(expected, '%+5.02%'), 'partial', 'relatorios'), AssertionError());
});

test('regressão do A3 revertida: "+0,00%" voltando em capital zero (empty) causa FAIL', () => {
  const expected = expectedRouteTokens(golden, 'empty', 'relatorios');
  assert.equal(expected.filter(token => token === '%+0.00%').length, 0, 'após A3 não há +0,00% sem denominador');
  const reverted = [...expected, '%+0.00%', '%+0.00%'].sort();
  assert.throws(() => compare(reverted, 'empty', 'relatorios'), AssertionError());
});

test('estado rico sem capital zero mantém o +5,87% legítimo (não é removido pelo A3)', () => {
  const expected = expectedRouteTokens(golden, 'rich', 'relatorios');
  assert.equal(expected.filter(token => token === '%+5.87%').length, 2);
});

function AssertionError() {
  return err => err instanceof assert.AssertionError;
}
