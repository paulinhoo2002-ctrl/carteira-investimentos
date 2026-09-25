export type IpcAContract =
  | Readonly<{
      kind: 'IPCA_PLUS_SPREAD';
      annualSpreadRate: number;
    }>
  | Readonly<{
      kind: 'IPCA_PURE';
    }>;

export function parseIpcaContract(
  contractedRate: string | null | undefined,
  indexer: string | null | undefined,
): IpcAContract | null {
  const rateText = (contractedRate ?? '').trim().toUpperCase().replace(',', '.');
  const indexerText = (indexer ?? '').trim().toUpperCase();

  // An explicit IPCA contract has precedence. Never reinterpret malformed or
  // contradictory IPCA terms as pure IPCA from the separate indexer field.
  if (/IPCA/i.test(rateText)) {
    const explicitSpread = /^IPCA\s*\+\s*(\d+(?:\.\d+)?)\s*%\s*(AA|A\.A\.)$/i.exec(rateText);
    if (explicitSpread) {
      const spread = Number(explicitSpread[1]) / 100;
      return Number.isFinite(spread) && spread >= 0 && spread <= 1
        ? { kind: 'IPCA_PLUS_SPREAD', annualSpreadRate: spread }
        : null;
    }
    return /^IPCA$/.test(rateText) ? { kind: 'IPCA_PURE' } : null;
  }

  if (/\b(CDI|PREFIX|PREFIXADO|PRÉ-FIXADO)\b/i.test(rateText)) return null;
  // Any other explicit rate text is a conflicting/unknown contract, not a
  // license to infer a pure-IPCA contract from the indexer field.
  if (rateText) return null;

  // Indexer fallback is allowed only when the rate field is blank/neutral.
  if (/IPCA/i.test(indexerText)) {
    const spreadMatch2 = /^IPCA\s*\+\s*(\d+(?:\.\d+)?)\s*%\s*(AA|A\.A\.)$/i.exec(indexerText);
    if (spreadMatch2) {
      const spread = Number(spreadMatch2[1]) / 100;
      if (Number.isFinite(spread) && spread >= 0 && spread <= 1) {
        return { kind: 'IPCA_PLUS_SPREAD', annualSpreadRate: spread };
      }
    }
  }

  if (/^IPCA$/.test(indexerText)) {
    return { kind: 'IPCA_PURE' };
  }

  return null;
}
