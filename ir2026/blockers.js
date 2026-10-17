'use strict';
// ============================================================================
// IR2026 — P18: fiscal blocker taxonomy. Stable machine-readable codes with
// metadata for checklist generation (P20). Never invented data: each code
// says exactly what is missing and which external evidence resolves it.
// ============================================================================

const BLOCKERS = Object.freeze({
  MISSING_OPENING_COST: {
    TITLE: 'Custo fiscal de abertura ausente',
    RESOLVED_BY: ['YEAR_END_POSITION', 'COST_BASIS_REPORT', 'ANNUAL_BROKER_REPORT'],
  },
  MISSING_OPENING_QTY: {
    TITLE: 'Quantidade de abertura ausente',
    RESOLVED_BY: ['YEAR_END_POSITION', 'ANNUAL_BROKER_REPORT'],
  },
  MISSING_SALE_AMOUNT: {
    TITLE: 'Valor de venda ausente no export',
    RESOLVED_BY: ['BROKERAGE_NOTE', 'TAX_REPORT'],
  },
  MISSING_FEES: {
    TITLE: 'Taxas por operação não itemizadas',
    RESOLVED_BY: ['BROKERAGE_NOTE', 'FEES_STATEMENT'],
  },
  MISSING_IRRF: {
    TITLE: 'IRRF não evidenciado',
    RESOLVED_BY: ['WITHHOLDING_REPORT', 'TAX_REPORT'],
  },
  MISSING_PRIOR_LOSS: {
    TITLE: 'Prejuízo acumulado anterior não evidenciado',
    RESOLVED_BY: ['LOSS_CARRYFORWARD_REPORT', 'ANNUAL_BROKER_REPORT'],
  },
  CORPORATE_ACTION_UNRESOLVED: {
    TITLE: 'Evento societário anterior sem resolução fiscal documentada',
    RESOLVED_BY: ['CORPORATE_ACTION_REPORT'],
  },
  TRANSFER_COST_UNKNOWN: {
    TITLE: 'Transferência sem continuidade de custo documentada',
    RESOLVED_BY: ['TRANSFER_EVIDENCE'],
  },
  ASSET_CLASS_UNKNOWN: {
    TITLE: 'Classe fiscal do ativo desconhecida',
    RESOLVED_BY: ['YEAR_END_POSITION', 'ANNUAL_BROKER_REPORT'],
  },
  SOURCE_CONFLICT: {
    TITLE: 'Conflito entre fontes de evidência',
    RESOLVED_BY: ['HUMAN_REVIEW'],
  },
  SOURCE_DATE_MISMATCH: {
    TITLE: 'Data da evidência não corresponde ao período fiscal',
    RESOLVED_BY: ['HUMAN_REVIEW'],
  },
  LENDING_CUSTODY_UNPRICED: {
    TITLE: 'Movimentação de custódia/empréstimo sem valor no export (não é venda econômica comprovada)',
    RESOLVED_BY: ['BROKERAGE_NOTE', 'HUMAN_REVIEW'],
  },
  PRE_COVERAGE_HOLDING: {
    TITLE: 'Posição anterior à cobertura do export (2019-11)',
    RESOLVED_BY: ['YEAR_END_POSITION', 'ANNUAL_BROKER_REPORT'],
  },
});

function isBlockerCode(code) {
  return Object.prototype.hasOwnProperty.call(BLOCKERS, code);
}

/** Human checklist entries (P20) generated from blocker codes with counts. */
function checklistFromBlockers(codeCounts) {
  const merged = new Map();
  for (const [code, count] of Object.entries(codeCounts || {})) {
    if (!isBlockerCode(code)) continue; // unknown codes stay machine-visible elsewhere
    const meta = BLOCKERS[code];
    const key = meta.TITLE;
    const entry = merged.get(key) || { CODE: code, TITLE: meta.TITLE, TOTAL_AFFECTED: 0, RESOLVED_BY: [...meta.RESOLVED_BY] };
    entry.TOTAL_AFFECTED += count;
    merged.set(key, entry);
  }
  return [...merged.values()].sort((a, b) => b.TOTAL_AFFECTED - a.TOTAL_AFFECTED);
}

module.exports = { BLOCKERS, isBlockerCode, checklistFromBlockers };
