import {
  formatReadonlyCurrency,
  formatReadonlyPercent,
  type ReadonlyAssetsSummary,
} from '../readonlyReportsViewModel';

interface AssetsReadonlySummaryGridProps {
  readonly summary: ReadonlyAssetsSummary;
}

export function AssetsReadonlySummaryGrid({ summary }: AssetsReadonlySummaryGridProps) {
  return (
    <div className="assets-readonly__summary" aria-label="Resumo readonly dos ativos">
      <article className="assets-readonly__summary-card">
        <p className="assets-readonly__summary-label">Total exibido</p>
        <p className="assets-readonly__summary-value">{formatReadonlyCurrency(summary.totalValue)}</p>
        <p className="assets-readonly__summary-hint">Somente itens visíveis nesta leitura.</p>
      </article>
      <article className="assets-readonly__summary-card">
        <p className="assets-readonly__summary-label">Quantidade</p>
        <p className="assets-readonly__summary-value">{summary.itemCount}</p>
        <p className="assets-readonly__summary-hint">Contagem atual do filtro.</p>
      </article>
      <article className="assets-readonly__summary-card">
        <p className="assets-readonly__summary-label">Resultado agregado</p>
        <p className="assets-readonly__summary-value">{formatReadonlyCurrency(summary.totalResult)}</p>
        <p className="assets-readonly__summary-hint">Diferença entre posição e custo.</p>
      </article>
      <article className="assets-readonly__summary-card">
        <p className="assets-readonly__summary-label">Rentabilidade</p>
        <p className="assets-readonly__summary-value">{formatReadonlyPercent(summary.rentabilityPct)}</p>
        <p className="assets-readonly__summary-hint">Retorno sobre custo exibido.</p>
      </article>
    </div>
  );
}
