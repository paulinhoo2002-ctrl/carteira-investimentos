// Financial as-of evidence extraction for readonly fixed-income items.
// Semantics mirror V81/V82 (fixed-income-benchmark-provider.js financialAsOfEvidence):
// - applicationDate, capturedAt, reconstructedAt, importedAt are NOT financialAsOf;
// - updated_at/quoteUpdatedAt are MEDIUM-confidence broker-effective timestamps;
// - explicit financialAsOf/valuationAsOf fields are HIGH confidence;
// - absence is UNKNOWN, never LIVE, never zero.
export type FinancialAsOfConfidence = 'HIGH' | 'MEDIUM' | 'UNKNOWN';

export type FinancialAsOfEvidence = Readonly<{
  readonly value: string | null; // ISO date (YYYY-MM-DD) or null
  readonly source: string | null; // which field produced the evidence
  readonly confidence: FinancialAsOfConfidence;
  readonly reason: string;
}>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  // Calendar validation: Date.parse accepts impossible dates (2026-02-31 rolls
  // over to March), so validate the day against the real month length — same
  // technique as cdiDailyFactorProvider.ts isStrictDateString.
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(5, 7));
  const d = Number(value.slice(8, 10));
  if (m < 1 || m > 12 || d < 1) return false;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= lastDay;
}

function normalizeToIsoDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isValidIsoDate(trimmed)) return trimmed;
  // Guard against impossible calendar dates inside timestamps (e.g. 2026-02-31T13:00:00Z):
  // validate the leading date component BEFORE Date.parse can roll it over.
  if (trimmed.length >= 10 && ISO_DATE.test(trimmed.slice(0, 10)) && !isValidIsoDate(trimmed.slice(0, 10))) {
    return null;
  }
  // Full timestamps: keep the UTC date part only (consistent with V81/V82 provider).
  const ts = Date.parse(trimmed);
  if (Number.isFinite(ts)) return new Date(ts).toISOString().slice(0, 10);
  return null;
}

// Read-only view of the fields a legacy RF record may expose.
// The readonly contract carries two SEPARATE optional raw fields so that
// provenance survives mapper -> contract -> domain:
// - financialAsOfRaw: EXPLICIT financial valuation timestamp (HIGH);
// - quoteUpdatedAtRaw: broker/update metadata timestamp (MEDIUM).
// Collapsing them into one field would promote MEDIUM metadata to HIGH.
export type FinancialAsOfCandidateItem = Readonly<{
  readonly financialAsOfRaw?: string | null;
  readonly valuationAsOf?: string | null;
  readonly quoteUpdatedAtRaw?: string | null;
  readonly quoteUpdatedAt?: string | null;
  readonly updatedAt?: string | null;
}>;

const EXPLICIT_FIELDS = [
  { key: 'financialAsOfRaw', label: 'financialAsOf', confidence: 'HIGH' },
  { key: 'valuationAsOf', label: 'valuationAsOf', confidence: 'HIGH' },
] as const;

const METADATA_FIELDS = [
  { key: 'quoteUpdatedAtRaw', label: 'quoteUpdatedAt', confidence: 'MEDIUM' },
  { key: 'quoteUpdatedAt', label: 'quoteUpdatedAt', confidence: 'MEDIUM' },
  { key: 'updatedAt', label: 'updated_at', confidence: 'MEDIUM' },
] as const;

export function extractFinancialAsOfEvidence(
  item: FinancialAsOfCandidateItem,
  options: Readonly<{ referenceDate?: string }> = {},
): FinancialAsOfEvidence {
  const reference =
    typeof options.referenceDate === 'string' && isValidIsoDate(options.referenceDate)
      ? options.referenceDate
      : new Date().toISOString().slice(0, 10);

  for (const field of EXPLICIT_FIELDS) {
    const raw = (item as Record<string, unknown>)[field.key];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const normalized = normalizeToIsoDate(raw);
    if (!normalized) {
      return {
        value: null,
        source: field.label,
        confidence: 'UNKNOWN',
        reason: `Campo financeiro explícito ${field.label} presente, mas com valor inválido; não promovido.`,
      };
    }
    if (normalized > reference) {
      return {
        value: null,
        source: field.label,
        confidence: 'UNKNOWN',
        reason: `Data financeira futura rejeitada: ${normalized}.`,
      };
    }
    return {
      value: normalized,
      source: field.label,
      confidence: 'HIGH',
      reason: `Campo financeiro explícito ${field.label}: ${normalized}.`,
    };
  }

  for (const field of METADATA_FIELDS) {
    const raw = (item as Record<string, unknown>)[field.key];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const normalized = normalizeToIsoDate(raw);
    if (!normalized) {
      return {
        value: null,
        source: field.label,
        confidence: 'UNKNOWN',
        reason: `Timestamp ${field.label} inválido rejeitado.`,
      };
    }
    if (normalized > reference) {
      return {
        value: null,
        source: field.label,
        confidence: 'UNKNOWN',
        reason: `Timestamp futuro rejeitado: ${normalized}.`,
      };
    }
    return {
      value: normalized,
      source: field.label,
      confidence: 'MEDIUM',
      reason: `updated_at/quoteUpdatedAt efetivo do registro: ${normalized}; relação temporal forte, sem rótulo explícito de valuation.`,
    };
  }

  return {
    value: null,
    source: null,
    confidence: 'UNKNOWN',
    reason:
      'Nenhuma data financeira confiável; data de aplicação, captura, reconstrução ou importação não são financialAsOf.',
  };
}

export function freshnessFromAsOfEvidence(
  evidence: FinancialAsOfEvidence,
  options: Readonly<{ referenceDate?: string; freshWithinDays?: number }> = {},
): 'FRESH' | 'STALE' | 'UNKNOWN' {
  if (evidence.confidence === 'UNKNOWN' || !evidence.value) {
    return 'UNKNOWN';
  }
  const reference =
    typeof options.referenceDate === 'string' && isValidIsoDate(options.referenceDate)
      ? options.referenceDate
      : new Date().toISOString().slice(0, 10);
  const freshWithin = typeof options.freshWithinDays === 'number' ? options.freshWithinDays : 3;
  const ageDays = Math.round(
    (Date.parse(`${reference}T00:00:00Z`) - Date.parse(`${evidence.value}T00:00:00Z`)) / 86400000,
  );
  if (ageDays < 0) return 'UNKNOWN'; // future evidence was already rejected; defensive
  return ageDays <= freshWithin ? 'FRESH' : 'STALE';
}
