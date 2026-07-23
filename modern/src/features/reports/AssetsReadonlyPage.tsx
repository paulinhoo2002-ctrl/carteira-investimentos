import { useMemo, useState, useSyncExternalStore } from 'react';
import type { ReportsReadonlyDiagnostics, ReportsRefreshController } from './reportsRefreshController';
import type { ReadOnlyReportsAdapter } from './reportsSnapshotAdapter';
import type { ReadOnlyReportsSnapshot } from './reportsReadonlyContract.mjs';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { Input } from '../../components/Input/Input';
import { Select } from '../../components/Select/Select';
import {
  calculateReadonlyAssetResult,
  calculateReadonlyAssetRentabilityPct,
  createReadonlyAssetsSummary,
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
  currentValueDesc: 'Maior valor da posicao',
  currentValueAsc: 'Menor valor da posicao',
  rentabilityPctDesc: 'Maior rentabilidade',
  rentabilityPctAsc: 'Menor rentabilidade',
  resultDesc: 'Maior resultado',
  resultAsc: 'Menor resultado',
  ticker: 'Ticker',
  name: 'Nome',
};

const diagnosticStatusLabel: Record<ReportsReadonlyDiagnostics['refreshStatus'], string> = {
  idle: 'Leitura pronta',
  updated: 'Leitura atualizada',
  fallback: 'Fallback readonly ativo',
  error: 'Ultimo snapshot valido preservado',
};

const diagnosticStatusVariant: Record<ReportsReadonlyDiagnostics['refreshStatus'], 'neutral' | 'positive' | 'warning' | 'negative'> = {
  idle: 'neutral',
  updated: 'positive',
  fallback: 'warning',
  error: 'negative',
};

const trendBadgeVariant: Record<'positive' | 'negative' | 'neutral', 'positive' | 'negative' | 'neutral'> = {
  positive: 'positive',
  negative: 'negative',
  neutral: 'neutral',
};

function categoryBadgeVariant(category: string) {
  if (/etf/i.test(category)) {
    return 'info' as const;
  }

  if (/fii/i.test(category)) {
    return 'neutral' as const;
  }

  return 'positive' as const;
}

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
  const [sortBy, setSortBy] = useState<ReadonlyAssetsSortKey>('currentValueDesc');
  const [topPositionsOpen, setTopPositionsOpen] = useState(false);
  const [distributionOpen, setDistributionOpen] = useState(false);

  const viewModel = useMemo(
    () =>
      createReadonlyAssetsViewModel(snapshot, {
        query,
        category,
        sortBy,
      }),
    [category, query, snapshot, sortBy],
  );

  const summary = useMemo(() => createReadonlyAssetsSummary(viewModel.filteredItems), [viewModel.filteredItems]);

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
            : `${viewModel.summary.itemCount} ativos somente leitura`}
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

      <section className="assets-readonly__highlights" aria-labelledby="assets-highlights">
        <div className="assets-readonly__section-title-row">
          <div>
            <h3 className="assets-readonly__section-title" id="assets-highlights">
              Maiores posições
            </h3>
            <p className="assets-readonly__section-note">Top 3 por valor da posição.</p>
          </div>
          <Button
            aria-controls="assets-readonly-highlights-panel"
            aria-expanded={topPositionsOpen}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTopPositionsOpen((value) => !value)}
          >
            {topPositionsOpen ? 'Ocultar' : 'Ver maiores'}
          </Button>
        </div>

        <div className="assets-readonly__auxiliary-panel" id="assets-readonly-highlights-panel" hidden={!topPositionsOpen}>
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
        </div>
      </section>

      <section className="assets-readonly__distribution" aria-labelledby="assets-distribution">
        <div className="assets-readonly__section-title-row">
          <div>
            <h3 className="assets-readonly__section-title" id="assets-distribution">
              Distribuição por categoria
            </h3>
            <p className="assets-readonly__section-note">Agregação visual baseada nas participações já calculadas.</p>
          </div>
          <Button
            aria-controls="assets-readonly-distribution-panel"
            aria-expanded={distributionOpen}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDistributionOpen((value) => !value)}
          >
            {distributionOpen ? 'Ocultar' : 'Ver distribuição'}
          </Button>
        </div>

        <div className="assets-readonly__auxiliary-panel" id="assets-readonly-distribution-panel" hidden={!distributionOpen}>
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
                      Valor da posição
                    </th>
                    <th className="number-cell" scope="col">
                      Resultado
                    </th>
                    <th className="number-cell" scope="col">
                      Rentabilidade
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
                      <td>
                        <Badge size="sm" variant={categoryBadgeVariant(item.category)}>
                          {item.category}
                        </Badge>
                      </td>
                      <td className="number-cell">{formatReadonlyQuantity(item.quantity)}</td>
                      <td className="number-cell">{formatReadonlyCurrency(item.averagePrice)}</td>
                      <td className="number-cell">{formatReadonlyCurrency(item.currentValue)}</td>
                      <td className="number-cell">{formatReadonlyCurrency(calculateReadonlyAssetResult(item))}</td>
                      <td className="number-cell">{formatReadonlyPercent(calculateReadonlyAssetRentabilityPct(item))}</td>
                      <td>
                        <Badge size="sm" variant={trendBadgeVariant[item.trend]}>
                          {item.trend === 'positive' ? 'Positivo' : item.trend === 'negative' ? 'Negativo' : 'Neutro'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="assets-report__mobile-list" aria-label="Lista mobile dos ativos readonly">
              {viewModel.filteredItems.map((item) => (
                <article className="assets-report__mobile-card" key={item.ticker}>
                  <div className="assets-report__mobile-card-head">
                    <div>
                      <h4 className="assets-report__ticker">{item.ticker}</h4>
                      <p className="assets-report__name">{item.name}</p>
                    </div>
                    <Badge size="sm" variant={categoryBadgeVariant(item.category)}>
                      {item.category}
                    </Badge>
                  </div>
                  <dl>
                    <div>
                      <dt>Valor da posição</dt>
                      <dd>{formatReadonlyCurrency(item.currentValue)}</dd>
                    </div>
                    <div>
                      <dt>Resultado</dt>
                      <dd>{formatReadonlyCurrency(calculateReadonlyAssetResult(item))}</dd>
                    </div>
                    <div>
                      <dt>Rentabilidade</dt>
                      <dd>{formatReadonlyPercent(calculateReadonlyAssetRentabilityPct(item))}</dd>
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
                      <dt>Tendência</dt>
                      <dd>
                        <Badge size="sm" variant={trendBadgeVariant[item.trend]}>
                          {item.trend === 'positive' ? 'Positivo' : item.trend === 'negative' ? 'Negativo' : 'Neutro'}
                        </Badge>
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
