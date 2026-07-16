import { createContributionsReadonlyAdapter } from './contributionsSnapshotAdapter.mjs';
import { createContributionsReadonlyBridge } from './contributionsReadonlyBridge.mjs';
import type { ReadOnlyContributionsAdapter } from './contributionsSnapshotAdapter.mjs';
import type { ReadOnlyContributionsBridge, ReadOnlyContributionsSource } from './contributionsReadonlyBridge.mjs';

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

const CONNECTED_CONTRIBUTIONS_DEMO_SNAPSHOT = deepFreeze({
  version: 1,
  originMode: 'demo-source',
  originLabel: 'Fonte demonstrativa',
  generatedAt: '2026-07-14T10:30:00.000Z',
  notice: 'Snapshot legado somente leitura de aportes. React nao escreve na fonte.',
  summary: {
    itemCount: 4,
    classCount: 3,
    monthCount: 2,
    candidateCount: 2,
    insufficientCount: 1,
    avoidedCount: 1,
    latestContributionDate: '2026-07-14T00:00:00.000Z',
  },
  items: [
    {
      id: 'apo-001',
      sourceEventId: 'evt-001',
      sourceEventKind: 'aporte',
      assetId: 'PETR4',
      date: '2026-06-15',
      ticker: 'PETR4',
      assetName: 'Petrobras',
      assetClass: 'Acao',
      amount: null,
      quantity: 10,
      unitPrice: 28.5,
      operation: 'compra',
      source: 'demo',
      note: 'Aporte demo em acao',
      createdAt: '2026-06-15T10:30:00.000Z',
      updatedAt: null,
    },
    {
      id: 'apo-002',
      sourceEventId: 'evt-002',
      sourceEventKind: 'aporte',
      assetId: 'MXRF11',
      date: '2026-06-28',
      ticker: 'MXRF11',
      assetName: 'Maxi Renda',
      assetClass: 'FII',
      amount: null,
      quantity: 5,
      unitPrice: 101.2,
      operation: 'compra',
      source: 'demo',
      note: 'Aporte demo em FII',
      createdAt: '2026-06-28T10:30:00.000Z',
      updatedAt: null,
    },
    {
      id: 'apo-003',
      sourceEventId: 'evt-003',
      sourceEventKind: 'aporte',
      assetId: 'CDB26',
      date: '2026-07-03',
      ticker: 'CDB26',
      assetName: 'CDB 2026',
      assetClass: 'Renda Fixa',
      amount: 4000,
      quantity: 1,
      unitPrice: 4000,
      operation: 'compra',
      source: 'demo',
      note: 'Aporte demo em renda fixa',
      createdAt: '2026-07-03T10:30:00.000Z',
      updatedAt: null,
    },
    {
      id: 'apo-004',
      sourceEventId: 'evt-004',
      sourceEventKind: 'aporte',
      assetId: 'BOVA11',
      date: '2026-07-14',
      ticker: 'BOVA11',
      assetName: 'BOVA',
      assetClass: 'ETF',
      amount: null,
      quantity: 2,
      unitPrice: 105.2,
      operation: 'compra',
      source: 'demo',
      note: 'Aporte demo em ETF',
      createdAt: '2026-07-14T10:30:00.000Z',
      updatedAt: null,
    },
  ],
  classDistribution: [
    { label: 'Acao', itemCount: 1, latestContributionDate: '2026-06-15T00:00:00.000Z' },
    { label: 'ETF', itemCount: 1, latestContributionDate: '2026-07-14T00:00:00.000Z' },
    { label: 'FII', itemCount: 1, latestContributionDate: '2026-06-28T00:00:00.000Z' },
    { label: 'Renda Fixa', itemCount: 1, latestContributionDate: '2026-07-03T00:00:00.000Z' },
  ],
  monthDistribution: [
    { monthKey: '2026-06', label: 'Junho de 2026', itemCount: 2 },
    { monthKey: '2026-07', label: 'Julho de 2026', itemCount: 2 },
  ],
  suggestion: {
    status: 'available',
    generatedAt: '2026-07-14T10:30:00.000Z',
    strategyName: 'Analise prudente do legado',
    candidates: [
      {
        assetId: 'PETR4',
        ticker: 'PETR4',
        assetName: 'Petrobras',
        assetClass: 'Acao',
        sector: 'Energia',
        score: 42,
        share: 8.5,
        pct: 4.2,
        dy: 5.7,
        idealWeightPct: 12,
        typeGapPct: 3.4,
        signalLabel: 'Pode estudar aporte',
        signalTone: 'positive',
        reasons: [
          { code: 'signal', label: 'Pode estudar aporte', detail: 'Sinal prudente favoravel ao estudo', sourceField: 'signal.label', value: 'Pode estudar aporte', unit: null },
          { code: 'criterion-1', label: 'Concentracao saudavel', detail: 'Concentracao saudavel', sourceField: 'criteria', value: 'concentracao saudavel', unit: null },
          { code: 'criterion-2', label: 'Abaixo do peso ideal', detail: 'Abaixo do peso ideal', sourceField: 'criteria', value: 'abaixo do peso ideal em 3.4 p.p.', unit: null },
        ],
        warnings: [],
      },
      {
        assetId: 'MXRF11',
        ticker: 'MXRF11',
        assetName: 'Maxi Renda',
        assetClass: 'FII',
        sector: 'Imobiliario',
        score: 18,
        share: 4.1,
        pct: -1.5,
        dy: 11.2,
        idealWeightPct: 9,
        typeGapPct: 1.0,
        signalLabel: 'Acompanhar',
        signalTone: 'neutral',
        reasons: [
          { code: 'signal', label: 'Acompanhar', detail: 'Ativo em acompanhamento', sourceField: 'signal.label', value: 'Acompanhar', unit: null },
          { code: 'criterion-1', label: 'Concentracao controlada', detail: 'Concentracao controlada', sourceField: 'criteria', value: 'concentracao controlada', unit: null },
        ],
        warnings: ['Acompanhar'],
      },
    ],
    warnings: ['Concentracao acima do limite prudente em parte dos ativos', 'Alguns registros ainda sao insuficientes'],
    inputs: [
      'S.aportes',
      'allocationGoalItems()',
      'allocationActualByType()',
      'assetAnalysisRows()',
      'assetContributionSignal()',
    ],
    limitations: [
      'Nao executa compra',
      'Nao recalcula nova recomendacao',
      'Nao altera pesos ou metas',
      'Nao usa cotacao externa',
    ],
  },
} as const);

export function createConnectedContributionsDemoSource(): ReadOnlyContributionsSource {
  const snapshot = CONNECTED_CONTRIBUTIONS_DEMO_SNAPSHOT;

  return {
    getSnapshot() {
      return snapshot;
    },
  };
}

export function createLegacyContributionsReadonlyBoundary(
  source: ReadOnlyContributionsSource | null | undefined,
): ReadOnlyContributionsSource {
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

export function createConnectedContributionsBridge(
  source: ReadOnlyContributionsSource | null | undefined,
): ReadOnlyContributionsBridge {
  return createContributionsReadonlyBridge(createLegacyContributionsReadonlyBoundary(source));
}

export function createConnectedContributionsAdapter(
  source: ReadOnlyContributionsSource | null | undefined,
): ReadOnlyContributionsAdapter {
  return createContributionsReadonlyAdapter(createConnectedContributionsBridge(source));
}
