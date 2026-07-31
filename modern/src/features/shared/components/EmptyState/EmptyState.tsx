import type { ReactNode } from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
  size?: 'compact' | 'default' | 'large';
}

export function EmptyState({ title, body, action, icon, size = 'default' }: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state--${size}`} role="status" aria-live="polite">
      {icon && <div className="empty-state__icon" aria-hidden="true">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__body">{body}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}