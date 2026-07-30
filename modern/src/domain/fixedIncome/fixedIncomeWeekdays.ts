function parseUTCDate(iso: string): Date | null {
  if (!iso || typeof iso !== 'string') {
    return null;
  }

  const trimmed = iso.trim();
  if (!trimmed) {
    return null;
  }

  // Aceitar somente YYYY-MM-DD ou ISO 8601 com timezone explícito
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateMatch) {
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
      return null;
    }
    return d;
  }

  const tsMatch = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(trimmed);
  if (!tsMatch) {
    return null;
  }

  const year = Number(tsMatch[1]);
  const month = Number(tsMatch[2]);
  const day = Number(tsMatch[3]);

  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }

  const ts = Date.parse(trimmed);
  if (!Number.isFinite(ts)) {
    return null;
  }

  return new Date(ts);
}

function isWeekday(date: Date): boolean {
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}

export function countWeekdays(fromISO: string, toISO: string): number | null {
  const from = parseUTCDate(fromISO);
  const to = parseUTCDate(toISO);

  if (!from || !to) {
    return null;
  }

  const fromTime = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toTime = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());

  if (toTime < fromTime) {
    return null;
  }

  if (toTime === fromTime) {
    return 0;
  }

  let count = 0;
  const current = new Date(fromTime);

  current.setUTCDate(current.getUTCDate() + 1);

  while (current.getTime() <= toTime) {
    if (isWeekday(current)) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}
