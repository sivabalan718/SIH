import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CopyableM63Id } from '../components/common/CopyableM63Id.js';
import { Button } from '../components/ui/Button.js';
import { Sparkles, ArrowRight } from 'lucide-react';

export const RegisterSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { m63Id?: string; name?: string } | null;

  const m63Id = state?.m63Id || 'M63-DEMO63';
  const name = state?.name || 'Artisan';

  return (
    <div className="m63-auth-page">
      <div className="m63-auth-card animate-fade-in" style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--m63-success-bg)',
            color: 'var(--m63-success)',
            border: '1px solid var(--m63-success-border)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <Sparkles size={32} />
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--m63-slate)', letterSpacing: '-0.02em' }}>
          Welcome to M63, {name}!
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--m63-slate-subtle)', marginTop: '6px', marginBottom: '24px' }}>
          Your M63 artisan account is ready.
        </p>

        {/* M63 ID Display Card */}
        <div
          style={{
            backgroundColor: 'var(--m63-bg-canvas)',
            border: '1px solid var(--m63-border)',
            borderRadius: 'var(--m63-radius-lg)',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            YOUR PUBLIC M63 ID
          </span>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
            <CopyableM63Id m63Id={m63Id} size="large" />
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--m63-slate-subtle)', lineHeight: 1.6, marginBottom: '28px' }}>
          Your <strong>M63 ID</strong> is your unique identity on M63. Keep it safe — you can use either your <strong>M63 ID</strong> or <strong>Email address</strong> to sign in to your account.
        </p>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<ArrowRight size={20} />}
          onClick={() => navigate('/login')}
        >
          Continue to Sign In
        </Button>

        <div style={{ marginTop: '20px' }}>
          <Link to="/login" style={{ fontSize: '0.85rem', color: 'var(--m63-slate-subtle)' }}>
            Already copied? Proceed to Login
          </Link>
        </div>
      </div>
    </div>
  );
};
