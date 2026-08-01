import { useMemo } from 'react';
import type { ReadOnlyReportsAdapter } from '../reports/reportsSnapshotAdapter';
import { createRebalanceViewModel } from './readonlyRebalanceViewModel.ts';
import { DashboardMetricCard } from '../shared/components/DashboardMetricCard/DashboardMetricCard';
import { DashboardSection } from '../shared/components/DashboardSection/DashboardSection';
import { EmptyState } from '../shared/components/EmptyState/EmptyState';
import { ResponsiveDataList } from '../shared/components/ResponsiveDataList/ResponsiveDataList';
import { AssetClassBadge } from '../shared/components/AssetClassBadge/AssetClassBadge';
import { formatReadonlyCurrency, formatReadonlyPercent } from '../reports/readonlyReportsViewModel.ts';
import './RebalancePage.css';

interface RebalancePageProps {
  reportsAdapter: ReadOnlyReportsAdapter;
}

export function RebalancePage({ reportsAdapter }: RebalancePageProps) {
  const snapshot = reportsAdapter.getSnapshot();
  const vm = useMemo(() => createRebalanceViewModel(snapshot), [snapshot]);

  if (!vm.hasData) {
    return (
      <DashboardSection title="Rebalancear" subtitle="Sem dados">
        <EmptyState title="Sem dados de alocação" body="Não há ativos na carteira para exibir alocação." size="compact" />
      </DashboardSection>
    );
  }

  const { distribution, totalValue, classCount } = vm;

  return (
    <div className="rebalance-page">
      <DashboardSection title="Rebalancear" subtitle="Alocação atual da carteira">
        <div className="rebalance-metrics">
          <DashboardMetricCard label="Patrimônio total" value={formatReadonlyCurrency(totalValue)} variant="primary" size="large" />
          <DashboardMetricCard label="Classes de ativos" value={String(classCount)} variant="info" size="large" />
        </div>

        {distribution.length > 0 ? (
          <ResponsiveDataList
            items={distribution}
            renderItem={entry => (
              <article className="rebalance-row">
                <div className="rebalance-row__main">
                  <AssetClassBadge category={entry.category} />
                  <strong>{entry.category}</strong>
                </div>
                <div className="rebalance-row__values">
                  <span className="rebalance-row__current">{formatReadonlyPercent(entry.currentAllocationPct)}</span>
                  <span className="rebalance-row__value">{formatReadonlyCurrency(entry.currentValue)}</span>
                </div>
              </article>
            )}
            renderMobileItem={entry => (
              <article className="rebalance-card">
                <header>
                  <AssetClassBadge category={entry.category} />
                  <strong>{entry.category}</strong>
                </header>
                <p className="rebalance-card__current">Alocação atual: {formatReadonlyPercent(entry.currentAllocationPct)}</p>
                <p className="rebalance-card__value">Valor atual: {formatReadonlyCurrency(entry.currentValue)}</p>
              </article>
            )}
          />
        ) : (
          <EmptyState title="Sem alocação" body="Nenhuma classe de ativos na carteira." size="compact" />
        )}
      </DashboardSection>

      <DashboardSection title="Alocação alvo" subtitle="Sem alvo confiável">
        <EmptyState
          title="Alocação alvo não definida"
          body="Não há alocação alvo confiável persistida no projeto. Nesta etapa não são calculados desvio, score, aporte sugerido, compra ou venda, e não há metas interpretadas como percentuais-alvo."
          size="compact"
        />
      </DashboardSection>
    </div>
  );
}
