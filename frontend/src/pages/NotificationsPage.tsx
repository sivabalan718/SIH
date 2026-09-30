import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Settings2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import {
  AppNotification,
  ChannelStatus,
  fetchNotificationPrefs,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationPrefs,
  saveNotificationPrefs,
} from '../services/engagementService.js';
import '../styles/shop.css';

export const NOTIFICATIONS_EVENT = 'm63:notifications-changed';

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const PREF_ROWS: Array<{ key: keyof NotificationPrefs; label: string; hint: string }> = [
  { key: 'order_updates', label: 'Order updates', hint: 'Placed, paid, shipped, delivered, returns' },
  { key: 'new_products', label: 'New from artisans you like', hint: 'When artisans you bought from or saved add products' },
  { key: 'offers', label: 'Price drops', hint: 'When an item in your wishlist gets cheaper' },
  { key: 'sms', label: 'SMS', hint: 'Order updates by SMS' },
  { key: 'whatsapp', label: 'WhatsApp', hint: 'Order updates on WhatsApp' },
];

/** Inbox for customers (in the marketplace) and artisans (in the workspace). */
export const NotificationsPage: React.FC<{ variant: 'shop' | 'artisan' }> = ({ variant }) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [channels, setChannels] = useState<ChannelStatus | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const isCustomer = user?.role === 'CUSTOMER';

  useEffect(() => {
    if (!authLoading && !user) navigate(variant === 'shop' ? '/customer/login?next=/marketplace/notifications' : '/login', { replace: true });
  }, [authLoading, user]);

  const load = () => {
    setLoading(true);
    fetchNotifications()
      .then((r) => {
        setItems(r.notifications);
        setError(null);
      })
      .catch((e) => setError(e?.message || 'Could not load notifications.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    load();
    if (isCustomer) fetchNotificationPrefs().then((r) => {
      setPrefs(r.preferences);
      setChannels(r.channels);
    }).catch(() => undefined);
  }, [user?.id]);

  const changed = () => window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT));

  const open = async (n: AppNotification) => {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      markNotificationRead(n.id).then(changed).catch(() => undefined);
    }
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    await markAllNotificationsRead().catch(() => undefined);
    changed();
  };

  const togglePref = async (key: keyof NotificationPrefs) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      const r = await saveNotificationPrefs({ [key]: next[key] });
      setPrefs(r.preferences);
    } catch {
      setPrefs(prefs);
    }
  };

  const unread = items.filter((i) => !i.read_at).length;
  const dark = variant === 'artisan';
  const card: React.CSSProperties = dark
    ? { background: '#111A18', border: '1px solid #1F2E2B', color: '#F3EFE7' }
    : { background: '#fff', border: '1px solid var(--shop-line, #ece7df)' };

  return (
    <div className={variant === 'shop' ? 'shop-narrow' : ''} style={{ padding: variant === 'artisan' ? '20px 16px 40px' : 0, maxWidth: 760, margin: '0 auto' }}>
      <section className="cart-head" style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, borderRadius: variant === 'artisan' ? 14 : undefined }}>
        <Bell size={22} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Notifications</h1>
          <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>{unread ? `${unread} unread` : 'You’re all caught up'}</p>
        </div>
        {unread > 0 && (
          <button className="pill-btn" onClick={readAll} style={dark ? { background: '#1A2724', color: '#F3EFE7' } : undefined}>
            <CheckCheck size={15} style={{ verticalAlign: '-3px' }} /> Mark all read
          </button>
        )}
        {isCustomer && (
          <button className="pill-btn" aria-label="Notification settings" aria-expanded={showPrefs} onClick={() => setShowPrefs((s) => !s)}>
            <Settings2 size={16} />
          </button>
        )}
      </section>

      {showPrefs && prefs && (
        <section className="co-section" style={card}>
          <h2 className="pdp__h">Notify me about</h2>
          {PREF_ROWS.map((r) => {
            const unavailable = (r.key === 'sms' && !channels?.sms) || (r.key === 'whatsapp' && !channels?.whatsapp);
            return (
              <label key={r.key} className="list-row" style={{ cursor: unavailable ? 'not-allowed' : 'pointer', opacity: unavailable ? 0.55 : 1 }}>
                <span>
                  <strong style={{ display: 'block', fontSize: '0.92rem' }}>{r.label}</strong>
                  <span className="pcard__meta">{unavailable ? 'Coming soon — not enabled on M63 yet' : r.hint}</span>
                </span>
                <input type="checkbox" checked={Boolean(prefs[r.key]) && !unavailable} disabled={unavailable} onChange={() => togglePref(r.key)} style={{ width: 20, height: 20 }} />
              </label>
            );
          })}
        </section>
      )}

      <section style={{ marginTop: 8 }}>
        {loading && Array.from({ length: 4 }, (_, i) => <div key={i} className="skel" style={{ height: 70, margin: '8px 16px', borderRadius: 12 }} />)}
        {!loading && error && <div className="shop-empty">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="shop-empty" style={dark ? card : undefined}>
            <h3>No notifications yet</h3>
            <p>{variant === 'artisan' ? 'New orders and customer requests will appear here.' : 'Order updates and news from artisans you like will appear here.'}</p>
          </div>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => open(n)}
            className="orow"
            style={{ ...card, gridTemplateColumns: '12px 1fr', padding: '12px 14px', margin: '8px 16px', width: 'calc(100% - 32px)', background: n.read_at ? card.background : dark ? '#16241F' : '#fff8f1' }}
          >
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: n.read_at ? 'transparent' : '#C85A28', alignSelf: 'start', marginTop: 6 }} />
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: '0.92rem' }}>{n.title}</strong>
              {n.body && <span style={{ display: 'block', fontSize: '0.84rem', opacity: 0.8 }}>{n.body}</span>}
              <span className="pcard__meta" style={{ display: 'block', marginTop: 2 }}>
                {ago(n.created_at)}
              </span>
            </span>
          </button>
        ))}
      </section>
    </div>
  );
};

/** Unread count for header bells; refreshes on navigation and every minute. */
export function useUnreadNotifications(enabled: boolean, refreshKey?: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    const load = () => fetchNotifications().then((r) => setCount(r.unread)).catch(() => setCount(0));
    load();
    const t = window.setInterval(load, 60000);
    window.addEventListener(NOTIFICATIONS_EVENT, load);
    return () => {
      window.clearInterval(t);
      window.removeEventListener(NOTIFICATIONS_EVENT, load);
    };
  }, [enabled, refreshKey]);
  return count;
}
