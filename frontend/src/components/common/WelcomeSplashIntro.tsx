import React, { useEffect, useState } from 'react';

interface WelcomeSplashIntroProps {
  onComplete?: () => void;
}

export const WelcomeSplashIntro: React.FC<WelcomeSplashIntroProps> = ({
  onComplete,
}) => {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const handleTrigger = () => {
      if (fadingOut) return;
      setFadingOut(true);
      setTimeout(() => {
        setVisible(false);
        if (onComplete) onComplete();
      }, 500);
    };

    // Listen to ANY keyboard key press
    const handleKeyDown = () => {
      handleTrigger();
    };

    // Listen to touch/pointer tap
    const handleTouchStart = () => {
      handleTrigger();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [fadingOut, onComplete]);

  const handleClick = () => {
    if (fadingOut) return;
    setFadingOut(true);
    setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 500);
  };

  if (!visible) return null;

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(3, 7, 18, 0.65)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        opacity: fadingOut ? 0 : 1,
        transform: fadingOut ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Centered Hero Content Box */}
      <div
        style={{
          textAlign: 'center',
          padding: '44px 36px',
          maxWidth: '820px',
          width: '90%',
          borderRadius: '32px',
          background: 'rgba(15, 23, 42, 0.78)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.95), 0 0 70px rgba(245, 158, 11, 0.3)',
          animation: 'm63WelcomeZoom 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Glowing Brand Emblem */}
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #EA580C 0%, #F59E0B 100%)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '3rem',
            marginBottom: '24px',
            boxShadow: '0 0 55px rgba(234, 88, 12, 0.85), 0 0 110px rgba(245, 158, 11, 0.45)',
            animation: 'm63PulseGlow 2s ease-in-out infinite alternate',
          }}
        >
          M
        </div>

        {/* Big Central Title */}
        <h1
          style={{
            fontSize: 'clamp(2.8rem, 7.5vw, 5.2rem)',
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: 0,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #FDE68A 40%, #EA580C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 35px rgba(245, 158, 11, 0.6))',
            lineHeight: 1.1,
          }}
        >
          WELCOME TO M63
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(0.95rem, 2.2vw, 1.25rem)',
            fontWeight: 600,
            color: '#CBD5E1',
            marginTop: '18px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Empowering Artisans & Digital Craftsmen
        </p>

        {/* Shimmer Line Divider */}
        <div
          style={{
            width: '160px',
            height: '4px',
            margin: '28px auto 0 auto',
            background: 'linear-gradient(90deg, transparent, #EA580C, #FDE68A, transparent)',
            borderRadius: '999px',
            boxShadow: '0 0 25px #EA580C',
          }}
        />

        {/* Key Press Call to Action */}
        <div
          style={{
            marginTop: '36px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 28px',
            borderRadius: '999px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#FDE68A',
            fontSize: '0.92rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            animation: 'm63BlinkCta 1.8s ease-in-out infinite',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)',
          }}
        >
          <span>⌨</span>
          <span>PRESS ANY KEY OR TOUCH TO ENTER →</span>
        </div>
      </div>

      <style>{`
        @keyframes m63WelcomeZoom {
          0% {
            opacity: 0;
            transform: scale(0.75) translateY(30px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes m63PulseGlow {
          0% {
            transform: scale(1);
            box-shadow: 0 0 40px rgba(234, 88, 12, 0.6), 0 0 80px rgba(245, 158, 11, 0.3);
          }
          100% {
            transform: scale(1.08);
            box-shadow: 0 0 65px rgba(234, 88, 12, 0.9), 0 0 130px rgba(245, 158, 11, 0.5);
          }
        }
        @keyframes m63BlinkCta {
          0%, 100% {
            opacity: 1;
            transform: translateY(0);
          }
          50% {
            opacity: 0.6;
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  );
};
