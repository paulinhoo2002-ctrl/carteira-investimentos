import { useMemo, useState, useSyncExternalStore } from 'react';
import type { IncomeRefreshController } from './incomeRefreshController.ts';
import type { ReadOnlyIncomeAdapter } from './incomeSnapshotAdapter.mjs';
import {
  createReadonlyIncomeViewModel,
  formatReadonlyMoneyOrMissing,
  formatReadonlyCurrency,
  formatReadonlyDateTime,
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
import { DashboardMetricCard } from '../shared/components/DashboardMetricCard/DashboardMetricCard';
import { DashboardSection } from '../shared/components/DashboardSection/DashboardSection';
import { ChartContainer } from '../shared/components/ChartContainer/ChartContainer';
import { EmptyState } from '../shared/components/EmptyState/EmptyState';
import { ResponsiveDataList } from '../shared/components/ResponsiveDataList/ResponsiveDataList';
import type { ReadOnlyIncomeItem } from './incomeReadonlyContract.mjs';

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

function formatDateShort(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatMonthShort(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(new Date(dateStr)).replace('.', '');
  } catch {
    return dateStr;
  }
}

function Sparkline({ data, color = 'var(--color-accent-info)' }: { data: readonly number[]; color?: string }) {
  if (data.length < 2) return <span aria-hidden="true">—</span>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, i) => `${((i / (data.length - 1)) * 100).toFixed(2)},${(26 - ((value - min) / range) * 22).toFixed(2)}`)
    .join(' ');
  return (
    <svg
      className="overview-sparkline"
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ color }}
    >
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
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
  const hasReceivedItems = snapshot.summary.paymentCount > 0;
  const topPayment = viewModel.topPayments[0] ?? null;
  const topPayer = viewModel.topPayers[0] ?? null;
  const emptyTitle = hasItems ? 'Nenhum provento encontrado' : 'Carteira de proventos vazia nesta leitura readonly.';
  const emptyBody = hasItems
    ? 'Ajuste busca, periodo, ano, mes, tipo ou ordenacao para ver os registros novamente.'
    : 'O snapshot de proventos chegou vazio, mas continua valido e congelado.';

  const monthlyIncomeData = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const item of snapshot.items) {
      if (item.paymentState !== 'PAID' || !item.paymentDate || typeof item.receivedValue !== 'number') continue;
      const date = new Date(item.paymentDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) ?? 0) + (item.receivedValue ?? 0));
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, value]) => value);
  }, [snapshot.items]);

  const upcomingDividends = useMemo(() => {
    const reference = new Date(snapshot.generatedAt).getTime();
    return snapshot.items
      .filter((item) => (item.paymentState === 'ANNOUNCED' || item.paymentState === 'ESTIMATED') && item.paymentDate && new Date(item.paymentDate).getTime() >= reference)
      .sort((a, b) => new Date(a.paymentDate!).getTime() - new Date(b.paymentDate!).getTime())
      .slice(0, 5);
  }, [snapshot.items, snapshot.generatedAt]);

  const yieldData = useMemo(() => {
    if (!hasItems) return null;
    const totalReceived = snapshot.summary.totalReceived ?? 0;
    return totalReceived > 0 ? totalReceived : null;
  }, [snapshot.summary.totalReceived]);

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

      <DashboardSection title="Resumo de proventos" subtitle={`${snapshot.summary.paymentCount} recebimentos identificados · cobertura ${snapshot.summary.historyCoverage.toLowerCase()}`}>
        <div className="income-summary-cards">
          <DashboardMetricCard
            label={snapshot.summary.historyCoverage === 'COMPLETE' ? 'Total recebido' : 'Subtotal recebido'}
            value={snapshot.summary.totalReceived != null ? formatReadonlyCurrency(snapshot.summary.totalReceived) : '—'}
            variant="primary"
            size="large"
          />
          <DashboardMetricCard
            label={snapshot.summary.monthCoverage === 'COMPLETE' ? 'Mês atual confirmado' : snapshot.summary.monthCoverage === 'PARTIAL' ? 'Subtotal do mês parcial' : 'Recebido no mês'}
            value={snapshot.summary.monthTotal != null ? formatReadonlyCurrency(snapshot.summary.monthTotal) : '—'}
            variant="info"
            size="large"
          />
          <DashboardMetricCard
            label={snapshot.summary.historyCoverage === 'COMPLETE' ? 'Acumulado anual' : 'Subtotal anual'}
            value={snapshot.summary.yearTotal != null ? formatReadonlyCurrency(snapshot.summary.yearTotal) : '—'}
            variant="primary"
            size="large"
          />
          <DashboardMetricCard
            label="Média mensal completa"
            value={snapshot.summary.averageMonthly != null ? formatReadonlyCurrency(snapshot.summary.averageMonthly) : '—'}
            variant="info"
            size="large"
          />
          <DashboardMetricCard
            label="Yield médio"
            value="—"
            variant="warning"
            size="large"
          />
          <DashboardMetricCard
            label="Ativos pagadores"
            value={hasReceivedItems ? new Set(snapshot.items.filter((i) => i.paymentState === 'PAID').map((i) => i.ticker).filter(Boolean)).size.toString() : '—'}
            variant="info"
            size="large"
          />
        </div>
      </DashboardSection>

      <div className="income-grid">
        <DashboardSection title="Evolução mensal" subtitle="Últimos 6 meses">
          <ChartContainer
            title="Evolução mensal de proventos"
            summary={`Período: últimos seis meses. Snapshot gerado em ${formatDateShort(snapshot.generatedAt)}. ${snapshot.summary.monthTotal != null ? `Subtotal observado: ${formatReadonlyCurrency(snapshot.summary.monthTotal)} (${snapshot.summary.monthCoverage.toLowerCase()}).` : 'Cobertura mensal insuficiente para confirmar o total.'}`}
          >
            {monthlyIncomeData.length >= 2 ? (
              <div className="income-sparkline-wrapper">
                <Sparkline data={monthlyIncomeData} color="var(--color-accent-info)" />
              </div>
            ) : (
              <EmptyState
                title={hasReceivedItems ? 'Histórico mensal parcial' : 'Histórico mensal desconhecido'}
                body={snapshot.summary.monthTotal == null && hasReceivedItems
                  ? 'Há recebimentos identificados, mas a cobertura mensal não foi confirmada. A evolução não será estimada.'
                  : snapshot.summary.monthTotal == null
                    ? 'Não há dados identificados para confirmar o histórico mensal.'
                    : 'Menos de dois períodos conhecidos para exibir a evolução.'}
                status={snapshot.summary.monthTotal == null ? (hasReceivedItems ? 'PARTIAL' : 'UNKNOWN') : 'UNAVAILABLE'}
                size="compact"
              />
            )}
          </ChartContainer>
        </DashboardSection>

        <DashboardSection title="Distribuição por tipo" subtitle="Proporção de proventos por categoria">
          <div className="income-type-distribution">
            {hasReceivedItems ? (() => {
              const typeMap = new Map<string, { count: number; total: number }>();
              for (const item of snapshot.items.filter((entry) => entry.paymentState === 'PAID')) {
                const type = item.type ?? 'Não informado';
                const current = typeMap.get(type) ?? { count: 0, total: 0 };
                typeMap.set(type, { count: current.count + 1, total: current.total + (item.receivedValue ?? 0) });
              }
              const totalReceived = snapshot.summary.totalReceived ?? 1;
              return Array.from(typeMap.entries())
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([type, data]) => (
                  <article key={type} className="income-type-item">
                    <header>
                      <strong>{type}</strong>
                      <span>{((data.total / (snapshot.summary.totalReceived ?? 1)) * 100).toFixed(1)}%</span>
                    </header>
                    <div className="overview-allocation__bar">
                      <div
                        className="overview-allocation__fill"
                        style={{ width: `${((data.total / (snapshot.summary.totalReceived ?? 1)) * 100)}%` } as React.CSSProperties}
                      />
                    </div>
                    <p className="overview-allocation__detail">
                      {data.count} pagamento{data.count !== 1 ? 's' : ''} · {formatReadonlyCurrency(data.total)}
                    </p>
                  </article>
                ));
            })() : (
              <EmptyState title="Sem recebimentos confirmados" body="Eventos anunciados ou desconhecidos não são contabilizados como pagamentos recebidos." status="UNKNOWN" size="compact" />
            )}
          </div>
        </DashboardSection>
      </div>

      <DashboardSection title="Próximos pagamentos" subtitle="Proventos com data futura">
        {(() => {
          const now = Date.now();
          const upcoming = snapshot.items
            .filter((item) => (item.paymentState === 'ANNOUNCED' || item.paymentState === 'ESTIMATED') && item.paymentDate && new Date(item.paymentDate).getTime() >= Date.now())
            .sort((a, b) => new Date(a.paymentDate!).getTime() - new Date(b.paymentDate!).getTime())
            .slice(0, 5);
          return upcoming.length > 0 ? (
            <ResponsiveDataList
              items={upcoming}
              renderItem={(item) => (
                <article className="income-upcoming-row">
                  <div className="income-upcoming-row__asset">
                    <strong>{item.ticker ?? '—'}</strong>
                    <span className="income-upcoming-row__type">{item.paymentState === 'ESTIMATED' ? 'Estimativa · ' : 'Anunciado · '}{item.type ?? 'Provento'}</span>
                  </div>
                  <div className="income-upcoming-row__details">
                    <span className="income-upcoming-row__date">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(item.paymentDate!))}</span>
                    <span className="income-upcoming-row__value">{typeof item.plannedValue === 'number' ? formatReadonlyCurrency(item.plannedValue) : '—'}</span>
                  </div>
                </article>
              )}
              renderMobileItem={(item) => (
                <article className="income-upcoming-card">
                  <header>
                    <strong>{item.ticker ?? '—'}</strong>
                    <span className="income-upcoming-card__type">{item.paymentState === 'ESTIMATED' ? 'Estimativa · ' : 'Anunciado · '}{item.type ?? 'Provento'}</span>
                  </header>
                  <p className="income-upcoming-card__date">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(item.paymentDate!))}</p>
                  <p className="income-upcoming-card__value">{typeof item.plannedValue === 'number' ? formatReadonlyCurrency(item.plannedValue) : '—'}</p>
                </article>
              )}
              emptyState={<EmptyState title="Sem próximos pagamentos" body="Nenhum provento com data futura identificado." size="compact" />}
            />
          ) : (
            <EmptyState title="Sem próximos pagamentos" body="Nenhum provento com data futura identificado na leitura atual." size="compact" />
          );
        })()}
      </DashboardSection>

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
        topPayment={viewModel.topPayments[0] ?? null}
        topPayer={viewModel.topPayers[0] ?? null}
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

      <DashboardSection title="Distribuição mensal" subtitle="Proventos por mês">
        <IncomeReadonlyMonthlyDistribution monthlyBuckets={viewModel.monthlyBuckets} />
      </DashboardSection>

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
