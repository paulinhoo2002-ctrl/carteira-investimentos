const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const Backup = require('../backup-portability.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'maintenance', 'backup-verify.js');

function runScript(rootDir) {
  try {
    const stdout = execFileSync('node', [SCRIPT, '--root', rootDir], { encoding: 'utf8' });
    return { stdout, exit: 0 };
  } catch (error) {
    return { stdout: String(error.stdout || ''), exit: error.status };
  }
}

test('V666 RED->GREEN: empty backup root must NOT report healthy (BACKUP_MISSING)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v666-empty-'));
  const { stdout, exit } = runScript(dir);
  assert.match(stdout, /PROBLEMS FOUND|BACKUP_MISSING/i, `stdout: ${stdout}`);
  assert.notEqual(exit, 0, 'exit must be non-zero when no backups exist');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('V666: arbitrary JSON is not accepted as an application backup', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v666-ok-'));
  const file = path.join(dir, 'backup.json');
  fs.writeFileSync(file, JSON.stringify({ meta: { version: 1 } }));
  const { stdout, exit } = runScript(dir);
  assert.match(stdout, /PROBLEMS FOUND/);
  assert.notEqual(exit, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('V666: nonexistent root must NOT report healthy', () => {
  const ghost = path.join(os.tmpdir(), `v666-ghost-${Date.now()}`);
  const { stdout, exit } = runScript(ghost);
  assert.match(stdout, /PROBLEMS FOUND|does not exist/i);
  assert.notEqual(exit, 0);
});

test('V666: a directory ending in .json does not satisfy the app backup gate', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v666-json-directory-'));
  fs.mkdirSync(path.join(dir, 'not-a-backup.json'));
  try {
    const { stdout, exit } = runScript(dir);
    assert.match(stdout, /BACKUP_MISSING|no application backups/i);
    assert.notEqual(exit, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('V666: source-code archives do not satisfy the app financial-backup gate', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v666-source-only-'));
  fs.writeFileSync(path.join(dir, 'CarteiraInvestimentos-Source-20261019-120000.zip'), 'synthetic source archive');
  const { stdout, exit } = runScript(dir);
  assert.match(stdout, /BACKUP_MISSING|no application backups/i);
  assert.notEqual(exit, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('V666: source-code archives do not invalidate a supported app backup', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v666-mixed-backups-'));
  const file = path.join(dir, 'carteira-investimentos-backup-synthetic.json');
  const backup = await Backup.createBackup({ state: { assets: [], aportes: [], proventos: [], rfEvents: [], wallets: [], goals: {}, performance: { schemaVersion: 1, valuationSnapshots: { snapshots: [] }, externalCashFlows: { flows: [] } } }, config: {} });
  fs.writeFileSync(file, JSON.stringify(backup));
  fs.writeFileSync(file + '.sha256', crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
  fs.writeFileSync(path.join(dir, 'CarteiraInvestimentos-Source-20261019-120000.zip'), 'synthetic source archive');
  try {
    const { stdout, exit } = runScript(dir);
    assert.match(stdout, /BACKUPS: OK/);
    assert.equal(exit, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
