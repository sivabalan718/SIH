import React, { useState } from 'react';
import { Sparkles, Palette, Check, X } from 'lucide-react';
import { Button } from '../ui/Button.js';

export type CatalogueBackgroundOption = 'ORIGINAL' | 'WHITE' | 'BEIGE' | 'GREY' | 'CREAM' | 'CUSTOM';

export interface SmartStudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (backgroundOption: CatalogueBackgroundOption, colorHex?: string) => void;
  isProcessing?: boolean;
}

const PRESET_BACKGROUNDS: { id: CatalogueBackgroundOption; label: string; hex: string; desc: string }[] = [
  { id: 'ORIGINAL', label: 'Original Background', hex: 'transparent', desc: 'Preserve natural background' },
  { id: 'WHITE', label: 'Clean White', hex: '#FFFFFF', desc: 'Classic crisp white (#FFFFFF)' },
  { id: 'BEIGE', label: 'Warm Beige', hex: '#F5F0EB', desc: 'Soft organic beige (#F5F0EB)' },
  { id: 'GREY', label: 'Light Grey', hex: '#F3F4F6', desc: 'Modern studio grey (#F3F4F6)' },
  { id: 'CREAM', label: 'Soft Cream', hex: '#FFFDF7', desc: 'Warm elegant cream (#FFFDF7)' },
  { id: 'CUSTOM', label: 'Custom Colour', hex: '#E2E8F0', desc: 'Choose your own hex shade' },
];

export const SmartStudioSettingsModal: React.FC<SmartStudioSettingsModalProps> = ({
  isOpen,
  onClose,
  onApply,
  isProcessing = false,
}) => {
  const [selectedBg, setSelectedBg] = useState<CatalogueBackgroundOption>('WHITE');
  const [customHex, setCustomHex] = useState<string>('#E2E8F0');

  if (!isOpen) return null;

  const handleApply = () => {
    const activeHex = selectedBg === 'CUSTOM' ? customHex : PRESET_BACKGROUNDS.find((b) => b.id === selectedBg)?.hex;
    onApply(selectedBg, activeHex);
  };

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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--m63-border)',
          width: '100%',
          maxWidth: '520px',
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

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)', color: '#FFFFFF' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--m63-slate)', margin: 0 }}>
              M63 Smart Product Photo Studio
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)', margin: '2px 0 0 0' }}>
              Make your product photo catalogue-ready while preserving the original product.
            </p>
          </div>
        </div>

        {/* Background Selection Section */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--m63-slate)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Palette size={16} style={{ color: '#F59E0B' }} />
            Choose Catalogue Background
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--m63-slate-subtle)', marginBottom: '14px' }}>
            Select a clean background for your product catalogue. M63 will improve presentation while preserving your actual product.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {PRESET_BACKGROUNDS.map((bg) => {
              const isSelected = selectedBg === bg.id;
              return (
                <div
                  key={bg.id}
                  onClick={() => setSelectedBg(bg.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #F59E0B' : '1px solid var(--m63-border)',
                    backgroundColor: isSelected ? '#FFFBEB' : 'var(--m63-bg-canvas)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: bg.id === 'CUSTOM' ? customHex : bg.hex,
                      border: '1px solid rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && <Check size={14} style={{ color: bg.id === 'WHITE' || bg.id === 'CREAM' ? '#B45309' : '#FFFFFF' }} />}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#92400E' : 'var(--m63-slate)' }}>
                      {bg.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--m63-slate-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bg.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Color Picker Input */}
          {selectedBg === 'CUSTOM' && (
            <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#92400E' }}>Pick Custom Hex Colour:</label>
              <input
                type="color"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                style={{ width: '40px', height: '32px', padding: '0', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent' }}
              />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace', color: '#B45309' }}>{customHex}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--m63-border)', paddingTop: '16px' }}>
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleApply}
            loading={isProcessing}
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
              border: 'none',
              color: '#FFFFFF',
              fontWeight: 700,
            }}
          >
            <Sparkles size={16} style={{ marginRight: '6px' }} />
            Apply & Preview
          </Button>
        </div>
      </div>
    </div>
  );
};
