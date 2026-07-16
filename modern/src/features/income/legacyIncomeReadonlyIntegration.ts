import { createIncomeReadonlyAdapter, INCOME_READONLY_ADAPTER } from './incomeSnapshotAdapter.mjs';
import { createIncomeReadonlyBridge } from './incomeReadonlyBridge.mjs';
import type { ReadOnlyIncomeAdapter } from './incomeSnapshotAdapter.mjs';
import type { ReadOnlyIncomeBridge, ReadOnlyIncomeSource } from './incomeReadonlyBridge.mjs';

const CONNECTED_INCOME_DEMO_SNAPSHOT = {
  version: 1,
  generatedAt: '2026-07-14T10:30:00.000Z',
  notice: 'Snapshot legado somente leitura de proventos. React nao escreve na fonte.',
  summary: {
    totalReceived: 748.51,
    monthTotal: 748.51,
    yearTotal: 748.51,
    averageMonthly: 62.38,
    paymentCount: 4,
  },
  items: [
    {
      id: 'inc-001',
      ticker: 'PETR4',
      name: 'Petrobras',
      type: 'Dividendo',
      paymentDate: '2026-06-15',
      competenceDate: null,
      grossValue: null,
      netValue: 320,
      taxValue: null,
      quantity: null,
      note: 'Demo de provento recebido',
      source: 'demo',
      sourceEventKind: null,
      sourceEventId: null,
    },
    {
      id: 'inc-002',
      ticker: 'BBAS3',
      name: 'Banco do Brasil',
      type: 'JCP',
      paymentDate: '2026-06-27',
      competenceDate: null,
      grossValue: null,
      netValue: 215.41,
      taxValue: null,
      quantity: null,
      note: 'Demo de JCP',
      source: 'demo',
      sourceEventKind: null,
      sourceEventId: null,
    },
    {
      id: 'inc-003',
      ticker: 'ITSA4',
      name: 'Itausa',
      type: 'Rendimento',
      paymentDate: '2026-07-05',
      competenceDate: null,
      grossValue: null,
      netValue: 168.5,
      taxValue: null,
      quantity: null,
      note: 'Demo de rendimento',
      source: 'demo',
      sourceEventKind: null,
      sourceEventId: null,
    },
    {
      id: 'inc-004',
      ticker: 'CDB26',
      name: 'CDB 2026',
      type: 'Juros de Renda Fixa',
      paymentDate: '2026-07-14',
      competenceDate: null,
      grossValue: null,
      netValue: 44.6,
      taxValue: null,
      quantity: null,
      note: 'Demo de renda fixa',
      source: 'demo',
      sourceEventKind: null,
      sourceEventId: null,
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

export function createConnectedIncomeDemoSource(): ReadOnlyIncomeSource {
  const snapshot = deepFreeze(CONNECTED_INCOME_DEMO_SNAPSHOT);

  return {
    getSnapshot() {
      return snapshot;
    },
  };
}

export function createLegacyIncomeReadonlyBoundary(
  source: ReadOnlyIncomeSource | null | undefined,
): ReadOnlyIncomeSource {
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

export function createConnectedIncomeBridge(
  source: ReadOnlyIncomeSource | null | undefined,
): ReadOnlyIncomeBridge {
  return createIncomeReadonlyBridge(createLegacyIncomeReadonlyBoundary(source));
}

export function createConnectedIncomeAdapter(
  source: ReadOnlyIncomeSource | null | undefined,
): ReadOnlyIncomeAdapter {
  return createIncomeReadonlyAdapter(createConnectedIncomeBridge(source));
}

export { INCOME_READONLY_ADAPTER };
