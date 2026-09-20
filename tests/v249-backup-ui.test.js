const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('V249 UI loads the portable backup engine before the legacy app bootstrap', () => {
  assert.equal(html.indexOf('<script src="backup-portability.js"></script>') < html.indexOf('const BACKUP_VER'), true);
  assert.match(html, /BackupPortability\.createBackup/);
  assert.match(html, /BackupPortability\.verifyBackup/);
  assert.match(html, /BackupPortability\.previewRestore/);
});

test('V249 UI exposes integrity and preview states without a real restore action', () => {
  assert.match(html, /Integridade:/);
  assert.match(html, /Prévia sem escrita/);
  assert.match(html, /Restauração real não é executada nesta fase/);
  assert.match(html, /Restaurar \(somente ambiente de teste\)/);
});

test('V249 export excludes the old token presentation from the new flow', () => {
  const exportStart = html.indexOf('async function exportBackup()');
  const exportEnd = html.indexOf('function importBackup()', exportStart);
  assert.ok(exportStart >= 0 && exportEnd > exportStart);
  const exportCode = html.slice(exportStart, exportEnd);
  assert.match(exportCode, /backupPortabilityPayload/);
  assert.doesNotMatch(exportCode, /brapiToken/);
});
