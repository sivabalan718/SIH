import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CopyableM63Id } from '../components/common/CopyableM63Id.js';
import { Button } from '../components/ui/Button.js';
import { Sparkles, ArrowRight } from 'lucide-react';
import { StarryBackground3D } from '../components/common/StarryBackground3D.js';
import { EmberField } from '../components/common/EmberField.js';
import '../styles/m63-animations.css';

export const RegisterSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { m63Id?: string; name?: string } | null;

  const m63Id = state?.m63Id || 'M63-DEMO63';
  const name = state?.name || 'Artisan';

  return (
    <div
      className="m63-sans"
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#030712',
        overflow: 'hidden',
      }}
    >
      <StarryBackground3D />
      <EmberField count={18} variant="clay" />

      {/* Celebration burst — bespoke moment on this page */}
      <div className="m63-success-ring" />
      <div className="m63-success-ring" style={{ animationDelay: '0.25s' }} />

      <div
        className="m63-auth-card-dark m63-card-in"
        style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '480px' }}
      >
        <div
          className="m63-reveal"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#6EE7B7',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            animationDelay: '0.05s',
          }}
        >
          <Sparkles size={32} />
        </div>

        <h1
          className="m63-serif m63-reveal"
          style={{
            fontSize: '1.7rem',
            fontWeight: 700,
            color: '#F8FAFC',
            letterSpacing: '-0.01em',
            animationDelay: '0.12s',
          }}
        >
          Welcome to M63, {name}!
        </h1>
        <p
          className="m63-reveal"
          style={{ fontSize: '0.95rem', color: '#94A3B8', marginTop: '6px', marginBottom: '24px', animationDelay: '0.18s' }}
        >
          Your M63 artisan account is ready.
        </p>

        {/* M63 ID Display Card */}
        <div
          className="m63-reveal"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            animationDelay: '0.26s',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#94A3B8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Your public M63 ID
          </span>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
            <CopyableM63Id m63Id={m63Id} size="large" />
          </div>
        </div>

        <p
          className="m63-reveal"
          style={{ fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '28px', animationDelay: '0.32s' }}
        >
          Your <strong style={{ color: '#F8FAFC' }}>M63 ID</strong> is your unique identity on M63. Keep it safe — you can
          use either your <strong style={{ color: '#F8FAFC' }}>M63 ID</strong> or{' '}
          <strong style={{ color: '#F8FAFC' }}>Email address</strong> to sign in to your account.
        </p>

        <div className="m63-reveal m63-btn-wrap" style={{ animationDelay: '0.38s' }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<ArrowRight size={20} />}
            onClick={() => navigate('/login')}
            style={{
              background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
              border: 'none',
              boxShadow: '0 4px 16px rgba(234, 88, 12, 0.35)',
              fontWeight: 700,
            }}
          >
            Continue to Sign In
          </Button>
        </div>

        <div className="m63-reveal" style={{ marginTop: '20px', animationDelay: '0.44s' }}>
          <Link to="/login" style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
            Already copied? Proceed to Login
          </Link>
        </div>
      </div>
    </div>
  );
};
