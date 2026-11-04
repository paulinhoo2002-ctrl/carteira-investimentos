'use strict';
// Extrai a 1a assercao que falha de cada orfao com falha real (status=1).
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..', '..');
let all = [];
for (const f of fs.readdirSync(path.join(root, 'tests', 'qa-probes')).filter(x => /^orphan-c\d\.json$/.test(x)))
  all = all.concat(JSON.parse(fs.readFileSync(path.join(root, 'tests', 'qa-probes', f), 'utf8')));
const bad = all.filter(r => r.bad && r.status === 1);
for (const r of bad) {
  const out = spawnSync(process.execPath, ['--test', '--test-timeout=12000', path.join(root, 'tests', r.file)],
    { cwd: root, encoding: 'utf8', timeout: 25000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20e6, env: { ...process.env, CI: '1' } });
  const s = (out.stdout || '') + (out.stderr || '');
  const m = s.match(/AssertionError[^\n]*/);
  const re = s.match(/did not match the regular expression\s*(\/[^\n]{0,220})/);
  const no = s.match(/The expression evaluated to a falsy value:\s*\n\s*(.*)/);
  console.log('### ' + r.file);
  console.log('   ' + (m ? m[0].slice(0, 200) : (no ? no[1].slice(0, 160) : (re ? 'RE ' + re[1].slice(0, 180) : 'sem AssertionError (erro de setup)'))));
  const st = s.match(/^\s*(Error|TypeError|ReferenceError|SyntaxError)[^\n]*/m);
  if (st) console.log('   ' + st[0].slice(0, 180));
}
