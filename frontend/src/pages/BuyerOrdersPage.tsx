import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingBag, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { fetchBuyerOrders, cancelOrder, OrderRecord, OrderStatus } from '../services/orderService.js';

export const BuyerOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
    const timer = setInterval(() => {
      loadOrdersSilent();
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const loadOrdersSilent = async () => {
    try {
      const data = await fetchBuyerOrders();
      setOrders(data);
    } catch (e) {}
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBuyerOrders();
      setOrders(data);
    } catch (err: any) {
      setError('Unable to load your orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order? Item stock will be restored.')) return;
    try {
      setCancellingId(orderId);
      await cancelOrder(orderId);
      await loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const statusSteps: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

  const getStepIndex = (status: OrderStatus): number => {
    if (status === 'CANCELLED') return -1;
    return statusSteps.indexOf(status);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--m63-bg-canvas)', padding: '32px 20px' }}>
      <div style={{ maxWidth: '950px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--m63-slate)', margin: 0 }}>
              🛍 My Orders
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>
              Track order fulfillment status and view historical purchase snapshots.
            </p>
          </div>

          <Button variant="secondary" size="sm" icon={<ShoppingBag size={16} />} onClick={() => navigate('/marketplace')}>
            Explore Marketplace
          </Button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #F59E0B', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px auto' }} />
            <p style={{ fontWeight: 600, color: 'var(--m63-slate)' }}>Loading your orders...</p>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '16px', color: '#991B1B', textAlign: 'center' }}>
            <AlertCircle size={24} style={{ display: 'block', margin: '0 auto 8px auto' }} />
            <p style={{ fontWeight: 700, margin: 0 }}>{error}</p>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--m63-border)', padding: '60px 24px', textAlign: 'center' }}>
            <Package size={48} className="text-amber-500" style={{ display: 'block', margin: '0 auto 12px auto' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--m63-slate)' }}>No orders placed yet</h2>
            <p style={{ fontSize: '0.9rem', color: '#64748B', marginTop: '4px', marginBottom: '20px' }}>
              Browse the artisan marketplace to discover unique handcrafted items.
            </p>
            <Button variant="primary" onClick={() => navigate('/marketplace')}>
              Browse Marketplace
            </Button>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {orders.map((order) => {
              const stepIdx = getStepIndex(order.status);
              const isCancelled = order.status === 'CANCELLED';

              return (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    border: '1px solid var(--m63-border)',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Order Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#D97706' }}>
                          {order.m63_order_number}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          • Placed on {new Date(order.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                        Shipping to <strong>{order.shipping_name}</strong> ({order.shipping_address})
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          padding: '4px 12px',
                          borderRadius: '12px',
                          backgroundColor: isCancelled ? '#FEE2E2' : order.status === 'DELIVERED' ? '#D1FAE5' : '#FEF3C7',
                          color: isCancelled ? '#991B1B' : order.status === 'DELIVERED' ? '#065F46' : '#92400E',
                        }}
                      >
                        {order.status}
                      </span>
                      <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669', display: 'block', marginTop: '4px' }}>
                        ₹{order.total_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  {!isCancelled ? (
                    <div style={{ padding: '20px 0', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                        {statusSteps.map((step, idx) => {
                          const isDone = idx <= stepIdx;
                          const isCurrent = idx === stepIdx;

                          return (
                            <div key={step} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: isDone ? '#059669' : '#E2E8F0',
                                  color: isDone ? '#FFFFFF' : '#64748B',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto 6px auto',
                                  border: isCurrent ? '3px solid #A7F3D0' : 'none',
                                }}
                              >
                                {isDone ? <CheckCircle size={16} /> : idx + 1}
                              </div>
                              <span style={{ fontSize: '0.72rem', fontWeight: isCurrent ? 800 : 600, color: isDone ? '#065F46' : '#94A3B8', display: 'block' }}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '14px 0', color: '#991B1B', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <XCircle size={16} />
                      <span>This order was cancelled. Stock has been restored.</span>
                    </div>
                  )}

                  {/* Order Items */}
                  <div style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {order.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Package size={16} className="text-amber-600 shrink-0" />
                          <div>
                            <span style={{ fontWeight: 800, color: 'var(--m63-slate)' }}>{item.product_name_snapshot}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>
                              ₹{item.unit_price_snapshot.toLocaleString('en-IN')} × {item.quantity}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontWeight: 800, color: '#059669' }}>₹{item.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions Area */}
                  {(!isCancelled && (order.status === 'PENDING' || order.status === 'CONFIRMED')) && (
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCancel(order.id)}
                        loading={cancellingId === order.id}
                        style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                      >
                        Cancel Order
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
