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

  if (typeof require === 'function') {
    const helper = require('../report-asset-row.js');
    if (typeof helper.buildReportAssetRow === 'function') {
      return helper.buildReportAssetRow;
    }
  }

  return null;
}

function mapLegacyCategory(type) {
  const normalized = normalizeText(type, '');
  if (!normalized || !Object.prototype.hasOwnProperty.call(LEGACY_REPORT_CATEGORY_MAP, normalized)) {
    return null;
  }

  return LEGACY_REPORT_CATEGORY_MAP[normalized];
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

function resolveSummaryNumber(calculator, fallbackCalculator) {
  if (typeof calculator === 'function') {
    return calculator();
  }

  return fallbackCalculator();
}

function calculateTotalValue(items, deps) {
  return resolveSummaryNumber(
    deps.totalValueCalculator,
    () => items.reduce((sum, item) => sum + item.currentValue, 0),
  );
}

function calculateAverageVariationPct(items, deps) {
  return resolveSummaryNumber(
    deps.averageVariationPctCalculator,
    () => (items.length > 0 ? items.reduce((sum, item) => sum + item.variationPct, 0) / items.length : 0),
  );
}

function calculateAllocationPct(item, totalValue, deps) {
  if (typeof deps.allocationPctCalculator === 'function') {
    return deps.allocationPctCalculator(item, totalValue);
  }

  if (!isFiniteNumber(totalValue) || totalValue <= 0) {
    return 0;
  }

  return (item.currentValue / totalValue) * 100;
}

function normalizeItem(row, deps) {
  const ticker = normalizeText(row.ticker, '');
  const name = normalizeText(row.name, ticker);
  const category = mapLegacyCategory(row.type);
  const quantity = Number(row.qty);
  const averagePrice = Number(row.avgPrice);
  const currentValue = Number(row.current);
  const variationPct = Number(row.resultPct);

  if (!ticker || !name || !category) {
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

  const item = {
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

  const allocationPct = calculateAllocationPct(item, deps.__totalValue, deps);
  if (!isFiniteNumber(allocationPct)) {
    return null;
  }

  item.allocationPct = allocationPct;
  return item;
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

    const rows = [];

    for (const asset of assets) {
      if (!isPlainObject(asset)) {
        return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
      }

      const row = buildReportAssetRow(asset, deps);
      if (!isPlainObject(row)) {
        return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
      }

      rows.push(row);
    }

    const totalValue = calculateTotalValue(
      rows.map((row) => ({
        currentValue: Number(row.current),
        variationPct: Number(row.resultPct),
      })),
      deps,
    );

    const averageVariationPct = calculateAverageVariationPct(
      rows.map((row) => ({
        currentValue: Number(row.current),
        variationPct: Number(row.resultPct),
      })),
      deps,
    );

    if (!isFiniteNumber(totalValue) || !isFiniteNumber(averageVariationPct)) {
      return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
    }

    const items = rows.map((row) => normalizeItem(row, { ...deps, __totalValue: totalValue }));
    if (items.some((item) => !item)) {
      return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
    }

    const finalItems = items.map((item) => ({
      ...item,
      allocationPct: calculateAllocationPct(item, totalValue, deps),
    }));

    if (finalItems.some((item) => !isFiniteNumber(item.allocationPct))) {
      return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
    }

    return deepFreeze({
      generatedAt,
      notice,
      summary: {
        totalValue,
        itemCount: finalItems.length,
        averageVariationPct,
      },
      items: finalItems,
    });
  } catch {
    return LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
  }
}

function createLegacyAssetsReadonlyProvider(deps = {}) {
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

const createLegacyReportsReadonlySource = (deps = {}) => createLegacyAssetsReadonlyProvider(deps);

function installLegacyReportsReadonlySource(target = globalThis) {
  if (!target || typeof target !== 'object') {
    return null;
  }

  Object.defineProperties(target, {
    createLegacyAssetsReadonlyProvider: {
      value: createLegacyAssetsReadonlyProvider,
      configurable: true,
      writable: true,
      enumerable: true,
    },
  });

  return target;
}

if (typeof module === 'object' && module.exports) {
  module.exports = {
    DEFAULT_NOTICE,
    LEGACY_REPORT_CATEGORY_MAP,
    LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT,
    buildLegacyReportsReadonlySnapshot,
    createLegacyAssetsReadonlyProvider,
    createLegacyReportsReadonlySource,
    installLegacyReportsReadonlySource,
    mapLegacyCategory,
  };
}
