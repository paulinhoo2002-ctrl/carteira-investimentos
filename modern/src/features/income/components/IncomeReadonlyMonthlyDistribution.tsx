import type { ReadonlyIncomeMonthBucket } from '../readonlyIncomeViewModel.ts';
import { IncomeReadonlyEmptyState } from './IncomeReadonlyEmptyState';

interface IncomeReadonlyMonthlyDistributionProps {
  monthlyBuckets: readonly ReadonlyIncomeMonthBucket[];
}

export function IncomeReadonlyMonthlyDistribution({
  monthlyBuckets,
}: IncomeReadonlyMonthlyDistributionProps) {
  return (
    <section className="fixed-income-readonly__distribution" aria-labelledby="income-monthly">
      <div className="fixed-income-readonly__section-title-row">
        <h3 className="fixed-income-readonly__section-title" id="income-monthly">
          Distribuicao mensal
        </h3>
        <p className="fixed-income-readonly__section-note">Agregacao visual baseada nos valores ja fornecidos.</p>
      </div>

      <div className="fixed-income-readonly__distribution-list">
        {monthlyBuckets.length > 0 ? (
          monthlyBuckets.map((entry) => {
            const maxCount = Math.max(...monthlyBuckets.map((bucket) => bucket.paymentCount ?? 0), 0);
            const ratio = maxCount > 0 ? (entry.paymentCount / maxCount) * 100 : 0;

            return (
              <div className="fixed-income-readonly__distribution-row" key={entry.monthKey}>
                <div className="fixed-income-readonly__distribution-row-head">
                  <strong>{entry.label}</strong>
                  <span>{entry.paymentCount} lancamento{entry.paymentCount === 1 ? '' : 's'}</span>
                </div>
                <div className="fixed-income-readonly__distribution-track" aria-label={`${entry.label}: ${entry.paymentCount} lancamentos`}>
                  <span
                    className="fixed-income-readonly__distribution-fill"
                    style={{ width: `${Math.max(0, Math.min(ratio, 100))}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <IncomeReadonlyEmptyState
            title="Sem meses informados"
            body="O snapshot nao trouxe meses suficientes para grafico mensal."
          />
        )}
      </div>
    </section>
  );
}
