import type { ReactNode } from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
  size?: 'compact' | 'default' | 'large';
  status?: 'NO_DATA' | 'EMPTY' | 'UNKNOWN' | 'PARTIAL' | 'UNAVAILABLE' | 'LOADING' | 'ERROR';
}

const statusLabels: Record<NonNullable<EmptyStateProps['status']>, string> = {
  NO_DATA: 'Sem dados',
  EMPTY: 'Sem registros',
  UNKNOWN: 'Dados não identificados',
  PARTIAL: 'Dados parciais',
  UNAVAILABLE: 'Indisponível',
  LOADING: 'Carregando',
  ERROR: 'Falha na leitura',
};

export function EmptyState({ title, body, action, icon, size = 'default', status }: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state--${size}`} role="status" aria-live="polite" data-state={status}>
      {icon && <div className="empty-state__icon" aria-hidden="true">{icon}</div>}
      {status && <span className="empty-state__status">{statusLabels[status]}</span>}
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__body">{body}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
