'use strict';
// SM132 — regressão: operação ausente ou desconhecida nunca vira compra silenciosamente.
const assert = require('node:assert/strict');
const test = require('node:test');
const PR = require('../position-reconciliation.js');

test('movimento sem operação não é contado como compra: posição fica incompleta', () => {
  const movs = [{ id: 'a', ticker: 'XXXX3', qty: 10, price: 5, date: '2026-01-01' }];
  const r = PR.reconcilePosition({ ticker: 'XXXX3', qty: 10 }, movs, { coverage: PR.COVERAGE.COMPLETE });
  assert.equal(r.complete, false);
  assert.ok(r.flags.includes('OPERATION_UNKNOWN'));
  assert.notEqual(PR.presentState(r).key, 'CONCILIADA');
});

test('operação desconhecida (ex.: reserva) não infla a quantidade derivada', () => {
  const movs = [
    { id: '1', ticker: 'XXXX3', qty: 10, price: 5, operation: 'compra', date: '2026-01-01' },
    { id: '2', ticker: 'XXXX3', qty: 99, price: 5, operation: 'reserva-entrada', date: '2026-02-01' },
  ];
  const r = PR.reconcilePosition({ ticker: 'XXXX3', qty: 10 }, movs, { coverage: PR.COVERAGE.COMPLETE });
  assert.equal(r.derivedQty, 10);
  assert.equal(r.complete, false);
  assert.ok(r.flags.includes('OPERATION_UNKNOWN'));
});

test('compra e venda explícitas continuam calculadas normalmente', () => {
  const movs = [
    { id: '1', ticker: 'XXXX3', qty: 10, price: 5, operation: 'compra', date: '2026-01-01' },
    { id: '2', ticker: 'XXXX3', qty: 4, price: 6, operation: 'venda', date: '2026-02-01' },
  ];
  const r = PR.reconcilePosition({ ticker: 'XXXX3', qty: 6 }, movs, { coverage: PR.COVERAGE.COMPLETE });
  assert.equal(r.derivedQty, 6);
  assert.equal(r.complete, true);
  assert.equal(PR.presentState(r).key, 'CONCILIADA');
});
