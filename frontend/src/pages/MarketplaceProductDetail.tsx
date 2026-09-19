import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Zap, MapPin, Sparkles, AlertCircle, Star, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { fetchMarketplaceProductById, MarketplaceProductItem } from '../services/marketplaceService.js';
import { addToBuyerCart } from '../services/cartService.js';
import { handleProductImageError } from '../utils/imageFallback.js';
import { getProductReviews, DeterministicReviewStats } from '../services/reviewService.js';

export const MarketplaceProductDetail: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<MarketplaceProductItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewStats, setReviewStats] = useState<DeterministicReviewStats | null>(null);

  const [activeLanguage, setActiveLanguage] = useState<'en' | 'ta' | 'hi'>(() => {
    const saved = localStorage.getItem('m63_marketplace_lang');
    if (saved === 'ta' || saved === 'hi' || saved === 'en') return saved;
    return 'en';
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'description' | 'highlights' | 'specifications' | 'craft' | 'care'>('description');
  const [addingToCart, setAddingToCart] = useState<boolean>(false);

  useEffect(() => {
    if (productId) {
      loadProduct(productId, activeLanguage);
      loadReviews(productId);
    }
  }, [productId, activeLanguage]);

  const loadReviews = async (id: string) => {
    try {
      const stats = await getProductReviews(id);
      setReviewStats(stats);
    } catch (e) {
      // ignore silent review loading failure
    }
  };

  const loadProduct = async (id: string, lang: 'en' | 'ta' | 'hi') => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMarketplaceProductById(id, lang);
      setProduct(data);
    } catch (err: any) {
      setError('Product not found or unavailable for viewing.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      setAddingToCart(true);
      await addToBuyerCart(product.id, quantity);
      navigate('/marketplace/cart');
    } catch (err: any) {
      alert(err.message || 'Failed to add product to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    navigate('/marketplace/checkout', {
      state: {
        buyNowItem: {
          product_id: product.id,
          quantity: quantity,
        },
      },
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--m63-bg-canvas)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #F59E0B', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: 600, color: 'var(--m63-slate)' }}>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
          <AlertCircle size={40} className="text-red-600" style={{ display: 'block', margin: '0 auto 12px auto' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#991B1B' }}>Product Unavailable</h2>
          <p style={{ color: '#7F1D1D', marginTop: '6px' }}>{error || 'This product is no longer published in the marketplace.'}</p>
          <Button variant="primary" style={{ marginTop: '16px' }} onClick={() => navigate('/marketplace')}>
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const maxStock = product.stock_quantity;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--m63-bg-canvas)', padding: '32px 20px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Back Link */}
        <button
          onClick={() => navigate('/marketplace')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: '#64748B',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            marginBottom: '24px',
          }}
        >
          <ArrowLeft size={18} />
          <span>Back to Marketplace</span>
        </button>

        {/* Top Product Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '36px', marginBottom: '40px' }}>
          {/* Image Container */}
          <div>
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '20px', border: '1px solid var(--m63-border)', overflow: 'hidden', height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {product.primary_image_url ? (
                <img
                  src={product.primary_image_url}
                  alt={product.name}
                  onError={(e) => handleProductImageError(e, product.category || product.craft_type)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                  <Sparkles size={48} style={{ display: 'block', margin: '0 auto 8px auto' }} />
                  <p>Handcrafted Artisan Item</p>
                </div>
              )}
            </div>
          </div>

          {/* Details & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {product.craft_type || product.category}
                </span>

                {/* Multilingual Selector */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['en', 'ta', 'hi'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setActiveLanguage(lang);
                        localStorage.setItem('m63_marketplace_lang', lang);
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: activeLanguage === lang ? 700 : 500,
                        border: activeLanguage === lang ? '1.5px solid #F59E0B' : '1px solid var(--m63-border)',
                        backgroundColor: activeLanguage === lang ? '#FEF3C7' : 'transparent',
                        color: activeLanguage === lang ? '#92400E' : 'var(--m63-slate)',
                        cursor: 'pointer',
                      }}
                    >
                      {lang === 'en' ? 'EN' : lang === 'ta' ? 'தமிழ்' : 'हिन्दी'}
                    </button>
                  ))}
                </div>
              </div>

              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--m63-slate)', margin: '0 0 10px 0', lineHeight: 1.2 }}>
                {product.name}
              </h1>

              {/* Artisan Profile Line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <MapPin size={16} className="text-amber-600 shrink-0" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  Crafted by <strong>{product.artisan_name}</strong> • {product.artisan_location}
                </span>
              </div>

              {/* Price & Stock Line */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#059669' }}>
                  ₹{product.price.toLocaleString('en-IN')}
                </span>

                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: '12px',
                    backgroundColor: product.is_in_stock ? '#D1FAE5' : '#FEE2E2',
                    color: product.is_in_stock ? '#065F46' : '#991B1B',
                  }}
                >
                  {product.is_in_stock ? `✓ In Stock (${maxStock} available)` : 'OUT OF STOCK'}
                </span>
              </div>

              <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
                {product.short_description}
              </p>
            </div>

            {/* Actions Area */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '16px', border: '1px solid var(--m63-border)' }}>
              {product.is_in_stock ? (
                <div>
                  {/* Quantity Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--m63-slate)' }}>Select Quantity</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--m63-border)', backgroundColor: '#F8FAFC', fontWeight: 800, cursor: quantity <= 1 ? 'not-allowed' : 'pointer' }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '1rem', fontWeight: 800, minWidth: '24px', textAlign: 'center' }}>{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                        disabled={quantity >= maxStock}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--m63-border)', backgroundColor: '#F8FAFC', fontWeight: 800, cursor: quantity >= maxStock ? 'not-allowed' : 'pointer' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {quantity >= maxStock && (
                    <p style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600, marginBottom: '12px' }}>
                      Only {maxStock} items available in stock.
                    </p>
                  )}

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      icon={<ShoppingCart size={18} />}
                      onClick={handleAddToCart}
                      loading={addingToCart}
                      style={{ flex: 1, minWidth: '140px' }}
                    >
                      Add to Cart
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      icon={<Zap size={18} />}
                      onClick={handleBuyNow}
                      style={{ flex: 1, minWidth: '140px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'none', color: '#FFFFFF', fontWeight: 800 }}
                    >
                      Buy Now
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px', color: '#991B1B', fontWeight: 700 }}>
                  This product is currently out of stock. Purchasing is disabled.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Saved Smart Catalogue Details Tabs */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--m63-border)', padding: '28px', marginBottom: '40px' }}>
          {/* Tab Buttons */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '24px', overflowX: 'auto' }}>
            <button
              onClick={() => setActiveTab('description')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'description' ? '#FEF3C7' : 'transparent', color: activeTab === 'description' ? '#92400E' : '#64748B', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Full Description
            </button>
            {product.highlights.length > 0 && (
              <button
                onClick={() => setActiveTab('highlights')}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'highlights' ? '#FEF3C7' : 'transparent', color: activeTab === 'highlights' ? '#92400E' : '#64748B', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Key Highlights
              </button>
            )}
            {Object.keys(product.specifications).length > 0 && (
              <button
                onClick={() => setActiveTab('specifications')}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'specifications' ? '#FEF3C7' : 'transparent', color: activeTab === 'specifications' ? '#92400E' : '#64748B', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Specifications
              </button>
            )}
            {product.craft_information && (
              <button
                onClick={() => setActiveTab('craft')}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'craft' ? '#FEF3C7' : 'transparent', color: activeTab === 'craft' ? '#92400E' : '#64748B', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Craft Technique
              </button>
            )}
            {product.care_instructions && (
              <button
                onClick={() => setActiveTab('care')}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'care' ? '#FEF3C7' : 'transparent', color: activeTab === 'care' ? '#92400E' : '#64748B', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Care Instructions
              </button>
            )}
          </div>

          {/* Tab Content Panels */}
          {activeTab === 'description' && (
            <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {product.full_description}
            </div>
          )}

          {activeTab === 'highlights' && (
            <ul style={{ paddingLeft: '20px', fontSize: '0.92rem', color: '#334155', lineHeight: 1.8 }}>
              {product.highlights.map((h, idx) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{h}</li>
              ))}
            </ul>
          )}

          {activeTab === 'specifications' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {Object.entries(product.specifications).map(([k, v]) => (
                <div key={k} style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block' }}>{k}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1E293B' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'craft' && (
            <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.7 }}>
              {product.craft_information}
            </div>
          )}

          {activeTab === 'care' && (
            <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.7 }}>
              {product.care_instructions}
            </div>
          )}
        </div>

        {/* Public Customer Ratings & Reviews Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--m63-border)', padding: '28px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--m63-slate)', margin: 0 }}>
              Customer Ratings & Reviews
            </h2>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '4px 10px', borderRadius: '12px' }}>
              ✓ VERIFIED PURCHASES ONLY
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '28px' }}>
            {/* Average Rating Block */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#D97706' }}>
                {reviewStats && reviewStats.average_rating > 0 ? reviewStats.average_rating.toFixed(1) : 'N/A'}
              </span>
              <div style={{ display: 'flex', gap: '4px', margin: '8px 0' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    fill={reviewStats && star <= Math.round(reviewStats.average_rating) ? '#F59E0B' : 'none'}
                    color={reviewStats && star <= Math.round(reviewStats.average_rating) ? '#F59E0B' : '#CBD5E1'}
                  />
                ))}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                {reviewStats ? `${reviewStats.total_reviews} verified rating${reviewStats.total_reviews === 1 ? '' : 's'}` : 'No feedback yet'}
              </span>
            </div>

            {/* Star Distribution Bars */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
              {[5, 4, 3, 2, 1].map((starCount) => {
                const count = reviewStats?.rating_distribution?.[starCount as 1 | 2 | 3 | 4 | 5] ?? 0;
                const total = reviewStats?.total_reviews ?? 0;
                const pct = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div key={starCount} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                    <span style={{ width: '40px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {starCount} <Star size={12} fill="#F59E0B" color="#F59E0B" />
                    </span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ width: '32px', textAlign: 'right', color: '#64748B', fontWeight: 600 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Public Reviews List */}
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
              Recent Customer Reviews
            </h3>

            {!reviewStats || reviewStats.recent_reviews.length === 0 ? (
              <p style={{ fontSize: '0.88rem', color: '#64748B', fontStyle: 'italic', margin: 0 }}>
                No customer feedback written yet for this product.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reviewStats.recent_reviews.map((rev) => (
                  <div key={rev.id} style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            fill={s <= rev.rating ? '#F59E0B' : 'none'}
                            color={s <= rev.rating ? '#F59E0B' : '#CBD5E1'}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {rev.review_text && (
                      <p style={{ fontSize: '0.88rem', color: '#1E293B', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                        "{rev.review_text}"
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#047857', fontWeight: 700 }}>
                      <CheckCircle size={14} />
                      <span>{rev.customer_name || 'Verified Customer'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
