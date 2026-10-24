#!/usr/bin/env node
// M911-M920 — Verificação periódica de integridade dos backups (2 cópias + sidecars).
// Uso: node scripts/backup/verify-integrity.js  → PASS/FAIL + idade do backup mais recente.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DIRS = [
  'C:/Projetos/_backups/carteira-investimentos',
  'C:/Projetos/_backups/carteira-investimentos/redundant',
];
const MAX_AGE_DAYS = 30; // alerta de staleness

let pass = 0, fail = 0, checked = [];
function check(cond, msg) { cond ? pass++ : fail++; checked.push((cond ? '✔ ' : '✖ ') + msg); }

for (const dir of DIRS) {
  if (!fs.existsSync(dir)) { check(false, 'diretório ausente: ' + dir); continue; }
  const files = fs.readdirSync(dir).filter(f => !f.endsWith('.sha256') && fs.statSync(path.join(dir, f)).isFile());
  let backupFound = false;
  for (const f of files) {
    const full = path.join(dir, f);
    const sidecar = full + '.sha256';
    if (!fs.existsSync(sidecar)) { check(false, 'sem sidecar: ' + f); continue; }
    const expected = (fs.readFileSync(sidecar, 'utf8').match(/[a-f0-9]{64}/) || [])[0];
    const actual = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    check(actual === expected, 'SHA-256 OK: ' + path.join(path.basename(dir), f));
    if (/backup-protegido/.test(f)) backupFound = true;
  }
  check(backupFound, 'backup protegido presente em: ' + dir);
}

// Staleness do backup mais recente (cópia principal)
const main = DIRS[0];
const backups = fs.existsSync(main) ? fs.readdirSync(main).filter(f => /backup-protegido/.test(f) && !f.endsWith('.sha256')) : [];
if (backups.length) {
  const newest = backups.map(f => ({ f, t: fs.statSync(path.join(main, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0];
  const ageDays = (Date.now() - newest.t) / 86400000;
  check(ageDays <= MAX_AGE_DAYS, 'backup recente (' + ageDays.toFixed(1) + 'd ≤ ' + MAX_AGE_DAYS + 'd): ' + newest.f);
} else {
  check(false, 'nenhum backup protegido na cópia principal');
}

console.log(checked.join('\n'));
console.log('\nINTEGRITY_CHECK=' + (fail ? 'FAIL' : 'PASS') + ' pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
