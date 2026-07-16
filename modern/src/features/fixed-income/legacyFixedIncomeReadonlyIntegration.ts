import type { ReadOnlyFixedIncomeBridge, ReadOnlyFixedIncomeSource } from './fixedIncomeReadonlyContract.mjs';
import type { ReadOnlyFixedIncomeAdapter } from './fixedIncomeSnapshotAdapter.mjs';
import { createFixedIncomeReadonlyBridge } from './fixedIncomeReadonlyBridge.mjs';
import { createFixedIncomeReadonlyAdapter } from './fixedIncomeSnapshotAdapter.mjs';

const CONNECTED_FIXED_INCOME_DEMO_SNAPSHOT = {
  version: 1,
  generatedAt: '2026-07-14T10:30:00.000Z',
  notice: 'Snapshot legado somente leitura de renda fixa. React nao escreve na fonte.',
  summary: {
    totalApplied: 11000,
    totalGross: 11418.5,
    totalLiquid: 11368.5,
    totalProfit: 368.5,
    totalTaxValue: 50,
    totalUnavailableValue: 0,
    itemCount: 3,
  },
  items: [
    {
      ticker: 'CDB26',
      name: 'CDB 2026',
      subtype: 'CDB',
      issuer: 'Banco Teste',
      applicationDate: '2026-01-12',
      maturityDate: '2026-12-15',
      contractedRate: 'CDI + 0,95% aa',
      indexer: 'CDI',
      appliedValue: 4000,
      grossValue: 4128.2,
      liquidValue: 4120.4,
      profitValue: 120.4,
      taxValue: 7.8,
      liquidity: 'Diaria',
      unavailableValue: 0,
      maturityStatus: 'Proximos 12 meses',
      note: 'Demo CDB',
    },
    {
      ticker: 'LCI27',
      name: 'LCI 2027',
      subtype: 'LCI',
      issuer: 'Banco Teste',
      applicationDate: '2025-08-08',
      maturityDate: '2027-08-08',
      contractedRate: '95% CDI',
      indexer: 'CDI',
      appliedValue: 2500,
      grossValue: 2618.77,
      liquidValue: 2618.77,
      profitValue: 118.77,
      taxValue: 0,
      liquidity: 'No vencimento',
      unavailableValue: 0,
      maturityStatus: 'Acima de 12 meses',
      note: 'Demo LCI',
    },
    {
      ticker: 'TESR3',
      name: 'Tesouro Selic 2028',
      subtype: 'Tesouro Direto',
      issuer: 'Tesouro Nacional',
      applicationDate: '2025-03-20',
      maturityDate: '2028-03-01',
      contractedRate: 'Selic + taxa',
      indexer: 'Selic',
      appliedValue: 4500,
      grossValue: 4671.53,
      liquidValue: 4629.33,
      profitValue: 129.33,
      taxValue: 42.2,
      liquidity: 'Diaria',
      unavailableValue: 0,
      maturityStatus: 'Acima de 12 meses',
      note: 'Demo Tesouro',
    },
  ],
} as const;

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

export function createConnectedFixedIncomeDemoSource(): ReadOnlyFixedIncomeSource {
  const snapshot = deepFreeze(CONNECTED_FIXED_INCOME_DEMO_SNAPSHOT);

  return {
    getSnapshot() {
      return snapshot;
    },
  };
}

export function createLegacyFixedIncomeReadonlyBoundary(
  source: ReadOnlyFixedIncomeSource | null | undefined,
): ReadOnlyFixedIncomeSource {
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

export function createConnectedFixedIncomeBridge(
  source: ReadOnlyFixedIncomeSource | null | undefined,
): ReadOnlyFixedIncomeBridge {
  return createFixedIncomeReadonlyBridge(createLegacyFixedIncomeReadonlyBoundary(source));
}

export function createConnectedFixedIncomeAdapter(
  source: ReadOnlyFixedIncomeSource | null | undefined,
): ReadOnlyFixedIncomeAdapter {
  return createFixedIncomeReadonlyAdapter(createConnectedFixedIncomeBridge(source));
}
