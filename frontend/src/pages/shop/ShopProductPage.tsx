import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, BadgeCheck, CreditCard, Heart, Minus, Package, Plus, Share2, Sparkles, Star, Store, Truck } from 'lucide-react';
import { fetchMarketplaceProductById, fetchMarketplaceProducts, MarketplaceProductItem } from '../../services/marketplaceService.js';
import { addToBuyerCart } from '../../services/cartService.js';
import { checkReviewEligibility, DeterministicReviewStats, getProductReviews, ReviewEligibilityResult } from '../../services/reviewService.js';
import { ReviewModal } from '../../components/reviews/ReviewModal.js';
import { PriceTag, ProductRail, StockLabel } from '../../components/shop/ShopProductCard.js';
import { rankSimilar, useCatalogIndex } from '../../components/shop/useCatalogIndex.js';
import { handleProductImageError } from '../../utils/imageFallback.js';
import { translateProductDescription, translateProductName } from '../../utils/marketplaceI18n.js';
import {
  getShopLang,
  getWishlist,
  notifyCartUpdated,
  recordRecentlyViewed,
  showToast,
  toggleWishlist,
  useShopStore,
} from '../../utils/shopStore.js';

const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
  <span style={{ display: 'inline-flex', gap: 1 }} aria-hidden>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} size={size} color="#d97706" fill={i <= Math.round(value) ? '#d97706' : 'none'} />
    ))}
  </span>
);

