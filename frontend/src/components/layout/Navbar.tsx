import { Menu, User, LogOut, Store, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'var(--m63-bg-surface)',
        borderBottom: '1px solid var(--m63-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onToggleMobileSidebar}
          aria-label="Open mobile navigation menu"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--m63-slate)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Menu size={24} />
        </button>
        <span
          onClick={() => navigate('/artisan/dashboard')}
          style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--m63-primary)', cursor: 'pointer' }}
        >
          M63
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Marketplace Shortcut */}
        <button
          onClick={() => navigate('/marketplace')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: '1px solid var(--m63-border)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--m63-slate)',
            cursor: 'pointer',
          }}
        >
          <Store size={16} className="text-amber-600" />
          <span>Marketplace</span>
        </button>

        {/* Cart Shortcut */}
        <button
          onClick={() => navigate('/marketplace/cart')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: '1px solid var(--m63-border)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--m63-slate)',
            cursor: 'pointer',
          }}
        >
          <ShoppingCart size={16} className="text-emerald-600" />
          <span>Cart</span>
        </button>

        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--m63-slate)', margin: 0 }}>
            {user?.name}
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--m63-primary)', fontFamily: 'monospace', fontWeight: 700 }}>
            {user?.m63Id}
          </span>
        </div>
        <button
          onClick={() => navigate('/artisan/profile')}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--m63-primary-light)',
            color: 'var(--m63-primary)',
            border: '1px solid var(--m63-primary-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="View Profile"
        >
          <User size={18} />
        </button>
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--m63-error)',
            cursor: 'pointer',
            padding: '6px',
          }}
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
