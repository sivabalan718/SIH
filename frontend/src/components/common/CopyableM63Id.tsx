import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyableM63IdProps {
  m63Id: string;
  size?: 'normal' | 'large';
}

export const CopyableM63Id: React.FC<CopyableM63IdProps> = ({ m63Id, size = 'normal' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(m63Id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = m63Id;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isLarge = size === 'large';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
      <div
        className="m63-id-pill"
        style={{
          fontSize: isLarge ? '1.5rem' : '1.125rem',
          padding: isLarge ? '12px 20px' : '8px 16px',
        }}
      >
        <span>{m63Id}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy M63 ID"
          title="Copy M63 ID to clipboard"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: copied ? 'var(--m63-success)' : 'var(--m63-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px',
            borderRadius: '4px',
            transition: 'var(--m63-transition)',
          }}
        >
          {copied ? <Check size={isLarge ? 22 : 18} /> : <Copy size={isLarge ? 22 : 18} />}
        </button>
      </div>
      {copied && (
        <span
          className="animate-fade-in"
          style={{
            fontSize: '0.8rem',
            color: 'var(--m63-success)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ✓ M63 ID copied to clipboard
        </span>
      )}
    </div>
  );
};
