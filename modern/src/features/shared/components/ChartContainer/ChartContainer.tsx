import { useId, type ReactNode } from 'react';
import './ChartContainer.css';

interface ChartContainerProps {
  title?: string;
  summary?: ReactNode;
  children: ReactNode;
  noData?: ReactNode;
  className?: string;
}

export function ChartContainer({ title, summary, children, noData, className = '' }: ChartContainerProps) {
  const titleId = useId();
  const summaryId = useId();

  return (
    <div className={`chart-container ${className}`}>
      {(title || summary) && (
        <header className="chart-container__header">
          {title && <h3 className="chart-container__title" id={titleId}>{title}</h3>}
          {summary && <p className="chart-container__summary" id={summaryId}>{summary}</p>}
        </header>
      )}
      <div
        className="chart-container__wrapper"
        role="img"
        aria-label={title ? undefined : 'Gráfico'}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={summary ? summaryId : undefined}
      >
        {children}
      </div>
      {noData && <div className="chart-container__no-data">{noData}</div>}
    </div>
  );
}
