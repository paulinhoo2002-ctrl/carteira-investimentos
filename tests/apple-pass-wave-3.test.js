const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Wave 3 exposes contextual busy states for targeted async operations', () => {
  assert.match(html, /qInFlight\?'true':'false'/);
  assert.match(html, /Atualizando\.\.\./);
  assert.match(html, /pdfBusy:false/);
  assert.match(html, /Gerando PDF\.\.\./);
  assert.match(html, /syncInFlight:false/);
  assert.match(html, /Sincronizando\.\.\./);
  assert.match(html, /backupImportValidating:false/);
  assert.match(html, /Validando\.\.\./);
});

test('Wave 3 blocks duplicate submissions and restores controls', () => {
  assert.match(html, /if\(FB\.syncInFlight\)/);
  assert.match(html, /if\(S\.pdfBusy\) return/);
  assert.match(html, /if\(resetPortfolio\._inFlight\) return/);
  assert.match(html, /FB\.securitySaving=true/);
  assert.match(html, /button\.disabled=false/);
  assert.match(html, /S\.pdfBusy=false/);
});

test('Wave 3 preserves contextual accessibility feedback', () => {
  assert.match(html, /aria-busy="\$\{S\.qInFlight\?'true':'false'\}"/);
  assert.match(html, /aria-busy="\$\{S\.pdfBusy\?'true':'false'\}"/);
  assert.match(html, /aria-busy="\$\{state\.status==='loading'\?'true':'false'\}"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /prefers-reduced-motion/);
});

test('Wave 3 keeps instant local operations free of loading UI', () => {
  assert.doesNotMatch(html, /function filterAssets[\s\S]{0,1200}?(?:spinner|loading|busy)/i);
  assert.doesNotMatch(html, /function sortAssets[\s\S]{0,1200}?(?:spinner|loading|busy)/i);
  assert.doesNotMatch(html, /function toggleTheme[\s\S]{0,600}?(?:spinner|loading|busy)/i);
  assert.doesNotMatch(html, /function exportReportCSV[\s\S]{0,1600}?(?:spinner|loading|busy)/i);
});

test('Wave 3 preserves protected destructive and import semantics', () => {
  assert.match(html, /S\.rfEvents=\[\];/);
  assert.match(html, /applyBackupData\(S\.backupImportDraft\.parsed\)/);
  assert.match(html, /rollbackErrors/);
  assert.match(html, /confirm\(`Importar o arquivo/);
  assert.match(html, /IMPORTAÇÃO|Importação/);
});
