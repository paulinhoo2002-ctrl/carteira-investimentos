import { useMemo } from 'react';
import type { ReadOnlyReportsAdapter } from '../reports/reportsSnapshotAdapter';
import type { ReadOnlyIncomeAdapter } from '../income/incomeSnapshotAdapter.mjs';
import './OverviewPage.css';
import {
  createReadonlyAssetsSummary,
  createCategoryDistribution,
  formatReadonlyCurrency,
  formatReadonlyPercent,
} from '../reports/readonlyReportsViewModel.ts';
import { DashboardMetricCard } from '../shared/components/DashboardMetricCard/DashboardMetricCard';
import { DashboardSection } from '../shared/components/DashboardSection/DashboardSection';
import { ChartContainer } from '../shared/components/ChartContainer/ChartContainer';
import { AssetClassBadge } from '../shared/components/AssetClassBadge/AssetClassBadge';
import { EmptyState } from '../shared/components/EmptyState/EmptyState';
import { ResponsiveDataList } from '../shared/components/ResponsiveDataList/ResponsiveDataList';
import type { ReadOnlyReportItem } from '../reports/reportsReadonlyContract.mjs';
import type { ReadOnlyIncomeItem } from '../income/incomeReadonlyContract.mjs';

interface OverviewPageProps {
  reportsAdapter: ReadOnlyReportsAdapter;
  incomeAdapter: ReadOnlyIncomeAdapter;
}

