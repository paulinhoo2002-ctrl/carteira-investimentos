import { App } from './App';
import { createHostLegacyReportsReadonlySource } from './bootstrap/hostLegacyReportsReadonlySource';
import { createModernReportsRuntime } from './bootstrap/modernReportsRuntime';
import { mountModernApp } from './bootstrap/mountModernApp';
import { createConnectedReportsDemoSource } from './features/reports/legacyReportsReadonlyIntegration.ts';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root nao encontrado.');
}

void bootstrapHost();

async function bootstrapHost() {
  const reportsSource = (await createHostLegacyReportsReadonlySource()) ?? createConnectedReportsDemoSource();
  const modernReportsRuntime = createModernReportsRuntime({ reportsSource });

  mountModernApp({
    rootElement,
    reportsAdapter: modernReportsRuntime.reportsAdapter,
    AppComponent: App,
  });
}
