import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import './Input.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: ReactNode;
  helperText?: ReactNode;
  icon?: ReactNode;
  id: string;
  label: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className = '',
    disabled = false,
    error,
    helperText,
    icon,
    id,
    label,
    prefix,
    readOnly = false,
    required = false,
    suffix,
    ...inputProps
  },
  ref,
) {
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;
  const classes = ['ui-input', className].filter(Boolean).join(' ');

  return (
    <label
      className={classes}
      data-disabled={disabled ? 'true' : undefined}
      data-error={error ? 'true' : undefined}
      data-readonly={readOnly ? 'true' : undefined}
      htmlFor={id}
    >
      <span className="ui-input__label">
        {label}
        {required ? <span className="ui-input__required" aria-hidden="true"> *</span> : null}
      </span>

      <span className="ui-input__shell">
        {prefix ? (
          <span className="ui-input__addon ui-input__addon--prefix" aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        {icon ? (
          <span className="ui-input__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <input
          {...inputProps}
          ref={ref}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required || undefined}
          className="ui-input__field"
          disabled={disabled}
          id={id}
          readOnly={readOnly}
          required={required}
        />
        {suffix ? (
          <span className="ui-input__addon ui-input__addon--suffix" aria-hidden="true">
            {suffix}
          </span>
        ) : null}
      </span>

      {helperText ? (
        <span className="ui-input__helper" id={helperId}>
          {helperText}
        </span>
      ) : null}
      {error ? (
        <span className="ui-input__error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
});
