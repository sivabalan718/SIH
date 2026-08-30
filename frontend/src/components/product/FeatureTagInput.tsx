import React, { useState, KeyboardEvent } from 'react';
import { Plus, X, Tag } from 'lucide-react';

export interface FeatureTagInputProps {
  features: string[];
  onChange: (features: string[]) => void;
  maxFeatures?: number;
}

export const FeatureTagInput: React.FC<FeatureTagInputProps> = ({
  features,
  onChange,
  maxFeatures = 20,
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (features.length >= maxFeatures) return;
    if (features.includes(trimmed)) {
      setInputVal('');
      return;
    }
    onChange([...features, trimmed]);
    setInputVal('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    onChange(features.filter((_, i) => i !== index));
  };

  return (
    <div className="m63-form-group">
      <label className="m63-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Tag size={15} style={{ color: 'var(--m63-primary)' }} />
        <span>Product Features & Craft Highlights</span>
      </label>

      {/* Tags list */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        {features.map((feat, idx) => (
          <span
            key={idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--m63-primary-light)',
              border: '1px solid var(--m63-primary-subtle)',
              color: 'var(--m63-primary)',
              borderRadius: 'var(--m63-radius-full)',
              padding: '4px 12px',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            {feat}
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--m63-primary)',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
              }}
              aria-label={`Remove feature ${feat}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>

      {/* Input box */}
      {features.length < maxFeatures && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="m63-input"
            placeholder="e.g. Handwoven, 100% Organic Cotton, Eco-friendly dye"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="m63-btn m63-btn-secondary m63-btn-sm"
            onClick={handleAdd}
            disabled={!inputVal.trim()}
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      )}

      <span className="m63-helper-text">
        Add key selling points or traditional craft techniques (press Enter or click Add).
      </span>
    </div>
  );
};
