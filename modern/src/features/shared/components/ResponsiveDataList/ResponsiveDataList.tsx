import type { ReactNode } from 'react';
import './ResponsiveDataList.css';

interface ResponsiveDataListProps<T> {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  renderMobileItem?: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
  desktopColumns?: number;
  className?: string;
}

export function ResponsiveDataList<T>({
  items,
  renderItem,
  renderMobileItem,
  emptyState,
  desktopColumns = 1,
  className = '',
}: ResponsiveDataListProps<T>) {
  if (items.length === 0) {
    return emptyState ?? null;
  }

  return (
    <div className={`responsive-data-list ${className}`} style={{ '--columns': desktopColumns }}>
      <div className="responsive-data-list__desktop" aria-hidden="true">
        {items.map((item, index) => renderItem(item, index))}
      </div>
      <div className="responsive-data-list__mobile" aria-hidden="true">
        {items.map((item, index) => (renderMobileItem ? renderMobileItem(item, index) : renderItem(item, index)))}
      </div>
    </div>
  );
}