(function (root, factory) {
  const api = factory(root);

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.createLegacyReportsReadonlySource = api.createLegacyReportsReadonlySource;
  root.buildLegacyReportsReadonlySnapshot = api.buildLegacyReportsReadonlySnapshot;
  root.LEGACY_REPORT_CATEGORY_MAP = api.LEGACY_REPORT_CATEGORY_MAP;
  root.LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT = api.LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const DEFAULT_NOTICE = 'Snapshot legado somente leitura. React nao escreve na fonte.';

  const LEGACY_REPORT_CATEGORY_MAP = deepFreeze({
    Ação: 'Acao demo',
    FII: 'FII demo',
    ETF: 'ETF demo',
  });

  const LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT = deepFreeze({
    generatedAt: '1970-01-01T00:00:00.000Z',
    notice: DEFAULT_NOTICE,
    summary: {
      totalValue: 0,
      itemCount: 0,
      averageVariationPct: 0,
    },
    items: [],
  });

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function normalizeText(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }

    Object.freeze(value);

    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }

    return value;
  }

  function resolveBuildReportAssetRow(deps) {
    if (typeof deps.buildReportAssetRow === 'function') {
      return deps.buildReportAssetRow;
    }

    if (typeof root.buildReportAssetRow === 'function') {
      return root.buildReportAssetRow;
    }

    if (typeof require === 'function') {
      const helper = require('../report-asset-row.js');
      if (typeof helper.buildReportAssetRow === 'function') {
        return helper.buildReportAssetRow;
      }
    }

    return null;
  }

  function mapLegacyCategory(type) {
    const normalized = normalizeText(type, 'Ação');
    return LEGACY_REPORT_CATEGORY_MAP[normalized] || LEGACY_REPORT_CATEGORY_MAP['Ação'];
  }

  function mapTrend(variationPct) {
    if (!isFiniteNumber(variationPct)) {
      return null;
    }

    if (variationPct > 0) {
      return 'positive';
    }

    if (variationPct < 0) {
      return 'negative';
    }

    return 'neutral';
  }

  function normalizeItem(row) {
    const ticker = normalizeText(row.ticker, '');
    const name = normalizeText(row.name, ticker);
    const category = mapLegacyCategory(row.type);
    const quantity = Number(row.qty);
    const averagePrice = Number(row.avgPrice);
    const currentValue = Number(row.current);
    const variationPct = Number(row.resultPct);

    if (!ticker || ticker === '—' || !name) {
      return null;
    }

    if (!isFiniteNumber(quantity) || quantity < 0) {
      return null;
    }

    if (!isFiniteNumber(averagePrice) || averagePrice < 0) {
      return null;
    }

    if (!isFiniteNumber(currentValue) || currentValue < 0) {
      return null;
    }

    if (!isFiniteNumber(variationPct)) {
      return null;
    }

    const trend = mapTrend(variationPct);
    if (!trend) {
      return null;
    }

    return {
      ticker,
      name,
      category,
      quantity,
      averagePrice,
      currentValue,
      variationPct,
      allocationPct: 0,
      trend,
    };
  }

  function createEmptySnapshot(generatedAt, notice) {
    return deepFreeze({
      generatedAt,
      notice,
      summary: {
        totalValue: 0,
        itemCount: 0,
        averageVariationPct: 0,
      },
      items: [],
    });
  }

  function buildLegacyReportsReadonlySnapshot(assets, deps = {}) {
    try {
      const generatedAt = normalizeText(typeof deps.getGeneratedAt === 'function' ? deps.getGeneratedAt() : new Date().toISOString(), '');
      const notice = normalizeText(deps.notice, DEFAULT_NOTICE);

      if (!generatedAt) {
        return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
      }

      if (!Array.isArray(assets)) {
        return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
      }

      if (assets.length === 0) {
        return createEmptySnapshot(generatedAt, notice);
      }

      const buildReportAssetRow = resolveBuildReportAssetRow(deps);
      if (typeof buildReportAssetRow !== 'function') {
        return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
      }

      const items = [];

      for (const asset of assets) {
        if (!isPlainObject(asset)) {
          return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
        }

        const row = buildReportAssetRow(asset, deps);
        if (!isPlainObject(row)) {
          return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
        }

        const item = normalizeItem(row);
        if (!item) {
          return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
        }

        items.push(item);
      }

      const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0);
      const averageVariationPct = items.length > 0
        ? items.reduce((sum, item) => sum + item.variationPct, 0) / items.length
        : 0;
      const safeTotalValue = Number.isFinite(totalValue) ? totalValue : 0;
      const safeAverageVariationPct = Number.isFinite(averageVariationPct) ? averageVariationPct : 0;

      if (items.length > 0 && (!Number.isFinite(safeTotalValue) || !Number.isFinite(safeAverageVariationPct))) {
        return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
      }

      const finalItems = items.map((item) => ({
        ...item,
        allocationPct: safeTotalValue > 0 ? (item.currentValue / safeTotalValue) * 100 : 0,
      }));

      if (finalItems.some((item) => !Number.isFinite(item.allocationPct))) {
        return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
      }

      return deepFreeze({
        generatedAt,
        notice,
        summary: {
          totalValue: safeTotalValue,
          itemCount: finalItems.length,
          averageVariationPct: safeAverageVariationPct,
        },
        items: finalItems,
      });
    } catch {
      return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
    }
  }

  function createLegacyReportsReadonlySource(deps = {}) {
    return {
      getSnapshot() {
        try {
          const assets = typeof deps.getAssets === 'function' ? deps.getAssets() : [];
          return buildLegacyReportsReadonlySnapshot(assets, deps);
        } catch {
          return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
        }
      },
    };
  }

  return {
    DEFAULT_NOTICE,
    LEGACY_REPORT_CATEGORY_MAP,
    LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT,
    buildLegacyReportsReadonlySnapshot,
    createLegacyReportsReadonlySource,
  };
});
