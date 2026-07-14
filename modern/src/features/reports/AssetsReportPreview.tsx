import { useSyncExternalStore } from 'react';
import type {
  ReportsReadonlyDiagnostics,
  ReportsRefreshController,
} from './reportsRefreshController';
import type { ReadOnlyReportsAdapter } from './reportsSnapshotAdapter';

const trendLabel = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
} as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}

function formatPercent(value: number) {
  return `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}%`;
}

function formatQuantity(value: number) {
  return value.toLocaleString('pt-BR', {
    maximumFractionDigits: 4,
  });
}

interface AssetsReportPreviewProps {
  adapter: ReadOnlyReportsAdapter;
  refreshController?: ReportsRefreshController | null;
}

interface AssetsReportPreviewContentProps {
  errorMessage: string | null;
  onRefresh?: () => void;
  showRefreshButton: boolean;
  diagnostics?: ReportsReadonlyDiagnostics | null;
  snapshot: ReturnType<ReadOnlyReportsAdapter['getSnapshot']>;
}

const diagnosticStatusLabel: Record<ReportsReadonlyDiagnostics['refreshStatus'], string> = {
  idle: 'Leitura inicial pronta',
  updated: 'Leitura atualizada',
  fallback: 'Fallback readonly ativo',
  error: 'Erro de refresh detectado',
};

function AssetsReportPreviewContent({
  diagnostics,
  errorMessage,
  onRefresh,
  showRefreshButton,
  snapshot,
}: AssetsReportPreviewContentProps) {
  return (
    <section className="page-shell assets-report" aria-labelledby="page-reports">
      <div className="assets-report__header">
        <div>
          <p className="page-shell__eyebrow">Relatorios</p>
          <h2 className="page-shell__title" id="page-reports">
            Previa somente leitura de Relatorios
          </h2>
        </div>
        <div className="assets-report__refresh">
          <p className="assets-report__updated" aria-live="polite">
            Atualizacao ficticia: {snapshot.generatedAt}
          </p>
          {showRefreshButton ? (
            <button className="assets-report__refresh-button" type="button" onClick={onRefresh}>
              Atualizar previa
            </button>
          ) : null}
        </div>
      </div>

      <p className="page-shell__description">
        Primeira tela moderna somente leitura para demonstrar uma previa de relatorios sem carregar dados reais.
      </p>
      {diagnostics ? (
        <div
          className="assets-report__diagnostic"
          data-origin-mode={diagnostics.originMode}
          data-refresh-status={diagnostics.refreshStatus}
          aria-live="polite"
        >
          <strong>{diagnostics.originLabel}</strong>
          <span>{diagnostics.itemCount} ativos</span>
          <span>Atualizacao: {diagnosticStatusLabel[diagnostics.refreshStatus]}</span>
          <span>Gerado em {diagnostics.generatedAt}</span>
          <span>{diagnostics.hasNotice ? 'Notice ativo' : 'Sem notice'}</span>
        </div>
      ) : null}
      <p className="assets-report__notice">{snapshot.notice}</p>
      {errorMessage ? (
        <p className="assets-report__status" role="status" aria-live="polite">
          {errorMessage}
        </p>
      ) : null}

      <div className="assets-report__summary" aria-label="Resumo demonstrativo da previa de relatorios">
        <article className="overview-card">
          <p className="overview-card__label">Total demonstrativo</p>
          <p className="overview-card__value">{formatCurrency(snapshot.summary.totalValue)}</p>
          <p className="overview-card__hint">Soma ficticia dos valores atuais</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Ativos na previa</p>
          <p className="overview-card__value">{snapshot.summary.itemCount}</p>
          <p className="overview-card__hint">Itens locais de demonstracao</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Variacao media</p>
          <p className="overview-card__value">{formatPercent(snapshot.summary.averageVariationPct)}</p>
          <p className="overview-card__hint">Media simples ficticia</p>
        </article>
      </div>

      <div className="assets-report__table-wrap">
        <table className="assets-report__table">
          <caption>Previa demonstrativa de ativos em relatorios</caption>
          <thead>
            <tr>
              <th scope="col">Ativo</th>
              <th scope="col">Tipo</th>
              <th className="number-cell" scope="col">
                Quantidade
              </th>
              <th className="number-cell" scope="col">
                Preco medio
              </th>
              <th className="number-cell" scope="col">
                Valor atual
              </th>
              <th className="number-cell" scope="col">
                Variacao
              </th>
              <th className="number-cell" scope="col">
                Participacao
              </th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.items.map((item) => (
              <tr key={item.ticker}>
                <th scope="row">
                  <span className="assets-report__ticker">{item.ticker}</span>
                  <span className="assets-report__name">{item.name}</span>
                </th>
                <td>{item.category}</td>
                <td className="number-cell">{formatQuantity(item.quantity)}</td>
                <td className="number-cell">{formatCurrency(item.averagePrice)}</td>
                <td className="number-cell">{formatCurrency(item.currentValue)}</td>
                <td className="number-cell">{formatPercent(item.variationPct)}</td>
                <td className="number-cell">{formatPercent(item.allocationPct).replace('+', '')}</td>
                <td>
                  <span className="trend-badge" data-trend={item.trend}>
                    {trendLabel[item.trend]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="assets-report__mobile-list" aria-label="Lista mobile equivalente da previa de ativos">
        {snapshot.items.map((item) => (
          <article className="assets-report__mobile-card" key={item.ticker}>
            <div>
              <h3>{item.ticker}</h3>
              <p>{item.name}</p>
            </div>
            <dl>
              <div>
                <dt>Tipo</dt>
                <dd>{item.category}</dd>
              </div>
              <div>
                <dt>Quantidade</dt>
                <dd>{formatQuantity(item.quantity)}</dd>
              </div>
              <div>
                <dt>Preco medio</dt>
                <dd>{formatCurrency(item.averagePrice)}</dd>
              </div>
              <div>
                <dt>Valor atual</dt>
                <dd>{formatCurrency(item.currentValue)}</dd>
              </div>
              <div>
                <dt>Variacao</dt>
                <dd>{formatPercent(item.variationPct)}</dd>
              </div>
              <div>
                <dt>Participacao</dt>
                <dd>{formatPercent(item.allocationPct).replace('+', '')}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  <span className="trend-badge" data-trend={item.trend}>
                    {trendLabel[item.trend]}
                  </span>
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function StaticAssetsReportPreview({ adapter }: { adapter: ReadOnlyReportsAdapter }) {
  return (
    <AssetsReportPreviewContent
      diagnostics={null}
      errorMessage={null}
      showRefreshButton={false}
      snapshot={adapter.getSnapshot()}
    />
  );
}

function RefreshableAssetsReportPreview({
  refreshController,
}: {
  refreshController: ReportsRefreshController;
}) {
  const refreshState = useSyncExternalStore(
    refreshController?.subscribe ?? (() => () => {}),
    refreshController!.getState,
    refreshController!.getState,
  );

  return (
    <AssetsReportPreviewContent
      diagnostics={refreshState.diagnostics}
      errorMessage={refreshState.errorMessage}
      onRefresh={() => refreshController?.refresh()}
      showRefreshButton={true}
      snapshot={refreshState.snapshot}
    />
  );
}

export function AssetsReportPreview({ adapter, refreshController }: AssetsReportPreviewProps) {
  if (!refreshController) {
    return <StaticAssetsReportPreview adapter={adapter} />;
  }

  return <RefreshableAssetsReportPreview refreshController={refreshController} />;
}
