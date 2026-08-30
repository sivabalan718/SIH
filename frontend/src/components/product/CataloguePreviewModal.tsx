import React from 'react';
import { X, Sparkles, ShoppingBag, Check } from 'lucide-react';
import { GeneratedCatalogueContent } from '../../services/catalogueService.js';

interface CataloguePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogue: GeneratedCatalogueContent | null;
  imageUrl?: string | null;
  price?: number;
  productName?: string;
  category?: string;
  material?: string;
  craftType?: string;
}

export const CataloguePreviewModal: React.FC<CataloguePreviewModalProps> = ({
  isOpen,
  onClose,
  catalogue,
  imageUrl,
  price = 0,
  productName = 'Artisan Product',
  category,
}) => {
  if (!isOpen) return null;

  const displayTitle = catalogue?.title || productName;
  const displayShort = catalogue?.shortDescription || '';
  const displayDesc = catalogue?.description || '';
  const highlights = catalogue?.highlights || [];
  const specs = catalogue?.specifications || {};
  const care = catalogue?.careInstructions;
  const tags = catalogue?.tags || [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
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
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)',
          border: '1px solid var(--m63-border)',
          width: '100%',
          maxWidth: '680px',
          padding: '24px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
          color: 'var(--m63-slate)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
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
            padding: '6px',
            borderRadius: '6px',
          }}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--m63-border)', paddingBottom: '12px' }}>
          <ShoppingBag size={20} className="text-amber-500" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Customer Catalogue Preview</h3>
          <span style={{ fontSize: '0.72rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, marginLeft: 'auto' }}>
            Live Marketplace View
          </span>
        </div>

        {/* Product Image Display */}
        <div style={{ width: '100%', height: '280px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid var(--m63-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', position: 'relative' }}>
          {imageUrl ? (
            <img src={imageUrl} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--m63-slate-subtle)' }}>
              <ShoppingBag size={48} style={{ opacity: 0.4 }} />
              <span style={{ fontSize: '0.85rem', marginTop: '8px' }}>No photo selected yet</span>
            </div>
          )}
          {category && (
            <span style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(15, 23, 42, 0.75)', color: '#FFFFFF', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
              {category}
            </span>
          )}
        </div>

        {/* Title & Price */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--m63-slate)', margin: 0, lineHeight: 1.2 }}>
            {displayTitle}
          </h2>
          {price > 0 && (
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706', whiteSpace: 'nowrap' }}>
              ₹{price.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Short Summary */}
        {displayShort && (
          <p style={{ fontSize: '0.92rem', color: 'var(--m63-slate)', fontWeight: 600, lineHeight: 1.5, marginBottom: '16px', borderLeft: '3px solid #F59E0B', paddingLeft: '12px' }}>
            {displayShort}
          </p>
        )}

        {/* Full Description */}
        {displayDesc && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Product Details
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--m63-slate-subtle)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {displayDesc}
            </p>
          </div>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <div style={{ marginBottom: '20px', backgroundColor: '#FFFBEB', borderRadius: '10px', padding: '14px', border: '1px solid #FCD34D' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400E', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} className="text-amber-500" />
              Product Highlights
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              {highlights.map((item, idx) => (
                <div key={idx} style={{ fontSize: '0.82rem', color: '#B45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={15} style={{ color: '#D97706', flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Specifications Table */}
        {Object.keys(specs).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Specifications
            </h4>
            <div style={{ border: '1px solid var(--m63-border)', borderRadius: '8px', overflow: 'hidden' }}>
              {Object.entries(specs).map(([key, val], idx) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    backgroundColor: idx % 2 === 0 ? 'var(--m63-bg-canvas)' : 'var(--m63-bg-surface)',
                    borderBottom: idx < Object.keys(specs).length - 1 ? '1px solid var(--m63-border)' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--m63-slate-subtle)' }}>{key}</span>
                  <span style={{ fontWeight: 700, color: 'var(--m63-slate)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Care Instructions */}
        {care && (
          <div style={{ marginBottom: '20px', fontSize: '0.82rem', backgroundColor: 'var(--m63-bg-canvas)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--m63-border)' }}>
            <span style={{ fontWeight: 700, color: 'var(--m63-slate)', display: 'block', marginBottom: '2px' }}>Care Instructions:</span>
            <span style={{ color: 'var(--m63-slate-subtle)' }}>{care}</span>
          </div>
        )}

        {/* Search Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {tags.map((tag, idx) => (
              <span key={idx} style={{ fontSize: '0.72rem', backgroundColor: 'var(--m63-border)', color: 'var(--m63-slate)', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: '12px', borderTop: '1px solid var(--m63-border)' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              borderRadius: '8px',
              backgroundColor: 'var(--m63-border)',
              color: 'var(--m63-slate)',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
