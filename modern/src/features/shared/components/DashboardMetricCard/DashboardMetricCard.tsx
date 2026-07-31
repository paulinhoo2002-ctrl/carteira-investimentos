import type { ReactNode } from 'react';
import './DashboardMetricCard.css';

interface DashboardMetricCardProps {
  label: string;
  value: ReactNode;
  trend?: { value: number; label: string } | null;
  variant?: 'primary' | 'success' | 'warning' | 'info';
  size?: 'compact' | 'default' | 'large';
  children?: ReactNode;
}

export function DashboardMetricCard({
  label,
  value,
  trend,
  variant = 'primary',
  size = 'default',
  children,
}: DashboardMetricCardProps) {
  return (
    <article className={`dashboard-metric-card dashboard-metric-card--${size} dashboard-metric-card--${variant}`}>
      <p className="dashboard-metric-card__label">{label}</p>
      <p className="dashboard-metric-card__value">{value}</p>
      {trend && (
        <p className={`dashboard-metric-card__trend dashboard-metric-card__trend--${trend.value >= 0 ? 'positive' : 'negative'}`}>
          <span aria-hidden="true">{trend.value >= 0 ? '▲' : '▼'}</span>
          <span>{Math.abs(trend.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
          <span className="dashboard-metric-card__trend-label">{trend.label}</span>
        </p>
      )}
      {children}
    </article>
  );
}