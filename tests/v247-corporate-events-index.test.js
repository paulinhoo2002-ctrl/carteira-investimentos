const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');

test('index integra Corporate Events Center em modo shadow read-only', () => {
  assert.match(html, /corporate-events-shadow\.js/);
  assert.match(html, /corporate-events-center\.js/);
  assert.match(html, /corporate-eventos/);
  assert.match(html, /corporateEventsCenterTab/);
  assert.doesNotMatch(html, /corporate-eventos[\s\S]{0,1200}Aplicar/);
});
