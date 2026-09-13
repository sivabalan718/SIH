import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ShieldCheck, Truck, AlertCircle, ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { fetchBuyerCart, CartSummary } from '../services/cartService.js';
import { fetchMarketplaceProductById, MarketplaceProductItem } from '../services/marketplaceService.js';
import { createOrder, ShippingDetails } from '../services/orderService.js';
import { useAuth } from '../contexts/AuthContext.js';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const buyNowState = (location.state as any)?.buyNowItem as { product_id: string; quantity: number } | undefined;

  const [cart, setCart] = useState<CartSummary | null>(null);
  const [buyNowProduct, setBuyNowProduct] = useState<MarketplaceProductItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields pre-filled from customer profile
  const [name, setName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.mobile || '');
  const [address, setAddress] = useState<string>(
    [user?.address, user?.locality].filter(Boolean).join(', ') || ''
  );
  const [city, setCity] = useState<string>(user?.city || '');
  const [postalCode, setPostalCode] = useState<string>(user?.postalCode || '');

  useEffect(() => {
    if (user) {
      if (!name && user.name) setName(user.name);
      if (!phone && user.mobile) setPhone(user.mobile);
      if (!address && user.address) {
        const fullAddr = [user.address, user.locality].filter(Boolean).join(', ');
        setAddress(fullAddr);
      }
      if (!city && user.city) setCity(user.city);
      if (!postalCode && user.postalCode) setPostalCode(user.postalCode);
    }
  }, [user]);

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (buyNowState) {
        const prod = await fetchMarketplaceProductById(buyNowState.product_id);
        if (!prod || !prod.is_in_stock) {
          setError('Product is currently unavailable or out of stock.');
        } else {
          setBuyNowProduct(prod);
        }
      } else {
        const cartData = await fetchBuyerCart();
        if (cartData.items.length === 0) {
          setError('Your shopping cart is empty.');
        } else if (cartData.has_stock_warning) {
          setError('Stock availability for items in your cart has changed. Please review your cart.');
        } else {
          setCart(cartData);
        }
      }
    } catch (err: any) {
      setError('Unable to prepare checkout details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || !address.trim()) {
      alert('Please fill in your name, phone number, and delivery address.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const shippingInfo: ShippingDetails = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
      };

      const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const customItems = buyNowState ? [{ product_id: buyNowState.product_id, quantity: buyNowState.quantity }] : undefined;

      const res = await createOrder(shippingInfo, customItems, idempotencyKey);

      if (res.orders && res.orders.length > 0) {
        const firstOrder = res.orders[0];
        navigate(`/marketplace/order-success/${firstOrder.id}`, { state: { createdOrders: res.orders } });
      } else {
        throw new Error('Order creation returned no order record.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please check item stock and try again.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--m63-bg-canvas)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #F59E0B', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: 600, color: 'var(--m63-slate)' }}>Preparing checkout details...</p>
        </div>
      </div>
    );
  }

  const itemsToDisplay = buyNowProduct
    ? [
        {
          product_name: buyNowProduct.name,
          artisan_name: buyNowProduct.artisan_name,
          unit_price: buyNowProduct.price,
          quantity: buyNowState?.quantity || 1,
          subtotal: buyNowProduct.price * (buyNowState?.quantity || 1),
          primary_image_url: buyNowProduct.primary_image_url,
        },
      ]
    : cart?.items || [];

  const subtotal = buyNowProduct
    ? buyNowProduct.price * (buyNowState?.quantity || 1)
    : cart?.subtotal || 0;

  const total = subtotal;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--m63-bg-canvas)', padding: '32px 20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Navigation Top */}
        <button
          onClick={() => navigate(buyNowProduct ? `/marketplace/product/${buyNowProduct.id}` : '/marketplace/cart')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748B', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', marginBottom: '24px' }}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--m63-slate)', margin: '0 0 24px 0' }}>
          📦 Checkout & Delivery Details
        </h1>

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '16px', color: '#991B1B', marginBottom: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {/* Left Column: Shipping Form */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--m63-border)', padding: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--m63-slate)', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={20} className="text-amber-600" />
              Delivery Information
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--m63-slate)', display: 'block', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siva Balan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--m63-border)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--m63-slate)', display: 'block', marginBottom: '6px' }}>
                  Phone Number (for delivery updates) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--m63-border)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--m63-slate)', display: 'block', marginBottom: '6px' }}>
                  Complete Street Address *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="House/Door No, Street Name, Locality, Landmark..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--m63-border)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--m63-slate)', display: 'block', marginBottom: '6px' }}>
                    City / Town
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Madurai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--m63-border)', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--m63-slate)', display: 'block', marginBottom: '6px' }}>
                    PIN / Postal Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 625001"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--m63-border)', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Confirmation Button */}
          <div>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--m63-border)', padding: '24px', position: 'sticky', top: '80px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--m63-slate)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={20} className="text-emerald-600" />
                Items to Order ({itemsToDisplay.length})
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {itemsToDisplay.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#F8FAFC', overflow: 'hidden', flexShrink: 0 }}>
                      {item.primary_image_url ? (
                        <img src={item.primary_image_url} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.6rem' }}>
                          Item
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--m63-slate)', margin: 0 }}>
                        {item.product_name}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>By {item.artisan_name}</span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669', display: 'block' }}>
                        ₹{item.subtotal.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Qty: {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 700 }}>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569', marginBottom: '10px' }}>
                  <span>Delivery Charge</span>
                  <span style={{ fontWeight: 600, color: '#059669' }}>Free Prototype Delivery</span>
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--m63-slate)' }}>Total Payable</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#059669' }}>
                    ₹{total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Idempotency Protected Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                icon={<Check size={18} />}
                loading={isSubmitting}
                disabled={isSubmitting || !!error}
                style={{ width: '100%', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'none', color: '#FFFFFF', fontWeight: 800 }}
              >
                {isSubmitting ? 'Processing Order...' : 'Place Order'}
              </Button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px', color: '#64748B', fontSize: '0.75rem' }}>
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Direct artisan transaction protected by M63 Platform</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
