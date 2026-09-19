import React from 'react';
import { Product } from '../../types/product.js';
import { ProductStatusBadge } from './ProductStatusBadge.js';
import { Package, Calendar, Layers } from 'lucide-react';
import { handleProductImageError } from '../../utils/imageFallback.js';

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
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        borderRadius: '16px',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* Product Image Banner */}
      <div
        style={{
          width: '100%',
          height: '180px',
          backgroundColor: '#0F1715',
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
            onError={(e) => handleProductImageError(e, product.category)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#9CA6A2' }}>
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
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FF8A3D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {product.category} {product.subcategory ? `• ${product.subcategory}` : ''}
            </span>
          )}

          {/* Product Name (Bright Orange) */}
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#FF8A3D',
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
                color: 'rgba(243, 239, 231, 0.78)',
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
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Price (Bright Orange/Gold) */}
            <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FF8A3D' }}>
              {product.price > 0 ? formattedPrice : 'Price Pending'}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'rgba(243, 239, 231, 0.75)', fontWeight: 600 }}>
              <Layers size={14} style={{ color: '#FF8A3D' }} />
              <span>{product.stockQuantity} in stock</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'rgba(243, 239, 231, 0.55)' }}>
              <Calendar size={12} />
              <span>Updated {formattedDate}</span>
            </div>

            {product.status === 'DRAFT' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#FF8A3D',
                  backgroundColor: 'rgba(255, 138, 61, 0.14)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 138, 61, 0.3)',
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
