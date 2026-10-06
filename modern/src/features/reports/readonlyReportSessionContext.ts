import * as readonlyReportPageContractModule from '../../../../readonly-report-page-contract.js';
import type { ModernPageId } from '../../types/navigation.mjs';
import { MODERN_PAGES } from '../../types/navigation.mjs';

export interface ReadonlyReportSessionContext {
  readonly pageId: ModernPageId;
}

const SESSION_PAGE_PARAM = 'readonlyReportPage';
const readonlyReportPageContract =
  ((readonlyReportPageContractModule as { readonly default?: unknown }).default ??
    readonlyReportPageContractModule) as {
    readonly getReadonlyReportPageContract?: (candidate?: unknown) => {
      readonly DEFAULT_READONLY_REPORT_PAGE_ID: ModernPageId;
      normalizeReadonlyReportPageId(value: string | null, fallback?: ModernPageId): ModernPageId;
    };
  };

const resolvedReadonlyReportPageContract = readonlyReportPageContract.getReadonlyReportPageContract?.(
  readonlyReportPageContract,
);
const modernPageIds = new Set(MODERN_PAGES.map((page) => page.id));

function normalizePageId(value: string | null, fallback: ModernPageId): ModernPageId {
  try {
    const normalizedByContract = resolvedReadonlyReportPageContract?.normalizeReadonlyReportPageId(value, fallback);
    if (normalizedByContract && modernPageIds.has(normalizedByContract)) return normalizedByContract;
  } catch {
    // Keep valid modern routes available if the shared contract module interop fails.
  }

  const requestedPageId = String(value ?? '').trim();
  if (modernPageIds.has(requestedPageId as ModernPageId)) return requestedPageId as ModernPageId;
  return modernPageIds.has(fallback) ? fallback : 'reports';
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
