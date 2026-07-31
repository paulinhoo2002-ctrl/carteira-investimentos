import type { ReactNode } from 'react';
import './DashboardSection.css';

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({ title, subtitle, action, children, className = '' }: DashboardSectionProps) {
  return (
    <section className={`dashboard-section ${className}`} aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`}>
      <header className="dashboard-section__header">
        <div>
          <h2 id={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`} className="dashboard-section__title">
            {title}
          </h2>
          {subtitle && <p className="dashboard-section__subtitle">{subtitle}</p>}
        </div>
        {action && <div className="dashboard-section__action">{action}</div>}
      </header>
      <div className="dashboard-section__content">{children}</div>
    </section>
  );
}