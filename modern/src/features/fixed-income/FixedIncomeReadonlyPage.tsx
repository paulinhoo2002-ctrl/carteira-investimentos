import { useMemo, useState } from 'react';
import type { ReadOnlyFixedIncomeAdapter } from './fixedIncomeSnapshotAdapter.mjs';
import {
  createReadonlyFixedIncomeViewModel,
  formatCount,
  formatReadonlyCurrency,
  formatReadonlyDate,
  formatReadonlyPercent,
  formatText,
  type ReadonlyFixedIncomeSortKey,
} from './readonlyFixedIncomeViewModel.ts';

interface FixedIncomeReadonlyPageProps {
  adapter: ReadOnlyFixedIncomeAdapter;
}

const sortLabels: Record<ReadonlyFixedIncomeSortKey, string> = {
  liquidValue: 'Valor líquido',
  profitValue: 'Ganho / perda',
  maturityDate: 'Vencimento',
  ticker: 'Ticker',
};

function summarizeItemLabel(ticker: string, name: string) {
  return `${ticker} · ${name}`;
}

function FixedIncomeReadonlyPageContent({ adapter }: FixedIncomeReadonlyPageProps) {
  const [query, setQuery] = useState('');
  const [subtype, setSubtype] = useState('all');
  const [sortBy, setSortBy] = useState<ReadonlyFixedIncomeSortKey>('liquidValue');
  const snapshot = adapter.getSnapshot();

  const viewModel = useMemo(
    () =>
      createReadonlyFixedIncomeViewModel(snapshot, {
        query,
        subtype,
        sortBy,
      }),
    [query, snapshot, sortBy, subtype],
  );

  const hasItems = snapshot.items.length > 0;
  const emptyTitle = hasItems ? 'Nenhum titulo encontrado' : 'Carteira vazia nesta leitura readonly.';
  const emptyBody = hasItems
    ? 'Ajuste a busca, o subtipo ou a ordenacao para ver os titulos novamente.'
    : 'O snapshot de renda fixa chegou vazio, mas continua valido e congelado.';

  return (
    <section className="page-shell fixed-income-readonly" aria-labelledby="page-fixed-income">
      <div className="fixed-income-readonly__header">
        <div>
          <p className="page-shell__eyebrow">Renda fixa</p>
          <h2 className="page-shell__title" id="page-fixed-income">
            Renda fixa
          </h2>
          <p className="page-shell__description">
            Somente leitura. Valores e vencimentos vem do legado por fronteira readonly explicita.
          </p>
        </div>

        <div className="fixed-income-readonly__header-actions">
          <p className="fixed-income-readonly__meta">
            <span className="fixed-income-readonly__meta-label">Snapshot</span>
            <time dateTime={snapshot.generatedAt}>{formatReadonlyDate(snapshot.generatedAt)}</time>
          </p>
          <p className="fixed-income-readonly__meta">
            <span className="fixed-income-readonly__meta-label">Origem segura</span>
            <span>Snapshot readonly validado</span>
          </p>
          <a className="fixed-income-readonly__legacy-link" href="/index.html">
            Voltar ao legado
          </a>
        </div>
      </div>

      <p className="fixed-income-readonly__notice">{snapshot.notice}</p>

      <p className="fixed-income-readonly__status" role="status" aria-live="polite">
        {viewModel.itemCount > 0
          ? `${formatCount(viewModel.itemCount)} título${viewModel.itemCount === 1 ? '' : 's'} de renda fixa somente leitura`
          : 'Carteira de renda fixa vazia nesta leitura readonly.'}
      </p>

      <section className="fixed-income-readonly__filters" aria-labelledby="fixed-income-filters">
        <div className="fixed-income-readonly__section-title-row">
          <h3 className="fixed-income-readonly__section-title" id="fixed-income-filters">
            Filtros
          </h3>
          <p className="fixed-income-readonly__section-note">Apenas estado visual local, sem persistência.</p>
        </div>

        <div className="fixed-income-readonly__controls">
          <label className="fixed-income-readonly__control">
            <span>Buscar por ticker, nome ou emissor</span>
            <input
              aria-label="Buscar por ticker, nome ou emissor"
              placeholder="CDB, banco, vencimento..."
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="fixed-income-readonly__control">
            <span>Subtipo</span>
            <select aria-label="Filtrar por subtipo" value={subtype} onChange={(event) => setSubtype(event.target.value)}>
              <option value="all">Todos</option>
              {viewModel.categories.map((itemSubtype) => (
                <option key={itemSubtype} value={itemSubtype}>
                  {itemSubtype}
                </option>
              ))}
            </select>
          </label>

          <label className="fixed-income-readonly__control">
            <span>Ordenar por</span>
            <select aria-label="Ordenar títulos" value={sortBy} onChange={(event) => setSortBy(event.target.value as ReadonlyFixedIncomeSortKey)}>
              {Object.entries(sortLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="fixed-income-readonly__results" aria-live="polite">
          {viewModel.hasResults
            ? `${viewModel.filteredItems.length} resultado${viewModel.filteredItems.length === 1 ? '' : 's'} encontrado${
                viewModel.filteredItems.length === 1 ? '' : 's'
              }`
            : hasItems
              ? 'Nenhum titulo corresponde aos filtros atuais.'
              : 'Carteira vazia nesta leitura readonly.'}
        </p>
      </section>

      <div className="overview-grid fixed-income-readonly__summary" aria-label="Resumo readonly da renda fixa">
        <article className="overview-card">
          <p className="overview-card__label">Valor aplicado</p>
          <p className="overview-card__value">{formatReadonlyCurrency(viewModel.totalApplied)}</p>
          <p className="overview-card__hint">Somatorio já entregue pelo legado</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Valor bruto</p>
          <p className="overview-card__value">{formatReadonlyCurrency(viewModel.totalGross)}</p>
          <p className="overview-card__hint">Leitura agregada do snapshot</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Valor líquido</p>
          <p className="overview-card__value">{formatReadonlyCurrency(viewModel.totalLiquid)}</p>
          <p className="overview-card__hint">Sem recálculo moderno</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Ganho / perda</p>
          <p className="overview-card__value">{formatReadonlyCurrency(viewModel.totalProfit)}</p>
          <p className="overview-card__hint">Leitura agregada da fonte readonly</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">IR / IOF</p>
          <p className="overview-card__value">{formatReadonlyCurrency(viewModel.totalTaxValue)}</p>
          <p className="overview-card__hint">Tributo combinado fornecido pelo legado</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Quantidade de títulos</p>
          <p className="overview-card__value">{viewModel.itemCount}</p>
          <p className="overview-card__hint">Itens já validados e congelados</p>
        </article>
      </div>

      <section className="fixed-income-readonly__highlights" aria-labelledby="fixed-income-highlights">
        <div className="fixed-income-readonly__section-title-row">
          <h3 className="fixed-income-readonly__section-title" id="fixed-income-highlights">
            Destaques
          </h3>
          <p className="fixed-income-readonly__section-note">Leitura rápida dos títulos mais úteis na sessão atual.</p>
        </div>

        <div className="fixed-income-readonly__highlight-grid">
          <article className="overview-card">
            <p className="overview-card__label">Maiores valores líquidos</p>
            {viewModel.topLiquidItems.length > 0 ? (
              <ul className="fixed-income-readonly__compact-list">
              {viewModel.topLiquidItems.map((item) => (
                <li key={item.ticker}>
                  <strong>{summarizeItemLabel(item.ticker, item.name)}</strong>
                  <span>
                      {formatReadonlyCurrency(item.liquidValue)} · {formatText(item.maturityStatus)}
                  </span>
                </li>
              ))}
              </ul>
            ) : (
              <p className="overview-card__hint">Sem titulos para destacar.</p>
            )}
          </article>

          <article className="overview-card">
            <p className="overview-card__label">Vencimentos mais próximos</p>
            {viewModel.topMaturityItems.length > 0 ? (
              <ul className="fixed-income-readonly__compact-list">
                {viewModel.topMaturityItems.map((item) => (
                  <li key={item.ticker}>
                    <strong>{summarizeItemLabel(item.ticker, item.name)}</strong>
                    <span>
                      {formatText(item.maturityStatus)} · {formatReadonlyDate(item.maturityDate)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="overview-card__hint">Sem titulos para destacar.</p>
            )}
          </article>

          <article className="overview-card">
            <p className="overview-card__label">Maiores ganhos</p>
            {viewModel.topProfitItems.length > 0 ? (
              <ul className="fixed-income-readonly__compact-list">
                {viewModel.topProfitItems.map((item) => (
                  <li key={item.ticker}>
                    <strong>{summarizeItemLabel(item.ticker, item.name)}</strong>
                    <span>{formatReadonlyCurrency(item.profitValue)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="overview-card__hint">Nenhum titulo com ganho positivo.</p>
            )}
          </article>

          <article className="overview-card">
            <p className="overview-card__label">Maiores perdas</p>
            {viewModel.topLossItems.length > 0 ? (
              <ul className="fixed-income-readonly__compact-list">
                {viewModel.topLossItems.map((item) => (
                  <li key={item.ticker}>
                    <strong>{summarizeItemLabel(item.ticker, item.name)}</strong>
                    <span>{formatReadonlyCurrency(item.profitValue)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="overview-card__hint">Nenhum titulo com perda negativa.</p>
            )}
          </article>
        </div>
      </section>

      <section className="fixed-income-readonly__distribution" aria-labelledby="fixed-income-distribution">
        <div className="fixed-income-readonly__section-title-row">
          <h3 className="fixed-income-readonly__section-title" id="fixed-income-distribution">
            Distribuição por subtipo
          </h3>
          <p className="fixed-income-readonly__section-note">Agregação visual baseada nas posições já fornecidas.</p>
        </div>

        <div className="fixed-income-readonly__distribution-list">
          {viewModel.distribution.length > 0 ? (
            viewModel.distribution.map((entry) => (
              <div className="fixed-income-readonly__distribution-row" key={entry.subtype}>
                <div className="fixed-income-readonly__distribution-row-head">
                  <strong>{entry.subtype}</strong>
                  <span>
                    {formatReadonlyPercent(entry.allocationPct, { signed: false })} · {entry.itemCount} títulos
                  </span>
                </div>
                <div
                  className="fixed-income-readonly__distribution-track"
                  aria-label={`${entry.subtype}: ${formatReadonlyPercent(entry.allocationPct, { signed: false })}`}
                >
                  <span
                    className="fixed-income-readonly__distribution-fill"
                    style={{ width: `${Math.max(0, Math.min(entry.allocationPct, 100))}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <article className="overview-card" aria-live="polite">
              <p className="overview-card__label">Sem distribuição</p>
              <p className="overview-card__value">Snapshot vazio</p>
              <p className="overview-card__hint">Nenhum subtipo readonly para exibir.</p>
            </article>
          )}
        </div>
      </section>

      <section className="fixed-income-readonly__list" aria-labelledby="fixed-income-list">
        <div className="fixed-income-readonly__section-title-row">
          <h3 className="fixed-income-readonly__section-title" id="fixed-income-list">
            Lista de títulos
          </h3>
          <p className="fixed-income-readonly__section-note">Desktop em tabela; mobile em cartões sem rolagem horizontal.</p>
        </div>

        {viewModel.filteredItems.length > 0 ? (
          <>
            <div className="fixed-income-readonly__table-wrap">
              <table className="fixed-income-readonly__table">
                <caption>Lista readonly dos títulos de renda fixa</caption>
                <thead>
                  <tr>
                    <th scope="col">Título</th>
                    <th scope="col">Subtipo</th>
                    <th scope="col">Emissor</th>
                    <th scope="col">Aplicação</th>
                    <th scope="col">Vencimento</th>
                    <th scope="col">Rentab.</th>
                    <th scope="col">Indexador</th>
                    <th className="number-cell" scope="col">
                      Aplicado
                    </th>
                    <th className="number-cell" scope="col">
                      Bruto
                    </th>
                    <th className="number-cell" scope="col">
                      Líquido
                    </th>
                    <th className="number-cell" scope="col">
                      Ganho / perda
                    </th>
                    <th className="number-cell" scope="col">
                      IR / IOF
                    </th>
                    <th scope="col">Liquidez</th>
                    <th className="number-cell" scope="col">
                      Indisp.
                    </th>
                    <th scope="col">Vencimento</th>
                    <th scope="col">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.filteredItems.map((item) => (
                    <tr key={item.ticker}>
                      <th scope="row">
                        <span className="assets-report__ticker">{item.ticker}</span>
                        <span className="assets-report__name">{item.name}</span>
                      </th>
                      <td>{formatText(item.subtype)}</td>
                      <td>{formatText(item.issuer)}</td>
                      <td>{formatReadonlyDate(item.applicationDate)}</td>
                      <td>{formatReadonlyDate(item.maturityDate)}</td>
                      <td>{formatText(item.contractedRate)}</td>
                      <td>{formatText(item.indexer)}</td>
                      <td className="number-cell">{formatReadonlyCurrency(item.appliedValue)}</td>
                      <td className="number-cell">{formatReadonlyCurrency(item.grossValue)}</td>
                      <td className="number-cell">{formatReadonlyCurrency(item.liquidValue)}</td>
                      <td className="number-cell">{formatReadonlyCurrency(item.profitValue)}</td>
                      <td className="number-cell">{formatReadonlyCurrency(item.taxValue)}</td>
                      <td>{formatText(item.liquidity)}</td>
                      <td className="number-cell">{formatReadonlyCurrency(item.unavailableValue)}</td>
                      <td>
                        <span className="fixed-income-readonly__status-badge" data-status={item.maturityStatus}>
                          {item.maturityStatus}
                        </span>
                      </td>
                      <td>{formatText(item.note)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="fixed-income-readonly__mobile-list" aria-label="Lista mobile dos titulos de renda fixa">
              {viewModel.filteredItems.map((item) => (
                <article className="fixed-income-readonly__mobile-card" key={item.ticker}>
                  <div>
                    <h4 className="assets-report__ticker">{item.ticker}</h4>
                    <p className="assets-report__name">{item.name}</p>
                    <p className="fixed-income-readonly__mobile-subtitle">{formatText(item.subtype)}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Emissor</dt>
                      <dd>{formatText(item.issuer)}</dd>
                    </div>
                    <div>
                      <dt>Aplicação</dt>
                      <dd>{formatReadonlyDate(item.applicationDate)}</dd>
                    </div>
                    <div>
                      <dt>Vencimento</dt>
                      <dd>{formatReadonlyDate(item.maturityDate)}</dd>
                    </div>
                    <div>
                      <dt>Rentab.</dt>
                      <dd>{formatText(item.contractedRate)}</dd>
                    </div>
                    <div>
                      <dt>Indexador</dt>
                      <dd>{formatText(item.indexer)}</dd>
                    </div>
                    <div>
                      <dt>Aplicado</dt>
                      <dd>{formatReadonlyCurrency(item.appliedValue)}</dd>
                    </div>
                    <div>
                      <dt>Bruto</dt>
                      <dd>{formatReadonlyCurrency(item.grossValue)}</dd>
                    </div>
                    <div>
                      <dt>Líquido</dt>
                      <dd>{formatReadonlyCurrency(item.liquidValue)}</dd>
                    </div>
                    <div>
                      <dt>Ganho / perda</dt>
                      <dd>{formatReadonlyCurrency(item.profitValue)}</dd>
                    </div>
                    <div>
                      <dt>IR / IOF</dt>
                      <dd>{formatReadonlyCurrency(item.taxValue)}</dd>
                    </div>
                    <div>
                      <dt>Liquidez</dt>
                      <dd>{formatText(item.liquidity)}</dd>
                    </div>
                    <div>
                      <dt>Indisp.</dt>
                      <dd>{formatReadonlyCurrency(item.unavailableValue)}</dd>
                    </div>
                    <div>
                      <dt>Vencimento</dt>
                      <dd>
                        <span className="fixed-income-readonly__status-badge" data-status={item.maturityStatus}>
                          {item.maturityStatus}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Observação</dt>
                      <dd>{formatText(item.note)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="fixed-income-readonly__empty" role="status" aria-live="polite">
            <p className="fixed-income-readonly__empty-title">{emptyTitle}</p>
            <p className="fixed-income-readonly__empty-body">{emptyBody}</p>
          </div>
        )}
      </section>
    </section>
  );
}

export function FixedIncomeReadonlyPage({ adapter }: FixedIncomeReadonlyPageProps) {
  return <FixedIncomeReadonlyPageContent adapter={adapter} />;
}
