import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });

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
    <div className="m63-auth-page">
      <div className="m63-auth-card animate-fade-in">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--m63-primary)',
              color: '#FFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.4rem',
              marginBottom: '12px',
              boxShadow: 'var(--m63-shadow-primary)',
            }}
          >
            M
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--m63-slate)', letterSpacing: '-0.02em' }}>
            M63
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--m63-slate-subtle)', marginTop: '4px' }}>
            Welcome back to your artisan workspace
          </p>
        </div>

        {serverError && (
          <div className="m63-alert m63-alert-error" role="alert">
            <span>{serverError}</span>
          </div>
        )}

        {forgotMsg && (
          <div className="m63-alert m63-alert-success" role="alert">
            <span>Password recovery instructions can be requested via M63 Support or your registered email address.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
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
              style={{ background: 'none', border: 'none', color: 'var(--m63-primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
            >
              Forgot password?
            </button>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Sign In to M63
          </Button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--m63-slate-subtle)' }}>
          Don't have an M63 account yet?{' '}
          <Link to="/register" style={{ fontWeight: 600, color: 'var(--m63-primary)' }}>
            Create M63 account
          </Link>
        </div>
      </div>
    </div>
  );
};
