import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import './Select.css';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: ReactNode;
  helperText?: ReactNode;
  id: string;
  label: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { children, className = '', disabled = false, error, helperText, id, label, required = false, ...selectProps },
  ref,
) {
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;
  const classes = ['ui-select', className].filter(Boolean).join(' ');

  return (
    <label
      className={classes}
      data-disabled={disabled ? 'true' : undefined}
      data-error={error ? 'true' : undefined}
      htmlFor={id}
    >
      <span className="ui-select__label">
        {label}
        {required ? <span className="ui-select__required" aria-hidden="true"> *</span> : null}
      </span>

      <span className="ui-select__shell">
        <select
          {...selectProps}
          ref={ref}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required || undefined}
          className="ui-select__field"
          disabled={disabled}
          id={id}
          required={required}
        >
          {children}
        </select>
      </span>

      {helperText ? (
        <span className="ui-select__helper" id={helperId}>
          {helperText}
        </span>
      ) : null}
      {error ? (
        <span className="ui-select__error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
});
