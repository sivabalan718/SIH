import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { Product, ProductStats } from '../types/product.js';
import { getProductStats, getProducts } from '../services/productService.js';
import { fetchArtisanOrders, OrderRecord } from '../services/orderService.js';
import { CopyableM63Id } from '../components/common/CopyableM63Id.js';
import { ProductCard } from '../components/product/ProductCard.js';
import { Button } from '../components/ui/Button.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Clock,
  Plus,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';

/**
 * Counts a number up from 0 to `target` with an eased curve, once `start` is true.
 * Respects prefers-reduced-motion by snapping straight to the target.
 */
function useCountUp(target: number, durationMs: number, start: boolean): number {
  const [value, setValue] = useState(0);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    if (!start) return;

    if (prefersReducedMotion.current) {
      setValue(target);
      return;
    }

    let frame: number;
    let startTime: number | null = null;

    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, start, durationMs]);

  return value;
}

const cssVar = (name: string, index: number): React.CSSProperties =>
  ({ [name]: index } as React.CSSProperties);

/* ---------- UI-only interaction helpers (no data / backend involved) ---------- */

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Feeds the cursor position into --mx / --my so CSS can draw a spotlight under the pointer. */
const trackSpotlight = (e: React.MouseEvent<HTMLElement>) => {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  el.style.setProperty('--my', `${e.clientY - rect.top}px`);
};

