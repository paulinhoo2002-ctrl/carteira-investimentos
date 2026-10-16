'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const runner = path.join(root, 'scripts/qa/run-background.js');

test('background QA closes stdin and persists output, PID and exit code', async () => {
  const dir = execFileSync(process.execPath, [runner, 'tests/fixtures/qa-no-tty.js'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const result = path.join(dir, 'exit-code.txt');
  for (let attempt = 0; attempt < 100 && !fs.existsSync(result); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(fs.readFileSync(result, 'utf8').trim(), '0');
  assert.match(fs.readFileSync(path.join(dir, 'stdout.log'), 'utf8'), /stdin closed/);
  assert.match(fs.readFileSync(path.join(dir, 'pid.txt'), 'utf8'), /^\d+\n$/);
});
