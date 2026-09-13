import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, ShoppingBag, LogOut, Edit3, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { PreferredLanguage } from '../types/auth.js';

export const CustomerProfilePage: React.FC = () => {
  const { user, logout, updateCustomerProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    locality: '',
    city: '',
    district: '',
    state: '',
    postalCode: '',
    preferredLanguage: 'en' as PreferredLanguage,
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        address: user.address || '',
        locality: user.locality || '',
        city: user.city || '',
        district: user.district || '',
        state: user.state || '',
        postalCode: user.postalCode || '',
        preferredLanguage: (user.preferredLanguage as PreferredLanguage) || 'en',
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);

    try {
      if (updateCustomerProfile) {
        await updateCustomerProfile({
          name: form.name,
          mobile: form.mobile,
          address: form.address,
          locality: form.locality,
          city: form.city,
          district: form.district,
          state: form.state,
          postalCode: form.postalCode,
          preferredLanguage: form.preferredLanguage,
        });
      }
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update customer profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/marketplace');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '32px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Top Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748B', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            <ArrowLeft size={18} />
            <span>Return to Marketplace</span>
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<ShoppingBag size={16} />}
              onClick={() => navigate('/marketplace/orders')}
              style={{ backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1' }}
            >
              My Orders
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<LogOut size={16} />}
              onClick={handleLogout}
              style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', color: '#DC2626' }}
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '32px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.06)', border: '1px solid #E2E8F0' }}>
          {/* Header Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '24px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                }}
              >
                {form.name ? form.name.charAt(0).toUpperCase() : '👤'}
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  {form.name || 'M63 Customer Profile'}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                    CUSTOMER ACCOUNT
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{form.email}</span>
                </div>
              </div>
            </div>

            {!isEditing ? (
              <Button
                variant="secondary"
                size="md"
                icon={<Edit3 size={16} />}
                onClick={() => setIsEditing(true)}
                style={{ backgroundColor: '#F1F5F9', color: '#334155' }}
              >
                Edit Profile
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsEditing(false)}
                style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}
              >
                Cancel
              </Button>
            )}
          </div>

          {saveSuccess && (
            <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '12px 16px', color: '#065F46', fontSize: '0.88rem', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>Customer profile updated successfully! Your saved delivery address will pre-fill at checkout.</span>
            </div>
          )}

          {/* Form / Profile Display */}
          <form onSubmit={handleSave}>
            {/* Account Information */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} className="text-amber-600" /> Account Details
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}
                    />
                  ) : (
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{form.name || '—'}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{form.email || '—'}</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                    Mobile Number
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}
                    />
                  ) : (
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{form.mobile || '—'}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                    Preferred Language
                  </label>
                  {isEditing ? (
                    <select
                      value={form.preferredLanguage}
                      onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value as PreferredLanguage })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}
                    >
                      <option value="en">English</option>
                      <option value="ta">தமிழ் (Tamil)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  ) : (
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      {form.preferredLanguage === 'ta' ? 'தமிழ் (Tamil)' : form.preferredLanguage === 'hi' ? 'हिन्दी (Hindi)' : 'English'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Address Information */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} className="text-amber-600" /> Default Delivery Address
              </h3>

              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                        Locality / Area
                      </label>
                      <input
                        type="text"
                        value={form.locality}
                        onChange={(e) => setForm({ ...form, locality: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                        City
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                        District
                      </label>
                      <input
                        type="text"
                        value={form.district}
                        onChange={(e) => setForm({ ...form, district: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                        State
                      </label>
                      <input
                        type="text"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                        PIN Code
                      </label>
                      <input
                        type="text"
                        value={form.postalCode}
                        onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0' }}>
                  {form.address || form.city ? (
                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1E293B', lineHeight: 1.6, margin: 0 }}>
                      {form.address}
                      {form.locality ? `, ${form.locality}` : ''}
                      <br />
                      {form.city}
                      {form.district ? `, ${form.district}` : ''}
                      {form.state ? `, ${form.state}` : ''} - {form.postalCode}
                      <br />
                      <strong>India</strong>
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.88rem', color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>
                      No delivery address recorded yet. Click "Edit Profile" to add your address.
                    </p>
                  )}
                </div>
              )}
            </div>

            {isEditing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  icon={<Save size={18} />}
                  style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', border: 'none', color: '#FFFFFF', fontWeight: 700 }}
                >
                  Save Profile Changes
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
