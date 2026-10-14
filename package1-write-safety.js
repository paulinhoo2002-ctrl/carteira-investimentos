'use strict';

const { createHash } = require('node:crypto');


const AS_OF = '2026-10-10';
const BATCH = 'INTER_CURRENT_POSITION_2026-10-10_V1';
const hash = value => createHash('sha256').update(value).digest('hex');
const stable = value => Array.isArray(value) ? '[' + value.map(stable).join(',') + ']'
  : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}'
    : JSON.stringify(value);
const clone = value => structuredClone(value);
const requireText = (value, error) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(error);
  return value.trim();
};
function cents(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100)) || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) {
    throw new Error(field + '_INVALID');
  }
  return Math.round(value * 100);
}
const amount = value => value / 100;
const positionId = (assetType, assetId) => 'pos_' + hash(stable(['INTER', AS_OF, assetType, assetId]));
function normalizePositionV2(record) {
  if (record?.schema_version !== 2 || !record.document_id || !record.custodian_id || !record.asset_id ||
      !record.asset_type || !record.import_batch_id || !Array.isArray(record.source_ids) || !record.source_ids.length ||
      !record.provenance?.source_id || !Number.isFinite(record.quantity) || record.quantity < 0) throw new Error('POSITION_V2_INVALID');
  cents(record.current_value, 'CURRENT_VALUE');
  if (record.average_cost_status !== 'UNKNOWN' || record.average_cost !== null ||
      record.cost_basis_status !== 'UNKNOWN' || record.cost_basis_value !== null || record.cost_method !== null) {
    throw new Error('COST_SEMANTICS_NOT_CERTIFIED');
  }
  if (record.reconciliation_status !== 'PARTIAL' || record.as_of !== AS_OF ||
      !record.created_at || !record.updated_at) throw new Error('POSITION_SCOPE_INVALID');
  return clone(record);
}
function migrateLegacyPositionV2(legacy, context) {
  if (!legacy || !context || legacy.qty === null || legacy.qty === undefined ||
      (typeof legacy.qty === 'string' && !legacy.qty.trim()) ||
      !Number.isFinite(Number(legacy.qty))) throw new Error('MIGRATION_CONTEXT_REQUIRED');
  return normalizePositionV2({
    ...context, schema_version: 2, quantity: Number(legacy.qty),
    average_cost: null, average_cost_status: 'UNKNOWN',
    cost_basis_value: null, cost_basis_status: 'UNKNOWN', cost_method: null,
    provenance: { source_id: context.source_ids?.[0], legacy_cost_unverified: true },
    reconciliation_status: 'PARTIAL'
  });
}
function positionV2Preview(record) {
  normalizePositionV2(record);
  return { currentValue: record.current_value, appliedValue: null, pnl: null,
    averageCostStatus: 'UNKNOWN', costBasisStatus: 'UNKNOWN' };
}
const targetKey = record => record.collection + '/' + record.document_id;
function validatePackage(packageData) {
  if (!packageData || packageData.mode !== 'LOCAL_DRY_RUN_ONLY' || packageData.import_batch_id !== BATCH ||
      !Array.isArray(packageData.records) || packageData.records.length !== 36) throw new Error('PACKAGE_INVALID');
  const ids = packageData.records.map(targetKey);
  if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_DOCUMENT_ID');
  const positions = packageData.records.filter(record => record.collection === 'positions');
  const snapshots = packageData.records.filter(record => record.collection === 'account_snapshots');
  if (positions.length !== 35 || snapshots.length !== 1) throw new Error('WRITE_SET_INVALID');
  let rv = 0, rf = 0;
  for (const record of positions) {
    if (record.document_id !== record.data?.document_id ||
        record.document_id !== positionId(record.data.asset_type, record.data.asset_id) ||
        record.data.import_batch_id !== BATCH ||
        record.data.custodian_id !== 'INTER' || record.data.as_of !== AS_OF) throw new Error('RECORD_INVALID');
    normalizePositionV2(record.data);
    const value = cents(record.data.current_value, 'CURRENT_VALUE');
    if (record.data.asset_type.startsWith('RV')) rv += value;
    else if (record.data.asset_type === 'RF') rf += value;
    else throw new Error('ASSET_CLASS_UNSUPPORTED');
  }
  const snapshotRecord = snapshots[0];
  const snapshot = snapshotRecord.data;
  if (snapshotRecord.document_id !== snapshot.document_id || snapshot.snapshot_id !== snapshot.document_id ||
      snapshot.document_id !== 'snapshot_INTER_' + AS_OF ||
      snapshot.schema_version !== 1 || snapshot.custodian_id !== 'INTER' || snapshot.as_of !== AS_OF ||
      snapshot.import_batch_id !== BATCH || snapshot.reconciliation_status !== 'PARTIAL' ||
      !snapshot.provenance?.source_id) throw new Error('SNAPSHOT_INVALID');
  const rvOfficial = cents(snapshot.rv_official, 'RV_OFFICIAL');
  const rfOfficial = cents(snapshot.rf_official, 'RF_OFFICIAL');
  const totalOfficial = cents(snapshot.total_official, 'TOTAL_OFFICIAL');
  if (rvOfficial + rfOfficial !== totalOfficial || rv > rvOfficial || rf > rfOfficial ||
      cents(snapshot.rv_detail_sum, 'RV_DETAIL') !== rv ||
      cents(snapshot.rf_detail_sum, 'RF_DETAIL') !== rf ||
      cents(snapshot.detail_total, 'DETAIL_TOTAL') !== rv + rf ||
      cents(snapshot.rv_gap, 'RV_GAP') !== rvOfficial - rv ||
      cents(snapshot.rf_gap, 'RF_GAP') !== rfOfficial - rf ||
      cents(snapshot.total_gap, 'TOTAL_GAP') !== totalOfficial - rv - rf) throw new Error('SNAPSHOT_RECONCILIATION_MISMATCH');
  if (packageData.snapshot && stable(packageData.snapshot) !== stable(snapshot)) throw new Error('SNAPSHOT_DUPLICATE_MISMATCH');
  return ids;
}
function buildPackage1({ positions, official, importBatchId, createdAt }) {
  if (importBatchId !== BATCH) throw new Error('BATCH_ID_INVALID');
  if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt)) || new Date(createdAt).toISOString() !== createdAt) throw new Error('CREATED_AT_INVALID');
  if (!Array.isArray(positions) || positions.length !== 35) throw new Error('POSITION_COUNT_INVALID');
  if (official?.custodian !== 'INTER' || official.as_of !== AS_OF) throw new Error('OFFICIAL_IDENTITY_INVALID');
  const officialSource = requireText(official.source_id, 'OFFICIAL_SOURCE_MISSING');
  const rvOfficial = cents(official.rv_official, 'RV_OFFICIAL');
  const rfOfficial = cents(official.rf_official, 'RF_OFFICIAL');
  const totalOfficial = cents(official.total_official, 'TOTAL_OFFICIAL');
  if (rvOfficial + rfOfficial !== totalOfficial) throw new Error('OFFICIAL_SUM_MISMATCH');

  let rvDetail = 0, rfDetail = 0, calculated = 0;
  const costEvidence = [];
  const records = positions.map(position => {
    if (position.custodian !== 'INTER' || position.as_of !== AS_OF) throw new Error('AS_OF_MISMATCH');
    const assetId = requireText(position.ticker, 'ASSET_ID_MISSING');
    const assetType = requireText(position.asset_type, 'ASSET_TYPE_MISSING');
    const source = requireText(position.source, 'SOURCE_MISSING');
    if (typeof position.quantity !== 'number' || !Number.isFinite(position.quantity) || position.quantity < 0) throw new Error('QUANTITY_INVALID');
    const currentCents = cents(position.current_value, 'CURRENT_VALUE');
    if (assetType.startsWith('RV')) rvDetail += currentCents;
    else if (assetType === 'RF') rfDetail += currentCents;
    else throw new Error('ASSET_CLASS_UNSUPPORTED');
    if (!Array.isArray(position.detail_positions) || !position.detail_positions.length ||
        position.detail_positions.some(detail => !detail.position_id)) throw new Error('DETAIL_PROVENANCE_MISSING');
    const sourceIds = [...new Set([source, ...position.detail_positions.map(detail => String(detail.position_id))])].sort();
    const documentId = positionId(assetType, assetId);
    if (position.pnl_status === 'CALCULATED') {
      calculated++;
      const derivedCents = cents(position.cost_basis_total, 'FIFO_COST');
      const unitCost = position.cost_basis;
      const fifoQuantity = typeof unitCost === 'number' && Number.isFinite(unitCost) && unitCost > 0 ? amount(derivedCents) / unitCost : null;
      costEvidence.push({
        asset: assetId, quantity: position.quantity, derived_value: amount(derivedCents),
        field_target: 'QUARANTINED_DRY_RUN_ONLY', method: 'FIFO',
        method_definition: 'Remaining 2026 purchase lots after dated sells; historical opening lots and completeness unproven',
        evidence_source: source, is_true_average_cost: 'NO',
        lot_quantity_matches: fifoQuantity !== null && Math.abs(fifoQuantity - position.quantity) < 1e-6
      });
    } else if (position.pnl_status !== 'UNKNOWN') throw new Error('COST_STATUS_UNRECOGNIZED');
    const data = normalizePositionV2({
      document_id: documentId, schema_version: 2, custodian_id: 'INTER',
      asset_id: assetId, asset_type: assetType, quantity: position.quantity,
      current_value: amount(currentCents), as_of: AS_OF,
      average_cost: null, average_cost_status: 'UNKNOWN',
      cost_basis_value: null, cost_basis_status: 'UNKNOWN', cost_method: null,
      provenance: { source_id: source, cost_evidence_status: 'QUARANTINED' },
      source_ids: sourceIds, reconciliation_status: 'PARTIAL',
      import_batch_id: BATCH, created_at: createdAt, updated_at: createdAt
    });
    return { collection: 'positions', document_id: documentId, data };
  });
  if (calculated !== 25) throw new Error('COST_CANDIDATE_COUNT_INVALID');
  const ids = records.map(targetKey);
  if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_DOCUMENT_ID');
  const detailTotal = rvDetail + rfDetail;
  if (rvDetail > rvOfficial || rfDetail > rfOfficial) throw new Error('DETAIL_EXCEEDS_OFFICIAL');
  const totals = {
    rv_detail_sum: amount(rvDetail), rf_detail_sum: amount(rfDetail), detail_total: amount(detailTotal),
    rv_gap: amount(rvOfficial - rvDetail), rf_gap: amount(rfOfficial - rfDetail), total_gap: amount(totalOfficial - detailTotal)
  };
  const snapshot = {
    snapshot_id: 'snapshot_INTER_' + AS_OF, document_id: 'snapshot_INTER_' + AS_OF, schema_version: 1,
    custodian_id: 'INTER', as_of: AS_OF, rv_official: amount(rvOfficial), rf_official: amount(rfOfficial),
    total_official: amount(totalOfficial), ...totals, reconciliation_status: 'PARTIAL',
    provenance: { source_id: officialSource }, import_batch_id: BATCH,
    created_at: createdAt, updated_at: createdAt
  };
  records.push({ collection: 'account_snapshots', document_id: snapshot.document_id, data: snapshot });
  const payload = { mode: 'LOCAL_DRY_RUN_ONLY', import_batch_id: BATCH, records, snapshot, totals, cost_evidence: costEvidence };
  validatePackage(payload);
  return payload;
}
function readTarget(before, key) {
  if (!(before instanceof Map) || !before.has(key)) throw new Error('TARGET_NOT_READ');
  const target = before.get(key);
  if (!target || !['ABSENT', 'PRESENT'].includes(target.state) || (target.state === 'PRESENT' && !target.data)) throw new Error('TARGET_READ_INVALID');
  return target;
}
function previewWrites(packageData, before) {
  const ids = validatePackage(packageData);
  const counts = { insert: 0, update: 0, delete: 0, unchanged: 0 };
  const operations = [];
  for (const [index, key] of ids.entries()) {
    const previous = readTarget(before, key);
    if (previous.state === 'ABSENT') {
      counts.insert++;
      operations.push({ action: 'INSERT_EXACT', key });
    } else if (stable(previous.data) === stable(packageData.records[index].data)) counts.unchanged++;
    else throw new Error('EXISTING_DOCUMENT_CONFLICT');
  }
  return { counts, operations };
}
function applyInsertPlan(packageData, before) {
  const preview = previewWrites(packageData, before);
  const after = new Map([...before.entries()].map(([key, value]) => [key, clone(value)]));
  for (const operation of preview.operations) {
    const record = packageData.records.find(item => targetKey(item) === operation.key);
    after.set(operation.key, { state: 'PRESENT', data: clone(record.data) });
  }
  return after;
}
function backupTargets(packageData, before) {
  const ids = validatePackage(packageData);
  const targets = ids.map(key => ({ key, ...clone(readTarget(before, key)) }));
  const backup = { batch_id: BATCH, targets };
  return { ...backup, sha256: hash(stable(backup)) };
}
function verifyBackup(packageData, backup) {
  try {
    const ids = validatePackage(packageData);
    return backup.batch_id === BATCH && backup.targets.length === 36 &&
      ids.every((id, index) => backup.targets[index]?.key === id &&
        (backup.targets[index].state === 'ABSENT' ||
          (backup.targets[index].state === 'PRESENT' && backup.targets[index].data && typeof backup.targets[index].data === 'object'))) &&
      backup.sha256 === hash(stable({ batch_id: backup.batch_id, targets: backup.targets }));
  } catch { return false; }
}
function rollbackExact(packageData, backup, current) {
  if (!verifyBackup(packageData, backup)) throw new Error('BACKUP_INVALID');
  const operations = [];
  for (const [index, target] of backup.targets.entries()) {
    const value = readTarget(current, target.key);
    if (value.state !== 'PRESENT' || value.data.import_batch_id !== BATCH) throw new Error('BATCH_MISMATCH');
    if (stable(value.data) !== stable(packageData.records[index].data)) throw new Error('CONCURRENT_TARGET_MUTATION');
    operations.push(target.state === 'ABSENT' ?
      { action: 'DELETE_EXACT', key: target.key } :
      { action: 'RESTORE_EXACT', key: target.key, data: clone(target.data) });
  }
  return operations;
}
module.exports = { buildPackage1, previewWrites, applyInsertPlan, backupTargets, verifyBackup, rollbackExact, targetKey, normalizePositionV2, migrateLegacyPositionV2, positionV2Preview };
