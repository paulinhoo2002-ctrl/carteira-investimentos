'use strict';
// ============================================================================
// IR2026 — P18/P21: fiscal blocker taxonomy. Stable machine-readable codes
// with metadata for checklist generation (P20). Never invented data: each
// code says exactly what is missing and which external evidence resolves it.
//
// P21 contract: EVERY code emitted by the engine via blockers.push('X')
// must exist here (or in INFO_FLAGS for provenance notes) — enforced by
// tests/ir2026-matrix-blockers-coverage.test.js (emitter scan).
//
// SEVERITY: CRITICAL | HIGH | MEDIUM | LOW
// AFFECTS:  what the blocker blocks (TAX_CALCULATION, TAX_ASSESSMENT,
//           OPENING, FISCAL_COST, SALE_RESULT, WITHHOLDING, LOSS_LEDGER,
//           CLASSIFICATION).
// ============================================================================

const BLOCKERS = Object.freeze({
  // --- Missing fiscal evidence (human must supply a document) -------------
  MISSING_OPENING_COST: {
    TITLE: 'Custo fiscal de abertura ausente',
    RESOLVED_BY: ['YEAR_END_POSITION', 'COST_BASIS_REPORT', 'ANNUAL_BROKER_REPORT'],
    SEVERITY: 'CRITICAL', AFFECTS: ['SALE_RESULT', 'TAX_CALCULATION'],
  },
  MISSING_OPENING_QTY: {
    TITLE: 'Quantidade de abertura ausente',
    RESOLVED_BY: ['YEAR_END_POSITION', 'ANNUAL_BROKER_REPORT'],
    SEVERITY: 'CRITICAL', AFFECTS: ['OPENING', 'TAX_CALCULATION'],
  },
  MISSING_OPENING_EVIDENCE: {
    TITLE: 'Evidência de abertura não fornecida',
    RESOLVED_BY: ['YEAR_END_POSITION', 'COST_BASIS_REPORT'],
    SEVERITY: 'CRITICAL', AFFECTS: ['OPENING'],
  },
  MISSING_SALE_AMOUNT: {
    TITLE: 'Valor de venda ausente no export',
    RESOLVED_BY: ['BROKERAGE_NOTE', 'TAX_REPORT'],
    SEVERITY: 'HIGH', AFFECTS: ['SALE_RESULT', 'TAX_CALCULATION'],
  },
  MISSING_FEES: {
    TITLE: 'Taxas por operação não itemizadas',
    RESOLVED_BY: ['BROKERAGE_NOTE', 'FEES_STATEMENT'],
    SEVERITY: 'MEDIUM', AFFECTS: ['SALE_RESULT'],
  },
  MISSING_IRRF: {
    TITLE: 'IRRF não evidenciado',
    RESOLVED_BY: ['WITHHOLDING_REPORT', 'TAX_REPORT'],
    SEVERITY: 'HIGH', AFFECTS: ['WITHHOLDING', 'TAX_CALCULATION'],
  },
  MISSING_PRIOR_LOSS: {
    TITLE: 'Prejuízo acumulado anterior não evidenciado',
    RESOLVED_BY: ['LOSS_CARRYFORWARD_REPORT', 'ANNUAL_BROKER_REPORT'],
    SEVERITY: 'HIGH', AFFECTS: ['LOSS_LEDGER', 'TAX_CALCULATION'],
  },
  CORPORATE_ACTION_UNRESOLVED: {
    TITLE: 'Evento societário anterior sem resolução fiscal documentada',
    RESOLVED_BY: ['CORPORATE_ACTION_REPORT'],
    SEVERITY: 'HIGH', AFFECTS: ['FISCAL_COST', 'SALE_RESULT'],
  },
  TRANSFER_COST_UNKNOWN: {
    TITLE: 'Transferência sem continuidade de custo documentada',
    RESOLVED_BY: ['TRANSFER_EVIDENCE'],
    SEVERITY: 'HIGH', AFFECTS: ['FISCAL_COST'],
  },
  ASSET_CLASS_UNKNOWN: {
    TITLE: 'Classe fiscal do ativo desconhecida',
    RESOLVED_BY: ['YEAR_END_POSITION', 'ANNUAL_BROKER_REPORT'],
    SEVERITY: 'HIGH', AFFECTS: ['CLASSIFICATION', 'TAX_CALCULATION'],
  },
  SOURCE_CONFLICT: {
    TITLE: 'Conflito entre fontes de evidência',
    RESOLVED_BY: ['HUMAN_REVIEW'],
    SEVERITY: 'HIGH', AFFECTS: ['OPENING', 'FISCAL_COST'],
  },
  SOURCE_DATE_MISMATCH: {
    TITLE: 'Data da evidência não corresponde ao período fiscal',
    RESOLVED_BY: ['HUMAN_REVIEW'],
    SEVERITY: 'HIGH', AFFECTS: ['OPENING'],
  },
  LENDING_CUSTODY_UNPRICED: {
    TITLE: 'Movimentação de custódia/empréstimo sem valor no export (não é venda econômica comprovada)',
    RESOLVED_BY: ['BROKERAGE_NOTE', 'HUMAN_REVIEW'],
    SEVERITY: 'HIGH', AFFECTS: ['SALE_RESULT'],
  },
  PRE_COVERAGE_HOLDING: {
    TITLE: 'Posição anterior à cobertura do export (2019-11)',
    RESOLVED_BY: ['YEAR_END_POSITION', 'ANNUAL_BROKER_REPORT'],
    SEVERITY: 'HIGH', AFFECTS: ['OPENING', 'FISCAL_COST'],
  },
  // --- Opening reconstruction blockers (engine-emitted) --------------------
  OPENING_QUANTITY_UNKNOWN: {
    TITLE: 'Quantidade de abertura desconhecida após reconstrução',
    RESOLVED_BY: ['YEAR_END_POSITION', 'ANNUAL_BROKER_REPORT'],
    SEVERITY: 'CRITICAL', AFFECTS: ['OPENING', 'TAX_CALCULATION'],
  },
  ANCHOR_QTY_MISMATCH: {
    TITLE: 'Quantidade reconstruída diverge da âncora oficial de posição',
    RESOLVED_BY: ['HUMAN_REVIEW', 'YEAR_END_POSITION'],
    SEVERITY: 'HIGH', AFFECTS: ['OPENING'],
  },
  TRANSFER_WITHOUT_CARRIED_COST: {
    TITLE: 'Transferência prévia sem custo carregado documentado',
    RESOLVED_BY: ['TRANSFER_EVIDENCE'],
    SEVERITY: 'HIGH', AFFECTS: ['FISCAL_COST'],
  },
  UNKNOWN_PRE_YEAR_EVENTS: {
    TITLE: 'Eventos anteriores a 2026 com tipo desconhecido no histórico',
    RESOLVED_BY: ['ANNUAL_BROKER_REPORT', 'HUMAN_REVIEW'],
    SEVERITY: 'MEDIUM', AFFECTS: ['OPENING', 'FISCAL_COST'],
  },
  TRANSFER_PRE_YEAR: {
    TITLE: 'Transferência anterior a 2026 presente no histórico',
    RESOLVED_BY: ['TRANSFER_EVIDENCE', 'ANNUAL_BROKER_REPORT'],
    SEVERITY: 'MEDIUM', AFFECTS: ['OPENING', 'FISCAL_COST'],
  },
  CORPORATE_PARTIAL_PRE_YEAR: {
    TITLE: 'Evento societário parcial anterior a 2026 (sem ratio completo)',
    RESOLVED_BY: ['CORPORATE_ACTION_REPORT'],
    SEVERITY: 'MEDIUM', AFFECTS: ['OPENING', 'FISCAL_COST'],
  },
  PRE_2026_CORPORATE_ACTION_EVIDENCE: {
    TITLE: 'Evento societário pré-2026 exige evidência dedicada de custo',
    RESOLVED_BY: ['CORPORATE_ACTION_REPORT'],
    SEVERITY: 'HIGH', AFFECTS: ['FISCAL_COST'],
  },
  PRE_2026_TRANSFER_COST_CHAIN: {
    TITLE: 'Cadeia de custo de transferência pré-2026 incompleta',
    RESOLVED_BY: ['TRANSFER_EVIDENCE'],
    SEVERITY: 'HIGH', AFFECTS: ['FISCAL_COST'],
  },
  // --- Monthly assessment input validation (fiscal-product) ----------------
  RULE_DATE_MISSING: {
    TITLE: 'Data de referência da apuração ausente ou inválida',
    RESOLVED_BY: ['HUMAN_REVIEW'],
    SEVERITY: 'HIGH', AFFECTS: ['TAX_ASSESSMENT'],
  },
  INVALID_TAXABLE_BASE: {
    TITLE: 'Base tributável inválida (não inteiro positivo em cents)',
    RESOLVED_BY: ['HUMAN_REVIEW'],
    SEVERITY: 'HIGH', AFFECTS: ['TAX_ASSESSMENT'],
  },
  INVALID_GROSS_AMOUNT: {
    TITLE: 'Valor bruto mensal inválido (não inteiro positivo em cents)',
    RESOLVED_BY: ['HUMAN_REVIEW'],
    SEVERITY: 'HIGH', AFFECTS: ['TAX_ASSESSMENT'],
  },
  // --- P19: subscription rights (engine-emitted) ---------------------------
  RIGHTS_FISCAL_TREATMENT_PENDING: {
    TITLE: 'Posicao de direitos de subscricao pendente de tratamento fiscal dedicado',
    RESOLVED_BY: ['CORPORATE_ACTION_REPORT', 'HUMAN_REVIEW'],
    SEVERITY: 'HIGH', AFFECTS: ['FISCAL_COST', 'TAX_CALCULATION'],
  },

  // --- Rule-authority blockers (registry gate) -----------------------------
  SWING_RULES_UNVERIFIED: {
    TITLE: 'Regras de operações comuns não verificadas em fonte oficial',
    RESOLVED_BY: ['OFFICIAL_SOURCE_VERIFICATION'],
    SEVERITY: 'CRITICAL', AFFECTS: ['TAX_CALCULATION'],
  },
  DAY_TRADE_RULE_UNVERIFIED: {
    TITLE: 'Regra de day trade não verificada em fonte oficial',
    RESOLVED_BY: ['OFFICIAL_SOURCE_VERIFICATION'],
    SEVERITY: 'CRITICAL', AFFECTS: ['TAX_CALCULATION'],
  },
  FII_RULE_UNVERIFIED: {
    TITLE: 'Regra de FII não verificada em fonte oficial',
    RESOLVED_BY: ['OFFICIAL_SOURCE_VERIFICATION'],
    SEVERITY: 'CRITICAL', AFFECTS: ['TAX_CALCULATION'],
  },
  MIXED_ETF_BDR_REGIME_UNVERIFIED: {
    TITLE: 'Regime fiscal de ETF/BDR não verificado em fonte oficial',
    RESOLVED_BY: ['OFFICIAL_SOURCE_VERIFICATION'],
    SEVERITY: 'CRITICAL', AFFECTS: ['TAX_CALCULATION'],
  },
  BUCKET_UNKNOWN: {
    TITLE: 'Categoria fiscal desconhecida para a apuração',
    RESOLVED_BY: ['YEAR_END_POSITION', 'ANNUAL_BROKER_REPORT'],
    SEVERITY: 'HIGH', AFFECTS: ['CLASSIFICATION', 'TAX_CALCULATION'],
  },
});

