const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(script => script.trim());

test('inline application scripts remain valid JavaScript', () => {
  assert.ok(scripts.length >= 2);
  scripts.forEach((script, index) => {
    assert.doesNotThrow(() => new vm.Script(script, { filename: `index-inline-${index}.js` }));
  });
});
