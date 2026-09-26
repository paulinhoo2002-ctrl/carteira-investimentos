const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPortfolioReportReadiness, reasonLabel } = require('../portfolio-report-readiness.js');

test('sem evidência mantém seções unavailable e métricas sem valores inventados', () => {
  const result = buildPortfolioReportReadiness();
  assert.equal(result.readOnly, true);
  assert.equal(result.dataReady, false);
  assert.equal(result.engineAvailable, false);
  assert.equal(result.sections.history.status, 'UNAVAILABLE');
  assert.equal(result.sections.prices.evidence.coverage, 'UNKNOWN');
  assert.equal(result.sections.income.status, 'UNAVAILABLE');
  assert.equal(result.sections.backup.evidence.lastBackupAt, null);
});

test('engine disponível não libera dados reais sem histórico, carteira e requisitos', () => {
  const result = buildPortfolioReportReadiness({ performance: { engineAvailable: true, dataReady: false, reasonCodes: ['WALLET_ID_UNAVAILABLE'] } });
  assert.equal(result.engineAvailable, true);
  assert.equal(result.dataReady, false);
  assert.equal(result.walletIdAvailable, false);
  assert.ok(result.sections.performance.reasonCodes.includes('WALLET_ID_UNAVAILABLE'));
  assert.equal(result.sections.performance.evidence.twrReady, false);
  assert.equal(result.sections.performance.evidence.xirrReady, false);
});

test('cobertura e frescor são dimensões separadas e ausência de frescor não vira fresh', () => {
  const result = buildPortfolioReportReadiness({ prices: { coverageStatus: 'FULL' } });
  assert.equal(result.sections.prices.evidence.coverage, 'FULL');
  assert.equal(result.sections.prices.evidence.freshness, 'UNKNOWN');
  assert.equal(result.sections.prices.status, 'PARTIAL');
  assert.ok(result.sections.prices.reasonCodes.includes('SOURCE_FRESHNESS_UNKNOWN'));
});

test('cobertura parcial e fonte stale nunca são promovidas a disponível', () => {
  const result = buildPortfolioReportReadiness({ prices: { coverageStatus: 'PARTIAL', freshness: 'STALE', sourceAsOf: '2026-01-01' } });
  assert.equal(result.sections.prices.status, 'PARTIAL');
  assert.ok(result.sections.prices.reasonCodes.includes('PARTIAL_PRICE_COVERAGE'));
  assert.ok(result.sections.prices.reasonCodes.includes('STALE_SOURCE'));
});

test('walletId ausente bloqueia performance mesmo com motor e outros sinais positivos', () => {
  const result = buildPortfolioReportReadiness({
    history: { status: 'AVAILABLE', snapshotCount: 10, spanDays: 400 },
    performance: { engineAvailable: true, dataReady: true, twrReady: true, xirrReady: true },
    cashFlows: { trustedExternalCount: 4, ambiguousCount: 0, unknownCount: 0, provenanceCoverage: 1 },
    prices: { coverageStatus: 'FULL', freshness: 'FRESH' }
  });
  assert.equal(result.engineAvailable, true);
  assert.equal(result.dataReady, false);
  assert.equal(result.sections.performance.status, 'UNAVAILABLE');
  assert.ok(result.sections.performance.reasonCodes.includes('WALLET_ID_UNAVAILABLE'));
});

test('identificadores de carteira ausentes ou divergentes nunca satisfazem readiness', () => {
  const claimedWithoutId = buildPortfolioReportReadiness({
    history: { status: 'AVAILABLE', snapshotCount: 8, spanDays: 400 },
    performance: { engineAvailable: true, dataReady: true, walletIdAvailable: true, twrReady: true, xirrReady: true },
    cashFlows: { trustedExternalCount: 3, ambiguousCount: 0, unknownCount: 0 },
    prices: { coverageStatus: 'FULL', freshness: 'FRESH' },
  });
  assert.equal(claimedWithoutId.dataReady, false);
  assert.ok(claimedWithoutId.sections.performance.reasonCodes.includes('WALLET_ID_UNAVAILABLE'));

  const mismatched = buildPortfolioReportReadiness({
    history: { status: 'AVAILABLE', snapshotCount: 8, spanDays: 400, walletId: 'wallet-history' },
    performance: { engineAvailable: true, dataReady: true, walletId: 'wallet-performance', twrReady: true, xirrReady: true },
    cashFlows: { walletId: 'wallet-flows', trustedExternalCount: 3, ambiguousCount: 0, unknownCount: 0 },
    prices: { coverageStatus: 'FULL', freshness: 'FRESH' },
  });
  assert.equal(mismatched.dataReady, false);
  assert.equal(mismatched.sections.performance.status, 'UNAVAILABLE');
  assert.ok(mismatched.sections.performance.reasonCodes.includes('WALLET_SCOPE_MISMATCH'));
  assert.ok(mismatched.sections.cashFlows.reasonCodes.includes('WALLET_SCOPE_MISMATCH'));

  const incompleteScopeEvidence = buildPortfolioReportReadiness({
    history: { status: 'AVAILABLE', snapshotCount: 8, spanDays: 400 },
    performance: { engineAvailable: true, dataReady: true, walletId: 'wallet-1', twrReady: true, xirrReady: true },
    cashFlows: { trustedExternalCount: 3, ambiguousCount: 0, unknownCount: 0 },
    prices: { coverageStatus: 'FULL', freshness: 'FRESH' },
  });
  assert.equal(incompleteScopeEvidence.dataReady, false);
  assert.ok(incompleteScopeEvidence.sections.performance.reasonCodes.includes('WALLET_ID_UNAVAILABLE'));
});

