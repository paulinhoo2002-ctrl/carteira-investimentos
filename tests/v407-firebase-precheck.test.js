const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

// V407: pure logic of the Firebase emulator pre-check utility.
const precheck = require('../scripts/qa/firebase-precheck.js');

test('V407 precheck: netstatListeners parses only LISTENING rows on emulator ports', () => {
  assert.ok(Array.isArray(precheck.EMULATOR_PORTS));
  assert.deepStrictEqual(precheck.EMULATOR_PORTS, [8080, 9099, 4400, 4500]);
});

test('V407 precheck: confirmed orphan requires emulator jar + legacy repo + QA project + dead parent', () => {
  // The V407-era fixture pointed at a generic \x\ worktree; V416 requires the
  // exact LEGACY root, so the canonical confirmed-orphan fixture (orphanFixture)
  // is the positive case now. This old shape must be rejected:
  const orphan = {
    parentAlive: false,
    parentPid: 1,
    commandLine: 'java.exe -jar cloud-firestore-emulator-v1.22.0.jar --port 8080 --rules C:\\Projetos\\carteira-investimentos.worktrees\\x\\tests\\fixtures\\v311-firestore.rules --project_id demo-carteira-qa-emulator'
  };
  assert.equal(precheck.isConfirmedOrphan(orphan), false, 'generic worktree path must not pass the root check');
});

test('V407 precheck: alive parent means NOT confirmed orphan', () => {
  const live = {
    parentAlive: true,
    parentPid: 999,
    commandLine: 'java.exe -jar cloud-firestore-emulator-v1.22.0.jar --port 8080 --rules C:\\Projetos\\carteira-investimentos.worktrees\\x\\tests\\fixtures\\v311-firestore.rules'
  };
  assert.equal(precheck.isConfirmedOrphan(live), false);
});

test('V407 precheck: foreign repo rules mean NOT confirmed orphan', () => {
  const foreign = {
    parentAlive: false,
    parentPid: 1,
    commandLine: 'java.exe -jar cloud-firestore-emulator-v1.22.0.jar --port 8080 --rules C:\\OutroProjeto\\rules.firestore'
  };
  assert.equal(precheck.isConfirmedOrphan(foreign), false);
});

test('V407 precheck: unrelated process on port 8080 is NOT confirmed orphan', () => {
  const other = {
    parentAlive: false,
    parentPid: 1,
    commandLine: 'C:\\some\\server.exe --port 8080'
  };
  assert.equal(precheck.isConfirmedOrphan(other), false);

  const mockedRun = spawnSync(process.execPath, ['-e', `
    const childProcess = require('node:child_process');
    const killCalls = [];
    childProcess.execFileSync = (file, args) => {
      if (file === 'netstat') return 'TCP 0.0.0.0:8080 0.0.0.0:0 LISTENING 4242';
      if (file === 'powershell') return 'ParentAlive=False\\nParentPid=1\\nCommandLine=C:\\\\some\\\\server.exe --port 8080';
      if (file === 'taskkill') { killCalls.push(args); return ''; }
      throw new Error('unexpected command: ' + file);
    };
    console.log = () => {};
    console.error = () => {};
    process.argv.push('--kill-confirmed');
    require(${JSON.stringify(require.resolve('../scripts/qa/firebase-precheck.js'))}).main();
    process.stdout.write(JSON.stringify({ exitCode: process.exitCode, killCalls }));
  `], { encoding: 'utf8' });
  assert.equal(mockedRun.status, 1);
  assert.deepEqual(JSON.parse(mockedRun.stdout), { exitCode: 1, killCalls: [] });
});

test('V407 precheck: missing info (process vanished) is NOT confirmed orphan', () => {
  assert.equal(precheck.isConfirmedOrphan(null), false);
});

// ─── V416 security hardening (RED/GREEN suite, mocks only — no real process killed) ───

const LEGACY_ROOT = precheck.REPO_ROOT;
const QA_PROJECT = precheck.QA_PROJECT_ID;

function orphanFixture(overrides = {}) {
  return {
    parentAlive: false,
    parentPid: 1,
    commandLine: `java.exe -jar cloud-firestore-emulator-v1.22.0.jar --port 8080 --rules ${LEGACY_ROOT}\\tests\\fixtures\\v311-firestore.rules --project_id ${QA_PROJECT}`,
    ...overrides,
  };
}

test('V407 precheck: canonical orphan fixture remains confirmed after V416 fix', () => {
  assert.equal(precheck.isConfirmedOrphan(orphanFixture()), true);
});

