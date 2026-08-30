import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, User, Store, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems: Array<{ label: string; path: string; icon: any; badge?: string }> = [
    { label: 'Dashboard', path: '/artisan/dashboard', icon: LayoutDashboard },
    { label: 'Products', path: '/artisan/products', icon: Package },
    { label: 'Orders', path: '/artisan/orders', icon: ShoppingCart },
    { label: 'Marketplace', path: '/marketplace', icon: Store },
    { label: 'Analytics', path: '/artisan/analytics', icon: BarChart3 },
    { label: 'Profile', path: '/artisan/profile', icon: User },
  ];

  return (
    <aside
      className={`m63-sidebar ${mobileOpen ? 'mobile-open' : ''}`}
      style={{
        width: '260px',
        backgroundColor: 'var(--m63-bg-surface)',
        borderRight: '1px solid var(--m63-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--m63-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--m63-slate)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              M63
            </h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--m63-slate-subtle)', fontWeight: 500 }}>
              Artisan Workspace
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) => (isActive ? 'active-nav-link' : 'nav-link')}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--m63-radius-md)',
                color: isActive ? 'var(--m63-primary)' : 'var(--m63-slate-subtle)',
                backgroundColor: isActive ? 'var(--m63-primary-light)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.95rem',
                textDecoration: 'none',
                transition: 'var(--m63-transition)',
              })}
            >
              <Icon size={20} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--m63-primary)',
                    color: '#FFF',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout Footer */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--m63-border)', backgroundColor: 'var(--m63-bg-canvas)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--m63-primary-subtle)',
              color: 'var(--m63-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--m63-slate)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--m63-slate-subtle)', fontFamily: 'monospace', fontWeight: 600 }}>
              {user?.m63Id}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="m63-btn m63-btn-ghost m63-btn-sm m63-btn-full"
          style={{ justifyContent: 'flex-start', color: 'var(--m63-error)' }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