function formatDateShort(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function OverviewPage({ reportsAdapter, incomeAdapter }: OverviewPageProps) {
  const reportsSnapshot = reportsAdapter.getSnapshot();
  const incomeSnapshot = incomeAdapter.getSnapshot();

  const assetsSummary = useMemo(() => createReadonlyAssetsSummary(reportsSnapshot.items), [reportsSnapshot.items]);
  const categoryDistribution = useMemo(() => createCategoryDistribution(reportsSnapshot.items), [reportsSnapshot.items]);

  const totalReceived = incomeSnapshot.summary.totalReceived ?? 0;
  const monthTotal = incomeSnapshot.summary.monthTotal ?? 0;
  const yearTotal = incomeSnapshot.summary.yearTotal ?? 0;
  const averageMonthly = incomeSnapshot.summary.averageMonthly ?? 0;
  const paymentCount = incomeSnapshot.summary.paymentCount ?? 0;

  const upcomingDividends = useMemo(() => {
    const reference = new Date(incomeSnapshot.generatedAt).getTime();
    return incomeSnapshot.items
      .filter((item) => item.paymentDate && new Date(item.paymentDate).getTime() >= reference)
      .sort((a, b) => new Date(a.paymentDate!).getTime() - new Date(b.paymentDate!).getTime())
      .slice(0, 5);
  }, [incomeSnapshot.items, incomeSnapshot.generatedAt]);

  const recentAssets = useMemo(() => reportsSnapshot.items.slice(0, 5), [reportsSnapshot.items]);

  const hasAssets = reportsSnapshot.items.length > 0;
  const hasIncome = incomeSnapshot.items.length > 0;

  

  return (
    <div className="overview-page">
      <DashboardSection title="Início" subtitle="Visão consolidada da carteira">
        <div className="overview-metrics">
          <DashboardMetricCard
            label="Patrimônio total"
            value={hasAssets ? formatReadonlyCurrency(assetsSummary.totalValue) : '—'}
            trend={assetsSummary.totalResult !== 0 ? { value: assetsSummary.rentabilityPct, label: 'no acumulado' } : null}
            variant="primary"
            size="large"
          />
          <DashboardMetricCard
            label="Resultado no mês"
            value={formatReadonlyCurrency(assetsSummary.totalResult)}
            trend={assetsSummary.totalResult !== 0 ? { value: assetsSummary.rentabilityPct, label: 'rentabilidade' } : null}
            variant={assetsSummary.totalResult >= 0 ? 'success' : 'warning'}
            size="large"
          />
          <DashboardMetricCard
            label="Dividendos no mês"
            value={monthTotal > 0 ? formatReadonlyCurrency(monthTotal) : '—'}
            trend={monthTotal > 0 ? { value: 0, label: 'recebido' } : null}
            variant="info"
            size="large"
          />
          <DashboardMetricCard
            label="Rentabilidade"
            value={hasAssets ? `${formatReadonlyPercent(assetsSummary.rentabilityPct, { signed: true })}` : '—'}
            variant={assetsSummary.rentabilityPct >= 0 ? 'success' : 'warning'}
            size="large"
          />
        </div>
      </DashboardSection>

      <div className="overview-grid">
        <DashboardSection title="Evolução do patrimônio" subtitle="Histórico não disponível">
          <EmptyState title="Histórico de patrimônio ainda não disponível" body="Não há série histórica de patrimônio no snapshot atual." size="compact" />
        </DashboardSection>

        <DashboardSection title="Alocação por classe" subtitle={hasAssets ? `${categoryDistribution.length} classes` : 'Sem dados'}>
          {hasAssets ? (
            <div className="overview-allocation">
              {categoryDistribution.map((entry) => (
                <article key={entry.category} className="overview-allocation__item">
                  <div className="overview-allocation__header">
                    <AssetClassBadge category={entry.category} />
                    <span className="overview-allocation__value">{formatReadonlyPercent(entry.allocationPct)}</span>
                  </div>
                  <div className="overview-allocation__bar">
                    <div
                      className="overview-allocation__fill"
                      style={{ width: `${Math.min(entry.allocationPct, 100)}%` } as React.CSSProperties}
                    />
                  </div>
                  <p className="overview-allocation__detail">
                    {formatReadonlyCurrency(entry.currentValue)} · {entry.itemCount} ativo{entry.itemCount !== 1 ? 's' : ''}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem alocação" body="Nenhum ativo na carteira para exibir distribuição." size="compact" />
          )}
        </DashboardSection>
      </div>

      <div className="overview-grid">
        <DashboardSection title="Resumo de ativos" subtitle={hasAssets ? `${reportsSnapshot.items.length} ativos` : 'Sem ativos'}>
          {hasAssets ? (
            <ResponsiveDataList
              items={recentAssets}
              renderItem={(item) => (
                <article className="overview-asset-row">
                  <div className="overview-asset-row__main">
                    <strong>{item.ticker}</strong>
                    <AssetClassBadge category={item.category} size="compact" />
                  </div>
                  <div className="overview-asset-row__values">
                    <span className="overview-asset-row__current">{formatReadonlyCurrency(item.currentValue)}</span>
                    <span className={`overview-asset-row__variation ${item.variationPct >= 0 ? 'positive' : 'negative'}`}>
                      {formatReadonlyPercent(item.variationPct, { signed: true })}
                    </span>
                  </div>
                </article>
              )}
              renderMobileItem={(item) => (
                <article className="overview-asset-card">
                  <header>
                    <strong>{item.ticker}</strong>
                    <AssetClassBadge category={item.category} size="compact" />
                  </header>
                  <div className="overview-asset-card__info">
                    <p>{item.name}</p>
                    <p className="overview-asset-card__value">{formatReadonlyCurrency(item.currentValue)}</p>
                    <p className={`overview-asset-card__variation ${item.variationPct >= 0 ? 'positive' : 'negative'}`}>
                      {formatReadonlyPercent(item.variationPct, { signed: true })}
                    </p>
                  </div>
                </article>
              )}
              emptyState={<EmptyState title="Sem ativos" body="Nenhum ativo encontrado na carteira." size="compact" />}
            />
          ) : (
            <EmptyState title="Sem ativos" body="Nenhum ativo na carteira para exibir resumo." size="compact" />
          )}
        </DashboardSection>

        <DashboardSection title="Próximos dividendos" subtitle={upcomingDividends.length > 0 ? `${upcomingDividends.length} agendados` : hasIncome ? 'Sem agendamentos' : 'Sem dados de proventos'}>
          {upcomingDividends.length > 0 ? (
            <ResponsiveDataList
              items={upcomingDividends}
              renderItem={(item) => (
                <article className="overview-dividend-row">
                  <div className="overview-dividend-row__asset">
                    <strong>{item.ticker ?? '—'}</strong>
                    <span className="overview-dividend-row__type">{item.type ?? 'Provento'}</span>
                  </div>
                  <div className="overview-dividend-row__details">
                    <span className="overview-dividend-row__date">{formatDateShort(item.paymentDate)}</span>
                    <span className="overview-dividend-row__value">{typeof item.receivedValue === 'number' ? formatReadonlyCurrency(item.receivedValue) : '—'}</span>
                  </div>
                </article>
              )}
              renderMobileItem={(item) => (
                <article className="overview-dividend-card">
                  <header>
                    <strong>{item.ticker ?? '—'}</strong>
                    <span className="overview-dividend-card__type">{item.type ?? 'Provento'}</span>
                  </header>
                  <p className="overview-dividend-card__date">{formatDateShort(item.paymentDate)}</p>
                  <p className="overview-dividend-card__value">{typeof item.receivedValue === 'number' ? formatReadonlyCurrency(item.receivedValue) : '—'}</p>
                </article>
              )}
              emptyState={<EmptyState title="Sem dividendos agendados" body="Nenhum pagamento futuro identificado." size="compact" />}
            />
          ) : hasIncome ? (
            <EmptyState title="Sem dividendos agendados" body="Nenhum pagamento futuro identificado na leitura atual." size="compact" />
          ) : (
            <EmptyState title="Sem dados de proventos" body="A leitura de proventos ainda não foi carregada." size="compact" />
          )}
        </DashboardSection>
      </div>
    </div>
  );
}