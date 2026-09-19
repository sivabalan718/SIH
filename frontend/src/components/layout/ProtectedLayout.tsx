import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { PanelLeft, PanelLeftClose, ArrowLeft } from 'lucide-react';
import { Sidebar } from './Sidebar.js';
import { M63Assistant } from '../assistant/M63Assistant.js';

export const ProtectedLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAnalytics = location.pathname.includes('/analytics');
  const isDashboard = location.pathname.includes('/dashboard');
  const isProfile = location.pathname.includes('/profile');
  const isProducts = location.pathname.includes('/products');
  const isDarkPage = isAnalytics || isDashboard || isProfile || isProducts;

  const pageBg = isAnalytics ? '#130B17' : (isDashboard || isProfile || isProducts) ? '#0C1211' : 'var(--m63-bg-canvas)';
  const headerBg = isAnalytics ? '#1C1022' : (isDashboard || isProfile || isProducts) ? '#111A18' : '#FFFFFF';
  const headerBorder = isAnalytics ? '1px solid #3A2346' : (isDashboard || isProfile || isProducts) ? '1px solid #1F2E2B' : '1px solid #E2E8F0';
  const pillBtnBg = isAnalytics ? '#E86024' : (isDashboard || isProfile || isProducts) ? '#5FB8B0' : '#0F172A';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/artisan/dashboard');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: pageBg,
        transition: 'background-color 0.2s ease',
      }}
    >
      {/* Top Header Bar with Back Button & Open Sidebar Pill Button */}
      <header
        style={{
          height: '60px',
          backgroundColor: headerBg,
          borderBottom: headerBorder,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Back Arrow Button */}
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go to previous page"
            title="Go back to previous page"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              backgroundColor: isDarkPage ? (isAnalytics ? '#25162E' : '#1A2724') : '#F1F5F9',
              border: isDarkPage ? (isAnalytics ? '1px solid #3A2346' : '1px solid #2D423F') : '1px solid #CBD5E1',
              borderRadius: '50%',
              color: isDarkPage ? '#F3EFE7' : '#0F172A',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <ArrowLeft size={20} />
          </button>

          {/* Pill Toggle Button for Sidebar */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              backgroundColor: pillBtnBg,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: isDarkPage ? '0 2px 10px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>

        {/* Brand Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: isDarkPage ? '#9CA6A2' : '#64748B', fontWeight: 600 }}>
            M63 Artisan Workspace
          </span>
        </div>
      </header>

      {/* Slide-out Sidebar Drawer */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Workspace Area */}
      <main
        style={{
          padding: isDarkPage ? '0' : '24px 20px 40px 20px',
          maxWidth: isDarkPage ? '100%' : '1200px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        <Outlet />
      </main>

      {/* Persistent Global M63 AI Assistant */}
      <M63Assistant />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};


