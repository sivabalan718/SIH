import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, AlertCircle, MapPin, User, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { PreferredLanguage } from '../types/auth.js';
import { StarryBackground3D } from '../components/common/StarryBackground3D.js';

export const CustomerRegister: React.FC = () => {
  const { registerCustomer } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    address: '',
    locality: '',
    city: '',
    district: '',
    state: '',
    postalCode: '',
    preferredLanguage: 'en' as PreferredLanguage,
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
    if (!formData.mobile.trim()) errs.mobile = 'Mobile number is required';
    if (!formData.address.trim()) errs.address = 'Delivery address line is required';
    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.state.trim()) errs.state = 'State is required';
    if (!formData.postalCode.trim()) errs.postalCode = 'PIN code is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      await registerCustomer({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        mobile: formData.mobile.trim(),
        address: formData.address.trim(),
        locality: formData.locality.trim(),
        city: formData.city.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        preferredLanguage: formData.preferredLanguage,
      });

      navigate('/marketplace');
    } catch (err: any) {
      setServerError(err.message || 'Unable to create customer account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', backgroundColor: '#030712', padding: '32px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <StarryBackground3D />

      <div className="m63-auth-card-dark animate-fade-in" style={{ position: 'relative', zIndex: 10, maxWidth: '640px', width: '100%' }}>
        {/* Back Link */}
        <button
          type="button"
          onClick={() => navigate('/login')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#94A3B8', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', marginBottom: '20px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to M63 Landing Page</span>
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
            Create Customer Account
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '6px' }}>
            Register to save delivery addresses, track orders, and shop authentic artisan crafts.
          </p>
        </div>

        {serverError && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '12px 14px', color: '#FCA5A5', fontSize: '0.85rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Basic Identity Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} className="text-amber-500" /> 1. Customer Identity
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <Input
                label="Full Name"
                placeholder="e.g. Priya Sharma"
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
                label="Mobile Number"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                error={errors.mobile}
                required
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}>
                  Preferred Language
                </label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value as PreferredLanguage })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)', backgroundColor: 'rgba(30, 41, 59, 0.65)', color: '#F8FAFC', fontSize: '0.88rem', fontWeight: 600 }}
                >
                  <option value="en" style={{ backgroundColor: '#0F172A', color: '#FFF' }}>English</option>
                  <option value="ta" style={{ backgroundColor: '#0F172A', color: '#FFF' }}>தமிழ் (Tamil)</option>
                  <option value="hi" style={{ backgroundColor: '#0F172A', color: '#FFF' }}>हिन्दी (Hindi)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={16} className="text-amber-500" /> 2. Account Security
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
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
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                error={errors.confirmPassword}
                required
              />
            </div>
          </div>

          {/* Delivery Information Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} className="text-amber-500" /> 3. Default Delivery Address
            </h3>

            <Input
              label="Street Address / Door No."
              placeholder="e.g. 42 Gandhi Road, Flat 3B"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              error={errors.address}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}>
              <Input
                label="Locality / Area"
                placeholder="e.g. T. Nagar"
                value={formData.locality}
                onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
              />

              <Input
                label="City"
                placeholder="e.g. Chennai"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                error={errors.city}
                required
              />

              <Input
                label="District"
                placeholder="e.g. Chennai"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}>
              <Input
                label="State"
                placeholder="e.g. Tamil Nadu"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                error={errors.state}
                required
              />

              <Input
                label="PIN Code"
                placeholder="e.g. 600017"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                error={errors.postalCode}
                required
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}>
                  Country
                </label>
                <input
                  type="text"
                  value="India"
                  disabled
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)', backgroundColor: 'rgba(30, 41, 59, 0.4)', color: '#94A3B8', fontSize: '0.88rem', fontWeight: 600 }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '28px' }}>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', border: 'none', color: '#FFFFFF', fontWeight: 700, height: '46px', fontSize: '0.95rem', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)' }}
            >
              Register & Start Shopping
            </Button>
          </div>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.88rem', color: '#94A3B8' }}>
          Already registered as a customer?{' '}
          <Link to="/customer/login" style={{ fontWeight: 700, color: '#F59E0B', textDecoration: 'none' }}>
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
