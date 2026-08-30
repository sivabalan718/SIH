import React from 'react';
import { Button } from '../ui/Button.js';
import { Sparkles, CheckCircle2, RotateCcw, Image as ImageIcon, Check, ShieldCheck } from 'lucide-react';

interface ImageEnhanceComparisonProps {
  originalUrl: string;
  enhancedUrl: string;
  onSelectOriginal: () => void;
  onSelectEnhanced: () => void;
  onTryAgain: () => void;
  isLoading?: boolean;
  improvementsApplied?: string[];
  backgroundColorLabel?: string;
}

export const ImageEnhanceComparison: React.FC<ImageEnhanceComparisonProps> = ({
  originalUrl,
  enhancedUrl,
  onSelectOriginal,
  onSelectEnhanced,
  onTryAgain,
  isLoading = false,
  improvementsApplied = [],
  backgroundColorLabel,
}) => {
  const displayImprovements =
    improvementsApplied.length > 0
      ? improvementsApplied
      : [
          '✓ Original background removed',
          '✓ Catalogue background applied',
          '✓ Lighting & exposure balanced',
          '✓ Colour balance & white balance corrected',
          '✓ Product details & texture sharpened',
          '✓ Local contrast improved',
          '✓ Catalogue framing & margins optimized',
          '✓ Web quality & format optimized',
        ];

  return (
    <div style={{ backgroundColor: 'var(--m63-bg-surface)', borderRadius: '12px', padding: '4px', color: 'var(--m63-slate)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--m63-border)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)', color: '#FFFFFF' }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--m63-slate)', margin: 0 }}>Compare Photo Presentation</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--m63-slate-subtle)', margin: '2px 0 0 0' }}>
              Choose which photo to show on your public product catalogue.
              {backgroundColorLabel && <span style={{ marginLeft: '8px', fontWeight: 600, color: '#B45309' }}>Background: {backgroundColorLabel}</span>}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onTryAgain}
          disabled={isLoading}
        >
          <RotateCcw size={14} style={{ marginRight: '6px' }} />
          Try Again
        </Button>
      </div>

      {/* Comparison Side-by-Side Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {/* Original Image Card */}
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--m63-bg-canvas)', border: '1px solid var(--m63-border)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--m63-slate-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={14} />
              Original Photo
            </span>
            <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--m63-border)', color: 'var(--m63-slate)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Unmodified
            </span>
          </div>
          <div style={{ position: 'relative', width: '100%', height: '230px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={originalUrl}
              alt="Original Product"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onSelectOriginal}
            style={{ marginTop: '12px', width: '100%' }}
          >
            Keep Original
          </Button>
        </div>

        {/* Enhanced Studio Image Card */}
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#FFFBEB', border: '1.5px solid #F59E0B', borderRadius: '10px', padding: '12px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} />
              M63 Studio Enhanced
            </span>
            <span style={{ fontSize: '0.7rem', backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              M63 Smart Studio
            </span>
          </div>
          <div style={{ position: 'relative', width: '100%', height: '230px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={enhancedUrl}
              alt="Enhanced Product"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onSelectEnhanced}
            style={{
              marginTop: '12px',
              width: '100%',
              background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
              border: 'none',
              color: '#FFFFFF',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={16} style={{ marginRight: '6px' }} />
            Use Enhanced
          </Button>
        </div>
      </div>

      {/* Dynamic What M63 Improved Section */}
      <div style={{ backgroundColor: '#FFFBEB', borderRadius: '10px', padding: '14px', border: '1px solid #FCD34D', marginBottom: '14px' }}>
        <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400E', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={15} style={{ color: '#F59E0B' }} />
          ✨ What M63 Improved
        </h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px 12px' }}>
          {displayImprovements.map((item, index) => (
            <div key={index} style={{ fontSize: '0.78rem', color: '#B45309', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <Check size={14} style={{ color: '#D97706', flexShrink: 0 }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Product Authenticity Lock Summary */}
      <div style={{ backgroundColor: 'var(--m63-bg-canvas)', borderRadius: '10px', padding: '12px', border: '1px solid var(--m63-border)', fontSize: '0.78rem', color: 'var(--m63-slate-subtle)' }}>
        <div style={{ fontWeight: 700, color: 'var(--m63-slate)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} style={{ color: '#10B981' }} />
          🔒 Product Authenticity Lock
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '4px 10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} style={{ color: '#10B981' }} /> Original product preserved</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} style={{ color: '#10B981' }} /> Product colours preserved</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} style={{ color: '#10B981' }} /> Product pattern preserved</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} style={{ color: '#10B981' }} /> Product proportions preserved</span>
        </div>
      </div>
    </div>
  );
};
