import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { describeOrder, fetchBuyerOrders, OrderRecord } from '../../services/orderService.js';
import { handleProductImageError } from '../../utils/imageFallback.js';

export const ShopOrders: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  useEffect(() => {
    if (!authLoading && !user) navigate(`/customer/login?next=${encodeURIComponent('/marketplace/orders')}`, { replace: true });
  }, [authLoading, user]);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchBuyerOrders()
      .then(setOrders)
      .catch((e) => setError(e?.message || 'Could not load your orders.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (user) load();
  }, [user?.id]);

  const buyAgain = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ product_id: string; image?: string | null; name: string }> = [];
    for (const o of orders.filter((o) => o.status === 'DELIVERED')) {
      for (const i of o.items) {
        if (!seen.has(i.product_id)) {
          seen.add(i.product_id);
          list.push({ product_id: i.product_id, image: i.primary_image_url, name: i.product_name_snapshot });
        }
      }
    }
    return list;
  }, [orders]);

  const visible = orders.filter((o) => {
    if (filter === 'active' && ['DELIVERED', 'CANCELLED'].includes(o.status)) return false;
    if (filter === 'delivered' && o.status !== 'DELIVERED') return false;
    if (filter === 'cancelled' && o.status !== 'CANCELLED') return false;
    const q = query.trim().toLowerCase();
    return !q || o.m63_order_number.toLowerCase().includes(q) || o.items.some((i) => i.product_name_snapshot.toLowerCase().includes(q));
  });

  return (
    <div>
      <section className="cart-head" style={{ paddingBottom: 12 }}>
        <h1>Your Orders</h1>
        <div className="shop-search" style={{ margin: '12px 0 0', boxShadow: 'inset 0 0 0 1px #d6d3d1' }}>
          <Search size={18} color="#0f766e" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all orders" aria-label="Search all orders" />
        </div>
        <div className="shop-chips" style={{ padding: '10px 0 0' }}>
          {(['all', 'active', 'delivered', 'cancelled'] as const).map((f) => (
            <button key={f} className="shop-chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All orders' : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {buyAgain.length > 0 && (
        <section className="hub-sec" style={{ marginTop: 0, borderBottom: '8px solid var(--shop-bg)' }}>
          <div className="hub-sec__head">
            <h2 style={{ fontSize: '1.05rem' }}>Buy again</h2>
          </div>
          <div className="hub-rail" style={{ gridAutoColumns: '28%' }}>
            {buyAgain.map((b) => (
              <button key={b.product_id} className="hub-tile" aria-label={`Buy ${b.name} again`} onClick={() => navigate(`/marketplace/product/${b.product_id}`)}>
                <img src={b.image || ''} alt="" loading="lazy" onError={(e) => handleProductImageError(e)} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="hub-sec" style={{ marginTop: 0 }}>
        <div className="hub-sec__head">
          <div>
            <h2>Purchase history</h2>
            <p className="pcard__meta">
              {orders.length} order{orders.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {loading && Array.from({ length: 3 }, (_, i) => <div key={i} className="skel" style={{ height: 96, marginBottom: 10, borderRadius: 12 }} />)}

        {error && (
          <div className="shop-empty" style={{ margin: 0 }}>
            <p>{error}</p>
            <button className="shop-btn shop-btn--dark" style={{ marginTop: 10 }} onClick={load}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="shop-empty" style={{ margin: 0 }}>
            <h3>{orders.length ? 'No matching orders' : 'No orders yet'}</h3>
            <p>{orders.length ? 'Try another search or filter.' : 'When you buy handmade products, they will appear here.'}</p>
            {!orders.length && (
              <button className="shop-btn shop-btn--pay" style={{ marginTop: 12, padding: '0 22px' }} onClick={() => navigate('/marketplace')}>
                Start shopping
              </button>
            )}
          </div>
        )}

        {!loading &&
          visible.map((o) => {
            const first = o.items[0];
            const s = describeOrder(o);
            return (
              <button key={o.id} className="orow" onClick={() => navigate(`/marketplace/orders/${o.id}`)}>
                <span className="orow__img">
                  <img src={first?.primary_image_url || ''} alt="" loading="lazy" onError={(e) => handleProductImageError(e)} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="orow__name" style={{ display: 'block' }}>
                    {first?.product_name_snapshot || o.m63_order_number}
                    {o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}
                  </span>
                  <span className={`orow__status tone-${s.tone}`} style={{ display: 'block' }}>
                    {s.label}
                  </span>
                  <span className="pcard__meta" style={{ display: 'block' }}>
                    {o.m63_order_number}
                  </span>
                </span>
                <ChevronRight size={18} color="#a8a29e" />
              </button>
            );
          })}
      </section>
    </div>
  );
};
