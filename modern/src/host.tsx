import { App } from './App';
import { createHostLegacyReportsReadonlySource } from './bootstrap/hostLegacyReportsReadonlySource';
import { createModernReportsRuntime } from './bootstrap/modernReportsRuntime';
import { mountModernApp } from './bootstrap/mountModernApp';
import { createConnectedReportsDemoSource } from './features/reports/legacyReportsReadonlyIntegration.ts';
import { createReportsRefreshController } from './features/reports/reportsRefreshController.ts';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root nao encontrado.');
}

void bootstrapHost();

function createRefreshableReportsSource(baseSource: { readonly getSnapshot: () => unknown }, getGeneratedAt: () => string) {
  return {
    getSnapshot() {
      const snapshot = baseSource.getSnapshot();
      if (!snapshot || typeof snapshot !== 'object') {
        return snapshot;
      }

      return {
        ...(snapshot as Record<string, unknown>),
        generatedAt: getGeneratedAt(),
      };
    },
  };
}

function createHostExperimentalAssets(revision: number) {
  const offset = revision;

  return [
    {
      ticker: 'PETR4',
      name: 'Petrobras',
      type: 'Ação',
      sector: 'Energia',
      qty: 10,
      avg_price: 20,
      current_price: 25 + offset,
      applied: 200,
      current: 250 + offset * 10,
      source: 'host-experimental',
      updated_at: '2026-07-14T10:30:00.000Z',
    },
    {
      ticker: 'MXRF11',
      name: 'Maxi Renda',
      type: 'FII',
      sector: 'Imobiliario',
      qty: 5,
      avg_price: 100,
      current_price: 90 + offset,
      applied: 500,
      current: 450 + offset * 5,
      source: 'host-experimental',
      updated_at: '2026-07-14T10:30:00.000Z',
    },
    {
      ticker: 'BOVA11',
      name: 'BOVA',
      type: 'ETF',
      sector: 'Ibovespa',
      qty: 2,
      avg_price: 100,
      current_price: 100 + offset,
      applied: 200,
      current: 200 + offset * 2,
      source: 'host-experimental',
      updated_at: '2026-07-14T10:30:00.000Z',
    },
  ] as const;
}

async function bootstrapHost() {
  let experimentalRevision = 0;
  let experimentalAssets = createHostExperimentalAssets(experimentalRevision);

  const baseReportsSource =
    (await createHostLegacyReportsReadonlySource({
      getAssets: () => experimentalAssets,
      getGeneratedAt: () => new Date(Date.parse('2026-07-14T10:30:00.000Z') + experimentalRevision * 60000).toISOString(),
    })) ?? createConnectedReportsDemoSource();

  const initialSnapshot = baseReportsSource.getSnapshot();
  const initialGeneratedAt =
    initialSnapshot && typeof initialSnapshot === 'object' && 'generatedAt' in initialSnapshot
      ? String((initialSnapshot as Record<string, unknown>).generatedAt)
      : '2026-07-14T10:30:00.000Z';
  const reportsRefreshController = createReportsRefreshController({
    source: createRefreshableReportsSource(baseReportsSource, () =>
      new Date(Date.parse(initialGeneratedAt) + experimentalRevision * 60000).toISOString(),
    ),
    onRefresh: () => {
      experimentalRevision += 1;
      experimentalAssets = createHostExperimentalAssets(experimentalRevision);
    },
  });

  const modernReportsRuntime = createModernReportsRuntime({ reportsSource: reportsRefreshController });

  mountModernApp({
    rootElement,
    reportsAdapter: modernReportsRuntime.reportsAdapter,
    AppComponent: App,
    reportsRefreshController,
  });
}
