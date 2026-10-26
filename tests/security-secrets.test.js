import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.join(__dirname, '..');

test('No hardcoded Google API keys in source', () => {
  const files = globSync('**/*.{js,html,json}', { 
    ignore: ['node_modules/**', '.git/**', 'sbom*.json', 'tests/security-*.test.js'] 
  });
  for (const file of files) {
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    // Google API Key pattern (AIza...) - only flag if in Firebase config context
    const apiKeyMatches = content.matchAll(/AIza[0-9A-Za-z_-]{35}/g);
    for (const match of apiKeyMatches) {
      const context = content.substring(Math.max(0, match.index - 50), match.index + 50);
      // Only flag if it looks like a real Firebase config (apiKey: "AIza...")
      if (/apiKey\s*[:=]\s*["']AIza/.test(context)) {
        assert.fail(`Found Google API key in Firebase config in ${file}: ${match[0]}`);
      }
    }
    // Firebase Auth token pattern (ya29...)
    assert.doesNotMatch(content, /ya29\.[0-9A-Za-z_-]{35}/, `Found Firebase token in ${file}`);
    // GitHub PAT (ghp_...)
    assert.doesNotMatch(content, /ghp_[0-9a-zA-Z]{36}/, `Found GitHub PAT in ${file}`);
    // GitHub Fine-grained PAT (github_pat_...)
    assert.doesNotMatch(content, /github_pat_[0-9a-zA-Z]{22}_[0-9a-zA-Z]{59}/, `Found GitHub fine-grained PAT in ${file}`);
  }
});

test('No private keys in source', () => {
  const files = globSync('**/*.{js,html,json,pem,key}', { 
    ignore: ['node_modules/**', '.git/**', 'tests/security-*.test.js'] 
  });
  for (const file of files) {
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(content, /-----BEGIN PRIVATE KEY-----/, `Found private key in ${file}`);
    assert.doesNotMatch(content, /-----BEGIN RSA PRIVATE KEY-----/, `Found RSA private key in ${file}`);
    assert.doesNotMatch(content, /-----BEGIN EC PRIVATE KEY-----/, `Found EC private key in ${file}`);
  }
});

test('Firebase config apiKey is redacted or placeholder', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  // Check that apiKey is either redacted or a placeholder
  const hasRedacted = /apiKey:\s*["'][^"']*\*\*\*[^"']*["']/.test(html);
  const hasPlaceholder = /apiKey:\s*["']demo[^"']*["']/.test(html);
  assert.ok(hasRedacted || hasPlaceholder, 'apiKey should be redacted or placeholder');
});

test('Demo mode apiKey is placeholder', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /apiKey:\s*['"]demo[^'"]*['"]/);
});

test('Backup portability detector exists (not a secret)', () => {
  const bp = fs.readFileSync(path.join(root, 'backup-portability.js'), 'utf8');
  assert.match(bp, /SENSITIVE_KEY/);
  // This is a detector pattern, not a secret
});