'use strict';

// V592–V595: read-only backup integrity verifier for the Carteira LEGACY.
// Scans the approved backup root, verifies each backup file:
//   - format (JSON parse + expected top-level shape)
//   - hash (SHA-256 recomputed vs .sha256 sidecar when present)
//   - age (warns when older than --max-age-days, default 35)
//   - size sanity (empty file = FAIL)
// Produces a JSON report; NEVER deletes, moves or restores anything.
//
// Usage: node scripts/maintenance/backup-verify.js [--root DIR] [--json] [--max-age-days N]
// Exit: 0 = all verified, 2 = integrity problems found, 1 = invocation error.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_ROOT = 'C:\\Projetos\\_backups\\carteira-investimentos';

function sha256(filePath) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return h.digest('hex');
}

function verifyFile(filePath, maxAgeDays, now = Date.now()) {
  const result = { file: path.basename(filePath), state: 'OK', details: [] };
  const stat = fs.statSync(filePath);
  if (stat.size === 0) { result.state = 'FAIL'; result.details.push('empty file'); return result; }

  // Format check (JSON backups).
  if (/\.json$/i.test(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        result.state = 'WARN'; result.details.push('valid JSON but not an object');
      } else {
        result.details.push(`json object, ${Object.keys(parsed).length} top-level keys`);
      }
    } catch (error) {
      result.state = 'FAIL'; result.details.push(`invalid JSON: ${String(error.message).slice(0, 60)}`);
      return result;
    }
  } else {
    result.details.push(`binary/other, ${stat.size} bytes`);
  }

  // Hash check against sidecar.
  const sidecar = `${filePath}.sha256`;
  if (fs.existsSync(sidecar)) {
    const expected = fs.readFileSync(sidecar, 'utf8').trim().split(/\s+/)[0].toLowerCase();
    const actual = sha256(filePath);
    if (expected && expected !== actual) { result.state = 'FAIL'; result.details.push(`hash mismatch: expected ${expected.slice(0, 12)} got ${actual.slice(0, 12)}`); }
    else result.details.push('hash verified');
  } else {
    result.details.push('no .sha256 sidecar (hash not checked)');
  }

  // Age check.
  const ageDays = Math.floor((now - stat.mtimeMs) / 86400000);
  if (ageDays > maxAgeDays) { if (result.state === 'OK') result.state = 'WARN'; result.details.push(`stale: ${ageDays}d old (max ${maxAgeDays}d)`); }
  else result.details.push(`age ${ageDays}d`);
  return result;
}

function main() {
  const args = process.argv;
  const asJson = args.includes('--json');
  const rootIdx = args.indexOf('--root');
  const root = rootIdx > -1 ? args[rootIdx + 1] : DEFAULT_ROOT;
  const ageIdx = args.indexOf('--max-age-days');
  const maxAgeDays = ageIdx > -1 ? Number(args[ageIdx + 1]) : 35;

  const report = { timestamp: new Date().toISOString(), root, maxAgeDays, files: [], healthy: true };
  if (!fs.existsSync(root)) {
    report.files.push({ state: 'WARN', details: ['backup root does not exist'] });
    report.healthy = false;
  } else {
    const entries = fs.readdirSync(root).filter(f => !/\.sha256$/i.test(f));
    if (entries.length === 0) report.files.push({ state: 'WARN', details: ['backup root is empty — no backups present'] });
    for (const entry of entries) {
      const full = path.join(root, entry);
      if (!fs.statSync(full).isFile()) continue;
      const r = verifyFile(full, maxAgeDays);
      report.files.push(r);
      if (r.state !== 'OK') report.healthy = false;
    }
  }

  if (asJson) console.log(JSON.stringify(report, null, 2));
  else {
    for (const f of report.files) console.log(`[${f.state}] ${f.file || ''} ${f.details.join('; ')}`);
    console.log(report.healthy ? 'BACKUPS: OK' : 'BACKUPS: PROBLEMS FOUND');
  }
  process.exitCode = report.healthy ? 0 : 2;
}

if (require.main === module) main();
module.exports = { verifyFile, DEFAULT_ROOT };