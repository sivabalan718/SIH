import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Trash2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { fetchBuyerCart, updateBuyerCartItem, removeBuyerCartItem, clearBuyerCart, CartSummary } from '../services/cartService.js';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const res = await fetchBuyerCart();
      setCart(res);
    } catch (err: any) {
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQty = async (productId: string, newQty: number) => {
    try {
      setUpdatingId(productId);
      const updated = await updateBuyerCartItem(productId, newQty);
      setCart(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update quantity');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      setUpdatingId(productId);
      const updated = await removeBuyerCartItem(productId);
      setCart(updated);
    } catch (err: any) {
      alert('Failed to remove item');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear all items from your cart?')) return;
    try {
      await clearBuyerCart();
      await loadCart();
    } catch (e) {}
  };

  if (loading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--m63-bg-canvas)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #F59E0B', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: 600, color: 'var(--m63-slate)' }}>Loading your shopping cart...</p>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--m63-bg-canvas)', padding: '32px 20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Navigation Top */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button
            onClick={() => navigate('/marketplace')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748B', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
          >
            <ArrowLeft size={18} />
            <span>Continue Shopping</span>
          </button>

          {!isEmpty && (
            <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={handleClear}>
              Clear Cart
            </Button>
          )}
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--m63-slate)', margin: '0 0 24px 0' }}>
          🛒 Your Shopping Cart
        </h1>

        {/* Stock Revalidation Warnings */}
        {cart?.has_stock_warning && cart.warnings.length > 0 && (
          <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 800, marginBottom: '6px' }}>
              <AlertCircle size={18} />
              <span>Cart Availability Notice</span>
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: '#92400E' }}>
              {cart.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {isEmpty ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--m63-border)', padding: '60px 24px', textAlign: 'center' }}>
            <ShoppingBag size={48} className="text-amber-500" style={{ display: 'block', margin: '0 auto 12px auto' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--m63-slate)' }}>Your cart is empty</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--m63-slate-subtle)', marginTop: '4px', marginBottom: '20px' }}>
              Explore artisan creations in our marketplace and add them to your cart.
            </p>
            <Button variant="primary" size="md" onClick={() => navigate('/marketplace')}>
              Explore Marketplace
            </Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            {/* Cart Items List */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {items.map((item) => (
                  <div
                    key={item.product_id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      border: item.stock_warning ? '1px solid #FCD34D' : '1px solid var(--m63-border)',
                      padding: '16px',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center',
                    }}
                  >
                    {/* Image */}
                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', backgroundColor: '#F1F5F9', overflow: 'hidden', flexShrink: 0 }}>
                      {item.primary_image_url ? (
                        <img src={item.primary_image_url} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.7rem' }}>
                          Product
                        </div>
                      )}
                    </div>

                    {/* Information */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--m63-slate)', margin: '0 0 4px 0' }}>
                        {item.product_name}
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 8px 0' }}>
                        By {item.artisan_name}
                      </p>

                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#059669' }}>
                        ₹{item.unit_price.toLocaleString('en-IN')} × {item.quantity} = ₹{item.subtotal.toLocaleString('en-IN')}
                      </div>

                      {item.stock_warning && (
                        <p style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600, marginTop: '4px' }}>
                          ⚠️ {item.stock_warning}
                        </p>
                      )}
                    </div>

                    {/* Quantity & Delete Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                      <button
                        onClick={() => handleRemove(item.product_id)}
                        disabled={updatingId === item.product_id}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F8FAFC', border: '1px solid var(--m63-border)', borderRadius: '8px', padding: '2px 4px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product_id, item.quantity - 1)}
                          disabled={updatingId === item.product_id}
                          style={{ border: 'none', background: 'none', width: '24px', height: '24px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product_id, item.quantity + 1)}
                          disabled={updatingId === item.product_id || item.quantity >= item.stock_quantity}
                          style={{ border: 'none', background: 'none', width: '24px', height: '24px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary & Checkout Card */}
            <div style={{ minWidth: '280px' }}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--m63-border)', padding: '24px', position: 'sticky', top: '80px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--m63-slate)', margin: '0 0 16px 0' }}>
                  Order Summary
                </h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '8px' }}>
                  <span>Items Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
                  <span style={{ fontWeight: 700 }}>₹{cart?.subtotal.toLocaleString('en-IN')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '16px' }}>
                  <span>Delivery Charge</span>
                  <span style={{ fontWeight: 600, color: '#059669' }}>Calculated at Checkout</span>
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--m63-slate)' }}>Total Amount</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669' }}>
                    ₹{cart?.total_amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  icon={<ArrowRight size={18} />}
                  onClick={() => navigate('/marketplace/checkout')}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'none', color: '#FFFFFF', fontWeight: 800 }}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
