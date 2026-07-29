export function summarizeItemLabel(item: { ticker?: string | null; name?: string | null }): string {
  const ticker = item.ticker?.trim();
  const name = item.name?.trim();

  if (ticker && name) {
    return `${ticker} · ${name}`;
  }

  return ticker || name || 'Sem identificacao';
}
