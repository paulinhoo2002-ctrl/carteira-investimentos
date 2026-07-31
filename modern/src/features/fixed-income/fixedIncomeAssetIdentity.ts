export function resolveFixedIncomeAssetId(asset: unknown): string | null {
  if (asset === null || asset === undefined || typeof asset !== 'object' || Array.isArray(asset)) {
    return null;
  }

  const candidates = [
    (asset as Record<string, unknown>).id,
    (asset as Record<string, unknown>).assetId,
    (asset as Record<string, unknown>).rf_asset_id,
    (asset as Record<string, unknown>).rf_id,
    (asset as Record<string, unknown>).fixed_id,
  ];

  for (let i = 0; i < candidates.length; i++) {
    const value = candidates[i];
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
      continue;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || Number.isNaN(value)) {
        continue;
      }
      if (value <= 0) {
        continue;
      }
      return String(value);
    }
  }
  return null;
}

export function normalizeEventAssetId(event: unknown): string | null {
  if (event === null || event === undefined || typeof event !== 'object' || Array.isArray(event)) {
    return null;
  }

  const record = event as Record<string, unknown>;
  const candidates = [record.assetId, record.asset_id];

  for (let i = 0; i < candidates.length; i++) {
    const value = candidates[i];
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
      continue;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || Number.isNaN(value)) {
        continue;
      }
      if (value <= 0) {
        continue;
      }
      return String(value);
    }
  }
  return null;
}