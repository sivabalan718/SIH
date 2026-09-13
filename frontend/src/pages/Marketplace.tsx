import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, ArrowUpDown, MapPin, Sparkles, AlertCircle, ShoppingCart, User, LogIn, Globe, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { fetchMarketplaceProducts, MarketplaceProductItem, MarketplaceFilterQuery } from '../services/marketplaceService.js';
import { addToBuyerCart, fetchBuyerCart } from '../services/cartService.js';
import { useAuth } from '../contexts/AuthContext.js';
import { SupportedLang, translations, translateProductName, translateCategoryName, translateProductDescription } from '../utils/marketplaceI18n.js';
import { handleProductImageError } from '../utils/imageFallback.js';

const CATEGORIES = ['All', 'Textiles', 'Pottery', 'Jewellery', 'Home Decor', 'Handicrafts', 'Apparel & Textiles', 'Wood Craft', 'Paintings', 'Other'];

export const Marketplace: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [products, setProducts] = useState<MarketplaceProductItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleExit = async () => {
    if (user?.role === 'ARTISAN') {
      navigate('/artisan/dashboard');
    } else {
      await logout();
      navigate('/login');
    }
  };

  // Preferred Language State
  const [selectedLang, setSelectedLang] = useState<SupportedLang>(() => {
    const saved = localStorage.getItem('m63_marketplace_lang');
    if (saved === 'ta' || saved === 'hi' || saved === 'en') return saved;
    if (user?.preferredLanguage === 'ta' || user?.preferredLanguage === 'hi') return user.preferredLanguage;
    return 'en';
  });

  const handleLanguageChange = (lang: SupportedLang) => {
    setSelectedLang(lang);
    localStorage.setItem('m63_marketplace_lang', lang);
  };

  const t = translations[selectedLang];

  // Filter States
  const [search, setSearch] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [sortOption, setSortOption] = useState<'recommended' | 'price_asc' | 'price_desc' | 'newest'>('recommended');
  const [cartCount, setCartCount] = useState<number>(0);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    loadCartCount();
  }, [activeCategory, sortOption]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const query: MarketplaceFilterQuery = {
        category: activeCategory,
        search: search.trim() || undefined,
        sort: sortOption,
      };
      const res = await fetchMarketplaceProducts(query);
      setProducts(res.products);
      setTotalCount(res.total);
    } catch (err: any) {
      setError(err.message || 'Unable to load marketplace products. Please check back shortly.');
    } finally {
      setLoading(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const cart = await fetchBuyerCart();
      const count = cart.items.reduce((acc, i) => acc + i.quantity, 0);
      setCartCount(count);
    } catch (e) {}
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    try {
      setAddingId(productId);
      await addToBuyerCart(productId, 1);
      await loadCartCount();
    } catch (err: any) {
      alert(err.message || 'Failed to add item to cart');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--m63-bg-canvas)', color: 'var(--m63-slate)' }}>
      {/* Marketplace Header / Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: '#FFFFFF',
          padding: '40px 24px 32px 24px',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Preferred Language & Exit Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '10px 18px', marginBottom: '24px', flexWrap: 'wrap', gap: '12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            {/* Exit to M63 Home Button */}
            <button
              type="button"
              onClick={handleExit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '20px',
                padding: '6px 14px',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Exit Marketplace and go to M63 Artisan Landing Page"
            >
              <ArrowLeft size={16} />
              <span>{t.exitToHome}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#F1F5F9' }}>
                <Globe size={16} style={{ color: '#F59E0B' }} />
                <span>Language / மொழி / भाषा:</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['en', 'ta', 'hi'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleLanguageChange(l)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: selectedLang === l ? '1.5px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: selectedLang === l ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
                      color: selectedLang === l ? '#78350F' : '#FFFFFF',
                      fontWeight: selectedLang === l ? 800 : 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: selectedLang === l ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none',
                    }}
                  >
                    {l === 'en' ? '🇬🇧 English' : l === 'ta' ? '🇮🇳 தமிழ்' : '🇮🇳 हिन्दी'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ backgroundColor: '#F59E0B', color: '#78350F', fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px' }}>
                  {t.badge}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>{t.platform}</span>
              </div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
                {t.title}
              </h1>
              <p style={{ fontSize: '0.95rem', color: '#CBD5E1', marginTop: '6px', maxWidth: '600px' }}>
                {t.subtitle}
              </p>
            </div>

            {/* Profile, Orders & Cart Quick Access */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {user ? (
                <Button
                  variant="secondary"
                  size="md"
                  icon={<User size={18} />}
                  onClick={() => navigate(user.role === 'CUSTOMER' ? '/marketplace/profile' : '/artisan/profile')}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.25)', fontWeight: 600 }}
                  title="View Profile"
                >
                  👤 {user.name ? user.name.split(' ')[0] : t.profile}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="md"
                  icon={<LogIn size={18} />}
                  onClick={() => navigate('/customer/login')}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.25)', fontWeight: 600 }}
                >
                  {t.signIn}
                </Button>
              )}
              <Button
                variant="secondary"
                size="md"
                icon={<ShoppingBag size={18} />}
                onClick={() => navigate('/marketplace/orders')}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                {t.myOrders}
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<ShoppingCart size={18} />}
                onClick={() => navigate('/marketplace/cart')}
                style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', border: 'none', color: '#FFFFFF', fontWeight: 700 }}
              >
                {t.cart} ({cartCount})
              </Button>
            </div>
          </div>

          {/* Search & Sort Controls Bar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '280px', display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
              <Button type="submit" variant="primary" size="md">
                {t.searchBtn}
              </Button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowUpDown size={16} style={{ color: '#94A3B8' }} />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="recommended">{t.sortRecommended}</option>
                <option value="price_asc">{t.sortPriceAsc}</option>
                <option value="price_desc">{t.sortPriceDesc}</option>
                <option value="newest">{t.sortNewest}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Category Pill Navigation */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '24px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '8px 18px',
                borderRadius: '20px',
                border: activeCategory === cat ? '1.5px solid #F59E0B' : '1px solid var(--m63-border)',
                backgroundColor: activeCategory === cat ? '#FEF3C7' : 'var(--m63-bg-surface)',
                color: activeCategory === cat ? '#92400E' : 'var(--m63-slate)',
                fontWeight: activeCategory === cat ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {translateCategoryName(cat, selectedLang)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--m63-slate-subtle)' }}>
            <div className="animate-spin" style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #F59E0B', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '12px' }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t.loadingProducts}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '20px', textAlign: 'center', color: '#991B1B', marginBottom: '24px' }}>
            <AlertCircle size={24} style={{ display: 'block', margin: '0 auto 8px auto' }} />
            <p style={{ fontWeight: 700, margin: 0 }}>{error}</p>
            <Button size="sm" variant="secondary" onClick={loadProducts} style={{ marginTop: '12px' }}>
              {t.retry}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && products.length === 0 && (
          <div style={{ backgroundColor: 'var(--m63-bg-surface)', border: '1px border var(--m63-border)', borderRadius: '16px', padding: '60px 24px', textAlign: 'center' }}>
            <ShoppingBag size={48} className="text-amber-500" style={{ display: 'block', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--m63-slate)' }}>{t.noProductsTitle}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--m63-slate-subtle)', marginTop: '4px', maxWidth: '400px', margin: '4px auto 16px auto' }}>
              {t.noProductsSub}
            </p>
            <Button variant="secondary" onClick={() => { setSearch(''); setActiveCategory('All'); }}>
              {t.resetFilters}
            </Button>
          </div>
        )}

        {/* Product Cards Grid */}
        {!loading && !error && products.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--m63-slate-subtle)', fontWeight: 600 }}>
                {t.showingProducts(products.length, totalCount)}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '24px' }}>
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => navigate(`/marketplace/product/${product.id}`)}
                  style={{
                    backgroundColor: 'var(--m63-bg-surface)',
                    borderRadius: '16px',
                    border: '1px solid var(--m63-border)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Product Image */}
                  <div style={{ height: '200px', backgroundColor: '#F1F5F9', position: 'relative', overflow: 'hidden' }}>
                    {product.primary_image_url ? (
                      <img
                        src={product.primary_image_url}
                        alt={product.name}
                        onError={(e) => handleProductImageError(e, product.category || product.craft_type)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                        <Sparkles size={32} />
                      </div>
                    )}

                    {/* Stock Status Badge */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          backgroundColor: product.is_in_stock ? '#D1FAE5' : '#FEE2E2',
                          color: product.is_in_stock ? '#065F46' : '#991B1B',
                        }}
                      >
                        {product.is_in_stock ? t.inStock(product.stock_quantity) : t.outOfStock}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
                          {translateCategoryName(product.craft_type || product.category, selectedLang)}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--m63-slate)', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                        {translateProductName(product.name, selectedLang)}
                      </h3>

                      <p style={{ fontSize: '0.82rem', color: 'var(--m63-slate-subtle)', margin: '0 0 14px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                        {translateProductDescription(product.short_description, selectedLang)}
                      </p>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748B', marginBottom: '12px' }}>
                        <MapPin size={14} className="text-amber-600 shrink-0" />
                        <span style={{ fontWeight: 600 }}>{t.byArtisanLabel(product.artisan_name, product.artisan_location)}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--m63-border)' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', fontWeight: 600 }}>{t.sellingPrice}</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669' }}>
                            ₹{product.price.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {product.is_in_stock && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<ShoppingCart size={14} />}
                              onClick={(e) => handleAddToCart(e, product.id)}
                              loading={addingId === product.id}
                              title={t.addToCart}
                            />
                          )}
                          <Button size="sm" variant="primary">
                            {t.viewDetails}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