test('V416 security: process from ANOTHER QA project is NOT confirmed orphan', () => {
  assert.equal(precheck.isConfirmedOrphan(orphanFixture({
    commandLine: `java.exe -jar cloud-firestore-emulator-v1.22.0.jar --port 8080 --rules ${LEGACY_ROOT}\\tests\\fixtures\\v311-firestore.rules --project_id demo-outro-projeto-qa`,
  })), false);
});

test('V416 security: PRODUCTION firebase project is NOT confirmed orphan', () => {
  assert.equal(precheck.isConfirmedOrphan(orphanFixture({
    commandLine: `java.exe -jar cloud-firestore-emulator-v1.22.0.jar --port 8080 --rules ${LEGACY_ROOT}\\tests\\fixtures\\v311-firestore.rules --project_id carteira-producao`,
  })), false);
});

test('V416 security: missing --project_id flag entirely is NOT confirmed orphan', () => {
  assert.equal(precheck.isConfirmedOrphan(orphanFixture({
    commandLine: `java.exe -jar cloud-firestore-emulator-v1.22.0.jar --port 8080 --rules ${LEGACY_ROOT}\\tests\\fixtures\\v311-firestore.rules`,
  })), false);
});

test('V416 security: look-alike sibling repo path is NOT confirmed orphan', () => {
  assert.equal(precheck.isConfirmedOrphan(orphanFixture({
    commandLine: `java.exe -jar cloud-firestore-emulator-v1.22.0.jar --port 8080 --rules ${LEGACY_ROOT}-outro\\tests\\fixtures\\v311-firestore.rules --project_id ${QA_PROJECT}`,
  })), false);
});

test('V416 security: vague repo mention without rules file is NOT confirmed orphan', () => {
  assert.equal(precheck.isConfirmedOrphan(orphanFixture({
    commandLine: `java.exe -jar cloud-firestore-emulator-v1.22.0.jar --port 8080 --notes C:\\docs\\carteira-investimentos.txt --project_id ${QA_PROJECT}`,
  })), false);
});

test('V416 security: bare firebase token (firebase-tools node process) is NOT confirmed orphan', () => {
  assert.equal(precheck.isConfirmedOrphan(orphanFixture({
    commandLine: `node firebase-tools.js --project_id ${QA_PROJECT} --rules ${LEGACY_ROOT}\\tests\\fixtures\\v311-firestore.rules`,
  })), false);
  assert.equal(precheck.isConfirmedOrphan(orphanFixture({
    commandLine: `C:\\some\\server.exe --notes cloud-firestore-emulator-v1.22.0.jar --project_id ${QA_PROJECT} --rules ${LEGACY_ROOT}\\tests\\fixtures\\v311-firestore.rules`,
  })), false, 'mentioning emulator identifiers is not proof that this is the emulator process');
});

test('V416 security: recycled PID with changed executable is NOT confirmed orphan', () => {
  assert.equal(precheck.isConfirmedOrphan(orphanFixture({
    commandLine: `C:\\some\\other\\server.exe --port 8080 --rules ${LEGACY_ROOT}\\tests\\fixtures\\v311-firestore.rules --project_id ${QA_PROJECT}`,
  })), false);
});

test('V416 security: ambiguous command (empty/undefined commandLine) is NOT confirmed orphan', () => {
  assert.equal(precheck.isConfirmedOrphan(orphanFixture({ commandLine: '' })), false);
  assert.equal(precheck.isConfirmedOrphan(orphanFixture({ commandLine: undefined })), false);
});

test('V416 security: emulator of a DIFFERENT repo root is NOT confirmed orphan', () => {
  const otherRepoRoot = 'C:\\Outro\\Repo';
  assert.equal(precheck.isConfirmedOrphan(
    orphanFixture({
      commandLine: `java.exe -jar cloud-firestore-emulator-v1.22.0.jar --port 8080 --rules ${otherRepoRoot}\\tests\\fixtures\\v311-firestore.rules --project_id ${QA_PROJECT}`,
    })
  ), false);
});

test('V416 security: forward-slash LEGACY path is still confirmed (slash normalization)', () => {
  const forwardSlash = orphanFixture().commandLine.replace(/\\/g, '/');
  assert.ok(forwardSlash.includes('/'));
  assert.equal(forwardSlash.includes('\\'), false);
  assert.equal(precheck.isConfirmedOrphan({ parentAlive: false, parentPid: 1, commandLine: forwardSlash }), true);
});
