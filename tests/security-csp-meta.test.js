import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const vercel = fs.readFileSync(path.join(root, 'vercel.json'), 'utf8');

function getMetaCSP() {
  const match = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  return match ? match[1] : '';
}

test('Meta CSP does NOT contain frame-ancestors (ignored via meta per spec)', () => {
  assert.equal(getMetaCSP().includes('frame-ancestors'), false,
    'frame-ancestors is ignored when delivered via <meta> and triggers a console error');
});

test('frame-ancestors is enforced via the HTTP header (vercel.json)', () => {
  assert.match(vercel, /frame-ancestors\s+'none'/);
});

test('Meta CSP keeps base-uri and form-action hardening', () => {
  const metaCSP = getMetaCSP();
  assert.match(metaCSP, /base-uri\s+'self'/);
  assert.match(metaCSP, /form-action\s+'self'/);
});
