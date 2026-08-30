import React from 'react';
import { Product } from '../../types/product.js';
import { ProductStatusBadge } from './ProductStatusBadge.js';
import { Package, Calendar, Layers } from 'lucide-react';

export interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(product.price);

  const formattedDate = new Date(product.updatedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      onClick={onClick}
      className="m63-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Product Image Banner */}
      <div
        style={{
          width: '100%',
          height: '180px',
          backgroundColor: 'var(--m63-bg-muted)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {product.primaryImageUrl ? (
          <img
            src={product.primaryImageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--m63-slate-subtle)' }}>
            <Package size={36} />
            <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>No image uploaded</span>
          </div>
        )}

        {/* Status Badge overlay */}
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <ProductStatusBadge status={product.status} size="sm" />
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          {/* Category Tag */}
          {product.category && (
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--m63-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {product.category} {product.subcategory ? `• ${product.subcategory}` : ''}
            </span>
          )}

          {/* Product Name */}
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: product.name?.trim() ? 'var(--m63-slate)' : 'var(--m63-slate-subtle)',
              fontStyle: product.name?.trim() ? 'normal' : 'italic',
              marginTop: '4px',
              marginBottom: '6px',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.name?.trim() || 'Untitled Product'}
          </h3>

          {/* Description snippet */}
          {product.description && (
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--m63-slate-subtle)',
                lineHeight: 1.4,
                marginBottom: '12px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {product.description}
            </p>
          )}
        </div>

        {/* Footer Meta: Price, Stock, Date */}
        <div style={{ borderTop: '1px solid var(--m63-border)', paddingTop: '12px', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--m63-slate)' }}>
              {product.price > 0 ? formattedPrice : 'Price Pending'}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--m63-slate-subtle)', fontWeight: 600 }}>
              <Layers size={14} />
              <span>{product.stockQuantity} in stock</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--m63-slate-subtle)' }}>
              <Calendar size={12} />
              <span>Updated {formattedDate}</span>
            </div>

            {product.status === 'DRAFT' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--m63-primary)',
                  backgroundColor: 'var(--m63-primary-light)',
                  padding: '3px 8px',
                  borderRadius: 'var(--m63-radius-md)',
                }}
              >
                Continue Editing →
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
