import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, ProductStatus } from '../types/product.js';
import { getProducts } from '../services/productService.js';
import { ProductCard } from '../components/product/ProductCard.js';
import { Button } from '../components/ui/Button.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import {
  Plus,
  Package,
  Search,
  AlertCircle,
  Filter,
} from 'lucide-react';

export const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | ProductStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on tab and search query
  const filteredProducts = products.filter((p) => {
    const matchesTab = activeTab === 'ALL' || p.status === activeTab;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.material && p.material.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const countByStatus = {
    ALL: products.length,
    DRAFT: products.filter((p) => p.status === 'DRAFT').length,
    PUBLISHED: products.filter((p) => p.status === 'PUBLISHED').length,
    ARCHIVED: products.filter((p) => p.status === 'ARCHIVED').length,
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--m63-slate)', letterSpacing: '-0.02em' }}>
            My Products
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--m63-slate-subtle)', marginTop: '4px' }}>
            Manage your craft catalogue, drafts, prices, and stock inventory.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus size={20} />}
          onClick={() => navigate('/artisan/products/new')}
        >
          Create Product
        </Button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="m63-alert m63-alert-error" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchProducts}>
            Retry
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
          <LoadingSpinner size={32} color="var(--m63-primary)" />
          <p style={{ fontSize: '0.9rem', color: 'var(--m63-slate-subtle)', fontWeight: 500 }}>
            Loading your M63 catalogue...
          </p>
        </div>
      ) : products.length === 0 ? (
        /* Empty State */
        <div
          className="m63-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--m63-bg-surface)',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              backgroundColor: 'var(--m63-primary-light)',
              color: 'var(--m63-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <Package size={36} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--m63-slate)' }}>
            Your catalogue starts here
          </h2>

          <p style={{ fontSize: '0.95rem', color: 'var(--m63-slate-subtle)', maxWidth: '440px', marginTop: '8px', lineHeight: 1.6, marginBottom: '28px' }}>
            Add your first handcrafted product and let M63 help you build your digital presence.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="primary"
              size="lg"
              icon={<Plus size={20} />}
              onClick={() => navigate('/artisan/products/new')}
            >
              Create Product
            </Button>
          </div>
        </div>
      ) : (
        /* Catalogue Controls & Products Grid */
        <>
          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              backgroundColor: 'var(--m63-bg-surface)',
              border: '1px solid var(--m63-border)',
              borderRadius: 'var(--m63-radius-lg)',
              padding: '12px 16px',
            }}
          >
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      border: 'none',
                      backgroundColor: isActive ? 'var(--m63-primary)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--m63-slate-subtle)',
                      padding: '6px 14px',
                      borderRadius: 'var(--m63-radius-md)',
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'var(--m63-transition)',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{tab === 'ALL' ? 'All Products' : tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--m63-bg-canvas)',
                        color: isActive ? '#FFFFFF' : 'var(--m63-slate)',
                      }}
                    >
                      {countByStatus[tab]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--m63-slate-subtle)',
                }}
              />
              <input
                type="text"
                className="m63-input"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="m63-card" style={{ padding: '36px', textAlign: 'center' }}>
              <Filter size={32} style={{ color: 'var(--m63-slate-subtle)', marginBottom: '8px' }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--m63-slate)' }}>
                No products found matching your filter.
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--m63-slate-subtle)', marginTop: '4px' }}>
                Try clearing your search query or changing status tabs.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => {
                    if (product.status === 'DRAFT') {
                      navigate(`/artisan/products/edit/${product.id}`);
                    } else {
                      navigate(`/artisan/products/${product.id}`);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
