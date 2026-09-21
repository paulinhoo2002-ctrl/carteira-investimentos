const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('V256 carrega o modelo read-only de inteligência do detalhe', () => {
  assert.match(html, /<script src="asset-detail-intelligence\.js"><\/script>/);
  assert.match(html, /AssetDetailIntelligence\?\.buildAssetDetailIntelligence/);
  assert.match(html, /data-asset-intelligence="true"/);
});

test('V256 expõe estados fiscais e de cobertura sem escrever ou transformar ausência em zero', () => {
  const start = html.indexOf('const intelligenceHtml=');
  const end = html.indexOf('const interpretation=', start);
  const block = html.slice(start, end);
  assert.match(block, /Custo-base/);
  assert.match(block, /Resultado realizado/);
  assert.match(block, /Revisão necessária/);
  assert.match(block, /===null\?'—'/);
  assert.doesNotMatch(block, /onclick|submit|persist|save/i);
});
