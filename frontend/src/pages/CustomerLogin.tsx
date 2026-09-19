import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { StarryBackground3D } from '../components/common/StarryBackground3D.js';
import { EmberField } from '../components/common/EmberField.js';
import '../styles/m63-animations.css';

export const CustomerLogin: React.FC = () => {
  const { loginCustomer } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.email.trim()) {
      errs.email = 'Please enter your email address';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
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
      await loginCustomer(formData);
      navigate('/marketplace');
    } catch (err: any) {
      setServerError(err.message || 'Invalid email or password.');
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
        backgroundColor: '#030712',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflow: 'hidden',
      }}
    >
      <StarryBackground3D />
      <EmberField count={16} variant="gold" />
      <div className="m63-card-glow m63-card-glow--gold" />

      <div
        className="m63-auth-card-dark m63-card-in"
        style={{ position: 'relative', zIndex: 10, maxWidth: '440px', width: '100%' }}
      >
        {/* Navigation Back */}
        <button
          type="button"
          onClick={() => navigate('/login')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginBottom: '20px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to M63 Landing Page</span>
        </button>

        {/* Brand Header */}
        <div className="m63-reveal" style={{ textAlign: 'center', marginBottom: '28px', animationDelay: '0.05s' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#FFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              boxShadow: '0 4px 18px rgba(245, 158, 11, 0.4)',
            }}
          >
            <ShoppingBag size={26} />
          </div>
          <h1
            className="m63-serif"
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em', margin: 0 }}
          >
            M63 Customer Sign In
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '6px' }}>
            Sign in to discover & purchase handcrafted artisan products
          </p>
        </div>

        {serverError && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '10px',
              padding: '12px 14px',
              color: '#FCA5A5',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="m63-reveal" style={{ animationDelay: '0.15s' }}>
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. customer@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
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

          <div style={{ marginTop: '24px' }} className="m63-btn-wrap">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 700,
                height: '44px',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
              }}
            >
              Sign In to Marketplace
            </Button>
          </div>
        </form>

        <div
          className="m63-reveal"
          style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.88rem', color: '#94A3B8', animationDelay: '0.24s' }}
        >
          New customer on M63?{' '}
          <Link to="/customer/register" style={{ fontWeight: 700, color: '#F59E0B', textDecoration: 'none' }}>
            Create Customer Account
          </Link>
        </div>
      </div>
    </div>
  );
};
