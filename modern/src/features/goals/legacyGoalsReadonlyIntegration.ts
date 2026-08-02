import { createGoalsReadonlyAdapter } from './goalsSnapshotAdapter.mjs';
import { createGoalsReadonlyBridge } from './goalsReadonlyBridge.mjs';
import type { ReadOnlyGoalsAdapter } from './goalsSnapshotAdapter.mjs';
import type { ReadOnlyGoalsBridge, ReadOnlyGoalsSource } from './goalsReadonlyBridge.mjs';

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }

  return value;
}

const CONNECTED_GOALS_DEMO_SNAPSHOT = deepFreeze({
  version: 1,
  originMode: 'demo-source',
  originLabel: 'Fonte demonstrativa',
  generatedAt: '2026-07-14T10:30:00.000Z',
  notice: 'Snapshot legado somente leitura de metas. React nao escreve na fonte.',
  flags: {
    hasPatrimonyGoal: false,
    hasIncomeGoal: false,
    hasAssetGoal: false,
    hasAllocationGoal: false,
    hasPortfolioData: false,
  },
  patrimony: {
    hasCurrent: false,
    hasTarget: false,
    current: null,
    target: null,
    percent: null,
    barPercent: 0,
    missing: null,
    excess: null,
    reached: false,
    tone: 'muted',
    monthlyContribution: 0,
    annualVariation: 0,
  },
  income: {
    hasCurrent: false,
    hasTarget: false,
    current: null,
    target: null,
    percent: null,
    barPercent: 0,
    missing: null,
    excess: null,
    reached: false,
    tone: 'muted',
    currentMonthKey: '1970-01',
    currentMonthLabel: 'Janeiro 1970',
    currentMonthCount: 0,
    monthlyAverage: 0,
    total12: 0,
    hasData: false,
  },
  assetGoal: {
    type: '',
    ticker: '',
    monthlyContribution: 0,
    annualVariation: 0,
    finalValue: 0,
  },
  allocation: {
    items: [],
  },
  allowedTypes: [],
  history: {
    groups: [],
    summary: { total: 0, monthCount: 0, avg: null },
  },
} as const);

export function createConnectedGoalsDemoSource(): ReadOnlyGoalsSource {
  const snapshot = CONNECTED_GOALS_DEMO_SNAPSHOT;

  return {
    getSnapshot() {
      return snapshot;
    },
  };
}

export function createLegacyGoalsReadonlyBoundary(
  source: ReadOnlyGoalsSource | null | undefined,
): ReadOnlyGoalsSource {
  return {
    getSnapshot() {
      if (!source) {
        return null;
      }

      try {
        return source.getSnapshot?.() ?? null;
      } catch {
        return null;
      }
    },
  };
}

export function createConnectedGoalsBridge(
  source: ReadOnlyGoalsSource | null | undefined,
): ReadOnlyGoalsBridge {
  return createGoalsReadonlyBridge(createLegacyGoalsReadonlyBoundary(source));
}

export function createConnectedGoalsAdapter(
  source: ReadOnlyGoalsSource | null | undefined,
): ReadOnlyGoalsAdapter {
  return createGoalsReadonlyAdapter(createConnectedGoalsBridge(source));
}
