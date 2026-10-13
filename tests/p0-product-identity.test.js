'use strict';

// P0 regression: LEGACY production/login must NEVER render "Carteira 2.0" branding.
// The LEGACY product identity is "Carteira de Investimentos".
// This test inspects the local LEGACY source (index.html) and fails if
// any user-visible branding contains "Carteira 2.0".

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const LEGACY_ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(LEGACY_ROOT, 'index.html');
const MANIFEST = path.join(LEGACY_ROOT, 'manifest.json');

test('P0: LEGACY index.html must not contain "Carteira 2.0" branding', () => {
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const forbidden = /carteira\s*2\.0/i;
  // Check the <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  assert.ok(titleMatch, 'index.html must have a <title> tag');
  assert.ok(!forbidden.test(titleMatch[1]),
    `LEGACY title must NOT contain "Carteira 2.0", got: "${titleMatch[1]}"`);
  assert.match(titleMatch[1], /Carteira de Investimentos/i,
    'LEGACY title must say "Carteira de Investimentos"');
});

test('P0: LEGACY auth gate brand must say "CARTEIRA DE INVESTIMENTOS"', () => {
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  assert.ok(html.includes('CARTEIRA DE <strong>INVESTIMENTOS</strong>'),
    'LEGACY auth gate must brand as "CARTEIRA DE INVESTIMENTOS"');
  assert.ok(!/class="auth-gate-brand"[^>]*>[\s\S]{0,200}carteira\s*2\.0/i.test(html),
    'LEGACY auth gate brand must not contain "Carteira 2.0"');
});

test('P0: LEGACY manifest.json must not say "Carteira 2.0"', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  assert.ok(manifest.name, 'manifest must have a name');
  assert.ok(!/carteira\s*2\.0/i.test(manifest.name),
    `LEGACY manifest name must NOT be "Carteira 2.0", got: "${manifest.name}"`);
  assert.match(manifest.name, /Carteira/i, 'manifest name must reference Carteira');
});

test('P0: LEGACY must have zero "Carteira 2.0" in user-visible source code', () => {
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  // The auth gate and all user-visible rendering must be free of 2.0 branding.
  // Only documentation references (docs/, .agents/) may mention Carteira 2.0
  // as cross-project context.
  const visibleSections = [
    // title tag
    /<title[^>]*>([^<]*)<\/title>/i,
    // auth gate template
    /auth-gate-brand[\s\S]{0,500}/i,
    // side brand
    /side-brand[\s\S]{0,200}/i,
  ];
  for (const sectionRegex of visibleSections) {
    const match = html.match(sectionRegex);
    if (match) {
      assert.ok(!/carteira\s*2\.0/i.test(match[0]),
        `User-visible section must not contain "Carteira 2.0": ${match[0].slice(0, 100)}...`);
    }
  }
});