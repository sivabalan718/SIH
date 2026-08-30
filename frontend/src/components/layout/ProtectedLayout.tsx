import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { Navbar } from './Navbar.js';

export const ProtectedLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--m63-bg-canvas)' }}>
      {/* Desktop Sidebar (hidden on mobile via CSS media query or flex container) */}
      <div className="desktop-sidebar-container" style={{ display: 'flex' }}>
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      </div>

      {/* Main Workspace Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div className="mobile-navbar-container">
          <Navbar onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />
        </div>

        <main style={{ flex: 1, padding: '24px 20px 40px 20px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar-container {
            display: none !important;
          }
          .m63-sidebar.mobile-open {
            display: flex !important;
            position: fixed !important;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 100;
            box-shadow: var(--m63-shadow-lg);
          }
        }
        @media (min-width: 769px) {
          .mobile-navbar-container {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
