import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.join(__dirname, '..');
const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

function getCSPHeader() {
  const headers = vercelConfig.headers || [];
  for (const h of headers) {
    if (h.source === '/index.html' || h.source === '/(.*)') {
      for (const header of h.headers) {
        if (header.key === 'Content-Security-Policy') {
          return header.value;
        }
      }
    }
  }
  return '';
}

test('CSP header restricts frame-ancestors to none (valid location: HTTP header)', () => {
  const csp = getCSPHeader();
  assert.match(csp, /frame-ancestors\s+'none'/);
});

test('CSP header restricts base-uri to self', () => {
  assert.match(getCSPHeader(), /base-uri\s+'self'/);
});

test('CSP header restricts form-action to self', () => {
  assert.match(getCSPHeader(), /form-action\s+'self'/);
});

test('CSP header allows Firebase domains in connect-src', () => {
  const csp = getCSPHeader();
  assert.match(csp, /connect-src.*firestore\.googleapis\.com/);
  assert.match(csp, /connect-src.*identitytoolkit\.googleapis\.com/);
  assert.match(csp, /connect-src.*securetoken\.googleapis\.com/);
});

test('CSP header allows Brapi API in connect-src', () => {
  assert.match(getCSPHeader(), /connect-src.*api\.brapi\.com\.br/);
});

test('CSP header does NOT carry infeasible Google Fonts hashes', () => {
  const csp = getCSPHeader();
  assert.equal(csp.includes('sha384-Yvt2jmTtQ'), false);
  assert.equal(csp.includes('sha384-mU3FzJNJ'), false);
});
