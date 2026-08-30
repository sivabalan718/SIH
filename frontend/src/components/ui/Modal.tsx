import React, { useEffect } from 'react';
import { Button } from './Button.js';
import { X, AlertTriangle } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'primary',
  loading = false,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getConfirmButtonVariant = (): 'primary' | 'secondary' | 'ghost' => {
    return 'primary';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          backgroundColor: 'var(--m63-bg-surface)',
          borderRadius: 'var(--m63-radius-xl)',
          boxShadow: 'var(--m63-shadow-lg)',
          border: '1px solid var(--m63-border)',
          width: '100%',
          maxWidth: '480px',
          padding: '24px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--m63-slate-subtle)',
            padding: '4px',
            borderRadius: '6px',
          }}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          {variant === 'warning' || variant === 'danger' ? (
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: variant === 'danger' ? 'var(--m63-error-bg)' : 'var(--m63-warning-bg)',
                color: variant === 'danger' ? 'var(--m63-error)' : 'var(--m63-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
          ) : null}

          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
              {title}
            </h2>
            {description && (
              <p style={{ fontSize: '0.88rem', color: 'var(--m63-slate-subtle)', marginTop: '4px', lineHeight: 1.5 }}>
                {description}
              </p>
            )}
          </div>
        </div>

        {children && <div style={{ marginBottom: '20px' }}>{children}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={getConfirmButtonVariant()}
            onClick={onConfirm}
            loading={loading}
            style={
              variant === 'danger'
                ? { backgroundColor: 'var(--m63-error)', borderColor: 'var(--m63-error)' }
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
