'use strict';
// SM169 (R5) — alertas de conciliação na tela do IRPF. Extrai do index.html a função real irpfReconciliationAlerts e a
// executa com o módulo PositionReconciliation real. Regra: posição com quantidades iguais e lançamentos completos é
// informativa (tom 'muted'); divergência e dados incompletos continuam sendo aviso ('warn'). Sem alteração financeira.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const repo = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const PR = require(path.join(repo, 'position-reconciliation.js'));

function runAlerts(assets, aportes) {
  const start = html.indexOf('function irpfReconciliationAlerts(){');
  assert.ok(start >= 0, 'função irpfReconciliationAlerts presente');
  const end = html.indexOf('\n}', start) + 2;
  const ctx = {
    window: { PositionReconciliation: PR },
    S: { assets, aportes },
    isNeutralMovement: () => false,
    isRendaFixaAsset: () => false,
  };
  vm.createContext(ctx);
  vm.runInContext(html.slice(start, end), ctx);
  return ctx.irpfReconciliationAlerts();
}

const LANCAMENTO = { id: 'fx-1', date: '2025-01-15', ticker: 'PETR4', qty: 120, price: 28.1, operation: 'compra' };

test('R5: quantidades iguais com lançamentos completos gera alerta informativo (muted), não aviso', () => {
  const items = runAlerts([{ id: 'fx-1', ticker: 'PETR4', qty: 120 }], [LANCAMENTO]);
  assert.equal(items.length, 1, 'uma posição, um item');
  assert.equal(items[0].tone, 'muted', 'não é divergência: deve ser informativo');
  assert.match(items[0].label, /conciliação não comprovada/);
});

test('R5: divergência de quantidade continua sendo aviso (warn)', () => {
  const items = runAlerts([{ id: 'fx-1', ticker: 'PETR4', qty: 999 }], [LANCAMENTO]);
  assert.equal(items.length, 1);
  assert.equal(items[0].tone, 'warn', 'divergência real não pode virar informativo');
});

test('R5: lançamento incompleto continua sendo aviso (warn)', () => {
  const incompleto = { ...LANCAMENTO, price: 0, totalValue: 0 };
  const items = runAlerts([{ id: 'fx-1', ticker: 'PETR4', qty: 120 }], [incompleto]);
  assert.equal(items.length, 1);
  assert.equal(items[0].tone, 'warn', 'dado incompleto não pode virar informativo');
});

test('R5: posição sem lançamentos continua sendo aviso (warn)', () => {
  const items = runAlerts([{ id: 'fx-1', ticker: 'PETR4', qty: 120 }], []);
  assert.equal(items.length, 1);
  assert.equal(items[0].tone, 'warn');
});
