import { useMemo, useState, useSyncExternalStore } from 'react';
import type { ReportsReadonlyDiagnostics, ReportsRefreshController } from './reportsRefreshController';
import type { ReadOnlyReportsAdapter } from './reportsSnapshotAdapter';
import type { ReadOnlyReportsSnapshot } from './reportsReadonlyContract.mjs';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { Select } from '../../components/Select/Select';
import {
  createReadonlyAssetsViewModel,
  formatReadonlyCurrency,
  formatReadonlyDateTime,
  formatReadonlyPercent,
  formatReadonlyQuantity,
  type ReadonlyAssetsSortKey,
} from './readonlyReportsViewModel';

interface AssetsReadonlyPageProps {
  adapter: ReadOnlyReportsAdapter;
  refreshController?: ReportsRefreshController | null;
}

interface AssetsReadonlyPageContentProps {
  snapshot: ReadOnlyReportsSnapshot;
  diagnostics: ReportsReadonlyDiagnostics | null;
  errorMessage: string | null;
  onRefresh?: () => void;
  showRefreshButton: boolean;
}

const sortLabels: Record<ReadonlyAssetsSortKey, string> = {
  currentValue: 'Valor atual',
  variationPct: 'Variacao',
  allocationPct: 'Participacao',
  ticker: 'Ticker',
};

const diagnosticStatusLabel: Record<ReportsReadonlyDiagnostics['refreshStatus'], string> = {
  idle: 'Leitura pronta',
  updated: 'Leitura atualizada',
  fallback: 'Fallback readonly ativo',
  error: 'Ultimo snapshot valido preservado',
};

function summarizeItemLabel(ticker: string, name: string) {
  return `${ticker} · ${name}`;
}

