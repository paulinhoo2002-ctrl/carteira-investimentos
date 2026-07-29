import { useMemo, useState, useSyncExternalStore } from 'react';
import type { IncomeRefreshController } from './incomeRefreshController.ts';
import type { ReadOnlyIncomeAdapter } from './incomeSnapshotAdapter.mjs';
import {
  createReadonlyIncomeViewModel,
  type ReadonlyIncomeSortKey,
} from './readonlyIncomeViewModel.ts';
import { IncomeReadonlyHeader } from './components/IncomeReadonlyHeader';
import { IncomeReadonlyFilters } from './components/IncomeReadonlyFilters';
import { IncomeReadonlySummaryGrid } from './components/IncomeReadonlySummaryGrid';
import { IncomeReadonlyEmptyState } from './components/IncomeReadonlyEmptyState';
import { IncomeReadonlyRecentHighlights } from './components/IncomeReadonlyRecentHighlights';
import { IncomeReadonlyMonthlyDistribution } from './components/IncomeReadonlyMonthlyDistribution';
import { IncomeReadonlyTable } from './components/IncomeReadonlyTable';
import { IncomeReadonlyMobileCards } from './components/IncomeReadonlyMobileCards';

interface IncomeReadonlyPageProps {
  adapter: ReadOnlyIncomeAdapter;
  refreshController?: IncomeRefreshController | null;
}

interface IncomeReadonlyPageContentProps {
  snapshot: ReturnType<ReadOnlyIncomeAdapter['getSnapshot']>;
  errorMessage: string | null;
  refreshStatus: string;
  showRefreshButton: boolean;
  onRefresh?: () => void;
}

const sortLabels: Record<ReadonlyIncomeSortKey, string> = {
  paymentDate: 'Data de pagamento',
  receivedValue: 'Valor recebido',
  ticker: 'Ticker',
  type: 'Tipo',
};

function formatStatusLabel(refreshStatus: string, itemCount: number) {
  switch (refreshStatus) {
    case 'updated':
      return `Leitura atualizada · ${itemCount} proventos`;
    case 'fallback':
      return 'Fallback readonly ativo';
    case 'error':
      return 'Ultimo snapshot valido preservado';
    default:
      return `${itemCount} provento${itemCount === 1 ? '' : 's'} somente leitura`;
  }
}

function IncomeReadonlyPageContent({
  errorMessage,
  onRefresh,
  refreshStatus,
  showRefreshButton,
  snapshot,
}: IncomeReadonlyPageContentProps) {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [type, setType] = useState('all');
  const [sortBy, setSortBy] = useState<ReadonlyIncomeSortKey>('paymentDate');

  const viewModel = useMemo(
    () =>
      createReadonlyIncomeViewModel(snapshot, {
        query,
        year,
        month,
        type,
        sortBy,
      }),
    [month, query, snapshot, sortBy, type, year],
  );

  const hasItems = snapshot.items.length > 0;
  const topPayment = viewModel.topPayments[0] ?? null;
  const topPayer = viewModel.topPayers[0] ?? null;
  const emptyTitle = hasItems ? 'Nenhum provento encontrado' : 'Carteira de proventos vazia nesta leitura readonly.';
  const emptyBody = hasItems
    ? 'Ajuste busca, periodo, ano, mes, tipo ou ordenacao para ver os registros novamente.'
    : 'O snapshot de proventos chegou vazio, mas continua valido e congelado.';

  return (
    <section className="page-shell fixed-income-readonly" aria-labelledby="page-income">
      <IncomeReadonlyHeader
        generatedAt={snapshot.generatedAt}
        onRefresh={onRefresh}
        showRefreshButton={showRefreshButton}
      />

      <p className="fixed-income-readonly__notice">{snapshot.notice}</p>

      <p className="fixed-income-readonly__status" role="status" aria-live="polite">
        {errorMessage ? errorMessage : formatStatusLabel(refreshStatus, snapshot.summary.paymentCount)}
      </p>

      <IncomeReadonlyFilters
        query={query}
        year={year}
        month={month}
        type={type}
        sortBy={sortBy}
        viewModel={viewModel}
        hasItems={hasItems}
        sortLabels={sortLabels}
        onQueryChange={setQuery}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onTypeChange={setType}
        onSortChange={setSortBy}
      />

      <IncomeReadonlySummaryGrid
        viewModel={viewModel}
        topPayment={topPayment}
        topPayer={topPayer}
        snapshot={snapshot}
      />

      <IncomeReadonlyRecentHighlights
        topPayments={viewModel.topPayments}
        topPayers={viewModel.topPayers}
        monthlyBuckets={viewModel.monthlyBuckets}
        selectedYear={viewModel.selectedYear}
        selectedMonth={viewModel.selectedMonth}
        selectedType={viewModel.selectedType}
        snapshot={snapshot}
      />

      <IncomeReadonlyMonthlyDistribution monthlyBuckets={viewModel.monthlyBuckets} />

      <section className="fixed-income-readonly__list" aria-labelledby="income-list">
        <div className="fixed-income-readonly__section-title-row">
          <h3 className="fixed-income-readonly__section-title" id="income-list">
            Lista de proventos
          </h3>
          <p className="fixed-income-readonly__section-note">Desktop em tabela; mobile em cartes sem rolagem horizontal.</p>
        </div>

        {viewModel.filteredItems.length > 0 ? (
          <>
            <IncomeReadonlyTable items={viewModel.filteredItems} snapshot={snapshot} />
            <IncomeReadonlyMobileCards items={viewModel.filteredItems} snapshot={snapshot} />
          </>
        ) : (
          <IncomeReadonlyEmptyState title={emptyTitle} body={emptyBody} />
        )}
      </section>
    </section>
  );
}

function StaticIncomeReadonlyPage({ adapter }: { adapter: ReadOnlyIncomeAdapter }) {
  return (
    <IncomeReadonlyPageContent
      errorMessage={null}
      refreshStatus="idle"
      showRefreshButton={false}
      snapshot={adapter.getSnapshot()}
    />
  );
}

function RefreshableIncomeReadonlyPage({ refreshController }: { refreshController: IncomeRefreshController }) {
  const refreshState = useSyncExternalStore(
    refreshController.subscribe,
    refreshController.getState,
    refreshController.getState,
  );

  return (
    <IncomeReadonlyPageContent
      errorMessage={refreshState.errorMessage}
      onRefresh={() => refreshController.refresh()}
      refreshStatus={refreshState.refreshStatus}
      showRefreshButton={true}
      snapshot={refreshState.snapshot}
    />
  );
}

export function IncomeReadonlyPage({ adapter, refreshController }: IncomeReadonlyPageProps) {
  if (!refreshController) {
    return <StaticIncomeReadonlyPage adapter={adapter} />;
  }

  return <RefreshableIncomeReadonlyPage refreshController={refreshController} />;
}
