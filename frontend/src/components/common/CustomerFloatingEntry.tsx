import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

export const CustomerFloatingEntry: React.FC = () => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {/* Desktop Tooltip Label */}
      <div
        className="hidden md:block"
        style={{
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.78rem',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          opacity: isHovered ? 1 : 0.85,
          transition: 'all 0.2s ease',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        🛍️ Shop on M63
      </div>

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => navigate('/customer/login')}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Shop on M63 Marketplace"
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          color: '#FFFFFF',
          border: '2px solid #FFFFFF',
          boxShadow: isHovered
            ? '0 8px 24px rgba(245, 158, 11, 0.45), 0 2px 6px rgba(0,0,0,0.2)'
            : '0 4px 16px rgba(245, 158, 11, 0.3), 0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transform: isHovered ? 'scale(1.08)' : 'scale(1)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <ShoppingBag size={24} />
      </button>
    </div>
  );
};
