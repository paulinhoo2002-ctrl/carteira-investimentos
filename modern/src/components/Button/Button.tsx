import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonIconPosition = 'start' | 'end';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  iconPosition?: ButtonIconPosition;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}
export function Button({
  children,
  className = '',
  disabled = false,
  icon,
  iconPosition = 'start',
  loading = false,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...buttonProps
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const classes = ['ui-button', `ui-button--${variant}`, `ui-button--${size}`, loading ? 'is-loading' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...buttonProps}
      aria-busy={loading || undefined}
      className={classes}
      data-loading={loading ? 'true' : undefined}
      data-size={size}
      data-variant={variant}
      disabled={isDisabled}
      type={type}
    >
      <span className="ui-button__inner">
        {icon && iconPosition === 'start' ? (
          <span className="ui-button__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="ui-button__label">{children}</span>
        {icon && iconPosition === 'end' ? (
          <span className="ui-button__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </span>
      <span className="ui-button__spinner" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
