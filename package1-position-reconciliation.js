'use strict';

const CLASSIFICATIONS = new Set([
  'EXACT_CERTIFIED_MATCH', 'LIKELY_MATCH', 'QUANTITY_CONFLICT', 'V2_ONLY',
  'LEGACY_ONLY', 'LOAN_RELATION_UNKNOWN', 'AMBIGUOUS'
]);

function numericValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function classifyPosition(row) {
  if (!row || typeof row !== 'object' || typeof row.canonical_id !== 'string' || !row.canonical_id.trim()) {
    throw new Error('POSITION_RECONCILIATION_ROW_INVALID');
  }
  const quantityV2 = numericValue(row.quantity_v2);
  const quantityLegacy = numericValue(row.quantity_legacy);
  const hasComparableQuantities = quantityV2 !== null && quantityLegacy !== null;
  const sameQuantity = hasComparableQuantities && quantityV2 === quantityLegacy;
  const isLent = /LENT/i.test(String(row.asset_type || ''));
  if (row.match_status === 'V2_ONLY') return 'V2_ONLY';
  if (row.match_status === 'SAME_ASSET_DIFFERENT_QUANTITY') return isLent ? 'LOAN_RELATION_UNKNOWN' : 'QUANTITY_CONFLICT';
  if (row.match_status === 'EXACT_MATCH' && sameQuantity && row.identity_unique === true &&
      row.as_of_v2 && row.as_of_v2 === row.as_of_legacy && row.value_v2 !== null &&
      row.value_v2 !== undefined && row.value_legacy !== null && row.value_legacy !== undefined &&
      numericValue(row.value_v2) !== null && numericValue(row.value_legacy) !== null &&
      numericValue(row.value_v2) === numericValue(row.value_legacy) && !isLent) return 'EXACT_CERTIFIED_MATCH';
  if (row.match_status === 'AMBIGUOUS' && sameQuantity && row.legacy_location && !isLent) return 'LIKELY_MATCH';
  return 'AMBIGUOUS';
}

function buildPositionReconciliationTable(rows) {
  if (!Array.isArray(rows) || rows.length !== 35) throw new Error('PACKAGE1_POSITION_COUNT_INVALID');
  const ids = new Set();
  const result = rows.map(row => {
    const canonicalId = row?.canonical_id;
    if (typeof canonicalId !== 'string' || !canonicalId.trim() || ids.has(canonicalId)) {
      throw new Error('POSITION_RECONCILIATION_ID_INVALID');
    }
    ids.add(canonicalId);
    const classification = classifyPosition(row);
    const quantityV2 = numericValue(row.quantity_v2);
    const quantityLegacy = numericValue(row.quantity_legacy);
    const valueV2 = numericValue(row.value_v2);
    const valueLegacy = numericValue(row.value_legacy);
    if (!CLASSIFICATIONS.has(classification)) throw new Error('POSITION_CLASSIFICATION_INVALID');
    return {
      canonical_id: canonicalId,
      classification,
      quantity_v2: quantityV2,
      quantity_legacy: quantityLegacy,
      value_v2: valueV2,
      value_legacy: valueLegacy,
      quantity_status: quantityV2 === null || quantityLegacy === null ? 'NOT_COMPARABLE' :
        quantityV2 === quantityLegacy ? 'SAME' : 'DIFFERENT',
      value_status: valueV2 === null || valueLegacy === null ? 'NOT_COMPARABLE' :
        valueV2 === valueLegacy ? 'SAME' : 'DIFFERENT',
      legacy_location: row.legacy_location ?? null,
      cost_status: row.cost_status || 'UNKNOWN',
      result_status: row.result_status || 'UNAVAILABLE'
    };
  });
  return { rows: result, counts: result.reduce((counts, row) => {
    counts[row.classification] = (counts[row.classification] || 0) + 1;
    return counts;
  }, {}) };
}

module.exports = { CLASSIFICATIONS, classifyPosition, buildPositionReconciliationTable };
