'use strict';
// ============================================================================
// IR2026 — P3: external document ingestion framework. Content/schema
// detection (never filename-dependent), row provenance, source hashes.
// Adapters produce normalized evidence records; nothing is promoted here —
// promotion is promotion.js (P4). All imports are dry-run friendly.
// ============================================================================

const crypto = require('node:crypto');
const { matchAsset } = require('./matcher');

const DOCUMENT_TYPES = Object.freeze({
  YEAR_END_POSITION: { ALIASES: ['informe de rendimentos', 'posicao', 'posição', 'position', 'carteira'], REQUIRED_FIELDS: ['ticker', 'quantity'], DATE_HINT: ['31/12/2025', '2025-12-31'] },
  ANNUAL_BROKER_REPORT: { ALIASES: ['informe', 'annual', 'rendimentos'], REQUIRED_FIELDS: ['ticker'], DATE_HINT: ['ano calendário', 'exercicio'] },
  COST_BASIS_REPORT: { ALIASES: ['custo', 'cost', 'aquisicao', 'aquisição'], REQUIRED_FIELDS: ['ticker', 'cost'] },
  LOSS_CARRYFORWARD_REPORT: { ALIASES: ['prejuizo', 'prejuízo', 'loss'], REQUIRED_FIELDS: ['loss_balance'] },
  WITHHOLDING_REPORT: { ALIASES: ['irrf', 'retencao', 'retenção', 'imposto'], REQUIRED_FIELDS: ['irrf'] },
  FEES_STATEMENT: { ALIASES: ['taxa', 'taxas', 'emolumento', 'corretagem', 'fees'], REQUIRED_FIELDS: ['fees'] },
  BROKERAGE_NOTE: { ALIASES: ['nota de corretagem', 'negociacao', 'negociação'], REQUIRED_FIELDS: ['ticker', 'quantity'] },
  B3_CUSTODY_STATEMENT: { ALIASES: ['b3', 'custodia', 'custódia', 'proventos'], REQUIRED_FIELDS: ['ticker'] },
});

