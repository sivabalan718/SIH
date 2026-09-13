import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  User,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  const navItems: Array<{ label: string; path: string; icon: any }> = [
    { label: 'Dashboard', path: '/artisan/dashboard', icon: LayoutDashboard },
    { label: 'Products', path: '/artisan/products', icon: Package },
    { label: 'Orders', path: '/artisan/orders', icon: ShoppingCart },
    { label: 'Analytics', path: '/artisan/analytics', icon: BarChart3 },
    { label: 'Profile', path: '/artisan/profile', icon: User },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Dark Backdrop Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 90,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Slide-out Sidebar Drawer */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          animation: 'slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Brand Header with Close Button */}
        <div style={{ padding: '20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'var(--m63-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '1.1rem',
              }}
            >
              M
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1, margin: 0 }}>
                M63
              </h1>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                Artisan Workspace
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            title="Close sidebar"
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav Tabs */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose} // Touch/click tab moves sidebar back inside automatically!
                className={({ isActive }) => (isActive ? 'active-nav-link' : 'nav-link')}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  color: isActive ? '#D97706' : '#475569',
                  backgroundColor: isActive ? '#FEF3C7' : 'transparent',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                })}
              >
                <Icon size={20} />
                <span style={{ flex: 1 }}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Logout Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </p>
              <p style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace', fontWeight: 600, margin: 0 }}>
                {user?.m63Id}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #FCA5A5',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
