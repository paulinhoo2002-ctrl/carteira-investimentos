'use strict';

// Local design adapter only. It does not connect to Firestore or persistence.
const PersistenceCore = require('./persistence-core');

const FIELD = 'package1_v2';
const SCHEMA_VERSION = 1;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function toEmbeddedPackage1(packageData) {
  if (!packageData || packageData.mode !== 'LOCAL_DRY_RUN_ONLY' ||
      !Array.isArray(packageData.records) || typeof packageData.import_batch_id !== 'string' ||
      !packageData.import_batch_id.trim()) throw new Error('PACKAGE1_DRY_RUN_REQUIRED');
  const positions = packageData.records
    .filter(record => record.collection === 'positions')
    .map(record => record.data);
  const snapshotRecord = packageData.records.find(record => record.collection === 'account_snapshots');
  if (!snapshotRecord) throw new Error('PACKAGE1_SNAPSHOT_MISSING');
  if (snapshotRecord.data?.import_batch_id !== packageData.import_batch_id) {
    throw new Error('PACKAGE1_BATCH_MISMATCH');
  }
  const view = PersistenceCore.buildPackage1ReadOnlyView(positions, snapshotRecord.data);
  if (view.positions.length !== 35 || packageData.records.length !== 36) {
    throw new Error('PACKAGE1_RECORD_COUNT_INVALID');
  }
  return {
    schema_version: SCHEMA_VERSION,
    as_of: view.snapshot.as_of,
    custodian_id: view.snapshot.custodian_id,
    import_batch_id: view.snapshot.import_batch_id,
    official_snapshot: clone(view.snapshot),
    detail_positions: clone(view.positions),
    // The account snapshot is the sole numeric authority; this section records state only.
    reconciliation: { status: view.snapshot.reconciliation_status, detail_coverage: 'PARTIAL' },
    provenance: {
      source_ids: [...new Set([
        view.snapshot.provenance.source_id,
        ...view.positions.flatMap(position => position.source_ids)
      ])].sort()
    }
  };
}

function readEmbeddedPackage1(portfolioDocument) {
  if (!portfolioDocument || typeof portfolioDocument !== 'object' || Array.isArray(portfolioDocument)) {
    throw new Error('PORTFOLIO_DOCUMENT_INVALID');
  }
  if (!Object.prototype.hasOwnProperty.call(portfolioDocument, FIELD)) {
    return { status: 'ABSENT', value: null };
  }
  const value = portfolioDocument[FIELD];
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema_version !== SCHEMA_VERSION ||
      !Array.isArray(value.detail_positions) || value.detail_positions.length !== 35 || !value.official_snapshot ||
      !value.reconciliation || value.reconciliation.detail_coverage !== 'PARTIAL' ||
      !value.provenance || !Array.isArray(value.provenance.source_ids) ||
      value.provenance.source_ids.some(id => typeof id !== 'string' || !id.trim()) ||
      !value.import_batch_id) throw new Error('PACKAGE1_EMBEDDED_SCHEMA_INVALID');
  const safe = PersistenceCore.buildPackage1ReadOnlyView(value.detail_positions, value.official_snapshot);
  const expectedSourceIds = [...new Set([
    safe.snapshot.provenance.source_id,
    ...safe.positions.flatMap(position => position.source_ids)
  ])].sort();
  if (safe.snapshot.import_batch_id !== value.import_batch_id ||
      safe.snapshot.as_of !== value.as_of || safe.snapshot.custodian_id !== value.custodian_id ||
      safe.positions.length !== value.detail_positions.length ||
      value.reconciliation.status !== safe.snapshot.reconciliation_status ||
      JSON.stringify(value.provenance.source_ids) !== JSON.stringify(expectedSourceIds)) {
    throw new Error('PACKAGE1_EMBEDDED_CONFLICT');
  }
  return { status: 'PRESENT', value: clone(value), view: safe };
}

function buildPortfolioFieldUpdate(packageData) {
  return { [FIELD]: toEmbeddedPackage1(packageData) };
}

// Models an exact field update and the legacy set(merge:true) payload behavior.
function simulateFieldUpdate(portfolioDocument, update) {
  if (!portfolioDocument || typeof portfolioDocument !== 'object' || Array.isArray(portfolioDocument) ||
      !update || Object.keys(update).length !== 1 || !Object.prototype.hasOwnProperty.call(update, FIELD)) {
    throw new Error('PACKAGE1_UPDATE_INVALID');
  }
  return { ...clone(portfolioDocument), [FIELD]: clone(update[FIELD]) };
}

function simulateLegacyMerge(portfolioDocument, legacyCloudPayload) {
  if (!portfolioDocument || typeof portfolioDocument !== 'object' || Array.isArray(portfolioDocument) ||
      !legacyCloudPayload || typeof legacyCloudPayload !== 'object' || Array.isArray(legacyCloudPayload)) {
    throw new Error('LEGACY_MERGE_INVALID');
  }
  return { ...clone(portfolioDocument), ...clone(legacyCloudPayload) };
}

module.exports = {
  FIELD,
  SCHEMA_VERSION,
  toEmbeddedPackage1,
  readEmbeddedPackage1,
  buildPortfolioFieldUpdate,
  simulateFieldUpdate,
  simulateLegacyMerge
};
