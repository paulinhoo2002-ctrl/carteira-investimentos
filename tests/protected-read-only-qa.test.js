const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const indexPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

function snippet(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`);
  return html.slice(start, end);
}

function makeGoHarness(protectedQa) {
  const counters = { save: 0, render: 0, auto: 0 };
  const context = {
    S: {
      tab: 'dashboard',
      tabSeq: 0,
      mobileMenuOpen: true,
      mobileTopMenuOpen: true,
      assetsInnerTab: 'resumo',
      activeAssetsGroup: 'group',
      activeDividendSection: null,
      irpfStep: 4,
      irpfFinalOpen: true
    },
    isProtectedReadOnlyQaBoot: () => protectedQa,
    save: () => { counters.save += 1; },
    render: () => { counters.render += 1; },
    runAutoProventosGratis: () => { counters.auto += 1; }
  };
  vm.runInNewContext(`${snippet('function go(t){', '// Busca global somente em memoria')}`, context);
  return { context, counters };
}

test('protected QA boot is query-driven and host-independent', () => {
  assert.match(html, /window\.__PROTECTED_READ_ONLY_QA_BOOT__=new URLSearchParams\(location\.search\)\.get\('protectedReadOnlyQa'\)==='1';/);
  assert.doesNotMatch(html, /__PROTECTED_READ_ONLY_QA_BOOT__=.*hostname===['"]localhost/);
});

test('protected navigation renders without save or automatic financial mutation', () => {
  const { context, counters } = makeGoHarness(true);
  context.go('dividendos');
  assert.equal(context.S.tab, 'dividendos');
  assert.equal(counters.render, 1);
  assert.equal(counters.save, 0);
  assert.equal(counters.auto, 0);
});

test('normal navigation keeps existing save and auto-generation behavior', () => {
  const { context, counters } = makeGoHarness(false);
  context.go('dividendos');
  assert.equal(context.S.tab, 'dividendos');
  assert.equal(counters.render, 1);
  assert.equal(counters.save, 1);
  assert.equal(counters.auto, 1);
});

test('protected mode guards every identified write channel', () => {
  assert.match(html, /function save\(\)[\s\S]*?isProtectedReadOnlyQaBoot\(\) && !protectedLocalRecoveryWrite/);
  assert.match(html, /function saveConfig\(\)[\s\S]*?if\(isProtectedReadOnlyQaBoot\(\)\) return;/);
  assert.match(html, /function recordAccessAttempt\([\s\S]*?if\(isProtectedReadOnlyQaBoot\(\)\) return/);
  assert.match(html, /function startCloudSync\([\s\S]*?if\(isProtectedReadOnlyQaBoot\(\) && !readOnlyOnly\) return;/);
  assert.match(html, /function scheduleAutoProventosGratis\([\s\S]*?if\(isProtectedReadOnlyQaBoot\(\)\) return false;/);
  assert.match(html, /function runAutoProventosGratis\([\s\S]*?if\(isProtectedReadOnlyQaBoot\(\)\) return false;/);
  assert.match(html, /function saveV76RuntimeStores\(\)[\s\S]*?if\(isProtectedReadOnlyQaBoot\(\)\) return false;/);
  assert.match(html, /function backupCorruptedStorageValue\([\s\S]*?if\(protectedQa \|\| authoritativeLocal\) return null;/);
  assert.match(html, /function initEditProtection\(\)[\s\S]*?EDIT_LOCK_STATE=\{ownerId:'',updatedAt:0,mode:'readonly',stale:false\}/);
});

test('protected mode skips persistence enablement and public event runtime', () => {
  assert.match(html, /if\(!isProtectedReadOnlyQaBoot\(\)\)\{\s*try\{ FB\.db\.enablePersistence/);
  assert.match(html, /function startPublicEventsSync\(\)[\s\S]*?isProtectedReadOnlyQaBoot\(\)\)return/);
});
