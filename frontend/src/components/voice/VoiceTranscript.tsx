import React from 'react';
import { Volume2, Globe } from 'lucide-react';

export interface VoiceTranscriptProps {
  transcript: string;
  detectedLanguage: string;
  confidence?: number;
}

export const VoiceTranscript: React.FC<VoiceTranscriptProps> = ({
  transcript,
  detectedLanguage,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--m63-primary-light)',
        border: '1px solid var(--m63-primary-subtle)',
        borderRadius: 'var(--m63-radius-lg)',
        padding: '18px 20px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--m63-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
          <Volume2 size={18} />
          <span>What M63 Heard</span>
        </div>

        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '9999px',
            backgroundColor: 'var(--m63-bg-surface)',
            color: 'var(--m63-slate)',
            border: '1px solid var(--m63-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Globe size={12} />
          <span>Detected Language: {detectedLanguage}</span>
        </span>
      </div>

      <p
        style={{
          fontSize: '0.95rem',
          color: 'var(--m63-slate)',
          lineHeight: 1.6,
          fontStyle: 'italic',
          backgroundColor: '#FFFFFF',
          padding: '12px 16px',
          borderRadius: 'var(--m63-radius-md)',
          border: '1px solid var(--m63-primary-subtle)',
        }}
      >
        "{transcript}"
      </p>

      <span style={{ fontSize: '0.75rem', color: 'var(--m63-slate-subtle)', marginTop: '8px', display: 'block' }}>
        Preserved in your original spoken language. Product details below were extracted automatically.
      </span>
    </div>
  );
};
