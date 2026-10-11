const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { verifyFile } = require('../scripts/maintenance/backup-verify.js');
const Backup = require('../backup-portability.js');

async function tmpFixture({ corrupt = false, sidecar = true, mismatch = false, olderDays = 0, nonJson = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v592-'));
  const file = path.join(dir, nonJson ? 'backup.bin' : 'backup.json');
  const backup = await Backup.createBackup({ state: { assets: [], aportes: [], proventos: [], rfEvents: [], wallets: [], goals: {}, performance: { schemaVersion: 1, valuationSnapshots: { snapshots: [] }, externalCashFlows: { flows: [] } } }, config: {}, createdAt: new Date().toISOString() });
  fs.writeFileSync(file, nonJson ? 'binary' : corrupt ? '{not json' : JSON.stringify(backup));
  if (sidecar) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    fs.writeFileSync(file + '.sha256', mismatch ? 'deadbeef'.repeat(8) : corrupt ? 'bad' : hash);
  }
  if (olderDays) { const old = new Date(Date.now() - olderDays * 86400000); fs.utimesSync(file, old, old); }
  return { dir, file };
}

test('V592: supported app backup with fresh mtime and matching sidecar passes', async () => {
  const { dir, file } = await tmpFixture();
  try { const r = await verifyFile(file, 35); assert.equal(r.state, 'OK'); assert.match(r.details.join(';'), /manifest and payload verified/); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('V592: arbitrary valid JSON is rejected as a backup', async () => {
  const { dir, file } = await tmpFixture(); fs.writeFileSync(file, JSON.stringify({ meta: { version: 1 }, data: {} }));
  try { const r = await verifyFile(file, 35); assert.equal(r.state, 'FAIL'); assert.match(r.details.join(';'), /unsupported or invalid application backup/); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('V592: corrupted JSON fails with explicit reason', async () => {
  const { dir, file } = await tmpFixture({ corrupt: true });
  try { const r = await verifyFile(file, 35); assert.equal(r.state, 'FAIL'); assert.match(r.details.join(';'), /invalid JSON/); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('V592: empty backup file fails', async () => {
  const { dir, file } = await tmpFixture(); fs.writeFileSync(file, '');
  try { const r = await verifyFile(file, 35); assert.equal(r.state, 'FAIL'); assert.match(r.details.join(';'), /empty/); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('V593: missing or mismatched hash sidecar fails closed', async () => {
  const missing = await tmpFixture({ sidecar: false }); const mismatch = await tmpFixture({ mismatch: true });
  try {
    assert.match((await verifyFile(missing.file, 35)).details.join(';'), /missing \.sha256 sidecar/);
    const r = await verifyFile(mismatch.file, 35); assert.equal(r.state, 'FAIL'); assert.match(r.details.join(';'), /sidecar invalid or mismatched/);
  } finally { fs.rmSync(missing.dir, { recursive: true, force: true }); fs.rmSync(mismatch.dir, { recursive: true, force: true }); }
});

test('V593: unsupported non-JSON backup fails', async () => {
  const { dir, file } = await tmpFixture({ nonJson: true });
  try { const r = await verifyFile(file, 35); assert.equal(r.state, 'FAIL'); assert.match(r.details.join(';'), /unsupported backup file format/); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('V594: stale supported backup warns and fresh one does not', async () => {
  const old = await tmpFixture({ olderDays: 40 }); const fresh = await tmpFixture();
  try {
    const stale = await verifyFile(old.file, 35); assert.equal(stale.state, 'WARN'); assert.match(stale.details.join(';'), /stale: 40d/);
    const current = await verifyFile(fresh.file, 35); assert.equal(current.state, 'OK'); assert.match(current.details.join(';'), /age -?\d+d/);
  } finally { fs.rmSync(old.dir, { recursive: true, force: true }); fs.rmSync(fresh.dir, { recursive: true, force: true }); }
});
