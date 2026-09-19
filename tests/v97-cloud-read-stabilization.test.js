'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('index.html', 'utf8');

test('authenticated read-only cloud sync is enabled without cloud writes', () => {
  assert.match(source, /startCloudSync\(\{readOnlyOnly: isProtectedReadOnlyQaBoot\(\) \|\| !isEditOwner\(\)\}\)/);
  assert.match(source, /function startCloudSync\(\{readOnlyOnly=false\}=\{\}\)/);
  assert.match(source, /if\(!readOnlyOnly && hasLocalData\(\)\) await uploadLocalToCloud\(false,\{allowMissingCloud:true\}\)/);
  assert.match(source, /if\(isProtectedReadOnlyQaBoot\(\) && !readOnlyOnly\) return;/);
});

test('read-only mode still marks a valid empty cloud document as loaded', () => {
  const start = source.indexOf('function startCloudSync');
  const end = source.indexOf('function stopCloudSync', start);
  const syncSource = source.slice(start, end);
  assert.match(syncSource, /if\(!snap\.exists\)\{/);
  assert.match(syncSource, /if\(!readOnlyOnly && hasLocalData\(\)/);
  assert.match(syncSource, /FB\.cloudLoaded=true;/);
});
