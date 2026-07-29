import type { IncomeReadonlyFiltersProps } from './shared/incomeReadonlySharedProps';

export function IncomeReadonlyFilters({
  query,
  year,
  month,
  type,
  sortBy,
  viewModel,
  hasItems,
  sortLabels,
  onQueryChange,
  onYearChange,
  onMonthChange,
  onTypeChange,
  onSortChange,
}: IncomeReadonlyFiltersProps) {
  return (
    <section className="fixed-income-readonly__filters" aria-labelledby="income-filters">
      <div className="fixed-income-readonly__section-title-row">
        <h3 className="fixed-income-readonly__section-title" id="income-filters">
          Filtros
        </h3>
        <p className="fixed-income-readonly__section-note">Apenas estado visual local, sem persistencia.</p>
      </div>

      <div className="fixed-income-readonly__controls">
        <label className="fixed-income-readonly__control">
          <span>Buscar por ticker, nome, tipo ou observacao</span>
          <input
            aria-label="Buscar por ticker, nome, tipo ou observacao"
            placeholder="PETR4, dividendo, julho..."
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>

        <label className="fixed-income-readonly__control">
          <span>Ano</span>
          <select aria-label="Filtrar por ano" value={year} onChange={(event) => onYearChange(event.target.value)}>
            <option value="all">Todos</option>
            {viewModel.years.map((itemYear) => (
              <option key={itemYear} value={itemYear}>
                {itemYear}
              </option>
            ))}
          </select>
        </label>

        <label className="fixed-income-readonly__control">
          <span>Mes</span>
          <select aria-label="Filtrar por mes" value={month} onChange={(event) => onMonthChange(event.target.value)}>
            <option value="all">Todos</option>
            {viewModel.months.map((itemMonth) => (
              <option key={itemMonth.key} value={itemMonth.key}>
                {itemMonth.label}
              </option>
            ))}
          </select>
        </label>

        <label className="fixed-income-readonly__control">
          <span>Tipo</span>
          <select aria-label="Filtrar por tipo" value={type} onChange={(event) => onTypeChange(event.target.value)}>
            <option value="all">Todos</option>
            {viewModel.types.map((itemType) => (
              <option key={itemType} value={itemType}>
                {itemType}
              </option>
            ))}
          </select>
        </label>

        <label className="fixed-income-readonly__control">
          <span>Ordenar por</span>
          <select aria-label="Ordenar proventos" value={sortBy} onChange={(event) => onSortChange(event.target.value as typeof sortBy)}>
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
            ? 'Nenhum provento corresponde aos filtros atuais.'
            : 'Carteira vazia nesta leitura readonly.'}
      </p>
    </section>
  );
}
