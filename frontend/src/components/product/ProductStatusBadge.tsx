import React from 'react';
import { ProductStatus } from '../../types/product.js';
import { FileEdit, CheckCircle, Archive } from 'lucide-react';

export interface ProductStatusBadgeProps {
  status: ProductStatus;
  size?: 'sm' | 'md';
}

export const ProductStatusBadge: React.FC<ProductStatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSmall = size === 'sm';

  const config = {
    DRAFT: {
      label: 'Draft',
      icon: FileEdit,
      bg: '#F1F5F9',
      color: '#475569',
      border: '#CBD5E1',
    },
    PUBLISHED: {
      label: 'Published',
      icon: CheckCircle,
      bg: 'var(--m63-success-bg)',
      color: 'var(--m63-success)',
      border: 'var(--m63-success-border)',
    },
    ARCHIVED: {
      label: 'Archived',
      icon: Archive,
      bg: '#F8FAFC',
      color: '#94A3B8',
      border: '#E2E8F0',
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '4px' : '6px',
        padding: isSmall ? '2px 8px' : '4px 10px',
        borderRadius: '9999px',
        fontSize: isSmall ? '0.72rem' : '0.8rem',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        lineHeight: 1,
      }}
    >
      <Icon size={isSmall ? 12 : 14} />
      <span>{config.label}</span>
    </span>
  );
};
