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

test('Broken font SRI hashes are fully removed from index.html', () => {
  assert.equal(html.includes('sha384-Yvt2jmTtQFEtXIVH1VgGfieY'), false);
  assert.equal(html.includes('sha384-mU3FzJNJ/BZ17S5514rJB3bxwX'), false);
});

test('Broken font SRI hashes are fully removed from vercel.json CSP', () => {
  assert.equal(vercel.includes('Yvt2jmTtQ'), false);
  assert.equal(vercel.includes('mU3FzJNJ'), false);
});

test('CSP still allowlists fonts.googleapis.com in style-src (header)', () => {
  assert.match(vercel, /style-src[^;]*fonts\.googleapis\.com/);
});

test('Static XLSX CDN resource keeps a valid SRI hash', () => {
  assert.match(html, /sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw/);
});
