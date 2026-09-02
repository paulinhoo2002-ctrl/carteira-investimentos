import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(source, /function rfContextualHistoryEntries\(asset\)/);
assert.match(source, /String\(event\.assetId\|\|''\)\.trim\(\)===assetId/);
assert.match(source, /sourceEventKind[^\n]+===['"]rf['"]/);
assert.match(source, /eventIds\.has\(String\(provento\?\.sourceEventId\|\|''\)\.trim\(\)\)/);
assert.match(source, /rows\.sort\(\(a,b\)=>\(b\.date\|\|'\'\)\.localeCompare\(a\.date\|\|'\'\)\)/);
assert.match(source, /kind:'Aplicação cadastrada'/);
assert.match(source, /function openRfContextualHistory\(assetId\)/);
assert.match(source, /openRfContextualHistory\(\$\{JSON\.stringify\(assetId\)\}\)/);
assert.match(source, /class="note-overlay" role="dialog" aria-modal="true" aria-labelledby="rf-context-history-title"/);
assert.match(source, /somente leitura/);
assert.doesNotMatch(source, /role="menuitem" onclick='closeAssetActionMenus\(\)'>Ver histórico/);

console.log('rf-contextual-history: PASS');
