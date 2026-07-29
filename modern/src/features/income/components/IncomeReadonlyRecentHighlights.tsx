import { formatReadonlyDateTime, formatReadonlyMoneyOrMissing } from '../readonlyIncomeViewModel.ts';
import type { ReadOnlyIncomeItem, ReadOnlyIncomeSnapshot } from '../incomeReadonlyContract.mjs';
import type { ReadonlyIncomeMonthBucket, ReadonlyIncomePayerBucket } from '../readonlyIncomeViewModel.ts';
import { summarizeItemLabel } from './shared/summarizeItemLabel';

interface IncomeReadonlyRecentHighlightsProps {
  topPayments: readonly ReadOnlyIncomeItem[];
  topPayers: readonly ReadonlyIncomePayerBucket[];
  monthlyBuckets: readonly ReadonlyIncomeMonthBucket[];
  selectedYear: string;
  selectedMonth: string;
  selectedType: string;
  snapshot: ReadOnlyIncomeSnapshot;
}

function renderAmount(value: number | null | undefined): string {
  return formatReadonlyMoneyOrMissing(value);
}

export function IncomeReadonlyRecentHighlights({
  topPayments,
  topPayers,
  monthlyBuckets,
  selectedYear,
  selectedMonth,
  selectedType,
  snapshot,
}: IncomeReadonlyRecentHighlightsProps) {
  return (
    <section className="fixed-income-readonly__highlights" aria-labelledby="income-highlights">
      <div className="fixed-income-readonly__section-title-row">
        <h3 className="fixed-income-readonly__section-title" id="income-highlights">
          Destaques
        </h3>
        <p className="fixed-income-readonly__section-note">Leitura rapida dos pagamentos e pagadores mais uteis na sessao atual.</p>
      </div>

      <div className="fixed-income-readonly__highlight-grid">
        <article className="overview-card">
          <p className="overview-card__label">Maiores pagamentos</p>
          {topPayments.length > 0 ? (
            <ul className="fixed-income-readonly__compact-list">
              {topPayments.map((item) => (
                <li key={item.id ?? item.sourceEventId ?? item.ticker ?? item.name ?? item.paymentDate ?? summarizeItemLabel(item)}>
                  <strong>{summarizeItemLabel(item)}</strong>
                  <span>
                    {renderAmount(item.receivedValue)} · {formatReadonlyDateTime(item.paymentDate ?? snapshot.generatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="overview-card__hint">Nenhum pagamento informado.</p>
          )}
        </article>

        <article className="overview-card">
          <p className="overview-card__label">Mais lancamentos</p>
          {topPayers.length > 0 ? (
            <ul className="fixed-income-readonly__compact-list">
              {topPayers.map((item) => (
                <li key={`${item.label}-${item.paymentCount}`}>
                  <strong>{item.label}</strong>
                  <span>{item.paymentCount} lancamento{item.paymentCount === 1 ? '' : 's'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="overview-card__hint">Nenhum lancamento informado.</p>
          )}
        </article>

        <article className="overview-card">
          <p className="overview-card__label">Meses com recebimento</p>
          {monthlyBuckets.length > 0 ? (
            <ul className="fixed-income-readonly__compact-list">
              {monthlyBuckets.slice(0, 3).map((item) => (
                <li key={item.monthKey}>
                  <strong>{item.label}</strong>
                  <span>{item.paymentCount} lancamento{item.paymentCount === 1 ? '' : 's'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="overview-card__hint">Sem meses informados.</p>
          )}
        </article>

        <article className="overview-card">
          <p className="overview-card__label">Filtro atual</p>
          <ul className="fixed-income-readonly__compact-list">
            <li>
              <strong>Ano</strong>
              <span>{selectedYear === 'all' ? 'Todos' : selectedYear}</span>
            </li>
            <li>
              <strong>Mes</strong>
              <span>{selectedMonth === 'all' ? 'Todos' : selectedMonth}</span>
            </li>
            <li>
              <strong>Tipo</strong>
              <span>{selectedType === 'all' ? 'Todos' : selectedType}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
