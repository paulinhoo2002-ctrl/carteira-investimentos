'use strict';
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const entries = fs.readdirSync(repoRoot, { withFileTypes: true });
const offenders = entries
  .filter(e => e.isDirectory() && (
    e.name.startsWith('.browser-harness-home-') ||
    e.name.startsWith('.browser-harness-tmp-') ||
    e.name.startsWith('.browser-harness-config-') ||
    e.name.startsWith('.browser-harness-runtime')
  ))
  .map(e => e.name);

if (offenders.length > 0) {
  console.error('ROOT_HYGIENE_BREACH: browser-harness dirs in repo root:');
  for (const name of offenders) console.error('  ' + name);
  console.error('Expected location: %TEMP%/CarteiraInvestimentos/browser-harness/');
  process.exitCode = 1;
} else {
  console.log('ROOT_HYGIENE_OK: no browser-harness dirs in repo root');
}
