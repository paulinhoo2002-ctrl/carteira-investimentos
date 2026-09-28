'use strict';

// Contract-only guard. It validates an authorization envelope but never mutates
// local state, calls save(), touches the real QA profile, or contacts cloud.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function parse(name) { const i = process.argv.indexOf(`--${name}`); return i < 0 ? undefined : process.argv[i + 1]; }
function blocked(reason) { throw new Error(`MONTHLY_EXECUTION_BLOCKED:${reason}`); }
if (process.argv.some(x => ['--real', '--write', '--execute'].includes(x))) blocked('REAL_MUTATION_DISABLED_IN_PREAUTH_TOOL');
const required = ['head', 'manifest-hash', 'source-hash', 'plan-fp', 'baseline-fp', 'target-fp'];
for (const name of required) if (!parse(name)) blocked(`MISSING_${name.toUpperCase().replaceAll('-', '_')}`);
if (!/^[0-9a-f]{64}$/.test(parse('manifest-hash'))) blocked('MANIFEST_HASH_FORMAT');
if (!/^[0-9a-f]{64}$/.test(parse('source-hash'))) blocked('SOURCE_HASH_FORMAT');
if (!/^[0-9a-f]{64}$/.test(parse('baseline-fp'))) blocked('BASELINE_FP_FORMAT');
if (!/^[0-9a-f]{64}$/.test(parse('target-fp'))) blocked('TARGET_FP_FORMAT');
console.log(JSON.stringify({
  contract: 'monthly-execution-v1',
  authorizationRequired: true,
  singleUse: true,
  retryAllowed: false,
  recoveryAllowed: false,
  cloudWrite: false,
  realWrite: false,
  bindings: Object.fromEntries(required.map(k => [k, parse(k)])),
  status: 'VALIDATION_ONLY_DO_NOT_EXECUTE'
}, null, 2));
