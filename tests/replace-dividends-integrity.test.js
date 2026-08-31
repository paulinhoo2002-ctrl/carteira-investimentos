#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'replace_dividends.py');
const reference = path.join(root, 'output', 'index-head-reference.html');

function runWithInput(input) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'replace-dividends-'));
  const target = path.join(dir, 'index.html');
  fs.copyFileSync(script, path.join(dir, 'replace_dividends.py'));
  fs.writeFileSync(target, input);
  const result = spawnSync(process.env.PYTHON || 'python', ['replace_dividends.py'], {
    cwd: dir,
    encoding: 'utf8'
  });
  return { dir, target, result };
}

test('replace_dividends accepts complete input and refuses fragments without overwriting', () => {
  const complete = fs.readFileSync(reference, 'utf8');
  const accepted = runWithInput(complete);
  assert.equal(accepted.result.status, 0, accepted.result.stderr);
  assert.match(fs.readFileSync(accepted.target, 'utf8'), /<!DOCTYPE html>/i);

  const fragment = '<div class="dividend-primary-grid-simple">fragment</div>\n';
  const rejected = runWithInput(fragment);
  assert.notEqual(rejected.result.status, 0);
  assert.match(rejected.result.stderr, /not a complete application/i);
  assert.equal(fs.readFileSync(rejected.target, 'utf8'), fragment);
});
