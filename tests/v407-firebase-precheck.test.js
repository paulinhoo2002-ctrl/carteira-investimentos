const test = require('node:test');
const assert = require('node:assert/strict');

// V407: pure logic of the Firebase emulator pre-check utility.
const precheck = require('../scripts/qa/firebase-precheck.js');

test('V407 precheck: netstatListeners parses only LISTENING rows on emulator ports', () => {
  assert.ok(Array.isArray(precheck.EMULATOR_PORTS));
  assert.deepStrictEqual(precheck.EMULATOR_PORTS, [8080, 9099, 4400, 4500]);
});

test('V407 precheck: confirmed orphan requires emulator jar + legacy repo + dead parent', () => {
  const orphan = {
    parentAlive: false,
    parentPid: 1,
    commandLine: 'java.exe -jar cloud-firestore-emulator-v1.22.0.jar --port 8080 --rules C:\\Projetos\\carteira-investimentos.worktrees\\x\\tests\\fixtures\\v311-firestore.rules --project_id demo-carteira-qa-emulator'
  };
  assert.equal(precheck.isConfirmedOrphan(orphan), true);
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
});

test('V407 precheck: missing info (process vanished) is NOT confirmed orphan', () => {
  assert.equal(precheck.isConfirmedOrphan(null), false);
});