import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, ChevronRight, Globe, LogIn, LogOut, MapPin, Package, User, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { describeOrder, fetchBuyerOrders, OrderRecord } from '../../services/orderService.js';
import { useCatalogIndex } from '../../components/shop/useCatalogIndex.js';
import { handleProductImageError } from '../../utils/imageFallback.js';
import { getRecentlyViewed, getShopLang, getWishlist, setShopLang, useShopStore } from '../../utils/shopStore.js';
import { SupportedLang } from '../../utils/marketplaceI18n.js';
import { setEntryRole } from '../StartScreen.js';

const LANGS: Array<{ value: SupportedLang; label: string }> = [
  { value: 'en', label: 'EN' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'hi', label: 'हिन्दी' },
];

const Tile: React.FC<{ src?: string | null; label: string; onClick: () => void }> = ({ src, label, onClick }) => (
  <button className="hub-tile" onClick={onClick} aria-label={label}>
    <img src={src || ''} alt="" loading="lazy" onError={(e) => handleProductImageError(e)} />
  </button>
);

export const ShopAccount: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const lang = useShopStore(getShopLang);
  const wishlistIds = useShopStore(getWishlist);
  const recentIds = useShopStore(getRecentlyViewed);
  const { products } = useCatalogIndex(lang);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  useEffect(() => {
    if (user) fetchBuyerOrders().then(setOrders).catch(() => setOrders([]));
  }, [user?.id]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const wishlist = wishlistIds.map((id) => byId.get(id)).filter(Boolean) as typeof products;
  const recent = recentIds.map((id) => byId.get(id)).filter(Boolean) as typeof products;
  const buyAgain = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ id: string; img?: string | null; name: string }> = [];
    for (const o of orders.filter((o) => o.status === 'DELIVERED'))
      for (const i of o.items)
        if (!seen.has(i.product_id)) {
          seen.add(i.product_id);
          out.push({ id: i.product_id, img: i.primary_image_url, name: i.product_name_snapshot });
        }
    return out;
  }, [orders]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="shop-narrow">
      <section className="hub-top">
        <div className="hub-hello">
          <span className="hub-hello__avatar">
            <User size={20} />
          </span>
          <span style={{ flex: 1 }}>{user ? `Hello, ${user.name?.split(' ')[0] || 'there'}` : 'Hello, sign in'}</span>
          <select
            value={lang}
            onChange={(e) => setShopLang(e.target.value as SupportedLang)}
            aria-label="Product language"
            style={{ border: '1px solid var(--shop-line)', borderRadius: 8, padding: '6px 8px', fontSize: 16, background: '#fff' }}
          >
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        {!user && (
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="shop-btn shop-btn--pay" style={{ flex: 1 }} onClick={() => navigate('/customer/login?next=/marketplace/account')}>
              <LogIn size={16} /> Sign in
            </button>
            <button className="shop-btn shop-btn--ghost" style={{ flex: 1 }} onClick={() => navigate('/customer/register?next=/marketplace/account')}>
              <UserPlus size={16} /> Create account
            </button>
          </div>
        )}
        <div className="hub-chips">
          <button className="hub-chip" onClick={() => navigate('/marketplace/orders')}>Orders</button>
          <button className="hub-chip" onClick={() => (buyAgain.length ? scrollTo('hub-buyagain') : navigate('/marketplace/orders'))}>Buy Again</button>
          <button className="hub-chip" onClick={() => scrollTo('hub-account')}>Account</button>
          <button className="hub-chip" onClick={() => scrollTo('hub-lists')}>Lists</button>
        </div>
      </section>

      {user && orders.length > 0 && (
        <section className="hub-sec">
          <div className="hub-sec__head">
            <h2>Your Orders</h2>
            <button aria-label="All orders" onClick={() => navigate('/marketplace/orders')}>
              <ArrowRight size={24} />
            </button>
          </div>
          <div className="hub-rail">
            {orders.slice(0, 8).map((o) => (
              <div key={o.id}>
                <Tile src={o.items[0]?.primary_image_url} label={`Order ${o.m63_order_number}`} onClick={() => navigate(`/marketplace/orders/${o.id}`)} />
                <p className={`pcard__meta tone-${describeOrder(o).tone}`} style={{ marginTop: 4 }}>
                  {describeOrder(o).label}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {buyAgain.length > 0 && (
        <section className="hub-sec" id="hub-buyagain">
          <div className="hub-sec__head">
            <h2>Buy Again</h2>
            <button aria-label="All orders" onClick={() => navigate('/marketplace/orders')}>
              <ArrowRight size={24} />
            </button>
          </div>
          <div className="hub-grid">
            {buyAgain.slice(0, 6).map((b) => (
              <Tile key={b.id} src={b.img} label={`Buy ${b.name} again`} onClick={() => navigate(`/marketplace/product/${b.id}`)} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="hub-sec">
          <div className="hub-sec__head">
            <h2>Keep shopping for</h2>
          </div>
          <div className="hub-grid">
            {recent.slice(0, 6).map((p) => (
              <Tile key={p.id} src={p.primary_image_url} label={p.name} onClick={() => navigate(`/marketplace/product/${p.id}`)} />
            ))}
          </div>
        </section>
      )}

      <section className="hub-sec" id="hub-lists">
        <div className="hub-sec__head">
          <h2>Your Wishlist</h2>
          <span className="pcard__meta">{wishlist.length} saved</span>
        </div>
        {wishlist.length ? (
          <div className="hub-grid">
            {wishlist.map((p) => (
              <Tile key={p.id} src={p.primary_image_url} label={p.name} onClick={() => navigate(`/marketplace/product/${p.id}`)} />
            ))}
          </div>
        ) : (
          <p className="pdp__text">Tap the heart on any product to save it here.</p>
        )}
      </section>

      <section className="hub-sec" id="hub-account">
        <div className="hub-sec__head">
          <h2>Your Account</h2>
        </div>
        <button className="list-row" onClick={() => navigate('/marketplace/orders')}>
          <span>
            <Package size={18} style={{ verticalAlign: '-4px', marginRight: 10 }} />
            Your orders & tracking
          </span>
          <ChevronRight size={18} />
        </button>
        {user && (
          <button className="list-row" onClick={() => navigate('/marketplace/notifications')}>
            <span>
              <Bell size={18} style={{ verticalAlign: '-4px', marginRight: 10 }} />
              Notifications & settings
            </span>
            <ChevronRight size={18} />
          </button>
        )}
        <button className="list-row" onClick={() => navigate(user ? '/marketplace/profile' : '/customer/login?next=/marketplace/profile')}>
          <span>
            <MapPin size={18} style={{ verticalAlign: '-4px', marginRight: 10 }} />
            Profile & delivery address
          </span>
          <ChevronRight size={18} />
        </button>
        <div className="list-row">
          <span>
            <Globe size={18} style={{ verticalAlign: '-4px', marginRight: 10 }} />
            Product language
          </span>
          <span className="pcard__meta">{LANGS.find((l) => l.value === lang)?.label}</span>
        </div>
        {user?.role !== 'ARTISAN' && (
          <button
            className="list-row"
            onClick={() => {
              setEntryRole('ARTISAN');
              navigate('/login');
            }}
          >
            <span>
              <UserPlus size={18} style={{ verticalAlign: '-4px', marginRight: 10 }} />
              Are you an artisan? Sell on M63
            </span>
            <ChevronRight size={18} />
          </button>
        )}
        {user && (
          <button
            className="list-row"
            onClick={async () => {
              await logout();
              navigate('/marketplace');
            }}
          >
            <span>
              <LogOut size={18} style={{ verticalAlign: '-4px', marginRight: 10 }} />
              Sign out
            </span>
            <ChevronRight size={18} />
          </button>
        )}
      </section>
    </div>
  );
};
