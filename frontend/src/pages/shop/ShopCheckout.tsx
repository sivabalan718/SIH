import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Banknote, Check, CreditCard, Lock, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { fetchBuyerCart } from '../../services/cartService.js';
import { fetchMarketplaceProductById } from '../../services/marketplaceService.js';
import { createOrder, PaymentMethod } from '../../services/orderService.js';
import { getPaymentConfig, PaymentConfig, runPayment } from '../../services/paymentService.js';
import { handleProductImageError } from '../../utils/imageFallback.js';
import { formatINR, notifyCartUpdated } from '../../utils/shopStore.js';

type Step = 'address' | 'payment' | 'confirm';
interface Line {
  product_id: string;
  name: string;
  image: string | null;
  artisan: string;
  unit_price: number;
  quantity: number;
}
interface Address {
  name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postal_code: string;
}

const BUY_NOW_KEY = 'm63_buy_now';
const PHONE_RE = /^[6-9]\d{9}$/;
const PIN_RE = /^\d{6}$/;

function readBuyNow(stateItem?: { product_id: string; quantity: number }) {
  if (stateItem) {
    try {
      sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(stateItem));
    } catch {
      // ignore
    }
    return stateItem;
  }
  try {
    const raw = sessionStorage.getItem(BUY_NOW_KEY);
    return raw ? (JSON.parse(raw) as { product_id: string; quantity: number }) : undefined;
  } catch {
    return undefined;
  }
}

const Steps: React.FC<{ step: Step }> = ({ step }) => {
  const order: Step[] = ['address', 'payment', 'confirm'];
  const idx = order.indexOf(step);
  return (
    <div className="steps" role="list" aria-label="Checkout progress">
      {['Address', 'Payment', 'Confirm order'].map((label, i) => (
        <div key={label} role="listitem" className={`step${i < idx ? ' step--done' : i === idx ? ' step--active' : ''}`} aria-current={i === idx ? 'step' : undefined}>
          <span className="step__dot">{i < idx && <Check size={13} strokeWidth={3} />}</span>
          {label}
        </div>
      ))}
    </div>
  );
};