function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function normalizeHeader(h) {
  return String(h || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Content-based document detection. rows: array of objects (parsed rows) or
 * {headers, sampleRows}. Score = alias hits + required-field coverage.
 */
function detectDocumentType({ name, headers, rows, rawText }) {
  const text = normalizeHeader(rawText); // accents/case normalized: 'prejuízo' matches 'prejuizo'
  const nameHit = normalizeHeader(name);
  const headerKeys = new Set((headers || Object.keys((rows || [])[0] || {})).map(normalizeHeader));
  const scores = {};
  for (const [type, spec] of Object.entries(DOCUMENT_TYPES)) {
    let score = 0;
    for (const alias of spec.ALIASES) {
      const a = normalizeHeader(alias);
      if (nameHit.includes(a) || text.includes(a)) score += 2;
    }
    for (const f of spec.REQUIRED_FIELDS) {
      for (const k of headerKeys) { if (k.includes(normalizeHeader(f))) { score += 3; break; } }
    }
    for (const hint of spec.DATE_HINT || []) { if (text.includes(hint) || nameHit.includes(normalizeHeader(hint))) score += 1; }
    scores[type] = score;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] === 0) return { TYPE: null, REASON: 'NO_SIGNATURE', SCORES: scores };
  const second = Object.entries(scores).sort((a, b) => b[1] - a[1])[1];
  if (second && second[1] === best[1]) return { TYPE: null, REASON: 'AMBIGUOUS_SIGNATURE', SCORES: scores };
  return { TYPE: best[0], CONFIDENCE: second && second[1] > 0 && best[1] - second[1] <= 2 ? 'WEAK' : 'STRONG', SCORES: scores };
}

/** Normalize one evidence row into the canonical evidence record shape. */
function normalizeRow({ type, rowIndex, row, fieldMap, knownAssets, asOf }) {
  const get = (key) => {
    const candidates = fieldMap[key] || [];
    for (const c of candidates) { const v = row[c]; if (v !== undefined && v !== null && v !== '') return v; }
    return null;
  };
  const tickerRaw = get('ticker');
  const match = matchAsset(tickerRaw, knownAssets);
  const num = (v) => {
    if (v === null) return null;
    if (typeof v === 'number') return v;
    const cleaned = String(v).replace(/[R$\s.]/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };
  const qty = num(get('quantity'));
  const cost = num(get('cost'));
  const rec = {
    EVIDENCE_ROW_ID: `${type}#${rowIndex}`,
    DOCUMENT_TYPE: type,
    ROW_INDEX: rowIndex,
    ASSET_INPUT: tickerRaw,
    ASSET_MATCH: match.MATCH,
    ASSET: match.ASSET || null,
    AS_OF: get('date') || asOf || null,
    QTY: qty,
    COST: cost,            // acquisition cost semantics per document type
    LOSS_BALANCE: type === 'LOSS_CARRYFORWARD_REPORT' ? num(get('loss_balance')) : null,
    IRRF: type === 'WITHHOLDING_REPORT' ? num(get('irrf')) : null,
    FEES: type === 'FEES_STATEMENT' || type === 'BROKERAGE_NOTE' ? num(get('fees')) : null,
    RAW: row,
  };
  rec.ROW_SHA256 = sha256Text(JSON.stringify(row));
  return rec;
}

/** Parse a whole document into normalized evidence records (no writes). */
function ingestDocument({ name, rows, type, fieldMap, knownAssets, asOf, contentHash, rawText }) {
  const detection = type ? { TYPE: type, FORCED: true }
    : detectDocumentType({ name, rows: rows || [], rawText: [rawText, asOf].filter(Boolean).join(' ') });
  if (!detection.TYPE) return { ACCEPTED: false, REASON: detection.REASON || 'NO_SIGNATURE', DETECTION: detection, RECORDS: [] };
  const t = detection.TYPE;
  const map = fieldMap && fieldMap[t] ? fieldMap[t] : defaultFieldMap(t);
  const records = (rows || []).map((row, i) => normalizeRow({ type: t, rowIndex: i, row, fieldMap: map, knownAssets, asOf }))
    .filter((r) => r.ASSET_INPUT !== null || r.LOSS_BALANCE !== null || r.IRRF !== null);
  return {
    ACCEPTED: true,
    DOCUMENT_TYPE: t,
    DETECTION_CONFIDENCE: detection.CONFIDENCE || 'FORCED',
    CONTENT_SHA256: contentHash || (records.length ? sha256Text(JSON.stringify(records)) : null),
    RECORD_COUNT: records.length,
    UNMATCHED: records.filter((r) => r.ASSET_MATCH === 'NO_MATCH' || r.ASSET_MATCH === 'AMBIGUOUS').length,
    RECORDS: records,
  };
}

function defaultFieldMap(type) {
  const common = { ticker: ['ticker', 'ativo', 'codigo', 'código', 'papel', 'asset'], quantity: ['quantidade', 'qty', 'qtd', 'quantity'], cost: ['custo', 'cost', 'custo de aquisicao', 'custo médio', 'preco medio', 'valor de aquisicao'], date: ['data', 'date', 'as of', 'data base'] };
  switch (type) {
    case 'LOSS_CARRYFORWARD_REPORT': return { ...common, loss_balance: ['prejuizo', 'prejuízo', 'prejuizo acumulado', 'loss', 'saldo'] };
    case 'WITHHOLDING_REPORT': return { ...common, irrf: ['irrf', 'imposto retido', 'retencao', 'withholding'] };
    case 'FEES_STATEMENT': case 'BROKERAGE_NOTE': return { ...common, fees: ['taxas', 'taxa', 'emolumentos', 'corretagem', 'fees', 'valor das taxas'] };
    default: return common;
  }
}

module.exports = { DOCUMENT_TYPES, detectDocumentType, ingestDocument, normalizeRow, sha256Text };
