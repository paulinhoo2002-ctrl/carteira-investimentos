'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  READINESS_SNAPSHOT, STATUS_LABEL, buildReadinessContract, renderReadinessPanel,
  taxDueLabel, buildSummaryCards, buildBlockers, buildEvidenceChecklist,
  buildPriorityActions, buildSaleCoverage, buildOpeningCoverage, buildRulesStatus,
} = require('../ir2026/ui/readiness');
const {
  EVIDENCE_TYPES, EVIDENCE_SCHEMA, IMPORT_RULES, validateEvidence, createSyntheticAdapter,
} = require('../ir2026/ui/evidence-intake');

// P1: Top-level status must say BLOQUEADA, not imply calculable tax
test('P1: top-level status is BLOQUEADA with honest explanation', () => {
  const c = buildReadinessContract();
  assert.equal(c.topLevelStatus, 'BLOQUEADA');
  assert.ok(c.topLevelExplanation.includes('insuficientes'));
});

// P1: tax due must NEVER display R$ 0,00
test('P1/P9: tax due displays "Não calculado", never R$ 0,00', () => {
  const label = taxDueLabel();
  assert.equal(label, 'Não calculado');
  assert.ok(!label.includes('R$'));
  assert.ok(!label.includes('0,00'));
  const html = renderReadinessPanel(buildReadinessContract(), String);
  assert.ok(html.includes('Não calculado'));
  assert.ok(!html.includes('R$ 0,00'));
});

// P3: summary cards match the real fiscal state
test('P3: summary cards carry real fiscal statuses', () => {
  const cards = buildSummaryCards();
  const byId = Object.fromEntries(cards.map(c => [c.id, c]));
  assert.equal(byId.engine.status, 'READY');
  assert.equal(byId.dryrun.status, 'READY');
  assert.equal(byId.opening.status, 'BLOCKED');
  assert.equal(byId.results.status, 'BLOCKED');
  assert.equal(byId.rules.status, 'PARTIAL');
  assert.equal(byId.taxdue.status, 'BLOCKED');
  assert.equal(byId.taxdue.detail, 'Não calculado');
});

// P3: no misleading green success for blocked sections
test('P3: blocked sections never get ok/green tone', () => {
  const cards = buildSummaryCards();
  const blocked = cards.filter(c => c.status === 'BLOCKED');
  assert.ok(blocked.length >= 2);
  for (const card of blocked) {
    const html = renderReadinessPanel(buildReadinessContract(), String);
    assert.ok(!html.includes(`class="irpf-summary-card ds-kpi ok">${card.label}`),
      `blocked card ${card.label} must not have ok tone`);
  }
});

// P4: blockers list is present and specific
test('P4: blockers explain why tax is blocked', () => {
  const blockers = buildBlockers();
  assert.ok(blockers.length >= 5);
  assert.ok(blockers.some(b => b.includes('31/12/2025')));
  assert.ok(blockers.some(b => b.includes('61')));
  assert.ok(blockers.some(b => b.toLowerCase().includes('prejuízos')));
});

// P5: evidence checklist has the right items
test('P5: evidence checklist has 8 items with correct statuses', () => {
  const checklist = buildEvidenceChecklist();
  assert.equal(checklist.length, 8);
  assert.ok(checklist.every(item => item.status === 'MISSING'));
  assert.ok(checklist.some(item => item.label.includes('31/12/2025')));
  assert.ok(checklist.some(item => item.label.includes('IRRF')));
});

// P6: priority actions highlight highest-value next step
test('P6: first priority is 31/12/2025 position/cost', () => {
  const priorities = buildPriorityActions();
  assert.equal(priorities[0].rank, 1);
  assert.ok(priorities[0].action.includes('31/12/2025'));
  assert.equal(priorities[0].status, 'CRITICAL');
  assert.ok(priorities[1].action.includes('taxas') || priorities[1].action.includes('corretagem'));
});

// P7: sale coverage shows aggregate only
test('P7: sale coverage is 61 analyzed, 0 certified, 61 blocked', () => {
  const sc = buildSaleCoverage();
  assert.equal(sc.analyzed, 61);
  assert.equal(sc.certified, 0);
  assert.equal(sc.blocked, 61);
});

