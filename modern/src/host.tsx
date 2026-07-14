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

async function bootstrapHost() {
  const baseReportsSource = (await createHostLegacyReportsReadonlySource()) ?? createConnectedReportsDemoSource();
  const initialSnapshot = baseReportsSource.getSnapshot();
  const initialGeneratedAt =
    initialSnapshot && typeof initialSnapshot === 'object' && 'generatedAt' in initialSnapshot
      ? String((initialSnapshot as Record<string, unknown>).generatedAt)
      : '2026-07-14T10:30:00.000Z';
  const baseTimestamp = Number.isFinite(Date.parse(initialGeneratedAt))
    ? Date.parse(initialGeneratedAt)
    : Date.parse('2026-07-14T10:30:00.000Z');

  let refreshRevision = 0;
  const readGeneratedAt = () => new Date(baseTimestamp + refreshRevision * 60000).toISOString();
  const refreshableReportsSource = createRefreshableReportsSource(baseReportsSource, readGeneratedAt);
  const reportsRefreshController = createReportsRefreshController({
    source: refreshableReportsSource,
    onRefresh: () => {
      refreshRevision += 1;
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
