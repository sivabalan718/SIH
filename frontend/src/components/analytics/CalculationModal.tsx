import React from 'react';
import { X, ShieldCheck, Database, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="m63-bi-modal-backdrop" onClick={onClose}>
      <div className="m63-bi-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} style={{ color: 'var(--m63-bi-orange)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--m63-bi-text-main)' }}>
              How M63 Calculates Metrics
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--m63-bi-text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--m63-bi-text-subtle)', lineHeight: 1.5, marginBottom: '16px' }}>
          M63 strictly separates deterministic business facts computed by backend code from Gemini AI contextual reasoning.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem' }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--m63-bi-surface)', borderRadius: '8px', border: '1px solid var(--m63-bi-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--m63-bi-green)', marginBottom: '4px' }}>
              <Database size={14} /> Deterministic Calculations
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--m63-bi-text-subtle)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <li><strong>Revenue & Orders:</strong> Summed from verified database buyer checkout records.</li>
              <li><strong>Stock & Velocity:</strong> Calculated as units sold divided by selected period days.</li>
              <li><strong>Category & Product Ranks:</strong> Ranked mathematically by actual recorded sales.</li>
            </ul>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--m63-bi-surface)', borderRadius: '8px', border: '1px solid var(--m63-bi-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--m63-bi-orange)', marginBottom: '4px' }}>
              <Sparkles size={14} /> Gemini AI Business Reasoning
            </div>
            <p style={{ margin: 0, color: 'var(--m63-bi-text-subtle)' }}>
              Gemini receives ONLY the calculated evidence payload to summarize trends, highlight inventory risks, and suggest business decisions. Gemini is never allowed to fabricate numbers or market statistics.
            </p>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--m63-bi-surface)', borderRadius: '8px', border: '1px solid var(--m63-bi-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--m63-bi-purple)', marginBottom: '4px' }}>
              <CheckCircle2 size={14} /> Trust Levels & Auditing
            </div>
            <p style={{ margin: 0, color: 'var(--m63-bi-text-subtle)' }}>
              Every insight exposes expandable <strong>Why M63 says this?</strong> supporting metrics, reasoning flow, and explicit limitations.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '10px',
            backgroundColor: 'var(--m63-bi-orange)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
};
