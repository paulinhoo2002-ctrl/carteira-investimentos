'use strict';
// IR2026 — versioned rule registry loader (P21/P22).
// Tax-law changes must not rewrite historical results invisibly: every rule
// is versioned with EFFECTIVE_FROM/TO, and the engine records which
// RULE_ID/RULE_VERSION produced each processing record.

const fs = require('fs');
const path = require('path');
const { sha256Json } = require('./hash');

const REGISTRY_PATH = path.join(__dirname, 'rules', `rules-${require('./contracts').FISCAL_START_YEAR}.json`);

const VERIFIED_STATUSES = Object.freeze(['CERTIFIED_BY_SOURCE', 'VERIFIED_OFFICIAL_SOURCE']);
const VALID_STATUSES = Object.freeze([...VERIFIED_STATUSES, 'VERIFIED_SECONDARY_SUPPORT', 'NEEDS_CURRENT_LEGAL_SOURCE', 'NEEDS_LEGAL_INTERPRETATION', 'BLOCKED', 'NOT_APPLICABLE', 'UNKNOWN']);
const OFFICIAL_AUTHORITIES = Object.freeze(['RECEITA_FEDERAL', 'PLANALTO', 'CVM']);
const OFFICIAL_HOSTS = Object.freeze(['www.gov.br', 'gov.br', 'www.planalto.gov.br', 'planalto.gov.br']);

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
    if (!VALID_STATUSES.includes(r.STATUS)) {
      throw new Error(`invalid STATUS for ${id}: ${r.STATUS}`);
    }
    if (!r.EFFECTIVE_FROM) throw new Error(`missing EFFECTIVE_FROM for ${id}`);
    if (['VERIFIED_OFFICIAL_SOURCE', 'VERIFIED_SECONDARY_SUPPORT'].includes(r.STATUS)) {
      if (!/^https:\/\//.test(r.SOURCE_URL || '')) throw new Error(`verified rule ${id} must cite a source URL`);
      if (!r.VERIFICATION_DATE) throw new Error(`verified rule ${id} must carry VERIFICATION_DATE`);
    }
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
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
  return registry.RULES.filter((r) => !VERIFIED_STATUSES.includes(r.STATUS)).map((r) => r.RULE_ID);
}

function officialRule(registry, ruleId, date) {
  const rule = resolveRule(registry, ruleId, date);
  if (!rule || rule.STATUS !== 'VERIFIED_OFFICIAL_SOURCE' || rule.SEMANTICS_VERIFIED !== true ||
      !OFFICIAL_AUTHORITIES.includes(rule.SOURCE_AUTHORITY)) return null;
  try {
    if (!OFFICIAL_HOSTS.includes(new URL(rule.SOURCE_URL).hostname)) return null;
  } catch { return null; }
  return rule;
}

function getTaxRate(registry, ruleId, date) {
  const rule = officialRule(registry, ruleId, date);
  return rule && Number.isInteger(rule.RATE_BPS) && rule.RATE_BPS >= 0 && rule.RATE_BPS <= 10000
    ? { RULE: rule, RATE_BPS: rule.RATE_BPS } : null;
}

function getExemption(registry, ruleId, date) {
  const rule = officialRule(registry, ruleId, date);
  return rule && Number.isSafeInteger(rule.EXEMPTION_LIMIT_CENTS) && rule.EXEMPTION_LIMIT_CENTS >= 0
    ? { RULE: rule, EXEMPTION_LIMIT_CENTS: rule.EXEMPTION_LIMIT_CENTS } : null;
}

// Certification gate for tax calculation: TAX_DUE may only be computed when
// every rule the close depends on is an effective project invariant or
// an official rule with reviewed semantics. Data certification (opening cost, IRRF,
// prior losses) is an INDEPENDENT gate — both must pass (P17/P22).
function taxDueCalculationAllowed(registry, ruleIds, date) {
  return Array.isArray(ruleIds) && ruleIds.length > 0 && ruleIds.some((id) => !!officialRule(registry, id, date)) && ruleIds.every((id) => {
    const r = resolveRule(registry, id, date);
    return r && (r.STATUS === 'CERTIFIED_BY_SOURCE' || officialRule(registry, id, date) === r);
  });
}

module.exports = { loadRegistry, resolveRule, rulesNeedingExternalVerification, taxDueCalculationAllowed,
  officialRule, getTaxRate, getExemption, VERIFIED_STATUSES, REGISTRY_PATH };
