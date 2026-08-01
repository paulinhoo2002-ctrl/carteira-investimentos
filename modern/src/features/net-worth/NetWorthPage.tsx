import { useMemo } from 'react';
import type { ReadOnlyReportsAdapter } from '../reports/reportsSnapshotAdapter';
import { createNetWorthViewModel } from './readonlyNetWorthViewModel.ts';
import { DashboardMetricCard } from '../shared/components/DashboardMetricCard/DashboardMetricCard';
import { DashboardSection } from '../shared/components/DashboardSection/DashboardSection';
import { EmptyState } from '../shared/components/EmptyState/EmptyState';
import { ResponsiveDataList } from '../shared/components/ResponsiveDataList/ResponsiveDataList';
import { AssetClassBadge } from '../shared/components/AssetClassBadge/AssetClassBadge';
import { formatReadonlyCurrency, formatReadonlyPercent } from '../reports/readonlyReportsViewModel.ts';
import './NetWorthPage.css';

interface NetWorthPageProps {
  reportsAdapter: ReadOnlyReportsAdapter;
}

export function NetWorthPage({ reportsAdapter }: NetWorthPageProps) {
  const snapshot = reportsAdapter.getSnapshot();
  const vm = useMemo(() => createNetWorthViewModel(snapshot), [snapshot]);

  if (!vm.hasData) {
    return (
      <DashboardSection title="Patrimônio" subtitle="Sem dados disponíveis">
        <EmptyState title="Sem dados de patrimônio" body="Não há ativos na carteira para exibir patrimônio." size="compact" />
      </DashboardSection>
    );
  }

  const { summary, distribution, topPositions, concentration } = vm;

  return (
    <div className="networth-page">
      <DashboardSection title="Patrimônio" subtitle="Resumo da carteira">
        <div className="networth-metrics">
          <DashboardMetricCard label="Patrimônio total" value={formatReadonlyCurrency(summary.totalValue)} variant="primary" size="large" />
          <DashboardMetricCard label="Quantidade de ativos" value={summary.itemCount.toLocaleString('pt-BR')} variant="info" size="large" />
          <DashboardMetricCard label="Maior posição" value={formatReadonlyPercent(concentration.maxAllocationPct, { signed: false })} variant="warning" size="large" />
          <DashboardMetricCard label="Posições acima de 10%" value={String(concentration.highConcentrationCount)} variant="warning" size="large" />
        </div>
      </DashboardSection>

      <div className="networth-grid">
        <DashboardSection title="Composição por classe" subtitle={`${vm.distribution.length} classes`}>
          {vm.distribution.length > 0 ? (
            <ResponsiveDataList
              items={vm.distribution}
              renderItem={d => (
                <article className="networth-allocation-row">
                  <div className="networth-allocation-row__header">
                    <AssetClassBadge category={d.category} />
                    <span className="networth-allocation-row__value">{formatReadonlyPercent(d.allocationPct)}</span>
                  </div>
                  <div className="networth-allocation-row__bar">
                    <div className="networth-allocation-row__fill" style={{ width: `${Math.min(d.allocationPct, 100)}%` }} />
                  </div>
                  <p className="networth-allocation-row__detail">{formatReadonlyCurrency(d.currentValue)} · {d.itemCount} ativo{d.itemCount !== 1 ? 's' : ''}</p>
                </article>
              )}
              renderMobileItem={d => (
                <article className="networth-allocation-card">
                  <header>
                    <AssetClassBadge category={d.category} />
                    <span>{formatReadonlyPercent(d.allocationPct)}</span>
                  </header>
                  <div className="networth-allocation-card__bar">
                    <div className="networth-allocation-card__fill" style={{ width: `${Math.min(d.allocationPct, 100)}%` }} />
                  </div>
                  <p className="networth-allocation-card__detail">{formatReadonlyCurrency(d.currentValue)} · {d.itemCount} ativo{d.itemCount !== 1 ? 's' : ''}</p>
                </article>
              )}
            />
          ) : (
            <EmptyState title="Sem alocação" body="Nenhum ativo na carteira para exibir distribuição." size="compact" />
          )}
        </DashboardSection>

        <DashboardSection title="Maiores posições" subtitle="Top 5 por valor atual">
          {vm.topPositions.length > 0 ? (
            <ResponsiveDataList
              items={vm.topPositions}
              renderItem={p => (
                <article className="networth-asset-row">
                  <div className="networth-asset-row__main">
                    <strong>{p.ticker}</strong>
                    <AssetClassBadge category={p.category} size="compact" />
                  </div>
                  <div className="networth-asset-row__values">
                    <span className="networth-asset-row__current">{formatReadonlyCurrency(p.currentValue)}</span>
                    <span className="networth-asset-row__alloc">{formatReadonlyPercent(p.allocationPct)}</span>
                  </div>
                </article>
              )}
              renderMobileItem={p => (
                <article className="networth-asset-card">
                  <header><strong>{p.ticker}</strong><AssetClassBadge category={p.category} size="compact" /></header>
                  <p className="networth-asset-card__value">{formatReadonlyCurrency(p.currentValue)}</p>
                  <p className="networth-asset-card__alloc">{formatReadonlyPercent(p.allocationPct)}</p>
                </article>
              )}
            />
          ) : (
            <EmptyState title="Sem posições" body="Nenhum ativo na carteira." size="compact" />
          )}
        </DashboardSection>
      </div>

      <DashboardSection title="Evolução histórica" subtitle="Série temporal não disponível">
        <EmptyState title="Histórico de patrimônio indisponível" body="Não há série histórica de patrimônio para exibir evolução, variação mensal/anual ou maior valor histórico." size="compact" />
      </DashboardSection>
    </div>
  );
}