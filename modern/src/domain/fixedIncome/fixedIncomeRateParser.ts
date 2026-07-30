const RATE_PATTERN = /^(\d+(?:[.,]\d+)?)\s*%\s*(?:aa|a\.a\.)?$/;

export function parseContractRate(rate: unknown): number | null {
  if (typeof rate !== 'string' || !rate.trim()) {
    return null;
  }

  const match = RATE_PATTERN.exec(rate.trim());
  if (!match) {
    return null;
  }

  const raw = match[1].replace(',', '.');
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed / 100;
}
