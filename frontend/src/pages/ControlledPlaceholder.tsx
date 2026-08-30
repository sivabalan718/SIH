import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.js';
import { Package, ShoppingCart, BarChart3, ArrowLeft } from 'lucide-react';

interface ControlledPlaceholderProps {
  title: string;
  moduleName: string;
  description: string;
  iconName: 'products' | 'orders' | 'analytics';
  targetPhase: string;
}

export const ControlledPlaceholder: React.FC<ControlledPlaceholderProps> = ({
  title,
  moduleName,
  description,
  iconName,
  targetPhase,
}) => {
  const navigate = useNavigate();

  const renderIcon = () => {
    switch (iconName) {
      case 'products':
        return <Package size={44} style={{ color: 'var(--m63-primary)' }} />;
      case 'orders':
        return <ShoppingCart size={44} style={{ color: 'var(--m63-primary)' }} />;
      case 'analytics':
        return <BarChart3 size={44} style={{ color: 'var(--m63-primary)' }} />;
      default:
        return <Package size={44} style={{ color: 'var(--m63-primary)' }} />;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', textAlign: 'center', maxWidth: '560px', margin: '0 auto' }}>
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '20px',
          backgroundColor: 'var(--m63-primary-light)',
          border: '1px solid var(--m63-primary-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          boxShadow: 'var(--m63-shadow-md)',
        }}
      >
        {renderIcon()}
      </div>

      <span className="m63-badge m63-badge-primary" style={{ marginBottom: '12px' }}>
        M63 {targetPhase} Module
      </span>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--m63-slate)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
        {title}
      </h1>

      <p style={{ fontSize: '0.95rem', color: 'var(--m63-slate-subtle)', lineHeight: 1.6, marginBottom: '28px' }}>
        {description}
      </p>

      <div
        style={{
          backgroundColor: 'var(--m63-bg-surface)',
          border: '1px solid var(--m63-border)',
          borderRadius: 'var(--m63-radius-lg)',
          padding: '20px',
          width: '100%',
          marginBottom: '28px',
          textAlign: 'left',
        }}
      >
        <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          ABOUT THE {moduleName.toUpperCase()} ARCHITECTURE
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--m63-slate)', lineHeight: 1.5 }}>
          Phase 1 establishes your authenticated artisan session and M63 ID foundation. The {moduleName} engine will connect directly to this identity in {targetPhase}.
        </p>
      </div>

      <Button
        variant="secondary"
        icon={<ArrowLeft size={18} />}
        onClick={() => navigate('/artisan/dashboard')}
      >
        Return to Dashboard
      </Button>
    </div>
  );
};
