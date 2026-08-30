import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="m63-form-group">
        {label && (
          <label htmlFor={inputId} className="m63-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`m63-input ${error ? 'm63-input-error' : ''} ${className}`}
          {...props}
        />
        {error && <span className="m63-error-text">{error}</span>}
        {!error && helperText && <span className="m63-helper-text">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
