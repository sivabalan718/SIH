import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Minus, Plus, Share2, ShieldCheck, Trash2, Truck } from 'lucide-react';
import { CartSummary, fetchBuyerCart, removeBuyerCartItem, updateBuyerCartItem, addToBuyerCart } from '../../services/cartService.js';
import { handleProductImageError } from '../../utils/imageFallback.js';
import { formatINR, getShopLang, notifyCartUpdated, showToast, useShopStore } from '../../utils/shopStore.js';
import { useCatalogIndex } from '../../components/shop/useCatalogIndex.js';
import { ProductRail, StockLabel } from '../../components/shop/ShopProductCard.js';

const SAVED_KEY = 'm63_saved_for_later';
const readSaved = (): Array<{ product_id: string; quantity: number }> => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
  } catch {
    return [];
  }
};
const writeSaved = (v: Array<{ product_id: string; quantity: number }>) => {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
};

export const ShopCart: React.FC = () => {
  const navigate = useNavigate();
  const lang = useShopStore(getShopLang);
  const { products: index } = useCatalogIndex(lang);
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(readSaved);

  const apply = (c: CartSummary) => {
    setCart(c);
    notifyCartUpdated(c.items.reduce((n, i) => n + i.quantity, 0));
  };

  const load = () => {
    setLoading(true);
    setError(null);
    fetchBuyerCart(lang)
      .then(apply)
      .catch((e) => setError(e?.message || 'Could not load your cart.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [lang]);

  const act = async (productId: string, fn: () => Promise<CartSummary | void>) => {
    setBusy(productId);
    try {
      const res = await fn();
      if (res) apply(res);
    } catch (e: any) {
      showToast(e?.message || 'Could not update your cart.');
    } finally {
      setBusy(null);
    }
  };

  const saveForLater = (productId: string, quantity: number) =>
    act(productId, async () => {
      const res = await removeBuyerCartItem(productId);
      const next = [{ product_id: productId, quantity }, ...readSaved().filter((s) => s.product_id !== productId)];
      writeSaved(next);
      setSaved(next);
      showToast('Saved for later');
      return res;
    });

  const moveToCart = (productId: string, quantity: number) =>
    act(productId, async () => {
      const res = await addToBuyerCart(productId, quantity);
      const next = readSaved().filter((s) => s.product_id !== productId);
      writeSaved(next);
      setSaved(next);
      return res;
    });

  const share = async (productId: string, name: string) => {
    const url = `${window.location.origin}/marketplace/product/${productId}`;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied');
      }
    } catch {
      // cancelled
    }
  };

  const count = cart?.items.reduce((n, i) => n + i.quantity, 0) || 0;
  const savedProducts = saved.map((s) => index.find((p) => p.id === s.product_id)).filter(Boolean) as typeof index;

  if (loading && !cart) {
    return (
      <div className="cart-head" aria-busy="true">
        <div className="skel" style={{ height: 24, width: '50%' }} />
        <div className="skel" style={{ height: 46, marginTop: 14, borderRadius: 23 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="shop-empty">
        <h3>Couldn’t load your cart</h3>
        <p>{error}</p>
        <button className="shop-btn shop-btn--dark" style={{ marginTop: 12 }} onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="shop-narrow">
      {cart && cart.items.length > 0 ? (
        <>
          <section className="cart-head">
            <h1>Shopping Cart</h1>
            <div style={{ fontSize: '1.1rem', margin: '6px 0 12px' }}>
              Subtotal <strong>{formatINR(cart.subtotal)}</strong>
            </div>
            <div className="sum-row" style={{ color: '#047857', fontSize: '0.86rem' }}>
              <span>
                <Truck size={15} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                FREE delivery on every M63 order
              </span>
            </div>
            <button
              className="shop-btn shop-btn--pay"
              style={{ width: '100%', marginTop: 12 }}
              disabled={cart.has_stock_warning || count === 0}
              onClick={() => {
                // A cart checkout must never pick up a stale "Buy now" item
                try {
                  sessionStorage.removeItem('m63_buy_now');
                } catch {
                  // ignore
                }
                navigate('/marketplace/checkout');
              }}
            >
              Proceed to Buy ({count} item{count === 1 ? '' : 's'})
            </button>
            {cart.warnings.length > 0 && (
              <div className="notice notice--warn" style={{ margin: '12px 0 0' }}>
                <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
                <span>{cart.warnings.join(' ')} Please review the items below.</span>
              </div>
            )}
          </section>

          {cart.items.map((item) => (
            <article key={item.product_id} className="citem" aria-busy={busy === item.product_id}>
              <button className="citem__img" onClick={() => navigate(`/marketplace/product/${item.product_id}`)} aria-label={`Open ${item.product_name}`}>
                <img src={item.primary_image_url || ''} alt="" loading="lazy" onError={(e) => handleProductImageError(e)} />
              </button>
              <div style={{ minWidth: 0 }}>
                <button className="citem__name" style={{ textAlign: 'left' }} onClick={() => navigate(`/marketplace/product/${item.product_id}`)}>
                  {item.product_name}
                </button>
                <p className="pcard__meta">by {item.artisan_name}</p>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, margin: '4px 0' }}>{formatINR(item.unit_price)}</div>
                <StockLabel stock={item.stock_quantity} />
                {item.stock_warning && <p className="tone-warn" style={{ fontSize: '0.78rem' }}>{item.stock_warning}</p>}
                <p className="pcard__meta" style={{ marginTop: 2 }}>
                  <ShieldCheck size={12} style={{ verticalAlign: '-2px' }} /> Handmade · sold by the artisan
                </p>
              </div>
              <div className="citem__actions">
                <div className="qty-pill">
                  {item.quantity <= 1 ? (
                    <button aria-label="Remove item" disabled={busy !== null} onClick={() => act(item.product_id, () => removeBuyerCartItem(item.product_id))}>
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <button aria-label="Decrease quantity" disabled={busy !== null} onClick={() => act(item.product_id, () => updateBuyerCartItem(item.product_id, item.quantity - 1))}>
                      <Minus size={16} />
                    </button>
                  )}
                  <span aria-live="polite">{item.quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    disabled={busy !== null || item.quantity >= item.stock_quantity}
                    onClick={() => act(item.product_id, () => updateBuyerCartItem(item.product_id, item.quantity + 1))}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button className="pill-btn" disabled={busy !== null} onClick={() => act(item.product_id, () => removeBuyerCartItem(item.product_id))}>
                  Delete
                </button>
                <button className="pill-btn" disabled={busy !== null} onClick={() => saveForLater(item.product_id, item.quantity)}>
                  Save for later
                </button>
                <button className="pill-btn" aria-label="Share" onClick={() => share(item.product_id, item.product_name)}>
                  <Share2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </>
      ) : (
        <div className="shop-empty">
          <h3>Your M63 cart is empty</h3>
          <p>Discover handmade pieces made by artisans across India.</p>
          <button className="shop-btn shop-btn--pay" style={{ marginTop: 14, padding: '0 24px' }} onClick={() => navigate('/marketplace')}>
            Continue shopping
          </button>
        </div>
      )}

      {savedProducts.length > 0 && (
        <section className="co-section" style={{ marginTop: 8 }}>
          <h2 className="co-title">Saved for later ({savedProducts.length})</h2>
          {savedProducts.map((p) => {
            const qty = saved.find((s) => s.product_id === p.id)?.quantity || 1;
            return (
              <div key={p.id} className="citem" style={{ padding: '12px 0' }}>
                <div className="citem__img">
                  <img src={p.primary_image_url || ''} alt="" loading="lazy" onError={(e) => handleProductImageError(e, p.category)} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="citem__name">{p.name}</p>
                  <div style={{ fontWeight: 800, margin: '4px 0' }}>{formatINR(p.price)}</div>
                  <StockLabel stock={p.stock_quantity} />
                </div>
                <div className="citem__actions">
                  <button className="pill-btn" disabled={busy !== null || p.stock_quantity <= 0} onClick={() => moveToCart(p.id, Math.min(qty, p.stock_quantity))}>
                    Move to cart
                  </button>
                  <button
                    className="pill-btn"
                    onClick={() => {
                      const next = readSaved().filter((s) => s.product_id !== p.id);
                      writeSaved(next);
                      setSaved(next);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <ProductRail title="Handmade picks for you" products={index.filter((p) => p.stock_quantity > 0 && !cart?.items.some((i) => i.product_id === p.id)).slice(0, 10)} lang={lang} />
    </div>
  );
};
