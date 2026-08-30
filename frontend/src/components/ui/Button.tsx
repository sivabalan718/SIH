import React, { ButtonHTMLAttributes } from 'react';
import { LoadingSpinner } from './LoadingSpinner.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  icon,
  className = '',
  ...props
}) => {
  const variantClass = `m63-btn-${variant}`;
  const sizeClass = size !== 'md' ? `m63-btn-${size}` : '';
  const fullWidthClass = fullWidth ? 'm63-btn-full' : '';

  return (
    <button
      disabled={disabled || loading}
      className={`m63-btn ${variantClass} ${sizeClass} ${fullWidthClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner size={18} />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span className="m63-btn-icon">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
