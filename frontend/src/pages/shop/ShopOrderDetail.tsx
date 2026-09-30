import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ChevronRight, Share2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { cancelOrder, describeOrder, fetchBuyerOrderById, OrderRecord } from '../../services/orderService.js';
import { addToBuyerCart } from '../../services/cartService.js';
import { checkReviewEligibility, ReviewEligibilityResult } from '../../services/reviewService.js';
import { runPayment } from '../../services/paymentService.js';
import { ReviewModal } from '../../components/reviews/ReviewModal.js';
import { OrderRequestSection } from '../../components/shop/OrderRequestSection.js';
import { handleProductImageError } from '../../utils/imageFallback.js';
import { formatINR, notifyCartUpdated, showToast } from '../../utils/shopStore.js';

const PAYMENT_WINDOW_MS = 30 * 60 * 1000;
const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

/** Tracking timeline built only from timestamps the artisan actually recorded. */
const Timeline: React.FC<{ o: OrderRecord }> = ({ o }) => {
  if (o.status === 'CANCELLED') {
    return (
      <ol className="track">
        <li className="done">
          <b>Ordered</b>
          {fmt(o.placed_at)}
        </li>
        <li className="cancel done current">
          <b>Cancelled</b>
          {fmt(o.cancelled_at)}
          {o.payment_failure_reason ? ` · ${o.payment_failure_reason}` : ''}
        </li>
      </ol>
    );
  }
  const steps: Array<{ key: string; label: string; at?: string | null }> = [
    { key: 'PENDING', label: 'Ordered', at: o.placed_at },
    { key: 'CONFIRMED', label: 'Confirmed by artisan', at: o.confirmed_at },
    { key: 'PROCESSING', label: 'Packed', at: o.processing_at },
    { key: 'SHIPPED', label: 'Shipped', at: o.shipped_at },
    { key: 'DELIVERED', label: 'Delivered', at: o.delivered_at },
  ];
  const current = steps.findIndex((s) => s.key === o.status);
  return (
    <ol className="track">
      {steps.map((s, i) => (
        <li key={s.key} className={`${i <= current ? 'done' : ''}${i === current ? ' current' : ''}`}>
          <b>{s.label}</b>
          {i <= current ? fmt(s.at) : 'Upcoming'}
        </li>
      ))}
    </ol>
  );
};

