import { TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="m63-form-group">
        {label && (
          <label htmlFor={textareaId} className="m63-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`m63-input ${error ? 'm63-input-error' : ''} ${className}`}
          style={{ minHeight: '100px', padding: '12px var(--m63-space-4)', resize: 'vertical' }}
          {...props}
        />
        {error && <span className="m63-error-text">{error}</span>}
        {helperText && !error && <span className="m63-helper-text">{helperText}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
