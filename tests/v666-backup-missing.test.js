const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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

test('V666: root with a valid fresh backup reports OK and exit 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v666-ok-'));
  const file = path.join(dir, 'backup.json');
  fs.writeFileSync(file, JSON.stringify({ meta: { version: 1 } }));
  const { stdout, exit } = runScript(dir);
  assert.match(stdout, /BACKUPS: OK/);
  assert.equal(exit, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('V666: nonexistent root must NOT report healthy', () => {
  const ghost = path.join(os.tmpdir(), `v666-ghost-${Date.now()}`);
  const { stdout, exit } = runScript(ghost);
  assert.match(stdout, /PROBLEMS FOUND|does not exist/i);
  assert.notEqual(exit, 0);
});