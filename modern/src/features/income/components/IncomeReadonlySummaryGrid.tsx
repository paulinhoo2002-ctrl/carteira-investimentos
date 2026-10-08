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
        <p className="overview-card__label">{snapshot.summary.historyCoverage === 'COMPLETE' ? 'Total recebido' : 'Subtotal recebido'}</p>
        <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.totalReceived)}</p>
        <p className="overview-card__hint">Cobertura do histórico: {snapshot.summary.historyCoverage.toLowerCase()}</p>
      </article>
      <article className="overview-card">
        <p className="overview-card__label">{snapshot.summary.monthCoverage === 'COMPLETE' ? 'Mês atual confirmado' : snapshot.summary.monthCoverage === 'PARTIAL' ? 'Subtotal do mês parcial' : 'Recebido no mês'}</p>
        <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.monthTotal)}</p>
        <p className="overview-card__hint">Cobertura do mês: {snapshot.summary.monthCoverage.toLowerCase()}</p>
      </article>
      <article className="overview-card">
        <p className="overview-card__label">{snapshot.summary.historyCoverage === 'COMPLETE' ? 'Ano atual confirmado' : 'Subtotal anual'}</p>
        <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.yearTotal)}</p>
        <p className="overview-card__hint">Cobertura anual não comprovada</p>
      </article>
      <article className="overview-card">
        <p className="overview-card__label">Média mensal completa</p>
        <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.averageMonthly)}</p>
        <p className="overview-card__hint">Exibida apenas com 12 meses completos</p>
      </article>
      <article className="overview-card">
        <p className="overview-card__label">Quantidade de pagamentos</p>
        <p className="overview-card__value">{viewModel.paymentCount > 0 ? viewModel.paymentCount : snapshot.summary.historyCoverage === 'COMPLETE' ? 0 : 'Nao informado'}</p>
        <p className="overview-card__hint">Registros classificados como recebidos (PAID)</p>
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