export const ShopProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const lang = useShopStore(getShopLang);
  const wishlist = useShopStore(getWishlist);
  const { products: index } = useCatalogIndex(lang);

  const [product, setProduct] = useState<MarketplaceProductItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'details' | 'reviews'>('details');
  const [reviews, setReviews] = useState<DeterministicReviewStats | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibilityResult | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [busy, setBusy] = useState<'cart' | null>(null);
  const [fromArtisan, setFromArtisan] = useState<MarketplaceProductItem[]>([]);

  const loadReviews = (id: string) => {
    getProductReviews(id).then(setReviews).catch(() => setReviews(null));
    checkReviewEligibility(id).then(setEligibility).catch(() => setEligibility(null));
  };

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQty(1);
    setTab('details');
    fetchMarketplaceProductById(productId, lang)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        recordRecentlyViewed(p.id);
        fetchMarketplaceProducts({ artisan_id: p.artisan_id, limit: 12, lang })
          .then((res) => !cancelled && setFromArtisan(res.products.filter((x) => x.id !== p.id)))
          .catch(() => setFromArtisan([]));
      })
      .catch(() => !cancelled && setError('This product is unavailable or no longer listed.'))
      .finally(() => !cancelled && setLoading(false));
    loadReviews(productId);
    return () => {
      cancelled = true;
    };
  }, [productId, lang]);

  // Similar items exclude ones already shown under "More from this artisan".
  const similar = useMemo(() => {
    if (!product) return [];
    const shown = new Set(fromArtisan.map((p) => p.id));
    return rankSimilar([product], index.filter((p) => !shown.has(p.id)), 10);
  }, [product, index, fromArtisan]);

  if (loading) {
    return (
      <div aria-busy="true">
        <div className="pdp__media skel" style={{ borderRadius: 0 }} />
        <div className="pdp__card">
          <div className="skel" style={{ height: 12, width: '40%' }} />
          <div className="skel" style={{ height: 22, width: '85%', marginTop: 10 }} />
          <div className="skel" style={{ height: 28, width: '35%', marginTop: 14 }} />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="shop-empty">
        <AlertCircle size={32} color="#b91c1c" style={{ margin: '0 auto 8px' }} />
        <h3>Product unavailable</h3>
        <p>{error}</p>
        <button className="shop-btn shop-btn--dark" style={{ marginTop: 12 }} onClick={() => navigate('/marketplace/discover')}>
          Browse products
        </button>
      </div>
    );
  }

  const saved = wishlist.includes(product.id);
  const out = product.stock_quantity <= 0;
  const maxQty = Math.max(1, product.stock_quantity);
  const reviewCount = reviews?.total_reviews || 0;
  const specs = Object.entries(product.specifications || {}).filter(([, v]) => v && String(v).trim());

  const addToCart = async (goToCart: boolean) => {
    setBusy('cart');
    try {
      const cart = await addToBuyerCart(product.id, qty);
      notifyCartUpdated(cart.items.reduce((n, i) => n + i.quantity, 0));
      if (goToCart) navigate('/marketplace/cart');
      else showToast(`Added ${qty} to cart`);
    } catch (err: any) {
      showToast(err?.message || 'Could not add to cart');
    } finally {
      setBusy(null);
    }
  };

  const buyNow = () => navigate('/marketplace/checkout', { state: { buyNowItem: { product_id: product.id, quantity: qty } } });

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied');
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <div>
      <div className="pdp__media">
        <img src={product.primary_image_url || ''} alt={product.name} onError={(e) => handleProductImageError(e, product.category)} />
        <div className="pdp__media-actions">
          <button
            className="pdp__round"
            aria-pressed={saved}
            aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
            onClick={() => showToast(toggleWishlist(product.id) ? 'Saved to wishlist' : 'Removed from wishlist')}
          >
            <Heart size={19} fill={saved ? '#dc2626' : 'none'} />
          </button>
          <button className="pdp__round" aria-label="Share product" onClick={share}>
            <Share2 size={18} />
          </button>
        </div>
      </div>

      <section className="pdp__card">
        <button className="pdp__artisan" onClick={() => navigate(`/marketplace/discover?artisan=${product.artisan_id}&artisanName=${encodeURIComponent(product.artisan_name)}`)}>
          Visit {product.artisan_name}’s store
        </button>
        <h1 className="pdp__title">{translateProductName(product.name, lang)}</h1>
        {reviewCount > 0 ? (
          <button className="stars" onClick={() => setTab('reviews')} aria-label={`Rated ${reviews!.average_rating.toFixed(1)} from ${reviewCount} reviews`}>
            <b>{reviews!.average_rating.toFixed(1)}</b>
            <Stars value={reviews!.average_rating} />
            <span>({reviewCount} review{reviewCount === 1 ? '' : 's'})</span>
          </button>
        ) : (
          <span className="stars">No reviews yet</span>
        )}

        <div style={{ marginTop: 10 }}>
          <PriceTag price={product.price} mrp={product.mrp} size="lg" />
          <small className="pcard__meta">Inclusive of all taxes</small>
        </div>

        <div className="pdp__facts">
          <div className="pdp__fact">
            <Truck size={17} />
            <span>
              <b className="tone-ok">FREE delivery</b> on this item
            </span>
          </div>
          <div className="pdp__fact">
            <CreditCard size={17} />
            <span>Pay online (UPI, cards, net banking) or Cash on Delivery</span>
          </div>
          <div className="pdp__fact">
            <Package size={17} />
            <span>
              <StockLabel stock={product.stock_quantity} />
              {!out && product.stock_quantity > 5 && <> · {product.stock_quantity} available</>}
            </span>
          </div>
          <div className="pdp__fact">
            <Store size={17} />
            <span>
              Sold and shipped by <b>{product.artisan_name}</b>
              {product.artisan_location ? ` from ${product.artisan_location}` : ''}. Delivery charges and timing are shown at checkout.
            </span>
          </div>
        </div>

        {!out && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--shop-ink-2)' }}>Quantity</span>
            <div className="pdp__qty">
              <button aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                <Minus size={16} />
              </button>
              <span aria-live="polite">{qty}</span>
              <button aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}>
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        {product.highlights?.length > 0 && (
          <div className="pdp__highlights">
            {product.highlights.slice(0, 6).map((h) => (
              <span key={h} className="pdp__hl">{h}</span>
            ))}
          </div>
        )}

        <button
          className="shop-btn shop-btn--ghost"
          style={{ width: '100%', marginTop: 16 }}
          onClick={() => navigate(`/marketplace/ai?product=${product.id}`)}
        >
          <Sparkles size={16} color="#C85A28" /> Ask M63 AI about this product
        </button>
      </section>

      <div className="pdp__tabs" role="tablist">
        <button className="pdp__tab" role="tab" aria-selected={tab === 'details'} onClick={() => setTab('details')}>
          Details
        </button>
        <button className="pdp__tab" role="tab" aria-selected={tab === 'reviews'} onClick={() => setTab('reviews')}>
          Reviews{reviewCount ? ` (${reviewCount})` : ''}
        </button>
      </div>

      {tab === 'details' ? (
        <div role="tabpanel">
          <section className="pdp__card">
            <h2 className="pdp__h">About this item</h2>
            <p className="pdp__text">{translateProductDescription(product.full_description || product.short_description, lang)}</p>
          </section>
          {specs.length > 0 && (
            <section className="pdp__card">
              <h2 className="pdp__h">Product details</h2>
              <table className="spec">
                <tbody>
                  {specs.map(([k, v]) => (
                    <tr key={k}>
                      <th scope="row">{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {product.care_instructions && (
            <section className="pdp__card">
              <h2 className="pdp__h">Care</h2>
              <p className="pdp__text">{product.care_instructions}</p>
            </section>
          )}
          <section className="pdp__card">
            <h2 className="pdp__h">Meet the artisan</h2>
            <div className="artisan-card">
              <span className="artisan-card__avatar">{product.artisan_name.charAt(0).toUpperCase()}</span>
              <div>
                <strong>{product.artisan_name}</strong>
                <p className="pcard__meta" style={{ whiteSpace: 'normal' }}>
                  {[product.craft_type, product.artisan_location].filter(Boolean).join(' · ') || 'Independent M63 artisan'}
                </p>
                {(() => {
                  const count = Math.max(index.filter((p) => p.artisan_id === product.artisan_id).length, fromArtisan.length + 1);
                  return <p className="pcard__meta">{count} product{count === 1 ? '' : 's'} on M63</p>;
                })()}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div role="tabpanel">
          <section className="pdp__card">
            {reviewCount > 0 && reviews ? (
              <>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{reviews.average_rating.toFixed(1)}</div>
                    <Stars value={reviews.average_rating} size={12} />
                    <div className="pcard__meta">{reviewCount} verified</div>
                  </div>
                  <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                    {([5, 4, 3, 2, 1] as const).map((s) => {
                      const n = reviews.rating_distribution[s] || 0;
                      return (
                        <div key={s} className="rv-bar">
                          <span>{s} ★</span>
                          <span className="rv-bar__track">
                            <span className="rv-bar__fill" style={{ display: 'block', width: `${(n / reviewCount) * 100}%` }} />
                          </span>
                          <span>{n}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {reviews.recent_reviews.map((r) => (
                  <article key={r.id} className="rv">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Stars value={r.rating} size={12} />
                      <span className="rv__verified">
                        <BadgeCheck size={12} style={{ verticalAlign: '-2px' }} /> Verified purchase
                      </span>
                    </div>
                    {r.review_text && <p className="pdp__text" style={{ marginTop: 6 }}>{r.review_text}</p>}
                    <p className="pcard__meta" style={{ marginTop: 4 }}>
                      {r.customer_name} · {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </article>
                ))}
              </>
            ) : (
              <p className="pdp__text">No reviews yet. Reviews appear here only from customers who bought and received this product.</p>
            )}
            {eligibility?.can_review && eligibility.order_item_id && (
              <button className="shop-btn shop-btn--dark" style={{ width: '100%', marginTop: 14 }} onClick={() => setShowReview(true)}>
                Write a review
              </button>
            )}
          </section>
        </div>
      )}

      <ProductRail title={`More from ${product.artisan_name}`} products={fromArtisan} lang={lang} />
      <ProductRail title="Similar handmade products" subtitle="Matched on category, craft and material" products={similar} lang={lang} />

      <div className="pdp__buybar">
        <div className="pdp__buybar-inner">
          <button className="shop-btn shop-btn--ghost" onClick={() => addToCart(false)} disabled={out || busy !== null}>
            {busy === 'cart' ? 'Adding…' : 'Add to cart'}
          </button>
          <button className="shop-btn shop-btn--primary" onClick={buyNow} disabled={out}>
            {out ? 'Out of stock' : 'Buy now'}
          </button>
        </div>
      </div>

      {showReview && eligibility?.order_item_id && eligibility.order_id && (
        <ReviewModal
          isOpen={showReview}
          onClose={() => setShowReview(false)}
          onSuccess={() => loadReviews(product.id)}
          orderItemId={eligibility.order_item_id}
          orderId={eligibility.order_id}
          productName={product.name}
          primaryImageUrl={product.primary_image_url}
        />
      )}
    </div>
  );
};
