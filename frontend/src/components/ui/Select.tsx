import { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: (SelectOption | string)[];
  error?: string;
  helperText?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, placeholder = 'Select an option', className = '', id, ...props }, ref) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="m63-form-group">
        {label && (
          <label htmlFor={selectId} className="m63-label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`m63-input ${error ? 'm63-input-error' : ''} ${className}`}
          style={{ cursor: 'pointer' }}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt, idx) => {
            const value = typeof opt === 'string' ? opt : opt.value;
            const labelText = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={idx} value={value}>
                {labelText}
              </option>
            );
          })}
        </select>
        {error && <span className="m63-error-text">{error}</span>}
        {helperText && !error && <span className="m63-helper-text">{helperText}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
