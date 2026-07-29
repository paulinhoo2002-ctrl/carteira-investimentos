import type { IncomeReadonlyEmptyStateProps } from './shared/incomeReadonlySharedProps';

export function IncomeReadonlyEmptyState({ title, body }: IncomeReadonlyEmptyStateProps) {
  return (
    <div className="fixed-income-readonly__empty" role="status" aria-live="polite">
      <p className="fixed-income-readonly__empty-title">{title}</p>
      <p className="fixed-income-readonly__empty-body">{body}</p>
    </div>
  );
}
