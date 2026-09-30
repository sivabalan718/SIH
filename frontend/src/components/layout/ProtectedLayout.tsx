import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { PanelLeft, PanelLeftClose, ArrowLeft, Bell } from 'lucide-react';
import { useUnreadNotifications } from '../../pages/NotificationsPage.js';
import { Sidebar } from './Sidebar.js';
import { M63Assistant } from '../assistant/M63Assistant.js';

export const ProtectedLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const unread = useUnreadNotifications(true, location.pathname);

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
        className="m63-workspace-header"
        style={{
          // Starts below the phone's status bar (safe area), then a comfortable 64px bar
          minHeight: 'calc(64px + var(--sat))',
          paddingTop: 'var(--sat)',
          backgroundColor: headerBg,
          borderBottom: headerBorder,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '16px',
          paddingRight: '20px',
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
              width: '44px',
              height: '44px',
              backgroundColor: isDarkPage ? (isAnalytics ? '#25162E' : '#1A2724') : '#F1F5F9',
              border: isDarkPage ? (isAnalytics ? '1px solid #3A2346' : '1px solid #2D423F') : '1px solid #CBD5E1',
              borderRadius: '50%',
              color: isDarkPage ? '#F3EFE7' : '#0F172A',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <ArrowLeft size={22} />
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
              width: '44px',
              height: '44px',
              backgroundColor: pillBtnBg,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: isDarkPage ? '0 2px 10px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
          </button>
        </div>

        {/* Brand Label + notifications */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/artisan/notifications')}
            aria-label={`Notifications, ${unread} unread`}
            style={{
              position: 'relative',
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDarkPage ? (isAnalytics ? '#25162E' : '#1A2724') : '#F1F5F9',
              border: isDarkPage ? (isAnalytics ? '1px solid #3A2346' : '1px solid #2D423F') : '1px solid #CBD5E1',
              color: isDarkPage ? '#F3EFE7' : '#0F172A',
              cursor: 'pointer',
            }}
          >
            <Bell size={20} />
            {unread > 0 && (
              <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
          <span className="m63-workspace-header-label" style={{ fontSize: '0.85rem', color: isDarkPage ? '#9CA6A2' : '#64748B', fontWeight: 600 }}>
            M63 Artisan Workspace
          </span>
        </div>
      </header>

      {/* Slide-out Sidebar Drawer */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Workspace Area */}
      <main
        className="m63-workspace-main"
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
        @media (max-width: 640px) {
          .m63-workspace-main[style*="24px 20px"] { padding: 16px 12px 88px 12px !important; }
          .m63-workspace-header-label { font-size: 0.78rem !important; }
        }
      `}</style>
    </div>
  );
};


