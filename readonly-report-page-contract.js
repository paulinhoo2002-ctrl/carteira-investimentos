(function (root, factory) {
  const contract = factory();
  const exportedContract = Object.freeze({
    ...contract,
    default: contract,
  });

  if (typeof module === 'object' && module.exports) {
    module.exports = exportedContract;
  }

  const shouldInstallOnGlobal =
    root &&
    typeof document !== 'undefined' &&
    document.currentScript &&
    document.currentScript.type !== 'module';

  if (shouldInstallOnGlobal && !root.ReadonlyReportPageContract) {
    Object.defineProperty(root, 'ReadonlyReportPageContract', {
      configurable: false,
      enumerable: false,
      value: exportedContract,
      writable: false,
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : undefined, function () {
  const READONLY_REPORT_PAGE_IDS = Object.freeze([
    'overview',
    'assets',
    'fixed-income',
    'provents',
    'contributions',
    'reports',
    'settings',
  ]);

  const DEFAULT_READONLY_REPORT_PAGE_ID = 'reports';

  function isReadonlyReportPageId(value) {
    return typeof value === 'string' && READONLY_REPORT_PAGE_IDS.includes(value);
  }

  function normalizeReadonlyReportPageId(value, fallback = DEFAULT_READONLY_REPORT_PAGE_ID) {
    const normalizedValue = String(value ?? '').trim();
    if (isReadonlyReportPageId(normalizedValue)) {
      return normalizedValue;
    }

    const normalizedFallback = String(fallback ?? '').trim();
    return isReadonlyReportPageId(normalizedFallback)
      ? normalizedFallback
      : DEFAULT_READONLY_REPORT_PAGE_ID;
  }

  function isReadonlyReportPageContract(value) {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value;
    const candidateIds = candidate.READONLY_REPORT_PAGE_IDS;

    if (!Array.isArray(candidateIds) || candidateIds.length !== READONLY_REPORT_PAGE_IDS.length) {
      return false;
    }

    if (!candidateIds.every((id, index) => id === READONLY_REPORT_PAGE_IDS[index])) {
      return false;
    }

    if (candidate.DEFAULT_READONLY_REPORT_PAGE_ID !== DEFAULT_READONLY_REPORT_PAGE_ID) {
      return false;
    }

    if (typeof candidate.isReadonlyReportPageId !== 'function') {
      return false;
    }

    if (typeof candidate.normalizeReadonlyReportPageId !== 'function') {
      return false;
    }

    try {
      if (candidate.isReadonlyReportPageId('reports') !== true) {
        return false;
      }

      if (candidate.isReadonlyReportPageId('invalid') !== false) {
        return false;
      }

      if (candidate.normalizeReadonlyReportPageId('assets', 'reports') !== 'assets') {
        return false;
      }

      if (candidate.normalizeReadonlyReportPageId('invalid', 'assets') !== 'assets') {
        return false;
      }

      if (candidate.normalizeReadonlyReportPageId('invalid', 'invalid') !== 'reports') {
        return false;
      }

      if (candidate.normalizeReadonlyReportPageId(' assets ', ' reports ') !== 'assets') {
        return false;
      }

      if (candidate.normalizeReadonlyReportPageId('REPORTS', 'assets') !== 'assets') {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  }

  function createReadonlyReportPageContractSafeFallback() {
    const fallbackDefault = DEFAULT_READONLY_REPORT_PAGE_ID;

    return Object.freeze({
      READONLY_REPORT_PAGE_IDS: Object.freeze([fallbackDefault]),
      DEFAULT_READONLY_REPORT_PAGE_ID: fallbackDefault,
      isReadonlyReportPageId(value) {
        return value === fallbackDefault;
      },
      normalizeReadonlyReportPageId(value, fallback = fallbackDefault) {
        const normalizedValue = String(value ?? '').trim();
        if (normalizedValue === fallbackDefault) {
          return fallbackDefault;
        }

        return fallbackDefault;
      },
    });
  }

  function readReadonlyReportPageContractGlobalCandidate() {
    try {
      if (typeof globalThis === 'undefined') {
        return undefined;
      }

      return globalThis.ReadonlyReportPageContract;
    } catch {
      return undefined;
    }
  }

  function getReadonlyReportPageContract(candidate) {
    const contractCandidate = arguments.length > 0 ? candidate : readReadonlyReportPageContractGlobalCandidate();

    try {
      return isReadonlyReportPageContract(contractCandidate)
        ? contractCandidate
        : createReadonlyReportPageContractSafeFallback();
    } catch {
      return createReadonlyReportPageContractSafeFallback();
    }
  }

  return Object.freeze({
    READONLY_REPORT_PAGE_IDS,
    DEFAULT_READONLY_REPORT_PAGE_ID,
    isReadonlyReportPageId,
    normalizeReadonlyReportPageId,
    isReadonlyReportPageContract,
    getReadonlyReportPageContract,
  });
});
