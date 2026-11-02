import { execSync } from 'child_process';
import fs from 'node:fs';

const checks = [
  { name: 'All tests pass', cmd: 'npm test' },
  { name: 'Security regression tests', cmd: 'node --test tests/security-*.test.js' },
  { name: 'Dependency audit', cmd: 'npm run audit:ci' },
  { name: 'Package lock valid', cmd: 'npm run check:lock' },
  { name: 'Build succeeds', cmd: 'npm run build && npm run build:modern' },
  { name: 'SBOM generated', cmd: 'test -f sbom.json' },
  { name: 'CHANGELOG updated', cmd: 'git diff HEAD~1 CHANGELOG.md' },
  { name: 'No uncommitted changes', cmd: 'git status --porcelain' },
];

async function runChecks() {
  for (const check of checks) {
    console.log(check.name + '...');
    try {
      execSync(check.cmd, { stdio: 'pipe', encoding: 'utf8' });
      console.log('  OK ' + check.name);
    } catch (e) {
      console.error('  FALHOU ' + check.name);
      if (e.stdout) console.error(e.stdout.toString());
      if (e.stderr) console.error(e.stderr.toString());
      process.exit(1);
    }
  }
  console.log('\nTodos os checks passaram!');
}

runChecks();