const assert = require('node:assert/strict');
const test = require('node:test');
const { reconstructRfPosition } = require('../rf-reconstruction');

const redemption = (date, delta, id) => ({ date, principalDelta: delta, id });

test('reconstroi resgate parcial sem alterar o valor historico da base', () => {
  const result = reconstructRfPosition({
    baseApplied: 39863.16,
    baseCurrent: 39863.16,
    events: [redemption('2026-08-17', -15275, 'resgate-1')],
  });
  assert.deepEqual(result, { ok: true, appliedValue: 24588.16, currentValue: 24588.16, eventCount: 1 });
});

test('reconstrucao e idempotente porque sempre parte da base', () => {
  const input = { baseApplied: 39863.16, baseCurrent: 39863.16, events: [redemption('2026-08-17', -15275, 'resgate-1')] };
  assert.equal(reconstructRfPosition(input).currentValue, 24588.16);
  assert.equal(reconstructRfPosition(input).currentValue, 24588.16);
});

test('resgate total preserva o historico e zera a posicao atual', () => {
  const result = reconstructRfPosition({
    baseApplied: 1000,
    baseCurrent: 1012.5,
    events: [redemption('2026-08-17', -1000, 'resgate-total')],
  });
  assert.equal(result.ok, true);
  assert.equal(result.appliedValue, 0);
  assert.equal(result.currentValue, 12.5);
});

test('multiplos eventos seguem ordem cronologica deterministica', () => {
  const result = reconstructRfPosition({
    baseApplied: 1000,
    baseCurrent: 1000,
    events: [
      redemption('2026-09-10', -200, 'resgate-2'),
      redemption('2026-08-10', -300, 'resgate-1'),
      redemption('2026-10-10', 150, 'aporte-2'),
    ],
  });
  assert.equal(result.ok, true);
  assert.equal(result.appliedValue, 650);
  assert.equal(result.currentValue, 650);
});

test('juros e imposto sem principalDelta nao alteram o principal', () => {
  const result = reconstructRfPosition({
    baseApplied: 1000,
    baseCurrent: 1010,
    events: [
      { date: '2026-08-10', type: 'juros', grossValue: 20, netValue: 18, principalDelta: 0 },
      { date: '2026-08-10', type: 'ir', grossValue: 0, netValue: 0, principalDelta: 0 },
    ],
  });
  assert.equal(result.appliedValue, 1000);
  assert.equal(result.currentValue, 1010);
});

test('bloqueia evento que levaria o principal abaixo de zero', () => {
  const result = reconstructRfPosition({
    baseApplied: 1000,
    baseCurrent: 1000,
    events: [redemption('2026-08-17', -1000.01, 'resgate-invalido')],
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'NEGATIVE_PRINCIPAL');
});

test('nao muta a base nem os eventos recebidos', () => {
  const base = { baseApplied: 1000, baseCurrent: 1000, events: [redemption('2026-08-17', -100, 'r1')] };
  const before = JSON.parse(JSON.stringify(base));
  reconstructRfPosition(base);
  assert.deepEqual(base, before);
});
