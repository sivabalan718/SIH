import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { CustomerFloatingEntry } from '../components/common/CustomerFloatingEntry.js';
import { StarryBackground3D } from '../components/common/StarryBackground3D.js';
import { EmberField } from '../components/common/EmberField.js';
import '../styles/m63-animations.css';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
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
      const result = await register(formData);
      navigate('/register-success', {
        state: { m63Id: result.m63Id, name: formData.name },
      });
    } catch (err: any) {
      setServerError(err.message || 'Unable to create account. Please try again.');
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
      <StarryBackground3D />
      <EmberField count={16} variant="clay" />
      <div className="m63-card-glow" />

      <div className="m63-auth-card-dark m63-card-in" style={{ position: 'relative', zIndex: 10 }}>
        {/* Brand Header */}
        <div className="m63-reveal" style={{ textAlign: 'center', marginBottom: '24px', animationDelay: '0.05s' }}>
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
            style={{ fontSize: '1.55rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em' }}
          >
            Welcome to M63
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginTop: '4px' }}>
            Create your digital workspace and bring your craft online.
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

        <form onSubmit={handleSubmit} noValidate className="m63-reveal" style={{ animationDelay: '0.15s' }}>
          <Input
            label="Full Name"
            placeholder="e.g. Meena Devi"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
            required
          />

          <div style={{ marginTop: '24px' }} className="m63-btn-wrap">
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
              Create my M63 Account
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
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600, color: '#F59E0B', textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
      <CustomerFloatingEntry />
    </div>
  );
};
