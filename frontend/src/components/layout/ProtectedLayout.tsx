import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { PanelLeft, PanelLeftClose, ArrowLeft } from 'lucide-react';
import { Sidebar } from './Sidebar.js';

export const ProtectedLayout: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/artisan/dashboard');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--m63-bg-canvas)' }}>
      {/* Top Header Bar with Back Button & Open Sidebar Pill Button */}
      <header
        style={{
          height: '60px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
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
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: '50%',
              color: '#0F172A',
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
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>

        {/* Brand Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
            M63 Artisan Workspace
          </span>
        </div>
      </header>

      {/* Slide-out Sidebar Drawer */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Workspace Area */}
      <main style={{ padding: '24px 20px 40px 20px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <Outlet />
      </main>

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
