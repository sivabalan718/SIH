import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, Truck, AlertCircle, Package, MapPin, User, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { fetchArtisanOrders, updateOrderStatus, OrderRecord, OrderStatus } from '../services/orderService.js';

export const ArtisanOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | OrderStatus>('ALL');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchArtisanOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Unable to load artisan order requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      await updateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = activeFilter === 'ALL' ? orders : orders.filter((o) => o.status === activeFilter);

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const processingCount = orders.filter((o) => o.status === 'PROCESSING').length;
  const shippedCount = orders.filter((o) => o.status === 'SHIPPED').length;

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--m63-bg-canvas)', minHeight: '100vh' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'var(--m63-primary)', color: '#FFFFFF' }}>
            <ShoppingCart size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--m63-slate)', margin: 0 }}>
              M63 Order Workspace
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--m63-slate-subtle)', margin: 0 }}>
              Manage incoming buyer purchases, confirm orders, and track delivery milestones.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '14px', border: '1px solid var(--m63-border)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block' }}>TOTAL ORDERS</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--m63-slate)' }}>{orders.length}</span>
        </div>
        <div style={{ backgroundColor: '#FEF3C7', padding: '16px', borderRadius: '14px', border: '1px solid #FCD34D' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E', display: 'block' }}>PENDING CONFIRMATION</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#78350F' }}>{pendingCount}</span>
        </div>
        <div style={{ backgroundColor: '#E0F2FE', padding: '16px', borderRadius: '14px', border: '1px solid #7DD3FC' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#075985', display: 'block' }}>IN PROCESSING / SHIPPED</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0369A1' }}>{processingCount + shippedCount}</span>
        </div>
      </div>

      {/* Status Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px' }}>
        {(['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setActiveFilter(st)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: activeFilter === st ? '1.5px solid var(--m63-primary)' : '1px solid var(--m63-border)',
              backgroundColor: activeFilter === st ? 'var(--m63-primary-light)' : '#FFFFFF',
              color: activeFilter === st ? 'var(--m63-primary)' : 'var(--m63-slate)',
              fontWeight: activeFilter === st ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {st} {st !== 'ALL' && `(${orders.filter((o) => o.status === st).length})`}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--m63-primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: 600, color: 'var(--m63-slate)' }}>Loading customer orders...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '16px', color: '#991B1B', textAlign: 'center' }}>
          <AlertCircle size={24} style={{ display: 'block', margin: '0 auto 8px auto' }} />
          <p style={{ fontWeight: 700, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredOrders.length === 0 && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--m63-border)', padding: '60px 24px', textAlign: 'center' }}>
          <ShoppingCart size={44} className="text-amber-500" style={{ display: 'block', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--m63-slate)' }}>No orders in this view</h3>
          <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
            When buyers purchase your registered products in the marketplace, their orders will appear here.
          </p>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredOrders.map((order) => {
            const isPending = order.status === 'PENDING';
            const isConfirmed = order.status === 'CONFIRMED';
            const isProcessing = order.status === 'PROCESSING';
            const isShipped = order.status === 'SHIPPED';
            const isDelivered = order.status === 'DELIVERED';
            const isCancelled = order.status === 'CANCELLED';

            return (
              <div
                key={order.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: isPending ? '1.5px solid #F59E0B' : '1px solid var(--m63-border)',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                {/* Order Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#D97706' }}>
                        ORDER #{order.m63_order_number}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        • Placed {new Date(order.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                      <User size={14} className="text-slate-500 shrink-0" />
                      <span>Customer: <strong>{order.shipping_name}</strong> ({order.shipping_phone})</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span>{order.shipping_address}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: '12px',
                        backgroundColor: isCancelled ? '#FEE2E2' : isDelivered ? '#D1FAE5' : isPending ? '#FEF3C7' : '#E0F2FE',
                        color: isCancelled ? '#991B1B' : isDelivered ? '#065F46' : isPending ? '#92400E' : '#0369A1',
                      }}
                    >
                      ● {order.status}
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669', display: 'block', marginTop: '4px' }}>
                      ₹{order.total_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Items Ordered List */}
                <div style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid #F1F5F9' }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Package size={16} className="text-amber-600 shrink-0" />
                        <div>
                          <span style={{ fontWeight: 800, color: 'var(--m63-slate)' }}>{item.product_name_snapshot}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>
                            Unit Price: ₹{item.unit_price_snapshot.toLocaleString('en-IN')} × {item.quantity}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, color: '#059669' }}>₹{item.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                {/* Action Controls for Artisan */}
                <div style={{ paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                    {isPending && 'Action Required: Confirm or reject buyer order.'}
                    {isConfirmed && 'Order confirmed! Mark when processing begins.'}
                    {isProcessing && 'Processing item! Mark when shipped to buyer.'}
                    {isShipped && 'Item shipped! Mark delivered upon completion.'}
                    {isDelivered && '✓ Order completed & delivered.'}
                    {isCancelled && '✕ Order cancelled.'}
                  </span>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}
                          loading={updatingId === order.id}
                          style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                        >
                          Reject / Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<Check size={14} />}
                          onClick={() => handleStatusUpdate(order.id, 'CONFIRMED')}
                          loading={updatingId === order.id}
                        >
                          Confirm Order
                        </Button>
                      </>
                    )}

                    {isConfirmed && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Package size={14} />}
                        onClick={() => handleStatusUpdate(order.id, 'PROCESSING')}
                        loading={updatingId === order.id}
                      >
                        Start Processing
                      </Button>
                    )}

                    {isProcessing && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Truck size={14} />}
                        onClick={() => handleStatusUpdate(order.id, 'SHIPPED')}
                        loading={updatingId === order.id}
                      >
                        Mark Shipped
                      </Button>
                    )}

                    {isShipped && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<CheckCircle2 size={14} />}
                        onClick={() => handleStatusUpdate(order.id, 'DELIVERED')}
                        loading={updatingId === order.id}
                        style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                      >
                        Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