export const ShopCheckout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, updateCustomerProfile } = useAuth();
  const buyNow = useMemo(() => readBuyNow((location.state as any)?.buyNowItem), []);

  const [step, setStep] = useState<Step>('address');
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payConfig, setPayConfig] = useState<PaymentConfig | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('ONLINE');
  const [addr, setAddr] = useState<Address>({ name: '', phone: '', address: '', city: '', district: '', postal_code: '' });
  const [editingAddr, setEditingAddr] = useState(false);
  const [saveAddr, setSaveAddr] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [placing, setPlacing] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'bad' | 'warn'; text: string } | null>(null);
  const [pendingGroup, setPendingGroup] = useState<{ id: string; orderId: string } | null>(null);
  const idemKey = useRef(`${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`);

  // Sign-in is required so the order and payment have a verified owner.
  useEffect(() => {
    if (!authLoading && !user) navigate(`/customer/login?next=${encodeURIComponent('/marketplace/checkout')}`, { replace: true });
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    setAddr({
      name: user.name || '',
      phone: (user.mobile || '').replace(/\D/g, '').slice(-10),
      address: [user.address, user.locality].filter(Boolean).join(', '),
      city: user.city || '',
      district: user.district || '',
      postal_code: user.postalCode || '',
    });
    setEditingAddr(!user.address || !user.mobile || !user.postalCode);
  }, [user?.id]);

  useEffect(() => {
    getPaymentConfig()
      .then((c) => {
        setPayConfig(c);
        if (!c.enabled) setMethod('COD');
      })
      .catch(() => {
        setPayConfig({ enabled: false, key_id: null, currency: 'INR' });
        setMethod('COD');
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const load = buyNow
      ? fetchMarketplaceProductById(buyNow.product_id).then((p) => [
          { product_id: p.id, name: p.name, image: p.primary_image_url, artisan: p.artisan_name, unit_price: p.price, quantity: buyNow.quantity },
        ])
      : fetchBuyerCart().then((c) =>
          c.items.map((i) => ({ product_id: i.product_id, name: i.product_name, image: i.primary_image_url, artisan: i.artisan_name, unit_price: i.unit_price, quantity: i.quantity }))
        );
    load
      .then((l) => {
        setLines(l);
        if (l.length === 0) setLoadError('Your cart is empty.');
      })
      .catch(() => setLoadError('Could not load your items. Please go back and try again.'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  // Display only — the backend recalculates every price when the order is placed.
  const itemsTotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  const validateAddress = () => {
    const e: Partial<Record<keyof Address, string>> = {};
    if (!addr.name.trim()) e.name = 'Enter the receiver’s name';
    if (!PHONE_RE.test(addr.phone.replace(/\D/g, '').slice(-10))) e.phone = 'Enter a valid 10-digit mobile number';
    if (addr.address.trim().length < 8) e.address = 'Enter house number, street and area';
    if (!addr.city.trim()) e.city = 'Enter the town/city';
    if (!PIN_RE.test(addr.postal_code.trim())) e.postal_code = 'Enter a valid 6-digit PIN code';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const confirmAddress = async () => {
    if (!validateAddress()) return;
    if (editingAddr && saveAddr && user?.role === 'CUSTOMER') {
      await updateCustomerProfile({
        mobile: addr.phone,
        address: addr.address,
        city: addr.city,
        district: addr.district,
        postalCode: addr.postal_code,
      }).catch(() => undefined);
    }
    setEditingAddr(false);
    setStep('payment');
    window.scrollTo({ top: 0 });
  };

  const prefill = { name: addr.name, email: user?.email, contact: addr.phone };

  const pay = async (groupId: string, firstOrderId: string) => {
    const result = await runPayment({ checkoutGroupId: groupId }, prefill);
    if (result.status === 'paid') {
      navigate(`/marketplace/order-success/${firstOrderId}`, { replace: true, state: { paid: true, orderNumbers: result.orderNumbers } });
      return;
    }
    setPendingGroup({ id: groupId, orderId: firstOrderId });
    setNotice({ tone: result.status === 'dismissed' ? 'warn' : 'bad', text: result.message });
  };

  const placeOrder = async () => {
    if (placing) return;
    setPlacing(true);
    setNotice(null);
    try {
      if (pendingGroup) {
        await pay(pendingGroup.id, pendingGroup.orderId);
        return;
      }
      const res = await createOrder(
        { name: addr.name.trim(), phone: addr.phone, address: addr.address.trim(), city: addr.city.trim(), district: addr.district.trim(), postal_code: addr.postal_code.trim() },
        buyNow ? [buyNow] : undefined,
        idemKey.current,
        method
      );
      try {
        sessionStorage.removeItem(BUY_NOW_KEY);
      } catch {
        // ignore
      }
      if (!buyNow) notifyCartUpdated(0);
      const first = res.orders[0];
      if (method === 'COD') {
        navigate(`/marketplace/order-success/${first.id}`, { replace: true, state: { paid: false, orderNumbers: res.orders.map((o) => o.m63_order_number) } });
        return;
      }
      await pay(res.checkout_group_id, first.id);
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message || 'Could not place your order. Please try again.' });
    } finally {
      setPlacing(false);
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div aria-busy="true">
        <Steps step={step} />
        <div className="co-section">
          <div className="skel" style={{ height: 22, width: '60%' }} />
          <div className="skel" style={{ height: 90, marginTop: 14 }} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="shop-empty">
        <h3>Nothing to check out</h3>
        <p>{loadError}</p>
        <button className="shop-btn shop-btn--dark" style={{ marginTop: 12 }} onClick={() => navigate('/marketplace')}>
          Continue shopping
        </button>
      </div>
    );
  }

  const field = (key: keyof Address, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      {label}
      <input value={addr[key]} onChange={(e) => setAddr({ ...addr, [key]: e.target.value })} aria-invalid={Boolean(errors[key])} {...props} />
      {errors[key] && <em>{errors[key]}</em>}
    </label>
  );

  const addressSummary = [addr.address, addr.city, addr.district, addr.postal_code].filter(Boolean).join(', ');

  return (
    <div className="shop-narrow">
      <Steps step={step} />

      {notice && (
        <div className={`notice notice--${notice.tone}`} role="alert">
          <AlertCircle size={17} style={{ flex: 'none', marginTop: 1 }} />
          <div>
            {notice.text}
            {pendingGroup && (
              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <button className="shop-link" onClick={() => navigate(`/marketplace/orders/${pendingGroup.orderId}`)}>
                  View order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step !== 'address' && (
        <section className="co-section" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <MapPin size={20} style={{ flex: 'none', marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>Delivering to {addr.name}</strong>
            <p className="pcard__meta" style={{ whiteSpace: 'normal' }}>{addressSummary}</p>
          </div>
          {!pendingGroup && (
            <button className="shop-link" onClick={() => setStep('address')}>
              Change
            </button>
          )}
        </section>
      )}

      {step === 'address' && (
        <section className="co-section">
          <h1 className="co-title">Select a delivery address</h1>
          {!editingAddr ? (
            <div className="opt" aria-checked="true" role="radio">
              <span className="opt__radio" />
              <div className="opt__body">
                <strong>{addr.name}</strong>
                {addressSummary}, India
                <br />
                Phone number: {addr.phone}
                <button className="shop-btn shop-btn--ghost" style={{ width: '100%', marginTop: 12, height: 40, borderRadius: 20 }} onClick={() => setEditingAddr(true)}>
                  Edit address
                </button>
              </div>
            </div>
          ) : (
            <div>
              {field('name', 'Full name', { autoComplete: 'name' })}
              {field('phone', 'Mobile number', { inputMode: 'numeric', autoComplete: 'tel', maxLength: 13, placeholder: '10-digit mobile number' })}
              {field('address', 'Flat, house no., street, area', { autoComplete: 'street-address' })}
              <div className="field-row">
                {field('city', 'Town / City', { autoComplete: 'address-level2' })}
                {field('postal_code', 'PIN code', { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' })}
              </div>
              {field('district', 'District (optional)')}
              {user.role === 'CUSTOMER' && (
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.86rem' }}>
                  <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} /> Save as my default address
                </label>
              )}
            </div>
          )}
        </section>
      )}

      {step === 'payment' && (
        <section className="co-section">
          <h1 className="co-title">Select a payment method</h1>
          <div className="co-sub">Recommended</div>
          <button
            role="radio"
            aria-checked={method === 'ONLINE'}
            className="opt"
            disabled={!payConfig?.enabled}
            onClick={() => setMethod('ONLINE')}
          >
            <span className="opt__radio" />
            <span className="opt__body">
              {payConfig?.enabled && <span className="opt__tag">Instant & secure</span>}
              <strong>
                <CreditCard size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                Pay online
              </strong>
              <small>UPI (Google Pay, PhonePe, Paytm), debit/credit cards, net banking and wallets — secured by Razorpay.</small>
              {!payConfig?.enabled && <small style={{ display: 'block', color: '#b45309' }}>Online payment is not available right now.</small>}
            </span>
          </button>
          <div className="co-sub">More ways to pay</div>
          <button role="radio" aria-checked={method === 'COD'} className="opt" onClick={() => setMethod('COD')}>
            <span className="opt__radio" />
            <span className="opt__body">
              <strong>
                <Banknote size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                Cash on Delivery
              </strong>
              <small>Pay in cash or UPI to the delivery partner when your order arrives.</small>
            </span>
          </button>
        </section>
      )}

      {step === 'confirm' && (
        <>
          <section className="co-section">
            <button className="shop-btn shop-btn--pay" style={{ width: '100%' }} onClick={placeOrder} disabled={placing}>
              {placing ? 'Processing…' : pendingGroup ? `Retry payment · ${formatINR(itemsTotal)}` : method === 'ONLINE' ? `Pay ${formatINR(itemsTotal)}` : 'Place your order'}
            </button>
            <p className="pcard__meta" style={{ whiteSpace: 'normal', marginTop: 8, textAlign: 'center' }}>
              <Lock size={12} style={{ verticalAlign: '-2px' }} /> Prices are confirmed securely by M63 when you place the order.
            </p>
          </section>
          <section className="co-section">
            <div className="sum-row">
              <span>Items ({count}):</span>
              <span>{formatINR(itemsTotal)}</span>
            </div>
            <div className="sum-row">
              <span>Delivery:</span>
              <span className="tone-ok">FREE</span>
            </div>
            <div className="sum-row sum-row--total">
              <span>Order Total:</span>
              <span>{formatINR(itemsTotal)}</span>
            </div>
          </section>
          <section className="co-section">
            <strong>{method === 'ONLINE' ? 'Paying online with Razorpay' : 'Paying with Cash on Delivery'}</strong>
            {!pendingGroup && (
              <button className="shop-link" style={{ display: 'block', marginTop: 8 }} onClick={() => setStep('payment')}>
                Change payment method
              </button>
            )}
          </section>
          <section className="co-section">
            <h2 className="pdp__h">
              <Truck size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
              Items shipped directly by the artisan{new Set(lines.map((l) => l.artisan)).size > 1 ? 's' : ''}
            </h2>
            {lines.map((l) => (
              <div key={l.product_id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: '1px solid var(--shop-line)' }}>
                <img src={l.image || ''} alt="" onError={(e) => handleProductImageError(e)} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, background: '#f6f2ec' }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="citem__name">{l.name}</p>
                  <p className="pcard__meta">by {l.artisan} · Qty {l.quantity}</p>
                  <strong>{formatINR(l.unit_price * l.quantity)}</strong>
                </div>
              </div>
            ))}
            <p className="pcard__meta" style={{ whiteSpace: 'normal', marginTop: 8 }}>
              <ShieldCheck size={12} style={{ verticalAlign: '-2px' }} /> Items from different artisans are placed as separate orders and tracked individually.
            </p>
          </section>
        </>
      )}

      <div style={{ height: 90 }} />
      {step !== 'confirm' && (
        <div className="co-bar">
          <button
            className="shop-btn shop-btn--pay"
            onClick={() => {
              if (step === 'address') confirmAddress();
              else {
                setStep('confirm');
                window.scrollTo({ top: 0 });
              }
            }}
          >
            {step === 'address' ? 'Deliver to this address' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
};
