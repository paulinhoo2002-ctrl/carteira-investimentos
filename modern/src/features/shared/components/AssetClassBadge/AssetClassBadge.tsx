import React from 'react';
import './AssetClassBadge.css';

interface AssetClassBadgeProps {
  category: string;
  size?: 'compact' | 'default';
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Acao demo': { bg: 'rgba(79, 70, 229, 0.18)', text: 'var(--color-accent-primary)' },
  'FII demo': { bg: 'rgba(52, 211, 153, 0.18)', text: 'var(--color-accent-success)' },
  'ETF demo': { bg: 'rgba(96, 165, 250, 0.18)', text: 'var(--color-accent-info)' },
  'Renda Fixa demo': { bg: 'rgba(250, 204, 21, 0.18)', text: 'var(--color-accent-warning)' },
};

export function AssetClassBadge({ category, size = 'default' }: AssetClassBadgeProps) {
  const colors = CATEGORY_COLORS[category] ?? { bg: 'var(--color-border-subtle)', text: 'var(--color-text-muted)' };

  return (
    <span
      className={`asset-class-badge asset-class-badge--${size}`}
      style={{ backgroundColor: colors.bg, color: colors.text } as React.CSSProperties}
    >
      {category}
    </span>
  );
}