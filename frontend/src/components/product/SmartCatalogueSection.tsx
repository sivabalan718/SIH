import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Eye,
  RotateCcw,
  Globe,
  Check,
  Plus,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Button } from '../ui/Button.js';
import {
  CatalogueLanguage,
  CatalogueStyle,
  GeneratedCatalogueContent,
  generateCatalogue,
} from '../../services/catalogueService.js';
import { CataloguePreviewModal } from './CataloguePreviewModal.tsx';

interface SmartCatalogueSectionProps {
  productData: {
    name: string;
    description?: string;
    category?: string;
    subcategory?: string;
    material?: string;
    color?: string;
    craft_type?: string;
    features?: string[];
    price?: number;
    stock_quantity?: number;
    production_time?: string;
  };
  productId?: string;
  imageUrl?: string | null;
  initialCatalogues?: Record<CatalogueLanguage, GeneratedCatalogueContent | null>;
  initialStyle?: CatalogueStyle;
  isLoadingCatalogue?: boolean;
  onCatalogueChange?: (catalogues: Record<CatalogueLanguage, GeneratedCatalogueContent | null>, style: CatalogueStyle) => void;
}

export const SmartCatalogueSection: React.FC<SmartCatalogueSectionProps> = ({
  productData,
  productId,
  imageUrl,
  initialCatalogues,
  initialStyle,
  isLoadingCatalogue = false,
  onCatalogueChange,
}) => {
  const [activeLanguage, setActiveLanguage] = useState<CatalogueLanguage>('en');
  const [style, setStyle] = useState<CatalogueStyle>(initialStyle || 'PROFESSIONAL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Per-language catalogue state store to preserve non-destructive edits
  const [catalogues, setCatalogues] = useState<Record<CatalogueLanguage, GeneratedCatalogueContent | null>>({
    en: initialCatalogues?.en || null,
    ta: initialCatalogues?.ta || null,
    hi: initialCatalogues?.hi || null,
  });

  // Track whether artisan manually edited content for each language
  const [editedByArtisan, setEditedByArtisan] = useState<Record<CatalogueLanguage, boolean>>({
    en: false,
    ta: false,
    hi: false,
  });

  // Sync initialCatalogues & initialStyle if provided externally
  useEffect(() => {
    if (initialCatalogues) {
      const hasContent = Boolean(initialCatalogues.en || initialCatalogues.ta || initialCatalogues.hi);
      setCatalogues((prev) => {
        const isSame =
          JSON.stringify(prev.en) === JSON.stringify(initialCatalogues.en) &&
          JSON.stringify(prev.ta) === JSON.stringify(initialCatalogues.ta) &&
          JSON.stringify(prev.hi) === JSON.stringify(initialCatalogues.hi);
        if (isSame) return prev;
        return {
          en: initialCatalogues.en || null,
          ta: initialCatalogues.ta || null,
          hi: initialCatalogues.hi || null,
        };
      });
      if (hasContent) {
        setIsExpanded(true);
      }
    } else {
      setCatalogues({ en: null, ta: null, hi: null });
      setIsExpanded(false);
    }

    if (initialStyle) {
      setStyle(initialStyle);
    }
  }, [initialCatalogues, initialStyle]);

  // Notify parent on state change
  useEffect(() => {
    if (onCatalogueChange) {
      onCatalogueChange(catalogues, style);
    }
  }, [catalogues, style, onCatalogueChange]);

  const currentCatalogue = catalogues[activeLanguage];

  // Execute AI catalogue generation for current language
  const handleGenerateSingleLanguage = async (
    targetLang: CatalogueLanguage = activeLanguage,
    targetStyle: CatalogueStyle = style
  ) => {
    if (!productData.name && !productData.category && !productData.material) {
      setNoticeMessage('Please enter product details above before generating catalogue content.');
      return;
    }

    try {
      setIsGenerating(true);
      setNoticeMessage(null);

      const res = await generateCatalogue(productData, targetLang, targetStyle, undefined, productId);

      setCatalogues((prev) => ({
        ...prev,
        [targetLang]: res.catalogue,
      }));
      setEditedByArtisan((prev) => ({ ...prev, [targetLang]: false }));
      setIsExpanded(true);
    } catch (err: any) {
      setNoticeMessage('Catalogue generation is temporarily unavailable. Your product information is safe.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Execute AI catalogue generation for ALL 3 languages
  const handleGenerateAllLanguages = async () => {
    try {
      setIsGeneratingAll(true);
      setNoticeMessage(null);

      const langs: CatalogueLanguage[] = ['en', 'ta', 'hi'];
      const updatedMap = { ...catalogues };

      for (const lang of langs) {
        const res = await generateCatalogue(productData, lang, style, undefined, productId);
        updatedMap[lang] = res.catalogue;
      }

      setCatalogues(updatedMap);
      setEditedByArtisan({ en: false, ta: false, hi: false });
      setIsExpanded(true);
    } catch (err: any) {
      setNoticeMessage('Catalogue generation is temporarily unavailable. Your product information is safe.');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // Field edit handler for current language
  const handleFieldChange = (field: keyof GeneratedCatalogueContent, value: any) => {
    if (!currentCatalogue) return;

    setCatalogues((prev) => ({
      ...prev,
      [activeLanguage]: {
        ...currentCatalogue,
        [field]: value,
      },
    }));
    setEditedByArtisan((prev) => ({ ...prev, [activeLanguage]: true }));
  };

  // Highlight array edit helpers
  const handleHighlightChange = (index: number, value: string) => {
    if (!currentCatalogue) return;
    const newHighlights = [...currentCatalogue.highlights];
    newHighlights[index] = value;
    handleFieldChange('highlights', newHighlights);
  };

  const handleAddHighlight = () => {
    if (!currentCatalogue) return;
    handleFieldChange('highlights', [...currentCatalogue.highlights, '']);
  };

  const handleRemoveHighlight = (index: number) => {
    if (!currentCatalogue) return;
    const newHighlights = currentCatalogue.highlights.filter((_, i) => i !== index);
    handleFieldChange('highlights', newHighlights);
  };

  // Search tag edit helpers
  const handleAddTag = (tagStr: string) => {
    if (!currentCatalogue || !tagStr.trim()) return;
    const clean = tagStr.trim().replace(/^#/, '');
    if (!currentCatalogue.tags.includes(clean)) {
      handleFieldChange('tags', [...currentCatalogue.tags, clean]);
    }
  };

  const handleRemoveTag = (tagStr: string) => {
    if (!currentCatalogue) return;
    handleFieldChange('tags', currentCatalogue.tags.filter((t) => t !== tagStr));
  };

  return (
    <div
      className="m63-card mb-6"
      style={{
        border: '1.5px solid #FCD34D',
        backgroundColor: 'var(--m63-bg-surface)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)',
      }}
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)', color: '#FFFFFF' }}>
              <Sparkles size={18} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--m63-slate)', margin: 0 }}>
              ✨ M63 Smart Catalogue
            </h2>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              AI Powered
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--m63-slate-subtle)', marginTop: '4px' }}>
            Turn your structured product information into a professional, marketplace-ready catalogue listing.
          </p>
        </div>

        {/* Style Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--m63-slate-subtle)' }}>Catalogue Style:</span>
          <select
            value={style}
            onChange={(e) => {
              const newStyle = e.target.value as CatalogueStyle;
              setStyle(newStyle);
              if (currentCatalogue) {
                handleGenerateSingleLanguage(activeLanguage, newStyle);
              }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--m63-border)',
              backgroundColor: 'var(--m63-bg-canvas)',
              color: 'var(--m63-slate)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <option value="PROFESSIONAL">Professional</option>
            <option value="SIMPLE">Simple</option>
            <option value="TRADITIONAL">Traditional</option>
          </select>
        </div>
      </div>

      {/* Language Switcher Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--m63-slate-subtle)', marginRight: '4px' }}>Language:</span>
        {(['en', 'ta', 'hi'] as CatalogueLanguage[]).map((lang) => {
          const labels: Record<CatalogueLanguage, string> = {
            en: 'English',
            ta: 'தமிழ்',
            hi: 'हिन्दी',
          };
          const hasContent = Boolean(catalogues[lang]);
          const isActive = activeLanguage === lang;

          return (
            <button
              key={lang}
              type="button"
              onClick={() => {
                setActiveLanguage(lang);
                if (!catalogues[lang] && isExpanded) {
                  handleGenerateSingleLanguage(lang);
                }
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: isActive ? '1.5px solid #F59E0B' : '1px solid var(--m63-border)',
                backgroundColor: isActive ? '#FEF3C7' : 'var(--m63-bg-canvas)',
                color: isActive ? '#92400E' : 'var(--m63-slate)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              {labels[lang]}
              {hasContent && <Check size={12} className="text-amber-600" />}
            </button>
          );
        })}
      </div>

      {/* Catalogue Loading State */}
      {isLoadingCatalogue ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', color: '#92400E', fontSize: '0.85rem', fontWeight: 700, marginTop: '12px' }}>
          <Sparkles size={16} className="animate-spin text-amber-600 shrink-0" />
          <span>Loading saved catalogue...</span>
        </div>
      ) : (
        /* Initial Compact Trigger State */
        !isExpanded && !currentCatalogue && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<Sparkles size={16} />}
              onClick={() => handleGenerateSingleLanguage(activeLanguage)}
              loading={isGenerating}
              disabled={isGeneratingAll}
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)', border: 'none', color: '#FFFFFF', fontWeight: 700 }}
            >
              {isGenerating ? 'Creating your catalogue...' : '✨ Generate Catalogue'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="md"
              icon={<Globe size={16} />}
              onClick={handleGenerateAllLanguages}
              loading={isGeneratingAll}
              disabled={isGenerating}
            >
              🌐 Generate All Languages
            </Button>
          </div>
        )
      )}

      {/* Notice Alert */}
      {noticeMessage && (
        <div className="mt-3 p-3 rounded-lg text-xs bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Expanded Catalogue Editor */}
      {isExpanded && currentCatalogue && (
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--m63-border)', paddingTop: '18px' }} className="animate-fade-in">
          {/* AI Content Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: editedByArtisan[activeLanguage] ? '#E0F2FE' : '#FEF3C7', color: editedByArtisan[activeLanguage] ? '#0369A1' : '#B45309', padding: '3px 10px', borderRadius: '12px' }}>
                {editedByArtisan[activeLanguage] ? <Edit3 size={12} /> : <Sparkles size={12} />}
                {editedByArtisan[activeLanguage] ? '✎ Edited by you' : '✨ Suggested by M63'}
              </span>

              {productId && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#D1FAE5', color: '#065F46', padding: '3px 9px', borderRadius: '12px' }}>
                  ✓ Saved to Draft
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={() => handleGenerateSingleLanguage(activeLanguage)}
                loading={isGenerating}
              >
                Regenerate
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Eye size={14} />}
                onClick={() => setShowPreviewModal(true)}
              >
                👁 Preview Catalogue
              </Button>
            </div>
          </div>

          {/* Section A: Product Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Product Title
            </label>
            <input
              type="text"
              value={currentCatalogue.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--m63-border)',
                backgroundColor: 'var(--m63-bg-canvas)',
                color: 'var(--m63-slate)',
                fontSize: '0.95rem',
                fontWeight: 700,
              }}
            />
          </div>

          {/* Section B: Short Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Short Description (Card Summary)
            </label>
            <textarea
              rows={2}
              value={currentCatalogue.shortDescription}
              onChange={(e) => handleFieldChange('shortDescription', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--m63-border)',
                backgroundColor: 'var(--m63-bg-canvas)',
                color: 'var(--m63-slate)',
                fontSize: '0.88rem',
                fontWeight: 600,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Section C: Full Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Full Catalogue Description
            </label>
            <textarea
              rows={4}
              value={currentCatalogue.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--m63-border)',
                backgroundColor: 'var(--m63-bg-canvas)',
                color: 'var(--m63-slate)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Section D: Product Highlights */}
          <div style={{ marginBottom: '16px', backgroundColor: '#FFFBEB', borderRadius: '10px', padding: '14px', border: '1px solid #FCD34D' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} className="text-amber-500" />
                Product Highlights
              </label>
              <button
                type="button"
                onClick={handleAddHighlight}
                style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Add Highlight
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentCatalogue.highlights.map((h, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} style={{ color: '#D97706', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={h}
                    onChange={(e) => handleHighlightChange(index, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #FCD34D',
                      backgroundColor: '#FFFFFF',
                      color: '#92400E',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveHighlight(index)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section E: Canonical Product Specifications */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Product Specifications (Derived from Structured Facts)
            </label>
            <div style={{ border: '1px solid var(--m63-border)', borderRadius: '8px', overflow: 'hidden' }}>
              {Object.keys(currentCatalogue.specifications).length > 0 ? (
                Object.entries(currentCatalogue.specifications).map(([k, v], i) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      backgroundColor: i % 2 === 0 ? 'var(--m63-bg-canvas)' : 'var(--m63-bg-surface)',
                      borderBottom: i < Object.keys(currentCatalogue.specifications).length - 1 ? '1px solid var(--m63-border)' : 'none',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--m63-slate-subtle)' }}>{k}</span>
                    <span style={{ fontWeight: 700, color: 'var(--m63-slate)' }}>{v}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--m63-slate-subtle)' }}>
                  Specifications will populate automatically as product details are provided.
                </div>
              )}
            </div>
          </div>

          {/* Section F: Care Instructions */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Care Instructions
            </label>
            <input
              type="text"
              value={currentCatalogue.careInstructions}
              onChange={(e) => handleFieldChange('careInstructions', e.target.value)}
              placeholder="e.g. Hand wash separately in cold water."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--m63-border)',
                backgroundColor: 'var(--m63-bg-canvas)',
                color: 'var(--m63-slate)',
                fontSize: '0.82rem',
              }}
            />
          </div>

          {/* Section G: Search Tags */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Search Tags
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {currentCatalogue.tags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '0.75rem',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FCD34D',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    style={{ background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', padding: 0, marginLeft: '2px' }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ Add tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--m63-border)',
                  backgroundColor: 'var(--m63-bg-canvas)',
                  width: '100px',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Customer Preview Modal */}
      <CataloguePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        catalogue={currentCatalogue}
        imageUrl={imageUrl}
        price={productData.price}
        productName={productData.name}
        category={productData.category}
        material={productData.material}
        craftType={productData.craft_type}
      />
    </div>
  );
};
