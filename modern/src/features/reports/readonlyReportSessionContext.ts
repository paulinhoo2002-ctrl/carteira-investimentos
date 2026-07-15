import * as readonlyReportPageContractModule from '../../../../readonly-report-page-contract.js';
import type { ModernPageId } from '../../types/navigation';

export interface ReadonlyReportSessionContext {
  readonly pageId: ModernPageId;
}

const SESSION_PAGE_PARAM = 'readonlyReportPage';
function readReadonlyReportPageContractCandidate(): unknown {
  try {
    if (typeof globalThis === 'undefined') {
      return undefined;
    }

    return (globalThis as { readonly ReadonlyReportPageContract?: unknown }).ReadonlyReportPageContract;
  } catch {
    return undefined;
  }
}

function createReadonlyReportPageContractFallback() {
  const fallbackDefaultPageId = 'reports' as ModernPageId;

  return {
    DEFAULT_READONLY_REPORT_PAGE_ID: fallbackDefaultPageId,
    isReadonlyReportPageId(value: unknown): value is ModernPageId {
      return value === fallbackDefaultPageId;
    },
    normalizeReadonlyReportPageId(): ModernPageId {
      return fallbackDefaultPageId;
    },
  };
}

function readReadonlyReportPageContractExports():
  | {
      readonly DEFAULT_READONLY_REPORT_PAGE_ID?: unknown;
      isReadonlyReportPageId?: unknown;
      normalizeReadonlyReportPageId?: unknown;
      resolveReadonlyReportPageContract?: unknown;
      readonly default?: unknown;
    }
  | undefined {
  const candidate = readonlyReportPageContractModule as
    | {
        readonly default?: unknown;
        readonly [key: string]: unknown;
      }
    | undefined;

  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  const defaultExport = candidate.default;
  if (defaultExport && typeof defaultExport === 'object') {
    return defaultExport as {
      readonly DEFAULT_READONLY_REPORT_PAGE_ID?: unknown;
      isReadonlyReportPageId?: unknown;
      normalizeReadonlyReportPageId?: unknown;
      resolveReadonlyReportPageContract?: unknown;
      readonly default?: unknown;
    };
  }

  return candidate;
}

function resolveReadonlyReportPageContractSafely() {
  const contractExports = readReadonlyReportPageContractExports() ?? readReadonlyReportPageContractCandidate();
  const resolver = contractExports?.resolveReadonlyReportPageContract;

  if (typeof resolver === 'function') {
    try {
      const resolved = resolver(contractExports);
      if (resolved && typeof resolved === 'object') {
        return resolved as {
          readonly DEFAULT_READONLY_REPORT_PAGE_ID: ModernPageId;
          isReadonlyReportPageId(value: unknown): value is ModernPageId;
          normalizeReadonlyReportPageId(value: string | null, fallback?: ModernPageId): ModernPageId;
        };
      }
    } catch {
      return createReadonlyReportPageContractFallback();
    }
  }

  return createReadonlyReportPageContractFallback();
}

const resolvedReadonlyReportPageContract = resolveReadonlyReportPageContractSafely();

function normalizePageId(value: string | null, fallback: ModernPageId): ModernPageId {
  return resolvedReadonlyReportPageContract.normalizeReadonlyReportPageId(value, fallback) as ModernPageId;
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