// P8: opening coverage separates qty from cost
test('P8: opening coverage shows qty and cost separately', () => {
  const oc = buildOpeningCoverage();
  assert.equal(oc.qty.certified, 0);
  assert.equal(oc.qty.partial, 44);
  assert.equal(oc.qty.unknown, 235);
  assert.equal(oc.cost.certified, 0);
  assert.equal(oc.cost.unknown, 279);
  // qty known does NOT imply cost known
  assert.ok(oc.qty.partial > 0);
  assert.equal(oc.cost.partial, 0);
  assert.equal(oc.cost.unknown, 279);
});

// P9: UNKNOWN never renders as zero
test('P9: UNKNOWN never equals zero in any coverage display', () => {
  const contract = buildReadinessContract();
  const html = renderReadinessPanel(contract, String);
  assert.ok(!html.includes('R$ 0,00'));
  assert.ok(!html.includes('Sem prejuízo'));
  assert.ok(!html.includes('Sem imposto'));
  // "Não calculado" or "Desconhecido" must appear
  assert.ok(html.includes('Não calculado'));
});

// P10: rules status shows the correct counts
test('P10: rules status shows 26 total, 0 certified, 19 partial, 7 needs source', () => {
  const rs = buildRulesStatus();
  assert.equal(rs.total, 26);
  assert.equal(rs.certified, 0);
  assert.equal(rs.partialLegalEvidence, 19);
  assert.equal(rs.needsMoreSource, 7);
  assert.equal(rs.label, 'Validação tributária em andamento');
});

// P10: partial evidence is never labeled "certified"
test('P10: partial evidence not shown as certified', () => {
  const rs = buildRulesStatus();
  assert.ok(rs.certified < rs.total);
  assert.ok(rs.partialLegalEvidence > 0);
  assert.ok(rs.certified === 0); // 0 certified, not 19
});

// P2: user-facing status labels use Portuguese
test('P2: status labels are Portuguese user-facing', () => {
  assert.equal(STATUS_LABEL.READY, 'Pronto');
  assert.equal(STATUS_LABEL.PARTIAL, 'Parcial');
  assert.equal(STATUS_LABEL.BLOCKED, 'Bloqueado');
  assert.equal(STATUS_LABEL.UNKNOWN, 'Desconhecido');
  assert.equal(STATUS_LABEL.NOT_APPLICABLE, 'Não aplicável');
});

// P2: no Package1/Package2 naming exposed to user
test('P2: no internal Package naming in UI', () => {
  const html = renderReadinessPanel(buildReadinessContract(), String);
  assert.ok(!html.includes('Package1'));
  assert.ok(!html.includes('Package2'));
  assert.ok(!html.includes('package1_v2'));
  assert.ok(!html.includes('package2_v2'));
});

// P12: evidence schema covers all required fields
test('P12: evidence schema has all required fields', () => {
  const fields = Object.keys(EVIDENCE_SCHEMA);
  assert.ok(fields.includes('EVIDENCE_ID'));
  assert.ok(fields.includes('SHA256'));
  assert.ok(fields.includes('AUTHORITY_LEVEL'));
  assert.ok(fields.includes('FISCAL_PURPOSE'));
  assert.ok(fields.includes('PRIVACY_CLASS'));
  assert.ok(fields.includes('IMPORT_STATUS'));
});

// P13: all 9 evidence types have synthetic adapters
test('P13: synthetic adapters exist for all 9 evidence types', async () => {
  assert.equal(EVIDENCE_TYPES.length, 9);
  for (const type of EVIDENCE_TYPES) {
    const adapter = createSyntheticAdapter(type);
    assert.equal(adapter.TYPE, type);
    assert.equal(adapter.IS_SYNTHETIC, true);
    const parsed = await adapter.parse(Buffer.from('fixture'));
    assert.ok(parsed.SYNTHETIC_FIXTURE);
    const result = await adapter.validate(parsed);
    assert.ok(typeof result.accepted === 'boolean');
  }
});

// P14: fail-closed — October 2026 is never January 2026 opening
test('P14: October 2026 data rejected as 2026 opening evidence', () => {
  const result = validateEvidence({
    SOURCE_TYPE: 'YEAR_END_POSITION', AS_OF: '2026-10-14',
    FISCAL_PURPOSE: 'OPENING_2026', AUTHORITY_LEVEL: 'OFFICIAL',
  });
  assert.equal(result.accepted, false);
  assert.ok(result.rejections.some(r => r.includes('NO_BACK_PROJECTION')));
});

