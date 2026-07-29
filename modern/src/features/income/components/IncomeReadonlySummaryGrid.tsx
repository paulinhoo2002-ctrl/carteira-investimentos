import { formatReadonlyMoneyOrMissing } from '../readonlyIncomeViewModel.ts';
import { summarizeItemLabel } from './shared/summarizeItemLabel';
import type { IncomeReadonlySummaryGridProps } from './shared/incomeReadonlySharedProps';

function renderAmount(value: number | null | undefined) {
  return formatReadonlyMoneyOrMissing(value);
}

export function IncomeReadonlySummaryGrid({
  snapshot,
  topPayment,
  topPayer,
  viewModel,
}: IncomeReadonlySummaryGridProps) {
  return (
    <div className="overview-grid fixed-income-readonly__summary" aria-label="Resumo readonly dos proventos">
      <article className="overview-card">
        <p className="overview-card__label">Total recebido</p>
        <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.totalReceived)}</p>
        <p className="overview-card__hint">Valor oficial fornecido pelo legado</p>
      </article>
      <article className="overview-card">
        <p className="overview-card__label">Mes atual</p>
        <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.monthTotal)}</p>
        <p className="overview-card__hint">Leitura direta do snapshot readonly</p>
      </article>
      <article className="overview-card">
        <p className="overview-card__label">Ano atual</p>
        <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.yearTotal)}</p>
        <p className="overview-card__hint">Sem recalculo moderno</p>
      </article>
      <article className="overview-card">
        <p className="overview-card__label">Media mensal</p>
        <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.averageMonthly)}</p>
        <p className="overview-card__hint">Media oficial do legado quando existente</p>
      </article>
      <article className="overview-card">
        <p className="overview-card__label">Quantidade de pagamentos</p>
        <p className="overview-card__value">{viewModel.paymentCount}</p>
        <p className="overview-card__hint">Registros ja validados e congelados</p>
      </article>
      <article className="overview-card">
        <p className="overview-card__label">Maior pagamento</p>
        <p className="overview-card__value">{topPayment ? summarizeItemLabel(topPayment) : 'Nao informado'}</p>
        <p className="overview-card__hint">
          {topPayment ? renderAmount(topPayment.receivedValue) : 'Sem valor recebido'}
        </p>
      </article>
      <article className="overview-card">
        <p className="overview-card__label">Mais lancamentos</p>
        <p className="overview-card__value">{topPayer ? topPayer.label : 'Nao informado'}</p>
        <p className="overview-card__hint">
          {topPayer ? `${topPayer.paymentCount} lancamento${topPayer.paymentCount === 1 ? '' : 's'}` : 'Sem agrupamento suficiente'}
        </p>
      </article>
      <article className="overview-card">
        <p className="overview-card__label">Ultimo snapshot valido</p>
        <p className="overview-card__value">{snapshot.generatedAt ? 'Sim' : 'Nao informado'}</p>
        <p className="overview-card__hint">Mantido mesmo em refresh com erro</p>
      </article>
    </div>
  );
}
