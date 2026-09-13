import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';

interface ProtectedRouteProps {
  requiredRole?: 'ARTISAN' | 'CUSTOMER';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole = 'ARTISAN' }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', backgroundColor: 'var(--m63-bg-canvas)' }}>
        <LoadingSpinner size={36} color="var(--m63-primary)" />
        <p style={{ fontSize: '0.9rem', color: 'var(--m63-slate-subtle)', fontWeight: 500 }}>
          Securing M63 Workspace...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={requiredRole === 'CUSTOMER' ? '/customer/login' : '/login'} replace />;
  }

  if (requiredRole === 'ARTISAN' && user.role === 'CUSTOMER') {
    return <Navigate to="/marketplace" replace />;
  }

  if (requiredRole === 'CUSTOMER' && user.role === 'ARTISAN') {
    return <Navigate to="/artisan/dashboard" replace />;
  }

  return <Outlet />;
};
