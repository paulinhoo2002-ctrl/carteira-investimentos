import { useMemo, useState, useSyncExternalStore } from 'react';
import type { ReportsReadonlyDiagnostics, ReportsRefreshController } from './reportsRefreshController';
import type { ReadOnlyReportsAdapter } from './reportsSnapshotAdapter';
import type { ReadOnlyReportsSnapshot } from './reportsReadonlyContract.mjs';
import {
  createReadonlyAssetPrudentSignal,
  createReadonlyAssetsSummary,
  createReadonlyAssetsViewModel,
  type ReadonlyAssetSignalKey,
  type ReadonlyAssetsSortKey,
} from './readonlyReportsViewModel';
import { diagnosticStatusLabel } from './readonlyReportsConstants';
import { AssetsReadonlyHeader } from './components/AssetsReadonlyHeader';
import { AssetsReadonlyFilters } from './components/AssetsReadonlyFilters';
import { AssetsReadonlySummaryGrid } from './components/AssetsReadonlySummaryGrid';
import { AssetsReadonlySignalCounts } from './components/AssetsReadonlySignalCounts';
import { AssetsReadonlyTopPositions } from './components/AssetsReadonlyTopPositions';
import { AssetsReadonlyDistribution } from './components/AssetsReadonlyDistribution';
import { AssetsReadonlyTable } from './components/AssetsReadonlyTable';
import { AssetsReadonlyMobileCards } from './components/AssetsReadonlyMobileCards';
import { AssetsReadonlyEmptyState } from './components/AssetsReadonlyEmptyState';

interface AssetsReadonlyPageProps {
  adapter: ReadOnlyReportsAdapter;
  refreshController?: ReportsRefreshController | null;
}

interface AssetsReadonlyPageContentProps {
  snapshot: ReadOnlyReportsSnapshot;
  diagnostics: ReportsReadonlyDiagnostics | null;
  errorMessage: string | null;
  onRefresh?: () => void;
  showRefreshButton: boolean;
}

function AssetsReadonlyPageContent({
  diagnostics,
  errorMessage,
  onRefresh,
  showRefreshButton,
  snapshot,
}: AssetsReadonlyPageContentProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [signal, setSignal] = useState<ReadonlyAssetSignalKey>('all');
  const [sortBy, setSortBy] = useState<ReadonlyAssetsSortKey>('currentValueDesc');
  const [topPositionsOpen, setTopPositionsOpen] = useState(false);
  const [distributionOpen, setDistributionOpen] = useState(false);

  const viewModel = useMemo(
    () =>
      createReadonlyAssetsViewModel(snapshot, {
        query,
        category,
        sortBy,
        signal,
      }),
    [category, query, signal, snapshot, sortBy],
  );

  const summary = useMemo(() => createReadonlyAssetsSummary(viewModel.filteredItems), [viewModel.filteredItems]);
  const itemsWithSignals = useMemo(
    () =>
      viewModel.filteredItems.map((item) => ({
        item,
        signal: createReadonlyAssetPrudentSignal(item),
      })),
    [viewModel.filteredItems],
  );

  return (
    <section className="page-shell assets-readonly" aria-labelledby="page-assets">
      <AssetsReadonlyHeader
        snapshot={snapshot}
        originLabel={diagnostics?.originLabel ?? 'Snapshot somente leitura validado'}
        showRefreshButton={showRefreshButton}
        onRefresh={onRefresh}
      />

      <p className="assets-report__notice">{snapshot.notice}</p>

      <p className="assets-report__status" role="status" aria-live="polite">
        {errorMessage
          ? errorMessage
          : diagnostics
            ? `${diagnosticStatusLabel[diagnostics.refreshStatus]} · ${diagnostics.itemCount} ativos`
            : `${viewModel.summary.itemCount} ativos somente leitura`}
      </p>

      <AssetsReadonlyFilters
        query={query}
        category={category}
        signal={signal}
        sortBy={sortBy}
        categories={viewModel.categories}
        resultCount={viewModel.filteredItems.length}
        totalItemCount={snapshot.items.length}
        hasResults={viewModel.hasResults}
        onQueryChange={setQuery}
        onCategoryChange={setCategory}
        onSignalChange={setSignal}
        onSortChange={setSortBy}
      />

      <AssetsReadonlySummaryGrid summary={summary} />

      <AssetsReadonlySignalCounts counts={viewModel.signalCounts} />

      <AssetsReadonlyTopPositions
        open={topPositionsOpen}
        onOpenChange={setTopPositionsOpen}
        items={viewModel.topPositions}
      />

      <AssetsReadonlyDistribution
        open={distributionOpen}
        onOpenChange={setDistributionOpen}
        entries={viewModel.distribution}
      />

      <section className="assets-readonly__list" aria-labelledby="assets-list">
        <div className="assets-readonly__section-title-row">
          <h3 className="assets-readonly__section-title" id="assets-list">
            Lista de ativos
          </h3>
          <p className="assets-readonly__section-note">Desktop em tabela; mobile em cartões sem rolagem horizontal.</p>
        </div>

        {viewModel.filteredItems.length > 0 ? (
          <>
            <AssetsReadonlyTable items={itemsWithSignals} />

            <AssetsReadonlyMobileCards items={itemsWithSignals} />
          </>
        ) : (
          <AssetsReadonlyEmptyState snapshotIsEmpty={snapshot.items.length === 0} />
        )}
      </section>
    </section>
  );
}

function StaticAssetsReadonlyPage({ adapter }: { adapter: ReadOnlyReportsAdapter }) {
  const snapshot = useMemo(() => adapter.getSnapshot(), [adapter]);

  return (
    <AssetsReadonlyPageContent
      diagnostics={null}
      errorMessage={null}
      showRefreshButton={false}
      snapshot={snapshot}
    />
  );
}

function RefreshableAssetsReadonlyPage({ refreshController }: { refreshController: ReportsRefreshController }) {
  const refreshState = useSyncExternalStore(
    refreshController.subscribe,
    refreshController.getState,
    refreshController.getState,
  );

  return (
    <AssetsReadonlyPageContent
      diagnostics={refreshState.diagnostics}
      errorMessage={refreshState.errorMessage}
      onRefresh={() => refreshController.refresh()}
      showRefreshButton={true}
      snapshot={refreshState.snapshot}
    />
  );
}

export function AssetsReadonlyPage({ adapter, refreshController }: AssetsReadonlyPageProps) {
  if (!refreshController) {
    return <StaticAssetsReadonlyPage adapter={adapter} />;
  }

  return <RefreshableAssetsReadonlyPage refreshController={refreshController} />;
}
