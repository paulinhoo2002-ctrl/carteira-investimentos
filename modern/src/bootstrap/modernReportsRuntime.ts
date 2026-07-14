import { createConnectedReportsAdapter, createConnectedReportsDemoSource } from '../features/reports/legacyReportsReadonlyIntegration.ts';
import type { ReadOnlyReportsAdapter } from '../features/reports/reportsSnapshotAdapter.ts';
import type { ReadOnlyReportsSource } from '../features/reports/reportsReadonlyBridge.ts';

export interface ModernReportsRuntimeOptions {
  readonly reportsSource?: ReadOnlyReportsSource | null;
}

export interface ModernReportsRuntime {
  readonly reportsAdapter: ReadOnlyReportsAdapter;
}

export function createModernReportsRuntime(options: ModernReportsRuntimeOptions = {}): ModernReportsRuntime {
  const reportsSource = options.reportsSource ?? createConnectedReportsDemoSource();

  return {
    reportsAdapter: createConnectedReportsAdapter(reportsSource),
  };
}