/** Wraps children in a card that leans toward the cursor. The children are rendered untouched. */
const TiltCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--rx', `${((0.5 - py) * 7).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((px - 0.5) * 9).toFixed(2)}deg`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div ref={ref} className="m63-tilt" onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {children}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<ProductStats | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoadingData(true);
        const [statsData, productsData, ordersData] = await Promise.all([
          getProductStats().catch(() => null),
          getProducts().catch(() => []),
          fetchArtisanOrders().catch(() => []),
        ]);
        if (statsData) setStats(statsData);
        setRecentProducts(productsData.slice(0, 3));
        setOrders(ordersData);
      } catch (err) {
        // Silently handle network errors
      } finally {
        setLoadingData(false);
      }
    }

    loadDashboardData();
  }, []);

  const totalProducts = stats?.total ?? recentProducts.length;
  const publishedProducts = stats?.published ?? recentProducts.filter((p) => p.status === 'PUBLISHED').length;
  const draftProducts = stats?.draft ?? recentProducts.filter((p) => p.status === 'DRAFT').length;

  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;
  const activeOrders = orders.filter((o) => o.status !== 'CANCELLED');
  const totalSales = activeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const readyToAnimate = !loadingData;
  const productsCount = useCountUp(totalProducts, 900, readyToAnimate);
  const ordersCount = useCountUp(totalOrdersCount, 900, readyToAnimate);
  const salesCount = useCountUp(totalSales, 1200, readyToAnimate);
  const draftsCount = useCountUp(draftProducts, 900, readyToAnimate);

  // Purely visual: share (0-1) used to fill the thin bar under each stat.
  const ratio = (part: number, whole: number) => (whole > 0 ? Math.min(1, Math.max(0, part / whole)) : 0);

  const ledgerItems = [
    {
      key: 'products',
      label: 'Products',
      value: productsCount,
      prefix: '',
      caption:
        totalProducts === 0
          ? 'Start building your catalogue'
          : `${publishedProducts} published · ${draftProducts} drafts`,
      icon: <Package size={19} />,
      accent: 'teal' as const,
      onClick: () => navigate('/artisan/products'),
      showPulse: false,
      progress: ratio(publishedProducts, totalProducts),
    },
    {
      key: 'orders',
      label: 'Orders',
      value: ordersCount,
      prefix: '',
      caption:
        totalOrdersCount === 0
          ? 'Orders will appear here'
          : pendingOrdersCount > 0
          ? `${pendingOrdersCount} pending confirmation`
          : `${totalOrdersCount} total orders received`,
      icon: <ShoppingCart size={19} />,
      accent: 'brass' as const,
      onClick: () => navigate('/artisan/orders'),
      showPulse: pendingOrdersCount > 0,
      progress: ratio(totalOrdersCount - pendingOrdersCount, totalOrdersCount),
    },
    {
      key: 'sales',
      label: 'Total sales',
      value: salesCount,
      prefix: '₹',
      caption:
        totalSales === 0
          ? 'Your sales activity will appear here'
          : `${activeOrders.length} active sales transactions`,
      icon: <TrendingUp size={19} />,
      accent: 'teal' as const,
      onClick: () => navigate('/artisan/orders'),
      showPulse: false,
      progress: ratio(activeOrders.length, totalOrdersCount),
    },
    {
      key: 'drafts',
      label: 'Draft products',
      value: draftsCount,
      prefix: '',
      caption: draftProducts === 0 ? 'No drafts pending' : 'Drafts awaiting publish',
      icon: <Clock size={19} />,
      accent: 'brass' as const,
      onClick: () => navigate('/artisan/products?status=DRAFT'),
      showPulse: false,
      progress: ratio(draftProducts, totalProducts),
    },
  ];

  // Soft glow that follows the pointer across the whole dashboard.
  const handleRootMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--cx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--cy', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={rootRef}
      className="m63-dashboard animate-fade-in"
      onMouseMove={handleRootMove}
      style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap');

        /* ============ Dark theme tokens (scoped to this page) ============ */
        .m63-dashboard {
          --m63d-bg: #0C1211;
          --m63d-ink: #F3EFE7;
          --m63d-ink-soft: #9CA6A2;
          --m63d-surface: rgba(255, 255, 255, 0.04);
          --m63d-surface-strong: rgba(255, 255, 255, 0.07);
          --m63d-teal: #5FB8B0;
          --m63d-teal-soft: rgba(95, 184, 176, 0.12);
          --m63d-brass: #E3AE55;
          --m63d-brass-soft: rgba(227, 174, 85, 0.15);
          --m63d-line: rgba(255, 255, 255, 0.09);
          --m63d-stitch: rgba(227, 174, 85, 0.5);
          --m63d-rust: #F0764E;

          color-scheme: dark;
          color: var(--m63d-ink);
          position: relative;
          isolation: isolate;
          overflow: hidden;
          padding: 28px clamp(16px, 3.5vw, 48px);
          min-height: calc(100vh - 60px);
          width: 100%;
          box-sizing: border-box;
          background: var(--m63d-bg);
        }
        @media (max-width: 640px) {
          .m63-dashboard { padding: 18px 14px; }
        }

        /* Everything except the background layer sits above it */
        .m63-dashboard > * { position: relative; z-index: 1; }
        .m63-dashboard > .m63-aurora { position: absolute; z-index: 0; }

        .m63-num { font-family: 'Space Grotesk', var(--m63-font-sans, inherit); }

        /* ============ Living background ============ */
        .m63-aurora {
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .m63-aurora span {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          will-change: transform;
        }
        .m63-aurora .a1 {
          width: 440px; height: 440px; top: -160px; left: -120px;
          background: radial-gradient(circle, rgba(47, 140, 130, 0.5), transparent 65%);
          animation: m63Drift1 20s ease-in-out infinite alternate;
        }
        .m63-aurora .a2 {
          width: 380px; height: 380px; top: 32%; right: -140px;
          background: radial-gradient(circle, rgba(227, 174, 85, 0.28), transparent 65%);
          animation: m63Drift2 24s ease-in-out infinite alternate;
        }
        .m63-aurora .a3 {
          width: 460px; height: 460px; bottom: -200px; left: 28%;
          background: radial-gradient(circle, rgba(189, 78, 42, 0.22), transparent 65%);
          animation: m63Drift3 28s ease-in-out infinite alternate;
        }
        /* faint dotted grid, echoes the stitch line */
        .m63-aurora::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
          background-size: 22px 22px;
          -webkit-mask-image: radial-gradient(ellipse at 50% 20%, #000 15%, transparent 72%);
          mask-image: radial-gradient(ellipse at 50% 20%, #000 15%, transparent 72%);
        }
        /* pointer-following glow */
        .m63-aurora::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(520px circle at var(--cx, 50%) var(--cy, -20%), rgba(95, 184, 176, 0.12), transparent 60%);
        }

        @keyframes m63Drift1 { to { transform: translate(140px, 90px) scale(1.15); } }
        @keyframes m63Drift2 { to { transform: translate(-160px, -70px) scale(1.1); } }
        @keyframes m63Drift3 { to { transform: translate(120px, -90px) scale(1.2); } }

        /* ============ Entrance choreography ============ */
        /* "backwards" fill: hidden during the delay, then hands control back to normal
           styles so hover / tilt transforms keep working afterwards. */
        .m63-anim-in {
          animation: m63RiseIn 0.7s cubic-bezier(.16,1,.3,1) backwards;
          animation-delay: calc(var(--i, 0) * 110ms);
        }

        @keyframes m63RiseIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes m63SweepIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes m63ScaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes m63PulseDot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(240, 118, 78, 0.55); }
          50% { box-shadow: 0 0 0 5px rgba(240, 118, 78, 0); }
        }

        @keyframes m63Shimmer {
          0% { background-position: -250% 0; }
          100% { background-position: 250% 0; }
        }

        @keyframes m63Float {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50% { transform: translateY(-5px) rotate(6deg); }
        }

        @keyframes m63Wave {
          0%, 60%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(14deg); }
          20%, 40% { transform: rotate(-8deg); }
          50% { transform: rotate(10deg); }
        }

        @keyframes m63StitchFlow {
          to { stroke-dashoffset: -100; }
        }

        /* ============ Header ============ */
        .m63-wave {
          display: inline-block;
          transform-origin: 70% 70%;
          animation: m63Wave 2.4s ease-in-out 1s 2;
          cursor: default;
        }
        .m63-wave:hover { animation: m63Wave 1.4s ease-in-out; }

        .m63-stitch {
          width: 100%;
          height: 7px;
          display: block;
          animation: m63RiseIn 0.7s cubic-bezier(.16,1,.3,1) backwards;
          animation-delay: 260ms;
        }
        .m63-stitch-line { animation: m63StitchFlow 7s linear infinite; }

        .m63-id-chip {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 5px;
          padding: 10px 16px;
          /* Ivory "ID tag": CopyableM63Id was designed for a light surface, so the chip
             stays light and the ID is always legible against the dark page. */
          background: #F3EFE7;
          border: 1px solid rgba(227, 174, 85, 0.55);
          border-radius: 12px;
          position: relative;
          color: #211D18;
          transition: box-shadow 0.25s ease, transform 0.25s cubic-bezier(.16,1,.3,1);
        }
        .m63-id-chip:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 26px -8px rgba(227, 174, 85, 0.45);
        }
        .m63-id-chip::before {
          content: '';
          position: absolute;
          top: 8px;
          right: 8px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--m63d-brass);
          opacity: 0.6;
        }
        /* ============ Primary actions ============ */
        .m63-action {
          display: inline-flex;
          transition: transform 0.25s cubic-bezier(.16,1,.3,1), filter 0.25s ease;
        }
        .m63-action:hover {
          transform: translateY(-2px);
          filter: drop-shadow(0 10px 18px rgba(95, 184, 176, 0.28));
        }
        .m63-action:active { transform: translateY(0) scale(0.97); }

        /* ============ Ledger (stats) ============ */
        .m63-ledger {
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, var(--m63d-surface-strong), var(--m63d-surface));
          border: 1px solid var(--m63d-line);
          border-radius: 18px;
          overflow: hidden;
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
        }

        .m63-ledger-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px 22px;
          background: transparent;
          border: none;
          border-top: 1px solid var(--m63d-line);
          cursor: pointer;
          text-align: left;
          font: inherit;
          color: inherit;
          animation: m63SweepIn 0.6s cubic-bezier(.16,1,.3,1) backwards;
          animation-delay: calc(420ms + var(--i, 0) * 90ms);
          transition: transform 0.2s ease;
        }
        .m63-ledger-item:first-child { border-top: none; }
        .m63-ledger-item:active { transform: scale(0.985); }
        .m63-ledger-item:focus-visible { outline: 2px solid var(--m63d-teal); outline-offset: -3px; }

        /* spotlight that tracks the cursor inside each stat */
        .m63-ledger-item::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), rgba(95, 184, 176, 0.17), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .m63-ledger-item:hover::before,
        .m63-ledger-item:focus-visible::before { opacity: 1; }
        .m63-ledger-item > * { position: relative; z-index: 1; }

        @media (min-width: 760px) {
          .m63-ledger { flex-direction: row; }
          .m63-ledger-item { flex: 1; border-top: none; border-left: 1px solid var(--m63d-line); }
          .m63-ledger-item:first-child { border-left: none; }
        }

        .m63-ledger-icon {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.35s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease;
        }
        .m63-ledger-icon.accent-teal { background: var(--m63d-teal-soft); color: var(--m63d-teal); }
        .m63-ledger-icon.accent-brass { background: var(--m63d-brass-soft); color: var(--m63d-brass); }
        .m63-ledger-item:hover .m63-ledger-icon { transform: rotate(-8deg) scale(1.12); }
        .m63-ledger-item:hover .m63-ledger-icon.accent-teal { box-shadow: 0 0 20px rgba(95, 184, 176, 0.35); }
        .m63-ledger-item:hover .m63-ledger-icon.accent-brass { box-shadow: 0 0 20px rgba(227, 174, 85, 0.35); }

        .m63-ledger-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .m63-ledger-label { font-size: 0.78rem; font-weight: 600; color: var(--m63d-ink-soft); }
        .m63-ledger-value {
          font-size: 1.85rem;
          font-weight: 700;
          color: var(--m63d-ink);
          line-height: 1.05;
          letter-spacing: -0.01em;
        }
        .m63-ledger-caption {
          font-size: 0.76rem;
          color: var(--m63d-ink-soft);
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* thin progress bar that fills once data has loaded */
        .m63-ledger-bar {
          display: block;
          height: 3px;
          margin-top: 8px;
          border-radius: 999px;
          background: var(--m63d-line);
          overflow: hidden;
        }
        .m63-ledger-bar-fill {
          display: block;
          height: 100%;
          border-radius: inherit;
          transform-origin: left center;
          transform: scaleX(var(--p, 0));
          transition: transform 1.1s cubic-bezier(.16,1,.3,1) 0.3s;
        }
        .m63-ledger-item .accent-teal ~ .m63-ledger-text .m63-ledger-bar-fill { background: var(--m63d-teal); }
        .m63-ledger-item .accent-brass ~ .m63-ledger-text .m63-ledger-bar-fill { background: var(--m63d-brass); }

        /* corner arrow that slides in on hover */
        .m63-ledger-go {
          position: absolute;
          top: 14px;
          right: 14px;
          color: var(--m63d-ink-soft);
          opacity: 0;
          transform: translate(-4px, 4px);
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .m63-ledger-item:hover .m63-ledger-go,
        .m63-ledger-item:focus-visible .m63-ledger-go {
          opacity: 1;
          transform: translate(0, 0);
        }

        .m63-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--m63d-rust);
          flex-shrink: 0;
          animation: m63PulseDot 1.8s ease-out infinite;
        }

        /* ============ Recent products ============ */
        .m63-dashboard .m63-card {
          background: var(--m63d-surface);
          border: 1px solid var(--m63d-line);
          border-radius: 18px;
          box-shadow: none;
          color: var(--m63d-ink);
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
        }

        .m63-recent-item {
          animation: m63ScaleIn 0.55s cubic-bezier(.16,1,.3,1) backwards;
          animation-delay: calc(560ms + var(--i, 0) * 100ms);
        }

        .m63-tilt {
          border-radius: 16px;
          transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(var(--ty, 0px));
          transition: transform 0.35s cubic-bezier(.16,1,.3,1), box-shadow 0.35s ease;
          will-change: transform;
        }
        .m63-tilt:hover {
          --ty: -4px;
          box-shadow: 0 22px 40px -20px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(95, 184, 176, 0.25);
        }

        /* ============ Assistant banner ============ */
        .m63-cta {
          position: relative;
          overflow: hidden;
        }
        .m63-cta::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%);
          background-size: 250% 100%;
          animation: m63Shimmer 5.5s ease-in-out infinite;
          pointer-events: none;
        }
        .m63-sparkle-icon {
          display: inline-flex;
          animation: m63Float 3.2s ease-in-out infinite;
        }

        /* ============ Reduced motion ============ */
        @media (prefers-reduced-motion: reduce) {
          .m63-dashboard .m63-anim-in,
          .m63-dashboard .m63-stitch,
          .m63-dashboard .m63-ledger-item,
          .m63-dashboard .m63-recent-item {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .m63-dashboard .m63-pulse-dot,
          .m63-dashboard .m63-cta::before,
          .m63-dashboard .m63-sparkle-icon,
          .m63-dashboard .m63-wave,
          .m63-dashboard .m63-stitch-line,
          .m63-dashboard .m63-aurora span {
            animation: none !important;
          }
          .m63-dashboard .m63-tilt,
          .m63-dashboard .m63-action,
          .m63-dashboard .m63-ledger-icon,
          .m63-dashboard .m63-ledger-bar-fill {
            transition: none !important;
          }
        }
      `}</style>

      {/* Ambient background: drifting colour glows + dotted grid + pointer glow */}
      <div className="m63-aurora" aria-hidden="true">
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
      </div>

      {/* Header Welcome Banner */}
      <div>
        <div
          className="m63-anim-in"
          style={{
            ...cssVar('--i', 0),
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div>
            <h1
              className="m63-num"
              style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--m63d-ink)', letterSpacing: '-0.02em' }}
            >
              Welcome to M63, {user?.name || 'Artisan'}{' '}
              <span className="m63-wave" role="img" aria-label="waving hand">
                👋
              </span>
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'var(--m63d-ink-soft)', marginTop: '4px' }}>
              Your digital workspace for managing and growing your craft business.
            </p>
          </div>

          <div className="m63-id-chip">
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B6357', letterSpacing: '0.02em' }}>
              Your public M63 ID
            </span>
            <CopyableM63Id m63Id={user?.m63Id || 'M63-MOMAOV'} size="normal" />
          </div>
        </div>

        <svg className="m63-stitch" viewBox="0 0 800 8" preserveAspectRatio="none" style={{ marginTop: '18px' }}>
          <line
            className="m63-stitch-line"
            x1="0"
            y1="4"
            x2="800"
            y2="4"
            stroke="var(--m63d-stitch)"
            strokeWidth="2"
            strokeDasharray="1 9"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* Prominent Primary Actions */}
      <div className="m63-anim-in" style={{ ...cssVar('--i', 1), display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <span className="m63-action">
          <Button
            variant="primary"
            size="lg"
            icon={<Plus size={22} />}
            onClick={() => navigate('/artisan/products/new')}
          >
            Create Product
          </Button>
        </span>

        <span className="m63-action">
          <Button
            variant="secondary"
            size="lg"
            icon={<Package size={20} style={{ color: 'var(--m63-primary)' }} />}
            onClick={() => navigate('/artisan/products')}
          >
            View Products
          </Button>
        </span>
      </div>

      {/* Ledger: real workspace stats */}
      <div className="m63-anim-in" style={cssVar('--i', 2)}>
        <div className="m63-ledger">
          {ledgerItems.map((item, i) => (
            <button
              key={item.key}
              className="m63-ledger-item"
              style={cssVar('--i', i)}
              onClick={item.onClick}
              onMouseMove={trackSpotlight}
              type="button"
            >
              <div className={`m63-ledger-icon accent-${item.accent}`}>{item.icon}</div>
              <div className="m63-ledger-text">
                <span className="m63-ledger-label">{item.label}</span>
                {loadingData ? (
                  <LoadingSpinner size={20} color="var(--m63d-teal)" />
                ) : (
                  <span className="m63-ledger-value m63-num">
                    {item.prefix}
                    {item.value.toLocaleString('en-IN')}
                  </span>
                )}
                <span className="m63-ledger-caption">
                  {item.showPulse && <span className="m63-pulse-dot" />}
                  {item.caption}
                </span>
                <span className="m63-ledger-bar" aria-hidden="true">
                  <span
                    className="m63-ledger-bar-fill"
                    style={cssVar('--p', loadingData ? 0 : item.progress)}
                  />
                </span>
              </div>
              <ArrowUpRight className="m63-ledger-go" size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Products Section */}
      <div className="m63-card m63-anim-in" style={cssVar('--i', 3)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--m63d-ink)' }}>
              Recent Products
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--m63d-ink-soft)' }}>
              Your latest handcrafted catalogue items.
            </p>
          </div>

          {recentProducts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/artisan/products')}
              style={{ fontWeight: 700, color: 'var(--m63d-teal)' }}
            >
              View All ({totalProducts}) →
            </Button>
          )}
        </div>

        {loadingData ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <LoadingSpinner size={24} color="var(--m63d-teal)" />
          </div>
        ) : recentProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--m63-radius-md)', border: '1px dashed rgba(255,255,255,0.16)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--m63d-ink)', fontWeight: 600 }}>No products created yet</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--m63d-ink-soft)', marginTop: '2px', marginBottom: '16px' }}>
              Create your first product to start building your catalogue.
            </p>
            <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={() => navigate('/artisan/products/new')}>
              Create Product
            </Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {recentProducts.map((prod, i) => (
              <div key={prod.id} className="m63-recent-item" style={cssVar('--i', i)}>
                <TiltCard>
                  <ProductCard product={prod} onClick={() => navigate(`/artisan/products/${prod.id}`)} />
                </TiltCard>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entry Banner for M63 Assistant */}
      <div
        className="m63-card m63-cta m63-anim-in"
        style={{
          ...cssVar('--i', 4),
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          border: '1px solid rgba(227, 174, 85, 0.22)',
          boxShadow: '0 24px 50px -28px rgba(227, 174, 85, 0.35)',
          color: '#FFFFFF',
          padding: '28px',
          borderRadius: 'var(--m63-radius-xl)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        <div style={{ maxWidth: '520px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(169, 117, 36, 0.22)', border: '1px solid rgba(169, 117, 36, 0.45)', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, color: '#E7B96A', marginBottom: '12px' }}>
            <span className="m63-sparkle-icon"><Sparkles size={14} /></span> M63 Smart AI Workspace
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
            Ready to list your artisan craft product?
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '6px', lineHeight: 1.5 }}>
            Use multilingual voice recording, automated AI extraction, smart photo enhancement, and smart catalogue generation in one unified workspace.
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }} className="m63-action">
          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight size={18} />}
            onClick={() => navigate('/artisan/products/new')}
          >
            Create Product Listing
          </Button>
        </div>
      </div>
    </div>
  );
};