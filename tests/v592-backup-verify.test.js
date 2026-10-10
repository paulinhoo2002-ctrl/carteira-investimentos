const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verifyFile } = require('../scripts/maintenance/backup-verify.js');

function tmpFixture(build) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v592-'));
  const file = path.join(dir, 'backup.json');
  build(dir, file);
  return file;
}

test('V592: valid JSON backup with fresh mtime passes', () => {
  const file = tmpFixture((dir, f) => fs.writeFileSync(f, JSON.stringify({ meta: { version: 1 }, data: {} })));
  const r = verifyFile(file, 35);
  assert.equal(r.state, 'OK');
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});

test('V592: corrupted JSON fails with explicit reason', () => {
  const file = tmpFixture((dir, f) => fs.writeFileSync(f, '{not json'));
  const r = verifyFile(file, 35);
  assert.equal(r.state, 'FAIL');
  assert.match(r.details.join(';'), /invalid JSON/);
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});

test('V592: empty backup file fails', () => {
  const file = tmpFixture((dir, f) => fs.writeFileSync(f, ''));
  const r = verifyFile(file, 35);
  assert.equal(r.state, 'FAIL');
  assert.match(r.details.join(';'), /empty/);
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});

test('V593: hash sidecar verified when it matches', () => {
  const file = tmpFixture((dir, f) => {
    fs.writeFileSync(f, JSON.stringify({ data: 1 }));
    const h = require('node:crypto').createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    fs.writeFileSync(f + '.sha256', h);
  });
  const r = verifyFile(file, 35);
  assert.equal(r.state, 'OK');
  assert.match(r.details.join(';'), /hash verified/);
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});

test('V593: hash mismatch fails', () => {
  const file = tmpFixture((dir, f) => {
    fs.writeFileSync(f, JSON.stringify({ data: 1 }));
    fs.writeFileSync(f + '.sha256', 'deadbeef'.repeat(8));
  });
  const r = verifyFile(file, 35);
  assert.equal(r.state, 'FAIL');
  assert.match(r.details.join(';'), /hash mismatch/);
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});

test('V594: stale backup (older than max-age) warns', () => {
  const file = tmpFixture((dir, f) => fs.writeFileSync(f, JSON.stringify({ data: 1 })));
  const old = new Date(Date.now() - 40 * 86400000);
  fs.utimesSync(file, old, old);
  const r = verifyFile(file, 35);
  assert.equal(r.state, 'WARN');
  assert.match(r.details.join(';'), /stale: 40d/);
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});

test('V594: fresh backup does not warn on age', () => {
  const file = tmpFixture((dir, f) => fs.writeFileSync(f, JSON.stringify({ data: 1 })));
  const r = verifyFile(file, 35);
  assert.match(r.details.join(';'), /age -?\d+d/); // 0d or occasionally -1d from ms truncation
  assert.equal(r.state, 'OK');
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});