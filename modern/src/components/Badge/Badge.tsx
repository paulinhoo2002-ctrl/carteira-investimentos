import type { ReactNode } from 'react';
import './Badge.css';

export type BadgeVariant = 'neutral' | 'positive' | 'negative' | 'info' | 'warning';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  children: ReactNode;
  className?: string;
  size?: BadgeSize;
  variant?: BadgeVariant;
}

export function Badge({ children, className = '', size = 'sm', variant = 'neutral' }: BadgeProps) {
  const classes = ['ui-badge', `ui-badge--${variant}`, `ui-badge--${size}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes} data-size={size} data-variant={variant}>
      {children}
    </span>
  );
}
