import React, { useRef, useState, DragEvent, ChangeEvent, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Trash2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button.js';

export interface ImageUploadProps {
  currentImageUrl?: string | null;
  selectedFile?: File | null;
  onFileSelect: (file: File | null) => void;
  onOpenCamera?: () => void;
  onImprovePhoto?: () => void;
  isImprovingPhoto?: boolean;
  qualityRating?: 'GOOD' | 'ACCEPTABLE' | 'NEEDS_IMPROVEMENT' | null;
  validationFeedback?: string | null;
  isValidProductImage?: boolean;
  error?: string;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  selectedFile,
  onFileSelect,
  onOpenCamera,
  onImprovePhoto,
  isImprovingPhoto = false,
  qualityRating,
  validationFeedback,
  isValidProductImage = true,
  error,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  // Generate preview URL when a new file is selected
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setLocalPreview(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setLocalPreview(null);
      return undefined;
    }
  }, [selectedFile]);

  const displayImage = localPreview || currentImageUrl;

  const handleFile = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type.toLowerCase())) {
      alert('Only JPG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be smaller than 10 MB.');
      return;
    }
    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="m63-form-group">
      <div className="flex items-center justify-between mb-1.5">
        <label className="m63-label mb-0">Product Photos</label>
        {displayImage && qualityRating && (
          <span
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
              qualityRating === 'GOOD'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : qualityRating === 'ACCEPTABLE'
                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
            }`}
          >
            {qualityRating === 'GOOD' ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Image Quality: Good ✓
              </>
            ) : qualityRating === 'ACCEPTABLE' ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-amber-500" />
                Image Quality: Acceptable
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                Needs Improvement
              </>
            )}
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {displayImage ? (
        /* Image Preview Box & Dedicated AI Toolbar */
        <div className="space-y-3">
          <div
            style={{
              position: 'relative',
              borderRadius: 'var(--m63-radius-lg)',
              overflow: 'hidden',
              border: !isValidProductImage
                ? '2px solid var(--m63-error)'
                : '1px solid var(--m63-border)',
              backgroundColor: 'var(--m63-bg-muted)',
              maxHeight: '340px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={displayImage}
              alt="Product Preview"
              style={{ width: '100%', maxHeight: '340px', objectFit: 'contain' }}
            />
          </div>

          {/* Dedicated Prominent AI Enhancement & Action Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              backgroundColor: 'var(--m63-bg-canvas)',
              border: '1px solid var(--m63-border)',
              borderRadius: 'var(--m63-radius-lg)',
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: '#F59E0B' }} />
              <div>
                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                  Product Photo Enhancement
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--m63-slate-subtle)' }}>
                  Smart Studio Enhancement • Preserves original product details
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {onImprovePhoto && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onImprovePhoto}
                  loading={isImprovingPhoto}
                  disabled={disabled || isImprovingPhoto}
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <Sparkles size={16} />
                  <span>{isImprovingPhoto ? 'Enhancing Photo...' : '✨ Enhance Photo'}</span>
                </Button>
              )}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                <RefreshCw size={14} />
                <span>Replace</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
                style={{ color: 'var(--m63-error)' }}
              >
                <Trash2 size={14} />
                <span>Remove</span>
              </Button>
            </div>
          </div>

          {/* Validation Feedback Warning/Tip */}
          {validationFeedback && (
            <div
              className={`p-3 rounded-lg text-xs border flex items-start gap-2.5 ${
                !isValidProductImage
                  ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/50 dark:text-rose-300'
                  : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/50 dark:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{validationFeedback}</p>
                {!isValidProductImage && (
                  <p className="mt-1 opacity-90">
                    M63 Assistant works best with clear photos of sarees, pottery, handicrafts, and artisan items.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Dropzone / Upload Box */
        <div className="space-y-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? 'var(--m63-primary)' : 'var(--m63-border)'}`,
              borderRadius: 'var(--m63-radius-lg)',
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: isDragging ? 'var(--m63-primary-light)' : 'var(--m63-bg-surface)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'var(--m63-transition)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--m63-primary-light)',
                color: 'var(--m63-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={26} />
            </div>

            <div>
              <p style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                Add a clear product photo
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--m63-slate-subtle)', marginTop: '4px' }}>
                Drag and drop an image here, or tap to choose from your device
              </p>
            </div>

            <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
              {onOpenCamera && (
                <button
                  type="button"
                  className="m63-btn m63-btn-secondary m63-btn-sm"
                  onClick={onOpenCamera}
                  disabled={disabled}
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--m63-border)' }}
                >
                  <Camera size={16} />
                  <span>📷 Take Photo</span>
                </button>
              )}

              <button
                type="button"
                className="m63-btn m63-btn-secondary m63-btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--m63-border)' }}
              >
                <Upload size={16} />
                <span>Choose Photo</span>
              </button>
            </div>

            <span style={{ fontSize: '0.75rem', color: 'var(--m63-slate-subtle)', fontWeight: 500 }}>
              JPG • PNG • WebP up to 10 MB
            </span>
          </div>
        </div>
      )}

      {error && <span className="m63-error-text" style={{ marginTop: '6px' }}>{error}</span>}
    </div>
  );
};
