import { formatReadonlyDateTime } from '../readonlyIncomeViewModel.ts';
import type { IncomeReadonlyHeaderProps } from './shared/incomeReadonlySharedProps';

export function IncomeReadonlyHeader({
  generatedAt,
  onRefresh,
  showRefreshButton,
}: IncomeReadonlyHeaderProps) {
  return (
    <div className="fixed-income-readonly__header">
      <div>
        <p className="page-shell__eyebrow">Proventos</p>
        <h2 className="page-shell__title" id="page-income">
          Proventos e renda mensal
        </h2>
        <p className="page-shell__description">
          Somente leitura. O legado fornece os registros reais e a tela apenas apresenta o snapshot congelado.
        </p>
      </div>

      <div className="fixed-income-readonly__header-actions">
        <p className="fixed-income-readonly__meta">
          <span className="fixed-income-readonly__meta-label">Snapshot</span>
          <time dateTime={generatedAt}>{formatReadonlyDateTime(generatedAt)}</time>
        </p>
        <p className="fixed-income-readonly__meta">
          <span className="fixed-income-readonly__meta-label">Origem segura</span>
          <span>Snapshot readonly validado</span>
        </p>
        <a className="fixed-income-readonly__legacy-link" href="/index.html">
          Voltar ao legado
        </a>
        {showRefreshButton ? (
          <button className="assets-report__refresh-button" type="button" onClick={onRefresh}>
            Atualizar proventos
          </button>
        ) : null}
      </div>
    </div>
  );
}
