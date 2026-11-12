'use strict';
// SM122: posições registradas × derivadas dos lançamentos, com status de cobertura e conciliação.
// Regra: ausência de cobertura NÃO é cobertura completa; dado desconhecido NÃO vira zero;
// nenhuma posição vira CONCILIADA sem evidência de cobertura completa.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { deriveFromMovements, reconcilePosition, COVERAGE, STATUS } = require('../position-reconciliation.js');

const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sm122-position-fixtures.json'), 'utf8'));
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('1. duas compras do mesmo ticker: 36 un., custo R$ 1.534,80, PM 42,6333', () => {
  const d = deriveFromMovements(FX.suzb3_two_buys);
  assert.equal(d.qty, 36);
  assert.ok(near(d.cost, 1534.80, 0.005), `custo ${d.cost}`);
  assert.ok(near(d.avgPrice, 1534.80 / 36, 1e-6));
});

test('2. compras em datas diferentes: resultado independe da ordem de entrada', () => {
  const a = deriveFromMovements(FX.suzb3_two_buys);
  const b = deriveFromMovements([...FX.suzb3_two_buys].reverse());
  assert.equal(a.qty, b.qty); assert.ok(near(a.cost, b.cost));
});

test('3. compras com preços diferentes: PM ponderado pela quantidade', () => {
  const d = deriveFromMovements(FX.buys_different_prices);
  assert.equal(d.qty, 20); assert.ok(near(d.avgPrice, 15));
});

test('4. compra seguida de venda total: zera quantidade e custo', () => {
  const d = deriveFromMovements(FX.buy_then_sell_all);
  assert.equal(d.qty, 0); assert.ok(near(d.cost, 0));
});

test('5. venda parcial: reduz quantidade e custo pelo PM vigente', () => {
  const d = deriveFromMovements(FX.buy_then_partial_sale);
  assert.equal(d.qty, 15); assert.ok(near(d.cost, 150)); assert.ok(near(d.avgPrice, 10));
});

test('6. duplicidade de movimentação: sinalizada, nunca conciliada', () => {
  const d = deriveFromMovements(FX.duplicate_movement);
  assert.ok(d.flags.includes('DUPLICATE_MOVEMENT'));
  const r = reconcilePosition({ ticker: 'TSTD3', qty: 10 }, FX.duplicate_movement, { coverage: COVERAGE.COMPLETE });
  assert.notEqual(r.status, STATUS.CONCILIADA);
});

test('7. identificador inconsistente (sem id): sinalizado', () => {
  const d = deriveFromMovements(FX.inconsistent_identifier);
  assert.ok(d.flags.includes('MISSING_MOVEMENT_ID'));
});

test('8. histórico incompleto: preço ausente não vira zero e a posição não é confirmada', () => {
  const d = deriveFromMovements(FX.incomplete_price);
  assert.equal(d.complete, false);
  assert.ok(d.flags.includes('MOVEMENT_PRICE_UNKNOWN'));
  assert.notEqual(d.avgPrice, 0);
  const r = reconcilePosition({ ticker: 'TSTF3', qty: 5 }, FX.incomplete_price, {});
  assert.notEqual(r.status, STATUS.CONCILIADA);
});

test('9. divergência B3 × lançamentos: diferença explícita e status NÃO CONCILIADA', () => {
  const r = reconcilePosition({ ticker: 'TSTG3', qty: FX.b3_vs_lancamentos.registeredQty }, FX.b3_vs_lancamentos.movements, { coverage: COVERAGE.COMPLETE });
  assert.equal(r.registeredQty, 21); assert.equal(r.derivedQty, 36); assert.equal(r.difference, 15);
  assert.equal(r.status, STATUS.NAO_CONCILIADA);
});

test('10. SUZB3 sintético sem cobertura comprovada: 21 registradas, 36 derivadas, alerta de não conciliação', () => {
  const r = reconcilePosition({ ticker: 'SUZB3', qty: 21 }, FX.suzb3_two_buys, {});
  assert.equal(r.registeredQty, 21); assert.equal(r.derivedQty, 36);
  assert.equal(r.coverage, COVERAGE.PARTIAL_OR_UNKNOWN);
  assert.equal(r.status, STATUS.NAO_CONCILIADA);
  assert.ok(r.notice && /pode não representar/i.test(r.notice));
});

test('sem movimentos: derivado é desconhecido, nunca zero confirmado', () => {
  const r = reconcilePosition({ ticker: 'NADA3', qty: 5 }, [], { coverage: COVERAGE.COMPLETE });
  assert.equal(r.derivedQty, null);
  assert.notEqual(r.status, STATUS.CONCILIADA);
});

test('CONCILIADA só com cobertura completa comprovada e quantidades iguais', () => {
  const ok = reconcilePosition({ ticker: 'SUZB3', qty: 36 }, FX.suzb3_two_buys, { coverage: COVERAGE.COMPLETE });
  assert.equal(ok.status, STATUS.CONCILIADA);
  const semCob = reconcilePosition({ ticker: 'SUZB3', qty: 36 }, FX.suzb3_two_buys, {});
  assert.notEqual(semCob.status, STATUS.CONCILIADA);
});

// SM122-R — apresentação dos estados de conciliação (não altera a lógica financeira).
const { presentState, LABEL } = require('../position-reconciliation.js');

test('R1. quantidades diferentes com histórico incompleto → "Divergência identificada · histórico incompleto"', () => {
  const r = reconcilePosition({ ticker: 'SUZB3', qty: 21 }, FX.suzb3_two_buys, {});
  assert.equal(presentState(r).label, 'Divergência identificada · histórico incompleto');
});

test('R2. quantidades iguais com histórico incompleto → "Quantidades coincidem · conciliação não comprovada" (nunca conciliada)', () => {
  const r = reconcilePosition({ ticker: 'SUZB3', qty: 36 }, FX.suzb3_two_buys, {});
  assert.equal(r.difference, 0);
  assert.equal(presentState(r).label, 'Quantidades coincidem · conciliação não comprovada');
  assert.notEqual(presentState(r).key, 'CONCILIADA');
});

test('R3. dados insuficientes (sem movimentos, preço ausente) → "Dados insuficientes para comparar"', () => {
  assert.equal(presentState(reconcilePosition({ ticker: 'X', qty: 5 }, [], {})).label, 'Dados insuficientes para comparar');
  const r = reconcilePosition({ ticker: 'SUZB3', qty: 36 }, FX.incomplete_price, { coverage: COVERAGE.COMPLETE });
  assert.equal(presentState(r).label, 'Dados insuficientes para comparar');
});

test('R4. cobertura completa comprovada e quantidades iguais → "Posição conciliada"', () => {
  const r = reconcilePosition({ ticker: 'SUZB3', qty: 36 }, FX.suzb3_two_buys, { coverage: COVERAGE.COMPLETE });
  assert.equal(presentState(r).label, LABEL.CONCILIADA);
  assert.equal(presentState(r).label, 'Posição conciliada');
});

test('R5. cobertura completa com quantidades diferentes → divergência (sem "conciliada")', () => {
  const r = reconcilePosition({ ticker: 'SUZB3', qty: 21 }, FX.suzb3_two_buys, { coverage: COVERAGE.COMPLETE });
  assert.equal(presentState(r).key, 'DIVERGENCIA');
});
