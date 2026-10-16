'use strict';
// IR2026 — versioned rule registry loader (P21/P22).
// Tax-law changes must not rewrite historical results invisibly: every rule
// is versioned with EFFECTIVE_FROM/TO, and the engine records which
// RULE_ID/RULE_VERSION produced each processing record.

const fs = require('fs');
const path = require('path');
const { sha256Json } = require('./hash');

const REGISTRY_PATH = path.join(__dirname, 'rules', `rules-${require('./contracts').FISCAL_START_YEAR}.json`);

function loadRegistry(registryPath) {
  const p = registryPath || REGISTRY_PATH;
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!Array.isArray(raw.RULES) || raw.RULES.length === 0) {
    throw new Error('rules registry must contain RULES[]');
  }
  const seen = new Set();
  for (const r of raw.RULES) {
    const id = `${r.RULE_ID}@${r.RULE_VERSION}`;
    if (seen.has(id)) throw new Error(`duplicate rule ${id}`);
    seen.add(id);
    if (!['CERTIFIED_BY_SOURCE', 'NEEDS_CURRENT_LEGAL_SOURCE', 'UNKNOWN'].includes(r.STATUS)) {
      throw new Error(`invalid STATUS for ${id}: ${r.STATUS}`);
    }
    if (!r.EFFECTIVE_FROM) throw new Error(`missing EFFECTIVE_FROM for ${id}`);
  }
  return {
    REGISTRY_VERSION: raw.REGISTRY_VERSION,
    FISCAL_START_YEAR: raw.FISCAL_START_YEAR,
    NOTE: raw.NOTE,
    RULES: raw.RULES,
    REGISTRY_SHA256: sha256Json(raw.RULES),
  };
}

// Resolve the rule active for a scope at a given date (YYYY-MM-DD).
// Fail-closed: no active rule → null (caller must treat as UNKNOWN, not guess).
function resolveRule(registry, ruleId, date) {
  const candidates = registry.RULES.filter(
    (r) => r.RULE_ID === ruleId && r.EFFECTIVE_FROM <= date && (!r.EFFECTIVE_TO || r.EFFECTIVE_TO >= date)
  );
  if (candidates.length === 0) return null;
  if (candidates.length > 1) {
    throw new Error(`overlapping effective ranges for ${ruleId} at ${date}`);
  }
  return candidates[0];
}

function rulesNeedingExternalVerification(registry) {
  return registry.RULES.filter((r) => r.STATUS === 'NEEDS_CURRENT_LEGAL_SOURCE').map((r) => r.RULE_ID);
}

// Certification gate for tax calculation: TAX_DUE may only be computed when
// every rule the close depends on is CERTIFIED_BY_SOURCE (P17/P22).
function taxDueCalculationAllowed(registry, ruleIds) {
  return ruleIds.every((id) => {
    const r = registry.RULES.find((x) => x.RULE_ID === id);
    return !!r && r.STATUS === 'CERTIFIED_BY_SOURCE';
  });
}

module.exports = { loadRegistry, resolveRule, rulesNeedingExternalVerification, taxDueCalculationAllowed, REGISTRY_PATH };
