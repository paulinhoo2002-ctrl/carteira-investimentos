import type { ReactNode } from 'react';
import './ChartContainer.css';

interface ChartContainerProps {
  title?: string;
  summary?: ReactNode;
  children: ReactNode;
  noData?: ReactNode;
  className?: string;
}

export function ChartContainer({ title, summary, children, noData, className = '' }: ChartContainerProps) {
  return (
    <div className={`chart-container ${className}`}>
      {(title || summary) && (
        <header className="chart-container__header">
          {title && <h3 className="chart-container__title">{title}</h3>}
          {summary && <p className="chart-container__summary">{summary}</p>}
        </header>
      )}
      <div className="chart-container__wrapper" role="img" aria-label={title ?? 'Gráfico'}>
        {children}
      </div>
      {noData && <div className="chart-container__no-data">{noData}</div>}
    </div>
  );
}