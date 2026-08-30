import React from 'react';
import { ProcessingStage } from '../../types/ai.js';
import { LoadingSpinner } from '../ui/LoadingSpinner.js';
import { Mic, FileText, Sparkles, CheckCircle2 } from 'lucide-react';

export interface VoiceProcessingStateProps {
  stage: ProcessingStage;
}

export const VoiceProcessingState: React.FC<VoiceProcessingStateProps> = ({ stage }) => {
  const steps = [
    {
      id: 'UPLOADING',
      label: 'Voice captured',
      sublabel: 'Sending audio securely',
      icon: Mic,
    },
    {
      id: 'TRANSCRIBING',
      label: 'Understanding your words',
      sublabel: 'Transcribing original language',
      icon: FileText,
    },
    {
      id: 'EXTRACTING',
      label: 'Structuring product details',
      sublabel: 'Extracting materials, colors & craft technique',
      icon: Sparkles,
    },
  ];

  const getStepStatus = (stepId: string) => {
    if (stage === 'READY') return 'completed';
    if (stage === 'ERROR') return 'idle';

    const order = ['UPLOADING', 'TRANSCRIBING', 'EXTRACTING', 'READY'];
    const currentIndex = order.indexOf(stage);
    const stepIndex = order.indexOf(stepId);

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    return 'idle';
  };

  return (
    <div
      className="m63-card animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        maxWidth: '520px',
        margin: '0 auto',
        backgroundColor: 'var(--m63-bg-surface)',
        borderRadius: 'var(--m63-radius-xl)',
        boxShadow: 'var(--m63-shadow-lg)',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <LoadingSpinner size={48} color="var(--m63-primary)" />
      </div>

      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--m63-slate)', letterSpacing: '-0.01em', marginBottom: '6px' }}>
        M63 Assistant is processing your voice...
      </h2>

      <p style={{ fontSize: '0.88rem', color: 'var(--m63-slate-subtle)', marginBottom: '32px' }}>
        Please wait a moment while we transcribe your audio and organize your product listing.
      </p>

      {/* Stage Steps Indicator */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '380px', textAlign: 'left' }}>
        {steps.map((step) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 16px',
                borderRadius: 'var(--m63-radius-md)',
                backgroundColor:
                  status === 'active'
                    ? 'var(--m63-primary-light)'
                    : status === 'completed'
                    ? 'var(--m63-success-bg)'
                    : 'var(--m63-bg-canvas)',
                border: `1px solid ${
                  status === 'active'
                    ? 'var(--m63-primary-subtle)'
                    : status === 'completed'
                    ? 'var(--m63-success-border)'
                    : 'var(--m63-border)'
                }`,
                transition: 'var(--m63-transition)',
              }}
            >
              {status === 'completed' ? (
                <CheckCircle2 size={22} style={{ color: 'var(--m63-success)', flexShrink: 0 }} />
              ) : status === 'active' ? (
                <LoadingSpinner size={20} color="var(--m63-primary)" />
              ) : (
                <Icon size={20} style={{ color: 'var(--m63-slate-subtle)', flexShrink: 0 }} />
              )}

              <div>
                <p
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color:
                      status === 'completed'
                        ? 'var(--m63-success)'
                        : status === 'active'
                        ? 'var(--m63-primary)'
                        : 'var(--m63-slate-subtle)',
                  }}
                >
                  {step.label}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--m63-slate-subtle)', marginTop: '2px' }}>
                  {step.sublabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
