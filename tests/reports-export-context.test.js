const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('reports export context declares current period and report/backup boundary', () => {
  const start = source.indexOf('function reportExportContext(data){');
  const end = source.indexOf('function reportsTab(){', start);
  assert.ok(start >= 0 && end > start);
  const context = source.slice(start, end);
  assert.match(context, /reportsPeriodLabel\(\)/);
  assert.match(context, /Não é backup/);
  assert.match(context, /backup de restauração/);
  assert.match(context, /payload bruto de importação/);
  assert.match(context, /data\.proventosCount/);
  assert.match(context, /data\.fixedCount/);
});

test('report exporters and backup remain separate contracts', () => {
  assert.match(source, /exportReportCSV\(type\)/);
  assert.match(source, /exportReportJSON\(type\)/);
  assert.match(source, /exportBackup\(\)/);
  assert.match(source, /PersistenceCore\.createBackupPayload/);
});
