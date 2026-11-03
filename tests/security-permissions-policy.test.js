import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const root = path.join(__dirname, '..');
const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

function getHeader(key) {
  const headers = vercelConfig.headers || [];
  for (const h of headers) {
    if (h.source === '/index.html' || h.source === '/(.*)') {
      for (const header of h.headers) {
        if (header.key === key) {
          return header.value;
        }
      }
    }
  }
  return '';
}

test('Permissions-Policy blocks camera', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /camera=\(\)/);
});

test('Permissions-Policy blocks microphone', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /microphone=\(\)/);
});

test('Permissions-Policy blocks geolocation', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /geolocation=\(\)/);
});

test('Permissions-Policy blocks payment', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /payment=\(\)/);
});

test('Permissions-Policy blocks usb', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /usb=\(\)/);
});

test('Permissions-Policy blocks bluetooth', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /bluetooth=\(\)/);
});
