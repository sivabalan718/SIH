import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Package } from 'lucide-react';
import { fetchBuyerOrders, OrderRecord } from '../../services/orderService.js';
import { formatINR } from '../../utils/shopStore.js';

/** Confirmation driven by the server's order records — never by the browser's own success flag. */
export const ShopOrderSuccess: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);

  useEffect(() => {
    fetchBuyerOrders()
      .then((all) => {
        const anchor = all.find((o) => o.id === orderId);
        setOrders(anchor ? all.filter((o) => (anchor.checkout_group_id ? o.checkout_group_id === anchor.checkout_group_id : o.id === anchor.id)) : []);
      })
      .catch(() => setOrders([]));
  }, [orderId]);

  if (!orders) {
    return (
      <div className="co-section" aria-busy="true">
        <div className="skel" style={{ height: 120 }} />
      </div>
    );
  }
  if (orders.length === 0) {
    return (
      <div className="shop-empty">
        <h3>We couldn’t find this order</h3>
        <button className="shop-btn shop-btn--dark" style={{ marginTop: 12 }} onClick={() => navigate('/marketplace/orders')}>
          Your orders
        </button>
      </div>
    );
  }

  const allPaid = orders.every((o) => o.payment_status === 'PAID');
  const isCod = orders.every((o) => o.payment_method === 'COD');
  const total = orders.reduce((s, o) => s + o.total_amount, 0);
  const verifiedPaid = allPaid && (location.state as any)?.paid !== false;

  return (
    <div>
      <section className="co-section" style={{ textAlign: 'center', paddingTop: 28 }}>
        <CheckCircle2 size={56} color="#0f766e" style={{ margin: '0 auto 10px' }} />
        <h1 className="co-title" style={{ marginBottom: 6 }}>
          {verifiedPaid ? 'Payment received — order placed!' : isCod ? 'Order placed — pay on delivery' : 'Order placed'}
        </h1>
        <p className="pdp__text">
          {verifiedPaid
            ? `We verified your payment of ${formatINR(total)}. The artisan${orders.length > 1 ? 's have' : ' has'} been notified.`
            : isCod
            ? `Keep ${formatINR(total)} ready (cash or UPI) for the delivery partner.`
            : 'Payment is still pending for this order. You can complete it from Your Orders.'}
        </p>
      </section>
      <section className="co-section">
        {orders.map((o) => (
          <button key={o.id} className="orow" onClick={() => navigate(`/marketplace/orders/${o.id}`)}>
            <span className="orow__img" style={{ display: 'grid', placeItems: 'center' }}>
              {o.items[0]?.primary_image_url ? <img src={o.items[0].primary_image_url} alt="" /> : <Package size={28} />}
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="orow__name" style={{ display: 'block' }}>
                {o.m63_order_number}
              </span>
              <span className="pcard__meta" style={{ display: 'block' }}>
                {o.items.length} item{o.items.length === 1 ? '' : 's'} · {formatINR(o.total_amount)}
              </span>
              <span className="shop-link">Track order →</span>
            </span>
            <span />
          </button>
        ))}
        <button className="shop-btn shop-btn--ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => navigate('/marketplace')}>
          Continue shopping
        </button>
      </section>
    </div>
  );
};
