import type {
  ReadonlyIncomePayerBucket,
  ReadonlyIncomeSortKey,
  ReadonlyIncomeViewModel,
} from '../readonlyIncomeViewModel.ts';
import type { ReadOnlyIncomeItem, ReadOnlyIncomeSnapshot } from '../incomeReadonlyContract.mjs';

export interface IncomeReadonlyHeaderProps {
  generatedAt: string;
  showRefreshButton: boolean;
  onRefresh?: () => void;
}

export interface IncomeReadonlyFiltersProps {
  query: string;
  year: string;
  month: string;
  type: string;
  sortBy: ReadonlyIncomeSortKey;
  viewModel: ReadonlyIncomeViewModel;
  hasItems: boolean;
  sortLabels: Record<ReadonlyIncomeSortKey, string>;
  onQueryChange: (next: string) => void;
  onYearChange: (next: string) => void;
  onMonthChange: (next: string) => void;
  onTypeChange: (next: string) => void;
  onSortChange: (next: ReadonlyIncomeSortKey) => void;
}

export interface IncomeReadonlySummaryGridProps {
  viewModel: ReadonlyIncomeViewModel;
  topPayment: ReadOnlyIncomeItem | null;
  topPayer: ReadonlyIncomePayerBucket | null;
  snapshot: ReadOnlyIncomeSnapshot;
}

export interface IncomeReadonlyEmptyStateProps {
  title: string;
  body: string;
}