function AssetsReadonlyPageContent({
  diagnostics,
  errorMessage,
  onRefresh,
  showRefreshButton,
  snapshot,
}: AssetsReadonlyPageContentProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<ReadonlyAssetsSortKey>('currentValue');

  const viewModel = useMemo(
    () =>
      createReadonlyAssetsViewModel(snapshot, {
        query,
        category,
        sortBy,
      }),
    [category, query, snapshot, sortBy],
  );

  const hasSnapshotItems = viewModel.itemCount > 0;
  const topGainLabel = hasSnapshotItems ? 'Nenhum ativo em alta' : 'Sem ativos';
  const topGainHint = hasSnapshotItems ? 'Nenhum ativo com variacao positiva' : 'Snapshot vazio';
  const topLossLabel = hasSnapshotItems ? 'Nenhum ativo em queda' : 'Sem ativos';
  const topLossHint = hasSnapshotItems ? 'Nenhum ativo com variacao negativa' : 'Snapshot vazio';

  const topGain = viewModel.topGainers[0] ?? null;
  const topLoss = viewModel.topLosers[0] ?? null;

  return (
    <section className="page-shell assets-readonly" aria-labelledby="page-assets">
      <div className="assets-readonly__header">
        <div>
          <p className="page-shell__eyebrow">Ativos</p>
          <h2 className="page-shell__title" id="page-assets">
            Ativos
          </h2>
          <p className="page-shell__description">Somente leitura. Nada aqui escreve ou altera a carteira.</p>
        </div>

        <div className="assets-readonly__header-actions">
          <p className="assets-readonly__meta">
            <span className="assets-readonly__meta-label">Snapshot</span>
            <time dateTime={snapshot.generatedAt}>{formatReadonlyDateTime(snapshot.generatedAt)}</time>
          </p>
          <p className="assets-readonly__meta">
            <span className="assets-readonly__meta-label">Origem segura</span>
            <span>{diagnostics?.originLabel ?? 'Snapshot somente leitura validado'}</span>
          </p>
          <a className="assets-readonly__legacy-link" href="/index.html">
            Voltar ao legado
          </a>
          {showRefreshButton ? (
            <Button className="assets-report__refresh-button" type="button" variant="secondary" onClick={onRefresh}>
              Atualizar ativos
            </Button>
          ) : null}
        </div>
      </div>

      <p className="assets-report__notice">{snapshot.notice}</p>

      <p className="assets-report__status" role="status" aria-live="polite">
        {errorMessage
          ? errorMessage
          : diagnostics
            ? `${diagnosticStatusLabel[diagnostics.refreshStatus]} · ${diagnostics.itemCount} ativos`
            : `${viewModel.itemCount} ativos somente leitura`}
      </p>

      <section className="assets-readonly__filters" aria-labelledby="assets-filters">
        <div className="assets-readonly__section-title-row">
          <h3 className="assets-readonly__section-title" id="assets-filters">
            Filtros
          </h3>
          <p className="assets-readonly__section-note">Apenas estado visual local, sem persistência.</p>
        </div>

        <div className="assets-readonly__controls">
          <Input
            className="assets-readonly__control"
            helperText="Apenas estado visual local, sem persistencia."
            id="assets-readonly-search"
            label="Buscar por ticker ou nome"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="PETR4, Maxi Renda..."
            type="search"
            value={query}
          />

          <Select className="assets-readonly__control" id="assets-readonly-category" label="Categoria" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">Todas</option>
              {viewModel.categories.map((itemCategory) => (
                <option key={itemCategory} value={itemCategory}>
                  {itemCategory}
                </option>
              ))}
          </Select>

          <Select
            className="assets-readonly__control"
            id="assets-readonly-sort"
            label="Ordenar por"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as ReadonlyAssetsSortKey)}
          >
              {Object.entries(sortLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </Select>
        </div>

        <p className="assets-readonly__results" aria-live="polite">
          {viewModel.hasResults
            ? `${viewModel.filteredItems.length} resultado${viewModel.filteredItems.length === 1 ? '' : 's'} encontrado${
                viewModel.filteredItems.length === 1 ? '' : 's'
              }`
            : snapshot.items.length === 0
              ? 'Carteira vazia nesta leitura readonly.'
              : 'Nenhum ativo corresponde aos filtros atuais.'}
        </p>
      </section>

      <div className="overview-grid assets-readonly__summary" aria-label="Resumo readonly dos ativos">
        <article className="overview-card">
          <p className="overview-card__label">Patrimônio total</p>
          <p className="overview-card__value">{formatReadonlyCurrency(viewModel.totalValue)}</p>
          <p className="overview-card__hint">Agregação pronta do snapshot versionado</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Quantidade de ativos</p>
          <p className="overview-card__value">{viewModel.itemCount}</p>
          <p className="overview-card__hint">Itens já calculados na origem</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Variação média</p>
          <p className="overview-card__value">{formatReadonlyPercent(viewModel.averageVariationPct)}</p>
          <p className="overview-card__hint">Métrica de leitura, sem fórmula nova</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Maior alta</p>
          <p className="overview-card__value">
            {topGain ? summarizeItemLabel(topGain.ticker, topGain.name) : topGainLabel}
          </p>
          <p className="overview-card__hint">
            {topGain ? formatReadonlyPercent(topGain.variationPct) : topGainHint}
          </p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Maior queda</p>
          <p className="overview-card__value">
            {topLoss ? summarizeItemLabel(topLoss.ticker, topLoss.name) : topLossLabel}
          </p>
          <p className="overview-card__hint">
            {topLoss ? formatReadonlyPercent(topLoss.variationPct) : topLossHint}
          </p>
        </article>
      </div>

      <section className="assets-readonly__highlights" aria-labelledby="assets-highlights">
        <div className="assets-readonly__section-title-row">
          <h3 className="assets-readonly__section-title" id="assets-highlights">
            Maiores posições
          </h3>
          <p className="assets-readonly__section-note">Ordenadas pelo valor atual já fornecido no snapshot.</p>
        </div>

        <div className="assets-readonly__top-list">
          {viewModel.topPositions.length > 0 ? (
            viewModel.topPositions.map((item, index) => (
              <article className="overview-card" key={item.ticker}>
                <p className="overview-card__label">Posição {index + 1}</p>
                <p className="overview-card__value">{summarizeItemLabel(item.ticker, item.name)}</p>
                <p className="overview-card__hint">
                  {formatReadonlyCurrency(item.currentValue)} · {formatReadonlyPercent(item.allocationPct, { signed: false })}
                </p>
              </article>
            ))
          ) : (
            <article className="overview-card" aria-live="polite">
              <p className="overview-card__label">Sem ativos</p>
              <p className="overview-card__value">Snapshot vazio</p>
              <p className="overview-card__hint">Nenhuma posição readonly para exibir.</p>
            </article>
          )}
        </div>
      </section>

      <section className="assets-readonly__distribution" aria-labelledby="assets-distribution">
        <div className="assets-readonly__section-title-row">
          <h3 className="assets-readonly__section-title" id="assets-distribution">
            Distribuição por categoria
          </h3>
          <p className="assets-readonly__section-note">Agregação visual baseada nas participações já calculadas.</p>
        </div>

        <div className="assets-readonly__distribution-list">
          {viewModel.distribution.length > 0 ? (
            viewModel.distribution.map((entry) => (
              <div className="assets-readonly__distribution-row" key={entry.category}>
                <div className="assets-readonly__distribution-row-head">
                  <strong>{entry.category}</strong>
                  <span>
                    {formatReadonlyPercent(entry.allocationPct, { signed: false })} · {entry.itemCount} ativos
                  </span>
                </div>
                <div
                  className="assets-readonly__distribution-track"
                  aria-label={`${entry.category}: ${formatReadonlyPercent(entry.allocationPct, { signed: false })}`}
                >
                  <span
                    className="assets-readonly__distribution-fill"
                    style={{ width: `${Math.max(0, Math.min(entry.allocationPct, 100))}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <article className="overview-card" aria-live="polite">
              <p className="overview-card__label">Sem distribuicao</p>
              <p className="overview-card__value">Snapshot vazio</p>
              <p className="overview-card__hint">Nenhuma categoria readonly para exibir.</p>
            </article>
          )}
        </div>
      </section>

      <section className="assets-readonly__list" aria-labelledby="assets-list">
        <div className="assets-readonly__section-title-row">
          <h3 className="assets-readonly__section-title" id="assets-list">
            Lista de ativos
          </h3>
          <p className="assets-readonly__section-note">Desktop em tabela; mobile em cartões sem rolagem horizontal.</p>
        </div>

        {viewModel.filteredItems.length > 0 ? (
          <>
            <div className="assets-report__table-wrap">
              <table className="assets-report__table">
                <caption>Lista readonly dos ativos da carteira</caption>
                <thead>
                  <tr>
                    <th scope="col">Ativo</th>
                    <th scope="col">Categoria</th>
                    <th className="number-cell" scope="col">
                      Quantidade
                    </th>
                    <th className="number-cell" scope="col">
                      Preço médio
                    </th>
                    <th className="number-cell" scope="col">
                      Valor atual
                    </th>
                    <th className="number-cell" scope="col">
                      Variação
                    </th>
                    <th className="number-cell" scope="col">
                      Participação
                    </th>
                    <th scope="col">Tendência</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.filteredItems.map((item) => (
                    <tr key={item.ticker}>
                      <th scope="row">
                        <span className="assets-report__ticker">{item.ticker}</span>
                        <span className="assets-report__name">{item.name}</span>
                      </th>
                      <td>{item.category}</td>
                      <td className="number-cell">{formatReadonlyQuantity(item.quantity)}</td>
                      <td className="number-cell">{formatReadonlyCurrency(item.averagePrice)}</td>
                      <td className="number-cell">{formatReadonlyCurrency(item.currentValue)}</td>
                      <td className="number-cell">{formatReadonlyPercent(item.variationPct)}</td>
                      <td className="number-cell">{formatReadonlyPercent(item.allocationPct, { signed: false })}</td>
                      <td>
                        <span className="trend-badge" data-trend={item.trend}>
                          {item.trend === 'positive' ? 'Positivo' : item.trend === 'negative' ? 'Negativo' : 'Neutro'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="assets-report__mobile-list" aria-label="Lista mobile dos ativos readonly">
              {viewModel.filteredItems.map((item) => (
                <article className="assets-report__mobile-card" key={item.ticker}>
                  <div>
                    <h4 className="assets-report__ticker">{item.ticker}</h4>
                    <p className="assets-report__name">{item.name}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Categoria</dt>
                      <dd>{item.category}</dd>
                    </div>
                    <div>
                      <dt>Quantidade</dt>
                      <dd>{formatReadonlyQuantity(item.quantity)}</dd>
                    </div>
                    <div>
                      <dt>Preço médio</dt>
                      <dd>{formatReadonlyCurrency(item.averagePrice)}</dd>
                    </div>
                    <div>
                      <dt>Valor atual</dt>
                      <dd>{formatReadonlyCurrency(item.currentValue)}</dd>
                    </div>
                    <div>
                      <dt>Variação</dt>
                      <dd>{formatReadonlyPercent(item.variationPct)}</dd>
                    </div>
                    <div>
                      <dt>Participação</dt>
                      <dd>{formatReadonlyPercent(item.allocationPct, { signed: false })}</dd>
                    </div>
                    <div>
                      <dt>Tendência</dt>
                      <dd>
                        <span className="trend-badge" data-trend={item.trend}>
                          {item.trend === 'positive' ? 'Positivo' : item.trend === 'negative' ? 'Negativo' : 'Neutro'}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="assets-readonly__empty" role="status" aria-live="polite">
            <p className="assets-readonly__empty-title">
              {snapshot.items.length === 0 ? 'Carteira vazia nesta leitura readonly.' : 'Nenhum ativo encontrado.'}
            </p>
            <p className="assets-readonly__empty-body">
              {snapshot.items.length === 0
                ? 'O snapshot de leitura chegou vazio, mas continua válido e congelado.'
                : 'Ajuste a busca, a categoria ou a ordenação para ver os itens novamente.'}
            </p>
          </div>
        )}
      </section>
    </section>
  );
}

function StaticAssetsReadonlyPage({ adapter }: { adapter: ReadOnlyReportsAdapter }) {
  const snapshot = useMemo(() => adapter.getSnapshot(), [adapter]);

  return (
    <AssetsReadonlyPageContent
      diagnostics={null}
      errorMessage={null}
      showRefreshButton={false}
      snapshot={snapshot}
    />
  );
}

function RefreshableAssetsReadonlyPage({ refreshController }: { refreshController: ReportsRefreshController }) {
  const refreshState = useSyncExternalStore(
    refreshController.subscribe,
    refreshController.getState,
    refreshController.getState,
  );

  return (
    <AssetsReadonlyPageContent
      diagnostics={refreshState.diagnostics}
      errorMessage={refreshState.errorMessage}
      onRefresh={() => refreshController.refresh()}
      showRefreshButton={true}
      snapshot={refreshState.snapshot}
    />
  );
}

export function AssetsReadonlyPage({ adapter, refreshController }: AssetsReadonlyPageProps) {
  if (!refreshController) {
    return <StaticAssetsReadonlyPage adapter={adapter} />;
  }

  return <RefreshableAssetsReadonlyPage refreshController={refreshController} />;
}
