import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { CopyableM63Id } from '../components/common/CopyableM63Id.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { updateArtisanProfileName } from '../services/authService.js';
import { User, Mail, Calendar, ShieldCheck, Check } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      await updateArtisanProfileName(name);
      await refreshProfile();
      setEditing(false);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile name.');
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className="animate-fade-in" style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--m63-slate)', letterSpacing: '-0.02em' }}>
          M63 Artisan Profile
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--m63-slate-subtle)', marginTop: '4px' }}>
          Manage your account identity and personal workspace settings.
        </p>
      </div>

      {successMsg && (
        <div className="m63-alert m63-alert-success" role="alert">
          <Check size={18} />
          <span>Profile name updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="m63-alert m63-alert-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="m63-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Public M63 ID Highlight Box */}
        <div
          style={{
            backgroundColor: 'var(--m63-primary-light)',
            border: '1px solid var(--m63-primary-subtle)',
            borderRadius: 'var(--m63-radius-lg)',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              YOUR PLATFORM M63 ID
            </span>
            <p style={{ fontSize: '0.85rem', color: 'var(--m63-slate)', marginTop: '2px' }}>
              Your unique public identifier across the M63 platform.
            </p>
          </div>
          <CopyableM63Id m63Id={user?.m63Id || 'M63-MOMAOV'} size="normal" />
        </div>

        {/* Editable Name Form */}
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              PERSONAL DETAILS
            </span>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{ background: 'none', border: 'none', color: 'var(--m63-primary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Edit Name
              </button>
            )}
          </div>

          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!editing}
            required
          />

          {editing && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setName(user?.name || '');
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                Save Changes
              </Button>
            </div>
          )}
        </form>

        {/* Account Metadata (Read Only) */}
        <div style={{ borderTop: '1px solid var(--m63-border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ACCOUNT SECURITY & METADATA
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Email Address */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--m63-bg-canvas)', border: '1px solid var(--m63-border)' }}>
              <Mail size={20} style={{ color: 'var(--m63-slate-subtle)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--m63-slate-subtle)', display: 'block' }}>Email Address</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--m63-slate)' }}>{user?.email}</span>
              </div>
            </div>

            {/* Account Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--m63-bg-canvas)', border: '1px solid var(--m63-border)' }}>
              <ShieldCheck size={20} style={{ color: 'var(--m63-success)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--m63-slate-subtle)', display: 'block' }}>Account Status</span>
                <span className="m63-badge m63-badge-success" style={{ marginTop: '2px' }}>
                  {user?.status || 'ACTIVE'}
                </span>
              </div>
            </div>

            {/* Member Since */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--m63-bg-canvas)', border: '1px solid var(--m63-border)' }}>
              <Calendar size={20} style={{ color: 'var(--m63-slate-subtle)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--m63-slate-subtle)', display: 'block' }}>Member Since</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--m63-slate)' }}>{formattedDate}</span>
              </div>
            </div>

            {/* Role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--m63-bg-canvas)', border: '1px solid var(--m63-border)' }}>
              <User size={20} style={{ color: 'var(--m63-primary)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--m63-slate-subtle)', display: 'block' }}>Platform Role</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--m63-slate)' }}>{user?.role || 'ARTISAN'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
