import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, ArrowRight, Package } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { fetchBuyerOrderById, OrderRecord } from '../services/orderService.js';

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const passedOrders = (location.state as any)?.createdOrders as OrderRecord[] | undefined;
  const [orders, setOrders] = useState<OrderRecord[]>(passedOrders || []);

  useEffect(() => {
    if (!passedOrders && orderId) {
      loadSingleOrder(orderId);
    }
  }, [orderId, passedOrders]);

  const loadSingleOrder = async (id: string) => {
    try {
      const single = await fetchBuyerOrderById(id);
      setOrders([single]);
    } catch (e) {
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--m63-bg-canvas)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Success Header Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px solid var(--m63-border)', padding: '40px 24px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <CheckCircle2 size={36} />
          </div>

          <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: '12px' }}>
            ORDER CONFIRMED
          </span>

          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--m63-slate)', margin: '12px 0 6px 0' }}>
            Thank you for supporting Indian artisans!
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#64748B', maxWidth: '500px', margin: '0 auto 24px auto' }}>
            Your order has been sent directly to the artisan. You can track progress in real-time from your buyer dashboard.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Button variant="primary" size="md" icon={<ShoppingBag size={18} />} onClick={() => navigate('/marketplace/orders')}>
              View My Orders
            </Button>
            <Button variant="secondary" size="md" icon={<ArrowRight size={18} />} onClick={() => navigate('/marketplace')}>
              Continue Shopping
            </Button>
          </div>
        </div>

        {/* Orders Details Cards */}
        {orders.map((ord) => (
          <div key={ord.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--m63-border)', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>ORDER NUMBER</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 900, color: '#D97706', margin: 0 }}>{ord.m63_order_number}</p>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 12px', borderRadius: '12px' }}>
                STATUS: {ord.status}
              </span>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {ord.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Package size={16} className="text-amber-600 shrink-0" />
                    <div>
                      <span style={{ fontWeight: 800, color: 'var(--m63-slate)' }}>{item.product_name_snapshot}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, color: '#059669' }}>₹{item.subtotal.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            {/* Address & Total Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '12px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', display: 'block' }}>SHIPPING TO</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>{ord.shipping_name} ({ord.shipping_phone})</span>
                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>{ord.shipping_address}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', display: 'block' }}>TOTAL AMOUNT</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669' }}>₹{ord.total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
