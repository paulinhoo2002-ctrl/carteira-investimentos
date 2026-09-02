import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(source,/function dividendReviewQueue\(\)/);
assert.match(source,/proventoConciliationBuildRows\(\)/);
assert.match(source,/conciliationGroup==='broken'/);
assert.match(source,/conciliationGroup==='possible'/);
assert.match(source,/openDividendReviewQueueItem\(auditId\)/);
assert.match(source,/openProventoRfLinkModal\(row\.auditId\)/);
assert.match(source,/Nenhuma pendência oficial encontrada/);
assert.match(source,/Conferência em dia/);
assert.match(source,/min-height:44px/);
assert.doesNotMatch(source,/dividendReviewQueue\(\)[\s\S]{0,2000}unlinkProventoRfEvent/);

console.log('dividend-review-queue: PASS');
