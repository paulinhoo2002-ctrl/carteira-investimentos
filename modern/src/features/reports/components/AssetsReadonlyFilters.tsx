import { Input } from '../../../components/Input/Input';
import { Select } from '../../../components/Select/Select';
import {
  SIGNAL_PRIORITY_ORDER,
  type ReadonlyAssetSignalKey,
  type ReadonlyAssetsSortKey,
} from '../readonlyReportsViewModel';
import { signalLabels, sortLabels } from '../readonlyReportsConstants';

interface AssetsReadonlyFiltersProps {
  readonly query: string;
  readonly category: string;
  readonly signal: ReadonlyAssetSignalKey;
  readonly sortBy: ReadonlyAssetsSortKey;
  readonly categories: readonly string[];
  readonly resultCount: number;
  readonly totalItemCount: number;
  readonly hasResults: boolean;
  readonly onQueryChange: (value: string) => void;
  readonly onCategoryChange: (value: string) => void;
  readonly onSignalChange: (value: ReadonlyAssetSignalKey) => void;
  readonly onSortChange: (value: ReadonlyAssetsSortKey) => void;
}

export function AssetsReadonlyFilters({
  query,
  category,
  signal,
  sortBy,
  categories,
  resultCount,
  totalItemCount,
  hasResults,
  onQueryChange,
  onCategoryChange,
  onSignalChange,
  onSortChange,
}: AssetsReadonlyFiltersProps) {
  return (
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
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="PETR4, Maxi Renda..."
          type="search"
          value={query}
        />

        <Select
          className="assets-readonly__control"
          id="assets-readonly-category"
          label="Categoria"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="all">Todas</option>
          {categories.map((itemCategory) => (
            <option key={itemCategory} value={itemCategory}>
              {itemCategory}
            </option>
          ))}
        </Select>

        <Select
          className="assets-readonly__control"
          id="assets-readonly-signal"
          label="Filtrar por sinal"
          value={signal}
          onChange={(event) => onSignalChange(event.target.value as ReadonlyAssetSignalKey)}
        >
          {(SIGNAL_PRIORITY_ORDER as readonly ReadonlyAssetSignalKey[]).map((key) => (
            <option key={key} value={key}>
              {signalLabels[key]}
            </option>
          ))}
        </Select>

        <Select
          className="assets-readonly__control"
          id="assets-readonly-sort"
          label="Ordenar por"
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as ReadonlyAssetsSortKey)}
        >
          {Object.entries(sortLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <p className="assets-readonly__results" aria-live="polite">
        {hasResults
          ? `${resultCount} resultado${resultCount === 1 ? '' : 's'} encontrado${resultCount === 1 ? '' : 's'}`
          : totalItemCount === 0
            ? 'Carteira vazia nesta leitura readonly.'
            : 'Nenhum ativo corresponde aos filtros atuais.'}
      </p>
    </section>
  );
}
