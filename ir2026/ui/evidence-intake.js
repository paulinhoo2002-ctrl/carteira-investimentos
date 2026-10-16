'use strict';

/**
 * IR2026 evidence intake contract + synthetic source adapters.
 * Fail-closed: October 2026 is never January 2026 opening; missing is never zero.
 */
const EVIDENCE_TYPES = Object.freeze([
  'YEAR_END_POSITION', 'COST_BASIS_REPORT', 'ANNUAL_BROKER_REPORT',
  'TAX_REPORT', 'LOSS_CARRYFORWARD_REPORT', 'WITHHOLDING_REPORT',
  'BROKERAGE_NOTE', 'CORPORATE_ACTION_REPORT', 'TRANSFER_EVIDENCE',
]);

const EVIDENCE_SCHEMA = Object.freeze({
  EVIDENCE_ID: 'string (unique)',
  SOURCE_TYPE: EVIDENCE_TYPES,
  SOURCE_NAME: 'string',
  AS_OF: 'YYYY-MM-DD',
  PERIOD_START: 'YYYY-MM-DD',
  PERIOD_END: 'YYYY-MM-DD',
  SHA256: 'hex64',
  AUTHORITY_LEVEL: 'OFFICIAL | BROKER_EXPORT | DERIVED | UNKNOWN_LINEAGE',
  FIELDS_AVAILABLE: 'string[]',
  FISCAL_PURPOSE: 'OPENING_2026 | COST_BASIS | REALIZED_RESULT | INCOME | WITHHOLDING | LOSS_CARRYFORWARD | CORPORATE_ACTION | TRANSFER',
  PRIVACY_CLASS: 'PRIVATE_LOCAL_ONLY',
  IMPORT_STATUS: 'PENDING_REVIEW | ACCEPTED_OPENING | ACCEPTED_CROSSCHECK | REJECTED_DATE_MISMATCH | REJECTED_INSUFFICIENT',
});

/** Fail-closed import rules (P14). Each returns a rejection reason or null (pass). */
const IMPORT_RULES = Object.freeze([
  { id: 'NO_BACK_PROJECTION',
    check: (evidence) => evidence.AS_OF > '2026-01-31' && evidence.FISCAL_PURPOSE === 'OPENING_2026'
      ? 'October 2026 data cannot serve as January 2026 opening' : null },
  { id: 'MISSING_COST_NOT_ZERO',
    check: (evidence) => evidence.FIELDS_AVAILABLE && !evidence.FIELDS_AVAILABLE.includes('cost') &&
      evidence.FISCAL_PURPOSE === 'COST_BASIS'
      ? 'Missing cost field cannot default to zero' : null },
  { id: 'MISSING_LOSS_NOT_ZERO',
    check: (evidence) => evidence.SOURCE_TYPE === 'LOSS_CARRYFORWARD_REPORT' &&
      !evidence.FIELDS_AVAILABLE?.includes('loss_balance')
      ? 'Missing loss balance cannot default to zero' : null },
  { id: 'MISSING_IRRF_NOT_ZERO',
    check: (evidence) => evidence.SOURCE_TYPE === 'WITHHOLDING_REPORT' &&
      !evidence.FIELDS_AVAILABLE?.includes('irrf_amount')
      ? 'Missing IRRF cannot default to zero' : null },
  { id: 'MISSING_FEES_NOT_ZERO',
    check: (evidence) => evidence.SOURCE_TYPE === 'BROKERAGE_NOTE' &&
      !evidence.FIELDS_AVAILABLE?.includes('fee_amount')
      ? 'Missing fees cannot default to zero' : null },
  { id: 'NO_AUTO_CERTIFICATION',
    check: (evidence) => evidence.AUTHORITY_LEVEL === 'UNKNOWN_LINEAGE'
      ? 'Unknown lineage evidence cannot be auto-certified' : null },
]);

/** Validate evidence against all fail-closed rules. Returns { accepted, rejections }. */
function validateEvidence(evidence) {
  if (!evidence || !evidence.SOURCE_TYPE || !EVIDENCE_TYPES.includes(evidence.SOURCE_TYPE)) {
    return { accepted: false, rejections: ['INVALID_SOURCE_TYPE'] };
  }
  if (!evidence.AS_OF || !/^\d{4}-\d{2}-\d{2}$/.test(evidence.AS_OF)) {
    return { accepted: false, rejections: ['INVALID_AS_OF_DATE'] };
  }
  const rejections = [];
  for (const rule of IMPORT_RULES) {
    const reason = rule.check(evidence);
    if (reason) rejections.push(`${rule.id}: ${reason}`);
  }
  return { accepted: rejections.length === 0, rejections };
}

/** Synthetic adapter interface for future real adapters. */
function createSyntheticAdapter(evidenceType) {
  if (!EVIDENCE_TYPES.includes(evidenceType)) throw new TypeError(`unknown evidence type: ${evidenceType}`);
  return Object.freeze({
    TYPE: evidenceType,
    IS_SYNTHETIC: true,
    /** Real adapters will parse actual documents; synthetic returns fixture shape only. */
    async parse(bytes) {
      if (!bytes || bytes.length === 0) throw new Error('empty document');
      return { EVIDENCE_ID: `synthetic-${evidenceType}`, SOURCE_TYPE: evidenceType,
        SYNTHETIC_FIXTURE: true, FIELDS_AVAILABLE: [] };
    },
    async validate(parsed) {
      if (!parsed || parsed.SYNTHETIC_FIXTURE !== true) throw new Error('not a synthetic fixture');
      return validateEvidence(parsed);
    },
  });
}

module.exports = { EVIDENCE_TYPES, EVIDENCE_SCHEMA, IMPORT_RULES, validateEvidence, createSyntheticAdapter };
