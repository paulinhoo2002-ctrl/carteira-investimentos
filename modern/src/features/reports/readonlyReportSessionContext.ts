import type { ModernPageId } from '../../types/navigation';

export interface ReadonlyReportSessionContext {
  readonly pageId: ModernPageId;
}

const SESSION_PAGE_PARAM = 'readonlyReportPage';
const SESSION_PAGE_IDS = new Set<ModernPageId>([
  'overview',
  'assets',
  'fixed-income',
  'provents',
  'contributions',
  'reports',
  'settings',
]);

function isModernPageId(value: string | null): value is ModernPageId {
  return typeof value === 'string' && SESSION_PAGE_IDS.has(value as ModernPageId);
}

function normalizePageId(value: string | null, fallback: ModernPageId): ModernPageId {
  return isModernPageId(value) ? value : fallback;
}

export function readReadonlyReportSessionContext(
  input: string | URLSearchParams | null | undefined,
  fallbackPageId: ModernPageId = 'reports',
): ReadonlyReportSessionContext {
  const params = input instanceof URLSearchParams ? input : new URLSearchParams(input ?? '');

  return {
    pageId: normalizePageId(params.get(SESSION_PAGE_PARAM), fallbackPageId),
  };
}

export function buildReadonlyReportSessionSearch(
  pageId: ModernPageId,
  currentSearch: string | URLSearchParams | null | undefined = '',
): string {
  const params = currentSearch instanceof URLSearchParams ? new URLSearchParams(currentSearch) : new URLSearchParams(currentSearch ?? '');

  params.set(SESSION_PAGE_PARAM, normalizePageId(pageId, 'reports'));

  return params.toString();
}

export function buildReadonlyReportSessionUrl(
  currentUrl: string | URL,
  pageId: ModernPageId,
  overrides: {
    readonly includeActiveWalletHost?: boolean;
    readonly includeTestMode?: boolean;
  } = {},
): string {
  const url = currentUrl instanceof URL ? new URL(currentUrl.toString()) : new URL(currentUrl);

  url.searchParams.set(SESSION_PAGE_PARAM, normalizePageId(pageId, 'reports'));

  if (overrides.includeActiveWalletHost !== false) {
    url.searchParams.set('activeWalletHost', '1');
  }

  if (overrides.includeTestMode !== false) {
    url.searchParams.set('testMode', '1');
  }

  url.hash = '';

  return url.toString();
}

export function withReadonlyReportSessionFallback(
  currentSearch: string | URLSearchParams | null | undefined,
  fallbackPageId: ModernPageId = 'reports',
): ReadonlyReportSessionContext {
  return readReadonlyReportSessionContext(currentSearch, fallbackPageId);
}
