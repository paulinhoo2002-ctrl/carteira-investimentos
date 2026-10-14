'use strict';

const CERTIFIED = 'EXACT_CERTIFIED_MATCH';
const ACCEPTED_CLASSIFICATIONS = new Set([
  CERTIFIED, 'LIKELY_MATCH', 'QUANTITY_CONFLICT', 'V2_ONLY', 'LEGACY_ONLY',
  'LOAN_RELATION_UNKNOWN', 'AMBIGUOUS'
]);

function identityOf(position) {
  const id = typeof position?.canonical_id === 'string' ? position.canonical_id.trim() : '';
  if (!id) throw new Error('POSITION_IDENTITY_MISSING');
  return id;
}

function selectOperationalPositions({ legacyPositions = [], v2Positions = [], reconciliationRows = [] } = {}) {
  if (![legacyPositions, v2Positions, reconciliationRows].every(Array.isArray)) throw new Error('POSITION_SOURCE_INVALID');
  const legacyById = new Map();
  const v2ById = new Map();
  for (const row of reconciliationRows) {
    if (!ACCEPTED_CLASSIFICATIONS.has(row?.classification)) throw new Error('POSITION_CLASSIFICATION_INVALID');
  }
  for (const position of legacyPositions) {
    const id = identityOf(position);
    if (legacyById.has(id)) throw new Error('POSITION_IDENTITY_AMBIGUOUS');
    legacyById.set(id, position);
  }
  for (const position of v2Positions) {
    const id = identityOf(position);
    if (v2ById.has(id)) throw new Error('POSITION_IDENTITY_AMBIGUOUS');
    v2ById.set(id, position);
  }
  const classificationById = new Map();
  for (const row of reconciliationRows) {
    const id = identityOf(row);
    if (classificationById.has(id)) throw new Error('POSITION_RECONCILIATION_AMBIGUOUS');
    classificationById.set(id, row.classification);
  }

  const positions = [];
  const selectedIds = new Set();
  const replacedLegacyIds = new Set();
  const excludedV2 = [];
  for (const [id, legacy] of legacyById) {
    if (classificationById.get(id) === CERTIFIED && v2ById.has(id)) {
      positions.push(v2ById.get(id));
      replacedLegacyIds.add(id);
    } else {
      positions.push(legacy);
    }
    selectedIds.add(id);
  }
  for (const [id, v2] of v2ById) {
    if (selectedIds.has(id)) {
      if (classificationById.get(id) !== CERTIFIED) {
        excludedV2.push({ position: v2, classification: classificationById.get(id) || 'AMBIGUOUS' });
      }
      continue;
    }
    if (classificationById.get(id) === CERTIFIED) {
      positions.push(v2);
      selectedIds.add(id);
    } else {
      excludedV2.push({ position: v2, classification: classificationById.get(id) || 'AMBIGUOUS' });
    }
  }
  const positionIds = positions.map(identityOf);
  const doubleCount = positionIds.length - new Set(positionIds).size;
  if (doubleCount !== 0) throw new Error('POSITION_DOUBLE_COUNT_DETECTED');
  return { positions, excludedV2, replacedLegacyIds: [...replacedLegacyIds].sort(), doubleCount,
    policy: 'CERTIFIED_V2_REPLACES_MATCHED_LEGACY; UNRESOLVED_USES_LEGACY; UNMATCHED_UNCERTIFIED_V2_EXCLUDED' };
}

module.exports = { selectOperationalPositions };