test('fluxos sem confiança ou com ambiguidade permanecem bloqueados/parciais', () => {
  const untrusted = buildPortfolioReportReadiness({ cashFlows: { trustedExternalCount: 0, ambiguousCount: 3, unknownCount: 1 } });
  assert.equal(untrusted.sections.cashFlows.status, 'UNAVAILABLE');
  assert.ok(untrusted.sections.cashFlows.reasonCodes.includes('NO_TRUSTWORTHY_EXTERNAL_FLOWS'));
  const mixed = buildPortfolioReportReadiness({ performance: { walletId: 'w1' }, cashFlows: { walletId: 'w1', trustedExternalCount: 2, ambiguousCount: 1, unknownCount: 0 } });
  assert.equal(mixed.sections.cashFlows.status, 'PARTIAL');
});

test('import fixture-required e backup sem metadados são descritos sem inferência', () => {
  const result = buildPortfolioReportReadiness({
    imports: { status: 'PARTIAL', providers: [{ provider: 'XP', status: 'FIXTURE_REQUIRED' }, { provider: 'BTG', status: 'FIXTURE_REQUIRED' }] },
    backup: { status: 'UNAVAILABLE' }
  });
  assert.equal(result.sections.imports.status, 'PARTIAL');
  assert.equal(result.sections.imports.evidence.providers[0].status, 'FIXTURE_REQUIRED');
  assert.equal(result.sections.backup.evidence.lastBackupAt, null);
  assert.ok(result.sections.backup.reasonCodes.includes('BACKUP_METADATA_UNAVAILABLE'));
});

test('readiness é determinística, não altera entrada e mapeia códigos estáveis', () => {
  const input = { prices: { coverageStatus: 'UNKNOWN' }, cashFlows: { trustedExternalCount: 0 } };
  const before = structuredClone(input);
  const first = buildPortfolioReportReadiness(input);
  const second = buildPortfolioReportReadiness(input);
  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
  assert.equal(reasonLabel('WALLET_ID_UNAVAILABLE'), 'Os registros não identificam a carteira de origem.');
  assert.match(reasonLabel('NOT_A_CODE'), /evidência disponível/);
});

test('retorno parcial não expõe métrica numérica e seção partial não vira available', () => {
  const result = buildPortfolioReportReadiness({ history: { status: 'PARTIAL', snapshotCount: 1 } });
  assert.equal(result.sections.history.status, 'PARTIAL');
  assert.ok(result.sections.history.reasonCodes.includes('INSUFFICIENT_HISTORY_SPAN'));
  assert.equal(Object.hasOwn(result.sections.performance.evidence, 'value'), false);
});

test('somente evidência completa e wallet-scoped torna readiness disponível', () => {
  const result = buildPortfolioReportReadiness({
    history: { status: 'AVAILABLE', snapshotCount: 8, spanDays: 400, walletId: 'wallet-1' },
    performance: { engineAvailable: true, dataReady: true, walletId: 'wallet-1', twrReady: true, xirrReady: true },
    cashFlows: { walletId: 'wallet-1', trustedExternalCount: 3, ambiguousCount: 0, unknownCount: 0, provenanceCoverage: 1 },
    prices: { coverageStatus: 'FULL', freshness: 'FRESH', source: 'approved-source', sourceAsOf: '2026-09-25' },
  });
  assert.equal(result.dataReady, true);
  assert.equal(result.sections.performance.status, 'AVAILABLE');
  assert.equal(result.sections.prices.status, 'AVAILABLE');
});

test('TWR e XIRR mantêm prontidão separada; uma métrica não promove a outra', () => {
  const result = buildPortfolioReportReadiness({
    history: { status: 'AVAILABLE', snapshotCount: 8, spanDays: 400, walletId: 'wallet-1' },
    performance: { engineAvailable: true, dataReady: true, walletId: 'wallet-1', twrReady: true, xirrReady: false },
    cashFlows: { walletId: 'wallet-1', trustedExternalCount: 3, ambiguousCount: 0, unknownCount: 0, provenanceCoverage: 1 },
    prices: { coverageStatus: 'FULL', freshness: 'FRESH' },
  });
  assert.equal(result.sections.performance.status, 'PARTIAL');
  assert.equal(result.sections.performance.evidence.twrReady, true);
  assert.equal(result.sections.performance.evidence.xirrReady, false);
  assert.equal(result.dataReady, false);
});

test('backup sem resultado real de validação não pode aparecer como disponível', () => {
  const result = buildPortfolioReportReadiness({ backup: { status: 'AVAILABLE' } });
  assert.equal(result.sections.backup.status, 'PARTIAL');
  assert.ok(result.sections.backup.reasonCodes.includes('RESTORE_VALIDATION_UNAVAILABLE'));
  assert.equal(result.sections.backup.evidence.restoreAllowed, null);
});
