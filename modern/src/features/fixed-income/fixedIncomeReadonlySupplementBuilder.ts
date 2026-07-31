import type { HostFixedIncomeAsset } from '../../bootstrap/hostFixedIncomeReadonlySource.ts';
import { parseContractRate } from '../../domain/fixedIncome/fixedIncomeRateParser.ts';
import { countWeekdays } from '../../domain/fixedIncome/fixedIncomeWeekdays.ts';
import type { FixedIncomeValuationSupplementMap } from './fixedIncomeReadonlyValuation.ts';
import { resolveFixedIncomeAssetId, normalizeEventAssetId } from './fixedIncomeAssetIdentity.ts';

export interface BuildSupplementOptions {
  readonly getAssets: () => readonly HostFixedIncomeAsset[];
  readonly getRfEvents?: () => readonly unknown[];
  readonly getGeneratedAt: () => string;
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  return str || null;
}

function extractAssetId(asset: HostFixedIncomeAsset): string | null {
  return resolveFixedIncomeAssetId(asset);
}

function extractIndexer(asset: HostFixedIncomeAsset): string | null {
  return toText(asset?.fixed_indexer ?? asset?.rf_yield_type ?? asset?.indexer);
}

function extractApplicationDate(asset: HostFixedIncomeAsset): string | null {
  return toText(
    asset?.rf_application_date ??
      asset?.rf_aporte_date ??
      asset?.fixed_application_date ??
      asset?.applicationDate ??
      asset?.date,
  );
}

function extractContractedRate(asset: HostFixedIncomeAsset): unknown {
  return asset?.rf_contract_rate ?? asset?.fixed_rate ?? asset?.rate;
}

function matchEventsByAssetId(
  events: readonly unknown[],
  assetId: string,
): readonly unknown[] {
  const result: unknown[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event || typeof event !== 'object') {
      continue;
    }
    const eventAssetId = normalizeEventAssetId(event);
    if (eventAssetId === assetId) {
      result.push(event);
    }
  }

  return result;
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }
  const ts = Date.parse(value.trim());
  return Number.isFinite(ts);
}

export function buildFixedIncomeReadonlySupplementMap(
  options: BuildSupplementOptions,
): FixedIncomeValuationSupplementMap {
  const assets = options.getAssets();
  const rfEventsRaw = options.getRfEvents?.();
  const generatedAt = options.getGeneratedAt();

  if (!Array.isArray(rfEventsRaw) || !isValidDateString(generatedAt)) {
    return Object.freeze({});
  }

  const map: Record<string, unknown> = {};

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    if (!asset || typeof asset !== 'object') {
      continue;
    }

    const assetId = extractAssetId(asset);
    if (!assetId) {
      continue;
    }

    const indexer = extractIndexer(asset);
    if (indexer !== 'PREFIXADO') {
      continue;
    }

    const applicationDate = extractApplicationDate(asset);
    if (!applicationDate) {
      continue;
    }

    const contractedRate = extractContractedRate(asset);
    const annualRate = parseContractRate(contractedRate);
    if (annualRate === null) {
      continue;
    }

    const elapsedBusinessDays = countWeekdays(applicationDate, generatedAt);
    if (elapsedBusinessDays === null) {
      continue;
    }

    const matchedEvents = matchEventsByAssetId(rfEventsRaw, assetId);
    if (matchedEvents.length === 0) {
      continue;
    }

    map[assetId] = Object.freeze({
      annualRate,
      elapsedBusinessDays,
      rfEvents: Object.freeze(matchedEvents),
    });
  }

  return Object.freeze(map) as FixedIncomeValuationSupplementMap;
}
