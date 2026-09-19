import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { CustomerFloatingEntry } from '../components/common/CustomerFloatingEntry.js';
import { StarryBackground3D } from '../components/common/StarryBackground3D.js';
import { WelcomeSplashIntro } from '../components/common/WelcomeSplashIntro.js';
import { EmberField } from '../components/common/EmberField.js';
import '../styles/m63-animations.css';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });

  const [showSplash, setShowSplash] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.identifier.trim()) {
      errs.identifier = 'Please enter your Email or M63 ID';
    }
    if (!formData.password) {
      errs.password = 'Please enter your password';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      await login(formData);
      navigate('/artisan/dashboard');
    } catch (err: any) {
      setServerError(err.message || 'Invalid email or M63 ID or password.');
    } finally {
      setLoading(false);
    }
  };

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
      {/* 3D Cosmic Animated Starfield & Shooting Stars Canvas */}
      <StarryBackground3D />

      {/* Kiln-spark ember field — reads as one continuous atmosphere with the starfield */}
      <EmberField count={16} variant="clay" />

      {/* 3-Second Welcome Splash Screen */}
      {showSplash && <WelcomeSplashIntro onComplete={() => setShowSplash(false)} />}

      {/* One-time kiln flare behind the card on load */}
      <div className="m63-card-glow" />

      {/* Login Dark Glass Card */}
      <div className="m63-auth-card-dark m63-card-in" style={{ position: 'relative', zIndex: 10 }}>
        {/* Brand Header — orchestrated reveal, staggered once on mount */}
        <div
          className="m63-reveal"
          style={{ textAlign: 'center', marginBottom: '28px', animationDelay: '0.05s' }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
              color: '#FFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.4rem',
              marginBottom: '12px',
              boxShadow: '0 4px 20px rgba(234, 88, 12, 0.4)',
            }}
          >
            M
          </div>
          <h1
            className="m63-serif"
            style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em' }}
          >
            M63
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginTop: '4px' }}>
            Welcome back to your artisan workspace
          </p>
        </div>

        {serverError && (
          <div
            className="m63-alert m63-alert-error"
            role="alert"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#FCA5A5',
            }}
          >
            <span>{serverError}</span>
          </div>
        )}

        {forgotMsg && (
          <div
            className="m63-alert m63-alert-success"
            role="alert"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              color: '#6EE7B7',
            }}
          >
            <span>Password recovery instructions can be requested via M63 Support or your registered email address.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="m63-reveal" style={{ animationDelay: '0.15s' }}>
          <Input
            label="Email or M63 ID"
            placeholder="e.g. artisan@example.com or M63-MOMAOV"
            value={formData.identifier}
            onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
            error={errors.identifier}
            helperText="Enter your registered email or your 10-character M63 ID"
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px', marginBottom: '18px' }}>
            <button
              type="button"
              onClick={() => setForgotMsg(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#F59E0B',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Forgot password?
            </button>
          </div>

          <div className="m63-btn-wrap">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              style={{
                background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                border: 'none',
                boxShadow: '0 4px 16px rgba(234, 88, 12, 0.35)',
                fontWeight: 700,
              }}
            >
              Sign In to M63
            </Button>
          </div>
        </form>

        <div
          className="m63-reveal"
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#94A3B8',
            animationDelay: '0.24s',
          }}
        >
          Don't have an M63 account yet?{' '}
          <Link to="/register" style={{ fontWeight: 600, color: '#F59E0B', textDecoration: 'none' }}>
            Create M63 account
          </Link>
        </div>
      </div>
      <CustomerFloatingEntry />
    </div>
  );
};
