'use strict';
// ============================================================================
// IR2026 — P5: 31/12/2025 position matcher. Deterministic ticker matching
// with explicit confidence. Alias table is data, not regex guessing; new
// aliases enter only through certified evidence (ticker-change events).
// ============================================================================

// Certified alias groups (normalized). Extend ONLY with documented evidence.
const ALIAS_GROUPS = Object.freeze([
  // (empty by default: real aliases come from evidence ingestion; synthetic
  //  fixtures register their own groups via registerAliasGroup in tests)
]);

const SUFFIX_PATTERN = /([A-Z0-9]{4,6})(?:-B|-F|-11|11|34|35)$/;

function normalizeTicker(raw) {
  const t = String(raw || '').trim().toUpperCase();
  if (!t) return '';
  const bare = t.replace(SUFFIX_PATTERN, '$1');
  return bare || t;
}

const registry = new Map(); // normalized -> { canonical, group, basis }

function registerAliasGroup({ aliases, canonical, basis }) {
  if (!Array.isArray(aliases) || !aliases.length || !canonical) throw new TypeError('aliases[] and canonical required');
  for (const a of aliases) registry.set(normalizeTicker(a), { canonical: normalizeTicker(canonical), group: canonical, basis: basis || 'EVIDENCE' });
}

function ensureDefaults() {
  for (const group of ALIAS_GROUPS) registerAliasGroup(group);
}

/** Match an incoming evidence ticker against the fiscal asset universe. */
function matchAsset(inputTicker, knownAssets) {
  ensureDefaults();
  const raw = String(inputTicker || '').trim().toUpperCase();
  if (!raw) return { MATCH: 'NO_MATCH', INPUT: raw, REASON: 'EMPTY' };
  const known = new Set((knownAssets || []).map((a) => String(a).toUpperCase()));
  if (known.has(raw)) return { MATCH: 'EXACT', INPUT: raw, ASSET: raw };
  const norm = normalizeTicker(raw);
  if (known.has(norm)) return { MATCH: 'NORMALIZED_EXACT', INPUT: raw, ASSET: norm, NORMALIZATION: 'SUFFIX' };
  const alias = registry.get(norm);
  if (alias && known.has(alias.canonical)) {
    return { MATCH: 'ALIAS_CERTIFIED', INPUT: raw, ASSET: alias.canonical, BASIS: alias.basis };
  }
  // same base code, different numeric/series suffix -> corporate series ambiguity
  const base = norm.replace(/\d{2}$/, '');
  const candidates = [...known].filter((k) => k.replace(/(F|B|11|34|35)$/, '') === base);
  if (candidates.length === 1) return { MATCH: 'NORMALIZED_EXACT', INPUT: raw, ASSET: candidates[0], NORMALIZATION: 'SERIES' };
  if (candidates.length > 1) return { MATCH: 'AMBIGUOUS', INPUT: raw, CANDIDATES: candidates };
  return { MATCH: 'NO_MATCH', INPUT: raw };
}

function resetAliases() { registry.clear(); }

module.exports = { normalizeTicker, matchAsset, registerAliasGroup, resetAliases };
