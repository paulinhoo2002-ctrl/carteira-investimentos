import { useMemo } from 'react';
import type { ReadOnlyReportsAdapter } from '../reports/reportsSnapshotAdapter';
import { createReturnsViewModel } from './readonlyReturnsViewModel.ts';
import { DashboardMetricCard } from '../shared/components/DashboardMetricCard/DashboardMetricCard';
import { DashboardSection } from '../shared/components/DashboardSection/DashboardSection';
import { EmptyState } from '../shared/components/EmptyState/EmptyState';
import { ResponsiveDataList } from '../shared/components/ResponsiveDataList/ResponsiveDataList';
import { AssetClassBadge } from '../shared/components/AssetClassBadge/AssetClassBadge';
import { formatReadonlyCurrency, formatReadonlyPercent } from '../reports/readonlyReportsViewModel.ts';
import './ReturnsPage.css';

interface ReturnsPageProps {
  reportsAdapter: ReadOnlyReportsAdapter;
}

export function ReturnsPage({ reportsAdapter }: ReturnsPageProps) {
  const snapshot = reportsAdapter.getSnapshot();
  const vm = useMemo(() => createReturnsViewModel(snapshot), [snapshot]);

  if (!vm.hasData) {
    return (
      <DashboardSection title="Rentabilidade" subtitle="Sem dados disponíveis">
        <EmptyState title="Sem dados de rentabilidade" body="Não há ativos na carteira para calcular rentabilidade." size="compact" />
      </DashboardSection>
    );
  }

  const { summary, categoryPerformance, topGainers, topLosers } = vm;

  return (
    <div className="returns-page">
      <DashboardSection title="Rentabilidade" subtitle="Resumo da carteira">
        <div className="returns-metrics">
          <DashboardMetricCard label="Patrimônio total" value={formatReadonlyCurrency(vm.summary.totalValue)} variant="primary" size="large" />
          <DashboardMetricCard label="Resultado total" value={formatReadonlyCurrency(vm.summary.totalResult)} trend={vm.summary.totalResult !== 0 ? { value: vm.summary.rentabilityPct, label: 'rentabilidade' } : null} variant={vm.summary.totalResult >= 0 ? 'success' : 'warning'} size="large" />
          <DashboardMetricCard label="Rentabilidade" value={formatReadonlyPercent(vm.summary.rentabilityPct, { signed: true })} variant={vm.summary.rentabilityPct >= 0 ? 'success' : 'warning'} size="large" />
          <DashboardMetricCard label="Positivos" value={vm.summary.positiveCount} variant="success" size="large" />
          <DashboardMetricCard label="Negativos" value={vm.summary.negativeCount} variant="warning" size="large" />
          <DashboardMetricCard label="Neutros" value={vm.summary.neutralCount} variant="info" size="large" />
        </div>
      </DashboardSection>

      <div className="returns-grid">
        <DashboardSection title="Desempenho por classe" subtitle={`${vm.categoryPerformance.length} classes`}>
          {vm.categoryPerformance.length > 0 ? (
            <ResponsiveDataList
              items={vm.categoryPerformance}
              renderItem={cat => (
                <article className="returns-category-row">
                  <div className="returns-category-row__main">
                    <AssetClassBadge category={cat.category} />
                    <strong>{cat.category}</strong>
                  </div>
                  <div className="returns-category-row__values">
                    <span>{formatReadonlyCurrency(cat.totalValue)}</span>
                    <span className={`returns-category-row__result ${cat.totalResult >= 0 ? 'positive' : 'negative'}`}>
                      {cat.totalResult >= 0 ? '+' : ''}{formatReadonlyCurrency(cat.totalResult)}
                    </span>
                    <span className={`returns-category-row__rent ${cat.rentabilityPct >= 0 ? 'positive' : 'negative'}`}>
                      {formatReadonlyPercent(cat.rentabilityPct, { signed: true })}
                    </span>
                    <span className="returns-category-row__alloc">{formatReadonlyPercent(cat.allocationPct)}</span>
                  </div>
                </article>
              )}
              renderMobileItem={cat => (
                <article className="returns-category-card">
                  <header>
                    <AssetClassBadge category={cat.category} />
                    <strong>{cat.category}</strong>
                  </header>
                  <p>{formatReadonlyCurrency(cat.totalValue)}</p>
                  <p className={`returns-category-card__result ${cat.totalResult >= 0 ? 'positive' : 'negative'}`}>
                    {cat.totalResult >= 0 ? '+' : ''}{formatReadonlyCurrency(cat.totalResult)}
                  </p>
                  <p className={`returns-category-card__rent ${cat.rentabilityPct >= 0 ? 'positive' : 'negative'}`}>
                    {formatReadonlyPercent(cat.rentabilityPct, { signed: true })}
                  </p>
                  <p className="returns-category-card__alloc">{formatReadonlyPercent(cat.allocationPct)}</p>
                </article>
              )}
            />
          ) : (
            <EmptyState title="Sem classes" body="Nenhuma classe de ativos na carteira." size="compact" />
          )}
        </DashboardSection>

        <DashboardSection title="Maiores ganhos" subtitle="Top 3">
          {vm.topGainers.length > 0 ? (
            <ResponsiveDataList
              items={vm.topGainers}
              renderItem={g => (
                <article className="returns-asset-row">
                  <strong>{g.ticker}</strong>
                  <span className="positive">{formatReadonlyPercent(g.variationPct, { signed: true })}</span>
                </article>
              )}
              renderMobileItem={g => (
                <article className="returns-asset-card">
                  <strong>{g.ticker}</strong>
                  <span className="positive">{formatReadonlyPercent(g.variationPct, { signed: true })}</span>
                </article>
              )}
            />
          ) : (
            <EmptyState title="Sem ganhos" body="Nenhum ativo com rentabilidade positiva." size="compact" />
          )}
        </DashboardSection>

        <DashboardSection title="Maiores perdas" subtitle="Top 3">
          {vm.topLosers.length > 0 ? (
            <ResponsiveDataList
              items={vm.topLosers}
              renderItem={l => (
                <article className="returns-asset-row">
                  <strong>{l.ticker}</strong>
                  <span className="negative">{formatReadonlyPercent(l.variationPct, { signed: true })}</span>
                </article>
              )}
              renderMobileItem={l => (
                <article className="returns-asset-card">
                  <strong>{l.ticker}</strong>
                  <span className="negative">{formatReadonlyPercent(l.variationPct, { signed: true })}</span>
                </article>
              )}
            />
          ) : (
            <EmptyState title="Sem perdas" body="Nenhum ativo com rentabilidade negativa." size="compact" />
          )}
        </DashboardSection>
      </div>

      <DashboardSection title="Histórico / Benchmarks" subtitle="Indicadores não disponíveis">
        <EmptyState title="Histórico de rentabilidade indisponível" body="Não há série histórica, CDI, Ibovespa, % CDI, Sharpe, Sortino, drawdown ou volatilidade calculados." size="compact" />
      </DashboardSection>
    </div>
  );
}