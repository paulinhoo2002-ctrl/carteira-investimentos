#!/usr/bin/env node
'use strict';
// Verificação por gates com PASS/FAIL por etapa.
//   npm run verify        -> rápida e determinística (build, financeiro, persistência, backup, carga,
//                            ida e volta, extração, desempenho e testes da Fase 1). Minutos.
//   npm run verify:full   -> completa: npm test (inclui tudo acima + UI), modern, QA smoke, regressão
//                            visual e a comparação histórica com origin/main (rotina separada).
// Não duplica rotinas: cada gate chama um script já existente do package.json.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repo = path.join(__dirname, '..');
const full = process.argv.includes('--full');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const FAST = [
  ['build', ['run', 'build']],
  ['finance', ['run', 'test:finance']],
  ['persistence', ['run', 'test:persistence']],
  ['backup-restore', ['run', 'test:backup-restore']],
  ['load', ['run', 'test:load']],
  ['roundtrip', ['run', 'test:roundtrip']],
  ['extraction', ['run', 'test:extraction']],
  ['performance', ['run', 'test:performance']],
  ['fase1 (proxy, CSP, golden, variação diária, formatos, Monte Carlo)', ['run', 'test:fase1']],
];
const FULL = [
  ['npm test (cadeia completa, inclui os gates rápidos e a UI)', ['test']],
  ['modern', ['run', 'test:modern']],
  ['qa:all (smoke)', ['run', 'qa:all']],
  ['visual-regression', ['run', 'test:visual-regression']],
  ['comparação histórica origin/main x árvore atual', ['run', 'test:fase1a-baseline']],
];

const gates = full ? FULL : FAST;
const results = [];
const counters = text => {
  const sum = label => [...text.matchAll(new RegExp(`^ℹ ${label} (\\d+)`, 'gm'))].reduce((total, match) => total + Number(match[1]), 0);
  return { pass: sum('pass'), fail: sum('fail'), skipped: sum('skipped'), todo: sum('todo') };
};

console.log(`verify${full ? ':full' : ''} — ${gates.length} gates\n`);
for (const [name, args] of gates) {
  const started = Date.now();
  const run = spawnSync(npm, args, { cwd: repo, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 512 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const count = counters(output);
  const status = run.status === 0 && count.fail === 0 ? 'PASS' : 'FAIL';
  results.push({ name, status, seconds, count, tail: status === 'FAIL' ? output.split('\n').slice(-25).join('\n') : '' });
  const detail = count.pass || count.fail ? `pass=${count.pass} fail=${count.fail}${count.skipped ? ` skipped=${count.skipped}` : ''}${count.todo ? ` todo=${count.todo}` : ''}` : '';
  console.log(`${status.padEnd(4)}  ${name}  (${seconds}s)  ${detail}`);
}

const failed = results.filter(item => item.status === 'FAIL');
console.log(`\n${failed.length === 0 ? 'RESULTADO: PASS' : `RESULTADO: FAIL (${failed.length} gate(s))`}`);
failed.forEach(item => { console.log(`\n--- ${item.name} (últimas linhas) ---\n${item.tail}`); });
process.exit(failed.length === 0 ? 0 : 1);
