'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('production loads the explicit cloud sync state machine', () => {
  assert.match(html, /<script src="cloud-sync-state\.js"><\/script>/);
  assert.match(html, /cloudStateModel/);
  assert.match(html, /CloudSyncState\.STATES\.TIMEOUT/);
});

test('cloud read has a bounded timeout and terminal error transitions', () => {
  assert.match(html, /FB\.cloudSyncTimeoutTimer=setTimeout\(/);
  assert.match(html, /CloudSyncState\.timeout\(FB\.cloudStateModel\)/);
  assert.match(html, /CloudSyncState\.fail\(FB\.cloudStateModel\|\|CloudSyncState\.initial\(\),e\)/);
  assert.match(html, /CloudSyncState\.fail\(FB\.cloudStateModel\|\|CloudSyncState\.initial\(\),err\)/);
});

test('unconfirmed cloud state blocks financial screens instead of rendering false zero', () => {
  assert.match(html, /if\(typeof FB!=='undefined' && FB\.user && !CloudSyncState\.isDataConfirmed\(cloudSyncState\(\)\)\) return cloudSyncRecoveryPanel\(\);/);
  assert.match(html, /Nenhum valor foi substituído por zero/);
  assert.match(html, /Tentar novamente/);
});

test('cloud retry is read-only and the protected financial write contracts remain guarded', () => {
  assert.match(html, /startCloudSync\(\{readOnlyOnly:true\}\)/);
  assert.match(html, /function uploadLocalToCloud[\s\S]*?if\(isProtectedReadOnlyQaBoot\(\)\) return/);
  assert.match(html, /function startCloudSync[\s\S]*?if\(isProtectedReadOnlyQaBoot\(\) && !readOnlyOnly\) return/);
});
