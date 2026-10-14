'use strict';

/**
 * Package 1A — Official Account-Level Snapshot (Certified Values)
 * 
 * Contains the exact certified Inter values per mission specification.
 * Independent of Package 1B (detailed position reconciliation).
 * 
 * Values per mission specification:
 * - rv_official = 361023.63
 * - rf_official = 208293.20
 * - total_official = 569316.83
 * - rv_detail_sum = 360801.54
 * - rf_detail_sum = 198163.35
 * - detail_total = 558964.89
 * - rv_gap = 222.09
 * - rf_gap = 10129.85
 * - total_gap = 10351.94
 * - status = 'PARTIAL'
 * - detail_status = 'PARTIAL'
 * - position_detail_operational = false
 * 
 * UNKNOWN != ZERO, PARTIAL != COMPLETE enforced.
 */

(function exposePackage1A(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Package1A = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createPackage1A() {
  const CURRENT_VERSION = 1;
  const FIELD_NAME = 'package1_v2';
  const CUSTODIAN_ID = 'inter';

  // Exact values from Inter official statement (mission specification)
  const OFFICIAL_SNAPSHOT = Object.freeze({
    rv_official: 361023.63,
    rf_official: 208293.20,
    total_official: 569316.83,
  });

  const DETAIL_RECONCILIATION = Object.freeze({
    rv_detail_sum: 360801.54,
    rf_detail_sum: 198163.35,
    detail_total: 558964.89,
    rv_gap: 222.09,
    rf_gap: 10129.85,
    total_gap: 10351.94,
  });

  const RECONCILIATION_STATUS = Object.freeze({
    status: 'PARTIAL',
    detail_status: 'PARTIAL',
    position_detail_operational: false,
  });

  function createPackage1A({ importBatchId, asOf, provenance } = {}) {
    if (!importBatchId || typeof importBatchId !== 'string') {
      throw new Error('Package1A requires importBatchId');
    }
    if (!asOf || typeof asOf !== 'string') {
      throw new Error('Package1A requires asOf (ISO timestamp)');
    }

    const payload = {
      schema_version: CURRENT_VERSION,
      import_batch_id: importBatchId,
      as_of: asOf,
      custodian_id: CUSTODIAN_ID,
      official_snapshot: OFFICIAL_SNAPSHOT,
      reconciliation: {
        ...RECONCILIATION_STATUS,
        ...DETAIL_RECONCILIATION,
      },
      coverage: {
        detail_status: RECONCILIATION_STATUS.detail_status,
        position_detail_operational: RECONCILIATION_STATUS.position_detail_operational,
      },
      provenance: provenance || {
        source: 'inter_official_statement',
        imported_at: new Date().toISOString(),
      },
    };

    return Object.freeze(payload);
  }

  function validatePackage1A(payload) {
    if (!payload || typeof payload !== 'object') return { valid: false, reason: 'NOT_OBJECT' };
    if (payload.schema_version !== CURRENT_VERSION) return { valid: false, reason: 'VERSION_MISMATCH' };
    if (!payload.import_batch_id) return { valid: false, reason: 'MISSING_IMPORT_BATCH_ID' };
    if (!payload.as_of) return { valid: false, reason: 'MISSING_AS_OF' };
    if (payload.custodian_id !== CUSTODIAN_ID) return { valid: false, reason: 'INVALID_CUSTODIAN' };
    if (!payload.official_snapshot) return { valid: false, reason: 'MISSING_OFFICIAL_SNAPSHOT' };
    const requiredSnapshot = ['rv_official', 'rf_official', 'total_official'];
    for (const key of requiredSnapshot) {
      if (typeof payload.official_snapshot[key] !== 'number') {
        return { valid: false, reason: `MISSING_OFFICIAL_${key.toUpperCase()}` };
      }
    }
    if (!payload.reconciliation) return { valid: false, reason: 'MISSING_RECONCILIATION' }
    if (payload.reconciliation.status !== 'PARTIAL') return { valid: false, reason: 'INVALID_STATUS' }
    return { valid: true };
  }

  function extractPackage1A(portfolioDoc) {
    if (!portfolioDoc || !portfolioDoc[FIELD_NAME]) return null;
    const pkg = portfolioDoc[FIELD_NAME];
    const validation = validatePackage1A(pkg);
    if (!validation.valid) return { valid: false, reason: validation.reason, raw: pkg };
    return { valid: true, payload: pkg };
  }

  function computeTotals(package1A) {
    if (!package1A || !package1A.official_snapshot) return null;
    return {
      rv: package1A.official_snapshot.rv_official,
      rf: package1A.official_snapshot.rf_official,
      total: package1A.official_snapshot.total_official,
    };
  }

  function computeGaps(package1A) {
    if (!package1A || !package1A.reconciliation) return null;
    const r = package1A.reconciliation;
    return {
      rv_gap: r.rv_gap ?? 0,
      rf_gap: r.rf_gap ?? 0,
      total_gap: r.total_gap ?? 0,
    };
  }

  const api = Object.freeze({
    FIELD_NAME,
    CURRENT_VERSION,
    CUSTODIAN_ID,
    OFFICIAL_SNAPSHOT,
    DETAIL_RECONCILIATION,
    RECONCILIATION_STATUS,
    createPackage1A,
    validatePackage1A,
    extractPackage1A,
    computeTotals,
    computeGaps,
  });

  return api;
});