// Provenance/informational markers the engine pushes into blockers arrays.
// They describe HOW a value was derived, not missing evidence: they must NOT
// appear in the human document checklist (checklistFromBlockers skips them
// by construction because they are not in BLOCKERS).
const INFO_FLAGS = Object.freeze({
  QTY_DERIVED_FROM_OFFICIAL_ANCHOR: 'Quantidade derivada de âncora oficial (derivação, não evidência faltante)',
  RF_PRINCIPAL_TRACKED_PER_INSTRUMENT: 'Principal RF rastreado por instrumento (nota de modelagem, não bloqueio)',
});

function isBlockerCode(code) {
  return Object.prototype.hasOwnProperty.call(BLOCKERS, code);
}

function isInfoFlag(code) {
  return Object.prototype.hasOwnProperty.call(INFO_FLAGS, code);
}

/** Human checklist entries (P20) generated from blocker codes with counts. */
function checklistFromBlockers(codeCounts) {
  const merged = new Map();
  for (const [code, count] of Object.entries(codeCounts || {})) {
    if (!isBlockerCode(code)) continue; // unknown/info codes stay machine-visible elsewhere
    const meta = BLOCKERS[code];
    const key = meta.TITLE;
    const entry = merged.get(key) || { CODE: code, TITLE: meta.TITLE, TOTAL_AFFECTED: 0, RESOLVED_BY: [...meta.RESOLVED_BY] };
    entry.TOTAL_AFFECTED += count;
    merged.set(key, entry);
  }
  return [...merged.values()].sort((a, b) => b.TOTAL_AFFECTED - a.TOTAL_AFFECTED);
}

module.exports = { BLOCKERS, INFO_FLAGS, isBlockerCode, isInfoFlag, checklistFromBlockers };
