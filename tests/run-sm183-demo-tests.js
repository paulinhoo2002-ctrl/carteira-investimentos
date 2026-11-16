'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const files = [
  'tests/sm183-demo-isolation.test.js',
  'tests/sm183-demo.browser.test.js',
  'tests/v317-financial-action-e2e.test.js',
  'tests/m567-functional-coverage.e2e.test.js',
  'tests/m568-provento-edit.e2e.test.js',
];

const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, SM183_DEMO_TEST: '1' },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
