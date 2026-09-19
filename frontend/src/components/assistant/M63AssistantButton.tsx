import React, { useState } from 'react';
import { Smile, Laugh, X } from 'lucide-react';

interface M63AssistantButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const M63AssistantButton: React.FC<M63AssistantButtonProps> = ({ onClick, isOpen }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={isOpen ? "Close M63 Assistant" : "Open M63 Assistant"}
      title={isOpen ? "Close M63 Assistant" : "Ask M63 AI Business Assistant"}
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        zIndex: 9999,
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: isOpen
          ? 'linear-gradient(135deg, #334155 0%, #0F172A 100%)'
          : isHovered
          ? 'linear-gradient(135deg, #FF6B00 0%, #F59E0B 100%)'
          : 'linear-gradient(135deg, #EA580C 0%, #D97706 100%)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isOpen
          ? '0 10px 30px rgba(0, 0, 0, 0.5)'
          : isHovered
          ? '0 12px 45px rgba(245, 158, 11, 0.75), 0 0 35px rgba(234, 88, 12, 0.65)'
          : '0 10px 35px rgba(234, 88, 12, 0.55), 0 0 25px rgba(245, 158, 11, 0.45)',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: isHovered ? 'scale(1.15) rotate(6deg)' : 'scale(1) rotate(0deg)',
        userSelect: 'none',
      }}
    >
      {isOpen ? (
        <X size={26} />
      ) : (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isHovered ? (
            <Laugh size={32} strokeWidth={2.4} style={{ transition: 'all 0.2s ease' }} />
          ) : (
            <Smile size={30} strokeWidth={2.4} style={{ transition: 'all 0.2s ease' }} />
          )}
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#22C55E',
              border: '2px solid #EA580C',
              boxShadow: '0 0 8px #22C55E',
            }}
          />
        </div>
      )}
    </button>
  );
};

