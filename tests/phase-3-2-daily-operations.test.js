const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Phase 3.2: seleção de ativo usa apenas dados já presentes na sessão', () => {
  assert.match(source, /quickMovementAssetPickerOptionsHtml\(\)/);
  assert.match(source, /Array\.isArray\(S\.assets\)/);
  assert.match(source, /Array\.isArray\(S\.aportes\)/);
  assert.match(source, /<datalist id="qm-asset-options">/);
  assert.match(source, /list="qm-asset-options"/);
  assert.doesNotMatch(source, /localStorage\.setItem\([^)]*recent/i);
});

test('Phase 3.2: validação inline e confirmação pós-gravação permanecem explícitas', () => {
  assert.match(source, /quickMovementErrorField/);
  assert.match(source, /aria-invalid="true"/);
  assert.match(source, /focusQuickMovementError\(\)/);
  assert.match(source, /quickMovementSuccessText\(reg,kind\)/);
  assert.match(source, /Lançamento registrado/);
});

test('Phase 3.2: operações integradas preservam acordeão e atalho seguro', () => {
  assert.match(source, /activeAssetsGroup/);
  assert.match(source, /toggleAssetGroup\(/);
  assert.match(source, /repeatContribution\(/);
  assert.match(source, /S\.quickMovementOpen=true/);
  assert.match(source, /S\.quickMovementEditId=null/);
});
