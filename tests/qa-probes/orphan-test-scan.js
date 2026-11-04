'use strict';
// Orfaos: roda cada .test.js nao citado em package.json/CI e registra pass/fail.
// Uso: node tests/qa-probes/orphan-test-scan.js <chunkIdx> <chunkTotal> <outFile>
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let blob = Object.values(pkg.scripts).join(' ');
const wfDir = path.join(root, '.github', 'workflows');
for (const f of fs.readdirSync(wfDir)) blob += fs.readFileSync(path.join(wfDir, f), 'utf8');
const all = fs.readdirSync(path.join(root, 'tests')).filter(f => f.endsWith('.test.js'));
const orphans = all.filter(f => !blob.includes(f));

const chunkIdx = Number(process.argv[2] || 0);
const chunkTotal = Number(process.argv[3] || 1);
const outFile = process.argv[4] || `orphan-c${chunkIdx}.json`;
const mine = orphans.filter((_, i) => i % chunkTotal === chunkIdx);

const results = [];
for (const f of mine) {
  const r = spawnSync(process.execPath, ['--test', '--test-timeout=12000', path.join(root, 'tests', f)], {
    cwd: root, encoding: 'utf8', timeout: 25000, windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, CI: '1' },
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/^\s*# fail (\d+)/m);
  const p = out.match(/^\s*# pass (\d+)/m);
  const fail = m ? Number(m[1]) : (r.status === 0 ? 0 : 1);
  const pass = p ? Number(p[1]) : 0;
  const bad = fail > 0 || r.status !== 0;
  results.push({ file: f, pass, fail, status: r.status, bad });
  process.stdout.write(`${bad ? 'FAIL' : 'ok  '} ${f} pass=${pass} fail=${fail} status=${r.status}\n`);
}
fs.writeFileSync(path.join(root, 'tests', 'qa-probes', outFile), JSON.stringify(results, null, 2));
console.log(`chunk ${chunkIdx}: ${results.length} rodados, ${results.filter(r => r.bad).length} falhando`);
