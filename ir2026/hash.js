'use strict';
// IR2026 — deterministic canonical hashing.
// Firestore REST note (learned in production forensics): map key order is
// NON-DETERMINISTIC between reads — identity hashing MUST be canonically
// recursive (sorted keys), otherwise the same content hashes differently.

const crypto = require('crypto');

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Json(value) {
  return crypto.createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const fs = require('fs');
    fs.createReadStream(path)
      .on('data', (d) => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

// Quantize money to integer cents (deterministic arithmetic boundary).
// Returns null for null/undefined/'' — UNKNOWN stays UNKNOWN, never 0.
function toCents(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

// Quantize quantity to 8 decimal places (share counts / principal units).
function toQty(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 1e8) / 1e8;
}

module.exports = { canonicalize, canonicalJson, sha256Json, sha256File, toCents, toQty };
