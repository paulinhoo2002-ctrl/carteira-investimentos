import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const root = path.join(__dirname, '..');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

test('Firestore rules enforce owner-only access via UID', () => {
  assert.match(rules, /request\.auth\.uid == "yaypxiiv7Ye7pwpDZ0nqhG3Yj7E3"/);
});

test('Firestore rules require email_verified', () => {
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
});

test('Firestore rules enforce email match', () => {
  assert.match(rules, /request\.auth\.token\.email == "paulinhoo2002@gmail.com"/);
});

test('Firestore rules use isOwner function for portfolios', () => {
  assert.match(rules, /match \/portfolios\/{userId}/);
  assert.match(rules, /allow read, write: if isOwner\(userId\)/);
});

test('Firestore rules use isOwner function for users', () => {
  assert.match(rules, /match \/users\/{userId}/);
  assert.match(rules, /allow read, write: if isOwner\(userId\)/);
});

test('Firestore rules restrict meta/access to owner account only', () => {
  assert.match(rules, /match \/meta\/access/);
  assert.match(rules, /allow read, write: if isOwnerAccount\(\)/);
});

test('Firestore rules deny by default (no unconditional allow)', () => {
  // Should not have any allow without condition
  const unconditionalAllows = rules.match(/allow read, write:[^;]*;/g) || [];
  for (const allow of unconditionalAllows) {
    assert.ok(allow.includes('if'), 'Found unconditional allow: ' + allow);
  }
});

test('Firestore rules use isOwnerAccount for admin check', () => {
  assert.match(rules, /function isOwnerAccount\(\)/);
  assert.match(rules, /request\.auth != null/);
  assert.match(rules, /request\.auth\.uid ==/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /request\.auth\.token\.email ==/);
});
