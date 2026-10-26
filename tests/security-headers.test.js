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

test('X-Content-Type-Options: nosniff', () => {
  assert.equal(getHeader('X-Content-Type-Options'), 'nosniff');
});

test('X-Frame-Options: DENY', () => {
  assert.equal(getHeader('X-Frame-Options'), 'DENY');
});

test('Referrer-Policy: strict-origin-when-cross-origin', () => {
  assert.equal(getHeader('Referrer-Policy'), 'strict-origin-when-cross-origin');
});

test('Permissions-Policy restricts camera', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /camera=\(\)/);
});

test('Permissions-Policy restricts microphone', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /microphone=\(\)/);
});

test('Permissions-Policy restricts geolocation', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /geolocation=\(\)/);
});

test('Permissions-Policy restricts payment', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /payment=\(\)/);
});

test('Permissions-Policy restricts usb', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /usb=\(\)/);
});

test('Permissions-Policy restricts bluetooth', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /bluetooth=\(\)/);
});

test('Service-Worker-Allowed header present for sw.js', () => {
  const headers = vercelConfig.headers || [];
  const swHeaders = headers.find(h => h.source === '/sw.js');
  assert.ok(swHeaders);
  const swa = swHeaders.headers.find(h => h.key === 'Service-Worker-Allowed');
  assert.equal(swa.value, '/');
});
