import React from 'react';
import { ProductStatusBadge } from '../components/product/ProductStatusBadge.js';
import { VoiceTranscript } from '../components/voice/VoiceTranscript.js';
import { Button } from '../components/ui/Button.js';
import {
  Package,
  Layers,
  Edit,
  Save,
  Rocket,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export interface ProductReviewProps {
  formData: {
    name: string;
    description: string;
    category: string;
    subcategory: string;
    material: string;
    color: string;
    craft_type: string;
    features: string[];
    price: string;
    stock_quantity: string;
  };
  imagePreviewUrl: string | null;
  originalImageUrl?: string | null;
  voiceTranscript?: string | null;
  detectedLanguage?: string | null;
  isAiAssisted?: boolean;
  onEdit: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  isSaving: boolean;
  isPublishing: boolean;
}

export const ProductReview: React.FC<ProductReviewProps> = ({
  formData,
  imagePreviewUrl,
  originalImageUrl,
  voiceTranscript,
  detectedLanguage,
  isAiAssisted = false,
  onEdit,
  onSaveDraft,
  onPublish,
  isSaving,
  isPublishing,
}) => {
  const numericPrice = parseFloat(formData.price) || 0;
  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numericPrice);

  const numericStock = parseInt(formData.stock_quantity, 10) || 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '840px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="m63-badge m63-badge-primary">
              Preview Listing
            </span>
            {isAiAssisted && (
              <span className="m63-badge" style={{ backgroundColor: '#FAF5FF', color: '#7E22CE', border: '1px solid #E9D5FF' }}>
                <Sparkles size={12} /> Suggested by M63 Assistant
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--m63-slate)', letterSpacing: '-0.02em' }}>
            Review Product Details
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--m63-slate-subtle)', marginTop: '2px' }}>
            Check how your product will appear to buyers before saving or publishing.
          </p>
        </div>

        <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={onEdit}>
          Back to Editing
        </Button>
      </div>

      {/* Voice Transcript Header if available */}
      {voiceTranscript && (
        <VoiceTranscript
          transcript={voiceTranscript}
          detectedLanguage={detectedLanguage || 'Original'}
        />
      )}

      {/* Main Review Card */}
      <div className="m63-card" style={{ padding: '28px', backgroundColor: 'var(--m63-bg-surface)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
          {/* Left Column: Image Preview */}
          <div>
            <div
              style={{
                width: '100%',
                height: '320px',
                borderRadius: 'var(--m63-radius-lg)',
                backgroundColor: 'var(--m63-bg-muted)',
                border: '1px solid var(--m63-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {imagePreviewUrl || originalImageUrl ? (
                <img
                  src={imagePreviewUrl || originalImageUrl || ''}
                  alt={formData.name || 'Product Preview'}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--m63-slate-subtle)' }}>
                  <Package size={48} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>No image attached</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Listing Details */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                {formData.category && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {formData.category} {formData.subcategory ? `• ${formData.subcategory}` : ''}
                  </span>
                )}
                <ProductStatusBadge status="DRAFT" size="sm" />
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--m63-slate)', lineHeight: 1.25, marginBottom: '12px' }}>
                {formData.name || 'Untitled Product'}
              </h2>

              {/* Price & Stock Display */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '20px', backgroundColor: 'var(--m63-bg-canvas)', padding: '12px 16px', borderRadius: 'var(--m63-radius-md)', border: '1px solid var(--m63-border)' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--m63-slate-subtle)', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>PRICE</span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--m63-slate)' }}>{formattedPrice}</span>
                </div>

                <div style={{ borderLeft: '1px solid var(--m63-border)', paddingLeft: '16px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--m63-slate-subtle)', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>AVAILABLE STOCK</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m63-slate)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <Layers size={16} /> {numericStock} units
                  </span>
                </div>
              </div>

              {/* Specifications Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '0.85rem' }}>
                {formData.material && (
                  <div>
                    <span style={{ color: 'var(--m63-slate-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>MATERIAL</span>
                    <span style={{ color: 'var(--m63-slate)', fontWeight: 600 }}>{formData.material}</span>
                  </div>
                )}

                {formData.color && (
                  <div>
                    <span style={{ color: 'var(--m63-slate-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>COLOR</span>
                    <span style={{ color: 'var(--m63-slate)', fontWeight: 600 }}>{formData.color}</span>
                  </div>
                )}

                {formData.craft_type && (
                  <div>
                    <span style={{ color: 'var(--m63-slate-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>CRAFT TYPE</span>
                    <span style={{ color: 'var(--m63-slate)', fontWeight: 600 }}>{formData.craft_type}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {formData.description && (
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ color: 'var(--m63-slate-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>PRODUCT STORY & DESCRIPTION</span>
                  <p style={{ fontSize: '0.88rem', color: 'var(--m63-slate)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {formData.description}
                  </p>
                </div>
              )}

              {/* Feature Tags */}
              {formData.features.length > 0 && (
                <div>
                  <span style={{ color: 'var(--m63-slate-subtle)', display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>CRAFT HIGHLIGHTS</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {formData.features.map((feat, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--m63-primary-light)',
                          color: 'var(--m63-primary)',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          border: '1px solid var(--m63-primary-subtle)',
                        }}
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--m63-border)' }}>
          <Button variant="secondary" icon={<Edit size={16} />} onClick={onEdit} disabled={isSaving || isPublishing}>
            Edit Information
          </Button>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              icon={<Save size={16} />}
              onClick={onSaveDraft}
              loading={isSaving}
              disabled={isPublishing}
            >
              Save as Draft
            </Button>

            <Button
              variant="primary"
              icon={<Rocket size={16} />}
              onClick={onPublish}
              loading={isPublishing}
              disabled={isSaving}
            >
              Publish Product
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
