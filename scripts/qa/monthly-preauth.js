'use strict';

// Generic fail-closed guard. Portfolio-specific source data, fingerprints and
// proposed transactions must never be embedded in this publishable tool.
function value(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? undefined : process.argv[index + 1];
}

function has(name) {
  return process.argv.includes(`--${name}`);
}

function blocked(reason) {
  throw new Error(`MONTHLY_PREAUTH_BLOCKED:${reason}`);
}

if (['real', 'execute', 'write'].some(has)) {
  blocked('REAL_WRITE_NOT_SUPPORTED');
}

const month = value('month');
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) {
  blocked('MONTH_REQUIRED_YYYY-MM');
}

for (const name of ['plan-fp', 'baseline-fp', 'target-fp']) {
  if (!/^[0-9a-f]{64}$/i.test(value(name) || '')) {
    blocked(`INVALID_${name.toUpperCase().replaceAll('-', '_')}`);
  }
}

if (has('shadow')) {
  blocked('SHADOW_RUNNER_UNAVAILABLE');
}

console.log(JSON.stringify({
  tool: 'monthly-preauth',
  version: 2,
  readOnly: true,
  realWrite: false,
  cloudWrite: false,
  month,
  portfolioSpecificDataEmbedded: false,
  portfolioSpecificAnalysis: 'UNAVAILABLE',
  manifestReady: false,
  reason: 'SOURCE_SPECIFIC_ANALYSIS_REQUIRED'
}, null, 2));
