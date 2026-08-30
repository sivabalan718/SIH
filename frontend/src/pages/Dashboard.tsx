import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { Product, ProductStats } from '../types/product.js';
import { getProductStats, getProducts } from '../services/productService.js';
import { CopyableM63Id } from '../components/common/CopyableM63Id.js';
import { ProductCard } from '../components/product/ProductCard.js';
import { Button } from '../components/ui/Button.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Clock,
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<ProductStats | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoadingData(true);
        const [statsData, productsData] = await Promise.all([
          getProductStats(),
          getProducts(),
        ]);
        setStats(statsData);
        setRecentProducts(productsData.slice(0, 3));
      } catch (err) {
        // Silently handle if network fails on first load
      } finally {
        setLoadingData(false);
      }
    }

    loadDashboardData();
  }, []);

  const totalProducts = stats?.total ?? 0;
  const publishedProducts = stats?.published ?? 0;
  const draftProducts = stats?.draft ?? 0;

  // Calculate onboarding progress step count dynamically
  let stepsCompletedCount = 1; // Step 1: Account created (always true)
  if (totalProducts > 0) stepsCompletedCount = 2;
  if (publishedProducts > 0) stepsCompletedCount = 3;

  const onboardingSteps = [
    { title: 'Account created', completed: true, desc: 'Registered and M63 ID assigned' },
    { title: 'Create your first product', completed: totalProducts > 0, desc: 'Add photos, price, and craft story' },
    { title: 'Publish your catalogue', completed: publishedProducts > 0, desc: 'Make your products visible to buyers' },
    { title: 'Receive your first order', completed: false, desc: 'Manage incoming orders seamlessly' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Welcome Banner */}
      <div className="m63-banner" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--m63-slate)', letterSpacing: '-0.02em' }}>
              Welcome to M63, {user?.name || 'Artisan'} 👋
            </h1>
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--m63-slate-subtle)', marginTop: '4px' }}>
            Your digital workspace for managing and growing your craft business.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--m63-slate-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            YOUR PUBLIC M63 ID
          </span>
          <CopyableM63Id m63Id={user?.m63Id || 'M63-MOMAOV'} size="normal" />
        </div>
      </div>

      {/* Prominent Primary Actions */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Button
          variant="primary"
          size="lg"
          icon={<Plus size={22} />}
          onClick={() => navigate('/artisan/products/new')}
        >
          Create Product
        </Button>

        <Button
          variant="secondary"
          size="lg"
          icon={<Package size={20} style={{ color: 'var(--m63-primary)' }} />}
          onClick={() => navigate('/artisan/products')}
        >
          View Products
        </Button>
      </div>

      {/* Onboarding Progress Component */}
      <div className="m63-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
              Get started with M63
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--m63-slate-subtle)' }}>
              Follow these simple steps to build your online artisan store.
            </p>
          </div>
          <span className="m63-badge m63-badge-primary">
            Step {stepsCompletedCount} of 4 Complete
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {onboardingSteps.map((step, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: step.completed ? 'var(--m63-success-bg)' : 'var(--m63-bg-canvas)',
                border: `1px solid ${step.completed ? 'var(--m63-success-border)' : 'var(--m63-border)'}`,
                borderRadius: 'var(--m63-radius-md)',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              {step.completed ? (
                <CheckCircle2 size={22} style={{ color: 'var(--m63-success)', flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <Circle size={22} style={{ color: 'var(--m63-border-hover)', flexShrink: 0, marginTop: '2px' }} />
              )}
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: step.completed ? 'var(--m63-success)' : 'var(--m63-slate)' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--m63-slate-subtle)', marginTop: '2px' }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real Workspace Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Products Card (Real Data) */}
        <div
          className="m63-card"
          onClick={() => navigate('/artisan/products')}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--m63-slate-subtle)' }}>
              Products
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--m63-primary-light)', color: 'var(--m63-primary)' }}>
              <Package size={20} />
            </div>
          </div>
          {loadingData ? (
            <LoadingSpinner size={24} color="var(--m63-primary)" />
          ) : (
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--m63-slate)', lineHeight: 1 }}>
              {totalProducts}
            </p>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)', marginTop: '8px' }}>
            {totalProducts === 0
              ? 'Start building your catalogue'
              : `${publishedProducts} published • ${draftProducts} drafts`}
          </p>
        </div>

        {/* Orders Card */}
        <div className="m63-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--m63-slate-subtle)' }}>
              Orders
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--m63-bg-muted)', color: 'var(--m63-slate)' }}>
              <ShoppingCart size={20} />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--m63-slate)', lineHeight: 1 }}>0</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)', marginTop: '8px' }}>
            Orders will appear here
          </p>
        </div>

        {/* Sales Card */}
        <div className="m63-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--m63-slate-subtle)' }}>
              Total Sales
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--m63-bg-muted)', color: 'var(--m63-slate)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--m63-slate)', lineHeight: 1 }}>₹0</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)', marginTop: '8px' }}>
            Your sales activity will appear here
          </p>
        </div>

        {/* Pending Tasks Card */}
        <div className="m63-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--m63-slate-subtle)' }}>
              Draft Products
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--m63-bg-muted)', color: 'var(--m63-slate)' }}>
              <Clock size={20} />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--m63-slate)', lineHeight: 1 }}>
            {draftProducts}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)', marginTop: '8px' }}>
            Drafts awaiting publish
          </p>
        </div>
      </div>

      {/* Recent Products Section */}
      <div className="m63-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
              Recent Products
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--m63-slate-subtle)' }}>
              Your latest handcrafted catalogue items.
            </p>
          </div>

          {recentProducts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/artisan/products')}
              style={{ fontWeight: 700 }}
            >
              View All ({totalProducts}) →
            </Button>
          )}
        </div>

        {loadingData ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <LoadingSpinner size={24} color="var(--m63-primary)" />
          </div>
        ) : recentProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 16px', backgroundColor: 'var(--m63-bg-canvas)', borderRadius: 'var(--m63-radius-md)', border: '1px dashed var(--m63-border)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--m63-slate)', fontWeight: 600 }}>No products created yet</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)', marginTop: '2px', marginBottom: '16px' }}>
              Create your first product to start building your catalogue.
            </p>
            <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={() => navigate('/artisan/products/new')}>
              Create Product
            </Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {recentProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onClick={() => navigate(`/artisan/products/${prod.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Entry Banner for M63 Assistant */}
      <div
        className="m63-card"
        style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: '#FFFFFF',
          padding: '28px',
          borderRadius: 'var(--m63-radius-xl)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        <div style={{ maxWidth: '520px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(200, 90, 40, 0.25)', border: '1px solid rgba(200, 90, 40, 0.5)', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, color: '#FFB899', marginBottom: '12px' }}>
            <Sparkles size={14} /> M63 SMART AI WORKSPACE
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
            Ready to list your artisan craft product?
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '6px', lineHeight: 1.5 }}>
            Use multilingual voice recording, automated AI extraction, smart photo enhancement, and smart catalogue generation in one unified workspace.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          icon={<ArrowRight size={18} />}
          onClick={() => navigate('/artisan/products/new')}
        >
          ✨ Create Product Listing
        </Button>
      </div>
    </div>
  );
};