// P14: fail-closed — missing cost cannot default to zero
test('P14: missing cost field rejected for COST_BASIS purpose', () => {
  const result = validateEvidence({
    SOURCE_TYPE: 'COST_BASIS_REPORT', AS_OF: '2025-12-31',
    FISCAL_PURPOSE: 'COST_BASIS', AUTHORITY_LEVEL: 'OFFICIAL',
    FIELDS_AVAILABLE: ['ticker', 'quantity'],
  });
  assert.equal(result.accepted, false);
  assert.ok(result.rejections.some(r => r.includes('MISSING_COST_NOT_ZERO')));
});

// P14: fail-closed — unknown lineage is never auto-certified
test('P14: unknown lineage evidence rejected', () => {
  const result = validateEvidence({
    SOURCE_TYPE: 'TAX_REPORT', AS_OF: '2025-12-31',
    AUTHORITY_LEVEL: 'UNKNOWN_LINEAGE', FISCAL_PURPOSE: 'INCOME',
  });
  assert.equal(result.accepted, false);
  assert.ok(result.rejections.some(r => r.includes('NO_AUTO_CERTIFICATION')));
});

// P14: valid evidence passes
test('P14: genuine 2025 year-end position passes validation', () => {
  const result = validateEvidence({
    SOURCE_TYPE: 'YEAR_END_POSITION', AS_OF: '2025-12-31',
    FISCAL_PURPOSE: 'OPENING_2026', AUTHORITY_LEVEL: 'OFFICIAL',
    FIELDS_AVAILABLE: ['ticker', 'quantity', 'cost'],
  });
  assert.equal(result.accepted, true);
  assert.equal(result.rejections.length, 0);
});

// P17: privacy — rendered HTML contains no per-asset data
test('P17: rendered panel has no per-asset ticker or quantity', () => {
  const html = renderReadinessPanel(buildReadinessContract(), String);
  const tickers = ['BBAS3','BRCO11','BTLG11','CMIG4','FATN11','GARE11','GGRC11','HGLG11',
    'HGRU11','IRIM11','ITUB4','KNHF11','KNRI11','KNUQ11','MCCI11','PETR4','PMLL11',
    'PVBI11','RBRY11','SAPR11','SUZB3','TEPP11','TGAR11','TRXF11','VALE3','VGHF11',
    'VGIP11','VISC11','VRTA11','XPLG11','XPML11','DIVD11'];
  for (const t of tickers) {
    assert.ok(!html.includes(t), `ticker ${t} must not appear in summary UI`);
  }
});

// P17: privacy — no individual amounts
test('P17: no individual financial amounts in rendered panel', () => {
  const html = renderReadinessPanel(buildReadinessContract(), String);
  // No specific financial values from the portfolio should appear
  assert.ok(!html.includes('361023'));
  assert.ok(!html.includes('569316'));
  assert.ok(!html.includes('365993'));
});

// P18: all import rules are present
test('P18: all 6 fail-closed import rules defined', () => {
  assert.equal(IMPORT_RULES.length, 6);
  const ids = IMPORT_RULES.map(r => r.id);
  assert.ok(ids.includes('NO_BACK_PROJECTION'));
  assert.ok(ids.includes('MISSING_COST_NOT_ZERO'));
  assert.ok(ids.includes('MISSING_LOSS_NOT_ZERO'));
  assert.ok(ids.includes('MISSING_IRRF_NOT_ZERO'));
  assert.ok(ids.includes('MISSING_FEES_NOT_ZERO'));
  assert.ok(ids.includes('NO_AUTO_CERTIFICATION'));
});

// P11: monthly close shows tax as not calculated
test('P11: monthly close shows 12 months with tax not calculated', () => {
  const c = buildReadinessContract();
  assert.equal(c.monthlyClose.months, 12);
  assert.equal(c.monthlyClose.taxDuePerMonth, 'Não calculado');
});

// Contract immutability
test('contract is frozen and snapshot matches verified state', () => {
  const c = buildReadinessContract();
  assert.ok(Object.isFrozen(c));
  assert.equal(READINESS_SNAPSHOT.SALES.ANALYZED, 61);
  assert.equal(READINESS_SNAPSHOT.OPENING.QTY_PARTIAL, 44);
  assert.equal(READINESS_SNAPSHOT.OPENING.QTY_UNKNOWN, 235);
  assert.equal(READINESS_SNAPSHOT.RULES.TOTAL, 26);
});
