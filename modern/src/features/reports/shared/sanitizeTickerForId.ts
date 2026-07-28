export function sanitizeTickerForId(ticker: string): string {
  const sanitized = String(ticker).trim().replace(/[^A-Za-z0-9_-]/g, '-');
  return sanitized.length > 0 ? sanitized : 'asset';
}
