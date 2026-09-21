const test = require('node:test');
const assert = require('node:assert/strict');
const Audit = require('../historical-reconstruction-hardening.js');

test('reconcilia compras e vendas com a posição atual sem escrever ou inventar dados', () => {
  const result = Audit.buildHistoricalReconstructionAudit({
    transactions: [
      { id: 'buy-1', date: '2024-01-10', ticker: 'AAA3', operation: 'compra', qty: 10, total: 100, source: 'broker-note' },
      { id: 'sell-1', date: '2024-06-10', ticker: 'AAA3', operation: 'venda', qty: 2, total: 30, source: 'broker-note' }
    ],
    currentPositions: [{ ticker: 'AAA3', quantity: 8 }],
    yearEndYears: [2024]
  });

  assert.equal(result.status, 'FULL');
  assert.equal(result.duplicateEconomicEvents, 0);
  assert.equal(result.positionReconciliation.rows[0].status, 'ALL_MATCH');
  assert.equal(result.annualCoverage[0].status, 'FULL');
  assert.equal(result.writeEnabled, false);
});

test('marca fonte fraca, campos ausentes e divergência como revisão necessária', () => {
  const result = Audit.buildHistoricalReconstructionAudit({
    transactions: [
      { id: 'buy-1', date: '2024-01-10', ticker: 'AAA3', operation: 'compra', qty: 10, total: 100, source: 'historical-reconstruction' },
      { id: 'buy-1-copy', date: '2024-01-10', ticker: 'AAA3', operation: 'compra', qty: 10, total: 100, source: 'import-b3' }
    ],
    currentPositions: [{ ticker: 'AAA3', quantity: 7 }],
    yearEndYears: [2023, 2024]
  });

  assert.equal(result.status, 'NEEDS_REVIEW');
  assert.equal(result.duplicateEconomicEvents, 1);
  assert.equal(result.positionReconciliation.rows[0].status, 'REVIEW_REQUIRED');
  assert.equal(result.annualCoverage.find(row => row.year === 2023).status, 'UNAVAILABLE');
  assert.ok(result.reviewReasons.some(reason => reason.includes('DUPLICATE')));
});

test('não transforma desconhecido em zero e mantém eventos não posicionais explícitos', () => {
  const result = Audit.buildHistoricalReconstructionAudit({
    transactions: [
      { id: 'transfer-1', date: '2024-02-01', ticker: 'BBB3', operation: 'transferência', qty: 5, source: 'movement-reference' },
      { id: 'unknown-1', date: '2024-03-01', operation: 'evento sem catálogo', source: 'UNKNOWN' }
    ],
    currentPositions: []
  });

  assert.equal(result.status, 'NEEDS_REVIEW');
  assert.equal(result.positionReconciliation.rows.length, 0);
  assert.ok(result.reviewReasons.some(reason => reason.includes('UNKNOWN')));
  assert.ok(result.coverage.reviewEvents >= 1);
  assert.equal(result.writeEnabled, false);
});

test('preserva zero legítimo para carteira vazia com histórico conhecido', () => {
  const result = Audit.buildHistoricalReconstructionAudit({
    transactions: [],
    currentPositions: [],
    yearEndYears: [2024]
  });

  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.positionReconciliation.rows.length, 0);
  assert.equal(result.annualCoverage[0].status, 'UNAVAILABLE');
  assert.equal(result.writeEnabled, false);
});
