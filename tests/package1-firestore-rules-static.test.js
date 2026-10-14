'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('current rules scope portfolio access to the authenticated owner path', () => {
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  assert.match(rules, /match\s*\/portfolios\/\{userId\}/);
  assert.match(rules, /function\s+isOwner\s*\(\s*userId\s*\)[\s\S]*?request\.auth\.uid\s*==\s*userId/);
  assert.match(rules, /match\s*\/portfolios\/\{userId\}\s*\{[\s\S]*?allow\s+read\s*,\s*write\s*:\s*if\s+isOwner\s*\(\s*userId\s*\)/);
  assert.doesNotMatch(rules, /match\s*\/portfolios\/\{userId\}\/\{document=\*\*\}/);
});
