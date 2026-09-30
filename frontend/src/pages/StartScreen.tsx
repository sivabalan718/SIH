import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Hammer, ShoppingBag } from 'lucide-react';
import '../styles/shop.css';

const ENTRY_KEY = 'm63_entry_role';
type EntryRole = 'CUSTOMER' | 'ARTISAN';

export function getEntryRole(): EntryRole | null {
  try {
    const v = localStorage.getItem(ENTRY_KEY);
    return v === 'CUSTOMER' || v === 'ARTISAN' ? v : null;
  } catch {
    return null;
  }
}

export function setEntryRole(role: EntryRole) {
  try {
    localStorage.setItem(ENTRY_KEY, role);
  } catch {
    // storage unavailable — the chooser simply shows again next launch
  }
}

/** First screen of the app for signed-out users: choose to shop or to sell. Remembered per device. */
export const StartScreen: React.FC = () => {
  const navigate = useNavigate();
  const remembered = getEntryRole();
  if (remembered === 'CUSTOMER') return <Navigate to="/marketplace" replace />;
  if (remembered === 'ARTISAN') return <Navigate to="/login" replace />;

  const choose = (role: EntryRole) => {
    setEntryRole(role);
    navigate(role === 'CUSTOMER' ? '/marketplace' : '/login', { replace: true });
  };

  const card: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 18,
    background: '#fff',
    border: '1px solid #ece7df',
    textAlign: 'left',
    boxShadow: '0 6px 20px rgba(28,25,23,0.08)',
    cursor: 'pointer',
    font: 'inherit',
    color: '#1c1917',
  };
  const icon: React.CSSProperties = { width: 52, height: 52, borderRadius: 16, display: 'grid', placeItems: 'center', flex: 'none', color: '#fff' };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #2b1d14 0%, #3a2618 45%, #f7f4ef 45%)',
        padding: 'calc(var(--sat) + 48px) 20px calc(var(--sab) + 24px)',
      }}
    >
      <div style={{ color: '#fff', maxWidth: 480, width: '100%', margin: '0 auto' }}>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em' }}>M63</div>
        <p style={{ color: '#f3c9a8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.75rem' }}>Handmade · Direct from artisans</p>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.25, marginTop: 28 }}>How would you like to use M63?</h1>
      </div>

      <div style={{ maxWidth: 480, width: '100%', margin: '28px auto 0', display: 'grid', gap: 14 }}>
        <button style={card} onClick={() => choose('CUSTOMER')}>
          <span style={{ ...icon, background: 'linear-gradient(135deg, #e0892f, #c85a28)' }}>
            <ShoppingBag size={26} />
          </span>
          <span style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: '1.08rem' }}>Shop handmade products</strong>
            <span style={{ fontSize: '0.86rem', color: '#78716c' }}>Browse, buy and track orders from artisans across India</span>
          </span>
          <ArrowRight size={20} color="#a8a29e" />
        </button>

        <button style={card} onClick={() => choose('ARTISAN')}>
          <span style={{ ...icon, background: 'linear-gradient(135deg, #0f766e, #134e4a)' }}>
            <Hammer size={24} />
          </span>
          <span style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: '1.08rem' }}>I’m an artisan — sell on M63</strong>
            <span style={{ fontSize: '0.86rem', color: '#78716c' }}>Create listings by voice, manage orders and see your business insights</span>
          </span>
          <ArrowRight size={20} color="#a8a29e" />
        </button>
      </div>

      <p style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.78rem', color: '#78716c', paddingTop: 24 }}>
        You can switch any time from your account.
      </p>
    </div>
  );
};
