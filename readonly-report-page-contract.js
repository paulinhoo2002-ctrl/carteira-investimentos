(function (root, factory) {
  const contract = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = contract;
  }

  if (root && !root.ReadonlyReportPageContract) {
    Object.defineProperty(root, 'ReadonlyReportPageContract', {
      configurable: false,
      enumerable: false,
      value: contract,
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

  return Object.freeze({
    READONLY_REPORT_PAGE_IDS,
    DEFAULT_READONLY_REPORT_PAGE_ID,
    isReadonlyReportPageId,
    normalizeReadonlyReportPageId,
  });
});