export const ShopOrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn' | 'bad'; text: string } | null>(null);
  const [eligibility, setEligibility] = useState<Record<string, ReviewEligibilityResult>>({});
  const [reviewing, setReviewing] = useState<{ itemId: string; productId: string; name: string; image?: string | null } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate(`/customer/login?next=${encodeURIComponent(`/marketplace/orders/${orderId}`)}`, { replace: true });
  }, [authLoading, user]);

  const load = () => {
    if (!orderId) return;
    setLoading(true);
    fetchBuyerOrderById(orderId)
      .then((o) => {
        setOrder(o);
        if (o.status === 'DELIVERED') {
          o.items.forEach((i) => {
            if (i.id)
              checkReviewEligibility(i.product_id, i.id)
                .then((r) => setEligibility((prev) => ({ ...prev, [i.id!]: r })))
                .catch(() => undefined);
          });
        }
      })
      .catch(() => setError('Order not found.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (user) load();
  }, [user?.id, orderId]);

  if (loading) {
    return (
      <div className="co-section" aria-busy="true">
        <div className="skel" style={{ height: 90 }} />
        <div className="skel" style={{ height: 180, marginTop: 14 }} />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="shop-empty">
        <h3>Order not found</h3>
        <button className="shop-btn shop-btn--dark" style={{ marginTop: 12 }} onClick={() => navigate('/marketplace/orders')}>
          Your orders
        </button>
      </div>
    );
  }

  const status = describeOrder(order);
  const awaitingPayment = order.payment_method === 'ONLINE' && order.payment_status !== 'PAID' && order.status === 'PENDING';
  const canPay = awaitingPayment && Date.now() - new Date(order.placed_at).getTime() < PAYMENT_WINDOW_MS;
  const canCancel =
    ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status) && !(order.payment_method === 'ONLINE' && order.payment_status === 'PAID');

  const payNow = async () => {
    setBusy('pay');
    setNotice(null);
    try {
      const res = await runPayment({ orderId: order.id }, { name: order.shipping_name, email: user?.email, contact: order.shipping_phone });
      if (res.status === 'paid') setNotice({ tone: 'ok', text: 'Payment successful. The artisan has been notified.' });
      else setNotice({ tone: res.status === 'dismissed' ? 'warn' : 'bad', text: res.message });
      load();
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message || 'Could not start the payment.' });
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setBusy('cancel');
    try {
      setOrder(await cancelOrder(order.id));
      setNotice({ tone: 'ok', text: 'Order cancelled.' });
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message || 'Could not cancel this order.' });
    } finally {
      setBusy(null);
    }
  };

  const buyAgain = async (productId: string) => {
    setBusy(productId);
    try {
      const cart = await addToBuyerCart(productId, 1);
      notifyCartUpdated(cart.items.reduce((n, i) => n + i.quantity, 0));
      navigate('/marketplace/cart');
    } catch (e: any) {
      showToast(e?.message || 'This item is not available right now.');
    } finally {
      setBusy(null);
    }
  };

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

  return (
    <div className="shop-narrow">
      {notice && (
        <div className={`notice notice--${notice.tone} no-print`} role="status">
          <AlertCircle size={17} style={{ flex: 'none', marginTop: 1 }} />
          <span>{notice.text}</span>
        </div>
      )}

      {order.items.map((item) => (
        <section key={item.id || item.product_id} className="co-section" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={() => navigate(`/marketplace/product/${item.product_id}`)} style={{ flex: 'none' }} aria-label={`Open ${item.product_name_snapshot}`}>
            <img
              src={item.primary_image_url || ''}
              alt=""
              onError={(e) => handleProductImageError(e)}
              style={{ width: 96, height: 96, objectFit: 'contain', borderRadius: 10, background: '#f6f2ec' }}
            />
          </button>
          <div style={{ minWidth: 0 }}>
            <button className="shop-link" style={{ fontSize: '0.98rem', textAlign: 'left', color: '#0e7490', fontWeight: 600 }} onClick={() => navigate(`/marketplace/product/${item.product_id}`)}>
              {item.product_name_snapshot}
            </button>
            <p className="pcard__meta">
              Qty {item.quantity} · {formatINR(item.unit_price_snapshot)}
            </p>
            <button className="shop-link no-print" style={{ color: '#0e7490', marginTop: 4 }} onClick={() => share(item.product_id, item.product_name_snapshot)}>
              <Share2 size={14} style={{ verticalAlign: '-2px' }} /> Share this item
            </button>
          </div>
        </section>
      ))}

      <section className="co-section">
        <h2 className={`pdp__h tone-${status.tone}`}>{status.label}</h2>
        {awaitingPayment && (
          <div className="notice notice--warn no-print" style={{ margin: '0 0 12px' }}>
            <AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />
            <span>
              {canPay
                ? 'Complete the payment within 30 minutes of ordering, otherwise the order is cancelled automatically and the items are released.'
                : 'The payment window has passed. This order will be cancelled automatically.'}
              {order.payment_failure_reason && order.payment_status === 'FAILED' ? ` Last attempt: ${order.payment_failure_reason}` : ''}
            </span>
          </div>
        )}
        {canPay && (
          <button className="shop-btn shop-btn--pay no-print" style={{ width: '100%', marginBottom: 14 }} onClick={payNow} disabled={busy !== null}>
            {busy === 'pay' ? 'Opening payment…' : `Pay now · ${formatINR(order.total_amount)}`}
          </button>
        )}
        <Timeline o={order} />
      </section>

      <section className="co-section no-print">
        {order.items.map((item) => (
          <button key={`again-${item.product_id}`} className="list-row" disabled={busy !== null} onClick={() => buyAgain(item.product_id)}>
            Buy it again{order.items.length > 1 ? ` — ${item.product_name_snapshot}` : ''}
            <ChevronRight size={18} />
          </button>
        ))}
        {canCancel && (
          <button className="list-row tone-bad" disabled={busy !== null} onClick={cancel}>
            {busy === 'cancel' ? 'Cancelling…' : 'Cancel order'}
            <ChevronRight size={18} />
          </button>
        )}
      </section>

      {order.status === 'DELIVERED' && (
        <section className="co-section no-print">
          <h2 className="pdp__h">How's your item?</h2>
          {order.items.map((item) => {
            const e = item.id ? eligibility[item.id] : undefined;
            return (
              <button
                key={`rv-${item.id}`}
                className="list-row"
                disabled={!e?.can_review}
                onClick={() => item.id && setReviewing({ itemId: item.id, productId: item.product_id, name: item.product_name_snapshot, image: item.primary_image_url })}
              >
                {e?.is_already_reviewed ? 'Thanks — you reviewed this item' : `Write a product review${order.items.length > 1 ? ` — ${item.product_name_snapshot}` : ''}`}
                <ChevronRight size={18} />
              </button>
            );
          })}
        </section>
      )}

      <OrderRequestSection order={order} />

      <section className="co-section">
        <h2 className="pdp__h">Order info</h2>
        <div className="sum-row">
          <span>Order number</span>
          <strong>{order.m63_order_number}</strong>
        </div>
        <div className="sum-row">
          <span>Placed on</span>
          <span>{fmt(order.placed_at)}</span>
        </div>
        <div className="sum-row">
          <span>Payment</span>
          <span>
            {order.payment_method === 'ONLINE' ? 'Online (Razorpay)' : 'Cash on Delivery'} ·{' '}
            <span className={order.payment_status === 'PAID' ? 'tone-ok' : order.payment_status === 'FAILED' ? 'tone-bad' : 'tone-warn'}>
              {order.payment_status === 'PAID' ? 'Paid' : order.payment_status === 'FAILED' ? 'Failed' : order.payment_status === 'CANCELLED' ? 'Cancelled' : order.payment_method === 'COD' ? 'Pay on delivery' : 'Pending'}
            </span>
          </span>
        </div>
        {order.razorpay_payment_id && (
          <div className="sum-row">
            <span>Payment ID</span>
            <span style={{ fontSize: '0.8rem' }}>{order.razorpay_payment_id}</span>
          </div>
        )}
        <div style={{ height: 10 }} />
        {order.items.map((i) => (
          <div key={`sum-${i.id || i.product_id}`} className="sum-row">
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }}>
              {i.quantity} × {i.product_name_snapshot}
            </span>
            <span>{formatINR(i.subtotal)}</span>
          </div>
        ))}
        <div className="sum-row">
          <span>Delivery</span>
          <span>{order.delivery_charge > 0 ? formatINR(order.delivery_charge) : 'FREE'}</span>
        </div>
        <div className="sum-row sum-row--total">
          <span>Order total</span>
          <span>{formatINR(order.total_amount)}</span>
        </div>
        <h3 className="pdp__h" style={{ marginTop: 16 }}>
          Delivering to {order.shipping_name}
        </h3>
        <p className="pdp__text">
          {order.shipping_address}
          <br />
          Phone: {order.shipping_phone}
        </p>
        <button className="list-row no-print" onClick={() => window.print()}>
          Download invoice
          <ChevronRight size={18} />
        </button>
      </section>

      {reviewing && (
        <ReviewModal
          isOpen
          onClose={() => setReviewing(null)}
          onSuccess={() => {
            setReviewing(null);
            load();
          }}
          orderItemId={reviewing.itemId}
          orderId={order.id}
          productName={reviewing.name}
          primaryImageUrl={reviewing.image}
        />
      )}
    </div>
  );
};
