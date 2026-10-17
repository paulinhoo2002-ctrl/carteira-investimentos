'use strict';
// ============================================================================
// IR2026 — P2: evidence precedence + deterministic promotion rules.
//
// Levels (mission contract):
//   1 official 31/12/2025 position/tax statement      -> may promote to CERTIFIED
//   2 official broker annual tax report               -> may promote to CERTIFIED
//   3 broker IR/tax export                            -> may promote to CERTIFIED
//   4 B3/custody official statement                   -> may promote to CERTIFIED
//   5 official movement export                        -> DERIVED reconstruction only
//   6 certified derived reconstruction                -> DERIVED
//   7 heuristic inference                             -> never promotes
//
// Stronger evidence is never downgraded by weaker evidence.
// ============================================================================

const PRECEDENCE_LEVELS = Object.freeze({
  OFFICIAL_YEAR_END_STATEMENT: { LEVEL: 1, CAN_CERTIFY: true },
  OFFICIAL_ANNUAL_TAX_REPORT: { LEVEL: 2, CAN_CERTIFY: true },
  BROKER_IR_EXPORT: { LEVEL: 3, CAN_CERTIFY: true },
  B3_CUSTODY_STATEMENT: { LEVEL: 4, CAN_CERTIFY: true },
  OFFICIAL_MOVEMENT_EXPORT: { LEVEL: 5, CAN_CERTIFY: false },
  CERTIFIED_DERIVED_RECONSTRUCTION: { LEVEL: 6, CAN_CERTIFY: false },
  HEURISTIC_INFERENCE: { LEVEL: 7, CAN_CERTIFY: false },
});

const STATUS_STRENGTH = Object.freeze({ UNKNOWN: 0, PARTIAL: 1, DERIVED: 2, CERTIFIED: 3 });

/** Deterministic promotion decision. Never downgrades, never invents. */
function evaluatePromotion({ currentStatus, evidenceLevel, evidencePresent, consistent }) {
  const level = PRECEDENCE_LEVELS[evidenceLevel];
  if (!level) return { PROMOTED: false, NEW_STATUS: currentStatus, REASON: 'UNKNOWN_EVIDENCE_LEVEL' };
  if (evidenceLevel === 'HEURISTIC_INFERENCE') return { PROMOTED: false, NEW_STATUS: currentStatus, REASON: 'HEURISTIC_NEVER_PROMOTES' };
  if (!evidencePresent) return { PROMOTED: false, NEW_STATUS: currentStatus, REASON: 'EVIDENCE_ABSENT' };
  if (consistent === false) return { PROMOTED: false, NEW_STATUS: currentStatus, REASON: 'SOURCE_CONFLICT', BLOCKER: 'SOURCE_CONFLICT' };
  const canCertify = level.CAN_CERTIFY;
  const target = canCertify ? 'CERTIFIED' : (STATUS_STRENGTH[currentStatus] >= STATUS_STRENGTH.DERIVED ? currentStatus : 'DERIVED');
  if (STATUS_STRENGTH[target] <= STATUS_STRENGTH[currentStatus] && target !== currentStatus) {
    return { PROMOTED: false, NEW_STATUS: currentStatus, REASON: 'NO_UPGRADE' };
  }
  if (STATUS_STRENGTH[target] < STATUS_STRENGTH[currentStatus]) {
    return { PROMOTED: false, NEW_STATUS: currentStatus, REASON: 'NEVER_DOWNGRADE' };
  }
  if (target === currentStatus) return { PROMOTED: false, NEW_STATUS: currentStatus, REASON: 'ALREADY_AT_STATUS' };
  return { PROMOTED: true, NEW_STATUS: target, REASON: canCertify ? 'EVIDENCE_LEVEL_CERTIFIES' : 'EVIDENCE_LEVEL_DERIVES' };
}

/** Opening compare (P4): qty + cost vs official evidence -> promotion class. */
function classifyOpeningCompare({ derivedQty, derivedCostCents, evidenceQty, evidenceCostCents, toleranceQty = 1e-6, toleranceCostCents = 1 }) {
  const qtyMatch = derivedQty !== null && evidenceQty !== null && Math.abs(derivedQty - evidenceQty) <= toleranceQty;
  const costMatch = derivedCostCents !== null && evidenceCostCents !== null
    && Math.abs(derivedCostCents - evidenceCostCents) <= toleranceCostCents;
  if (evidenceQty === null && evidenceCostCents === null) return 'UNKNOWN';
  if (qtyMatch && (costMatch || evidenceCostCents === null)) return 'CERTIFIED_EXACT';
  if (evidenceQty !== null && evidenceCostCents !== null) return 'CONFLICT'; // documented, never auto-resolved
  if (evidenceQty !== null) return 'PARTIAL';
  return 'PARTIAL'; // cost-only evidence upgrades cost dimension partially
}

module.exports = { PRECEDENCE_LEVELS, STATUS_STRENGTH, evaluatePromotion, classifyOpeningCompare };
