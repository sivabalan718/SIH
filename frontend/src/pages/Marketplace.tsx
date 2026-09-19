import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  ArrowUpDown,
  MapPin,
  Sparkles,
  AlertCircle,
  ShoppingCart,
  LogIn,
  Globe,
  ArrowLeft,
  ArrowUpRight,
  Check,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { fetchMarketplaceProducts, MarketplaceProductItem, MarketplaceFilterQuery } from '../services/marketplaceService.js';
import { addToBuyerCart, fetchBuyerCart } from '../services/cartService.js';
import { useAuth } from '../contexts/AuthContext.js';
import { SupportedLang, translations, translateProductName, translateCategoryName, translateProductDescription } from '../utils/marketplaceI18n.js';
import { handleProductImageError } from '../utils/imageFallback.js';

/* ------------------------------------------------------------------ *
 *  M63 Marketplace — "The gallery"
 *
 *  PRESENTATION-ONLY REDESIGN. Untouched from the original:
 *    - every import (services, contexts, utils, Button)
 *    - CATEGORIES, all state, all effects and their dependencies
 *    - loadProducts / loadCartCount / handleSearchSubmit / handleAddToCart
 *    - handleExit, handleLanguageChange, the localStorage key
 *    - every navigate() route and every translation key used
 *  Added (UI-only): scroll state, an "item just added" flag for the
 *  cart button feedback, and a decorative canvas / CSS animations.
 * ------------------------------------------------------------------ */

const CATEGORIES = ['All', 'Textiles', 'Pottery', 'Jewellery', 'Home Decor', 'Handicrafts', 'Apparel & Textiles', 'Wood Craft', 'Paintings', 'Other'];

type Tr = (typeof translations)[SupportedLang];

/* ----------------------- Decorative hero canvas --------------------- */

const HeroField: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    const start = last;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    const sprite = document.createElement('canvas');
    sprite.width = 32;
    sprite.height = 32;
    const sctx = sprite.getContext('2d');
    if (sctx) {
      const g = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(254,243,199,1)');
      g.addColorStop(0.25, 'rgba(251,191,36,0.85)');
      g.addColorStop(1, 'rgba(217,119,6,0)');
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, 32, 32);
    }

    const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() * 0.9 + 0.1, p: Math.random() * 6.28 }));
    type Ember = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; ph: number };
    const embers: Ember[] = [];
    let acc = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw(8, 0.016);
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);

      // slow gold threads
      for (let i = 0; i < 4; i++) {
        const base = h * (0.3 + i * 0.14);
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'rgba(251,191,36,0)');
        grad.addColorStop(0.5, `rgba(251,191,36,${0.14 - i * 0.02})`);
        grad.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 10) {
          const y = base + Math.sin(x * 0.004 + t * 0.4 + i * 1.3) * 26 + Math.sin(x * 0.011 - t * 0.3 + i) * 8 + mouse.y * 10;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * 1.4 + s.p);
        ctx.fillStyle = `rgba(226,232,240,${0.1 + 0.5 * tw * s.z})`;
        const sz = s.z * 1.6;
        ctx.fillRect(s.x * w - mouse.x * 14 * s.z, s.y * h - mouse.y * 8 * s.z, sz, sz);
      }

      if (!reduced) {
        acc += dt * 9;
        while (acc >= 1 && embers.length < 60) {
          embers.push({
            x: Math.random() * w,
            y: h + 8,
            vx: (Math.random() - 0.5) * 12,
            vy: -(16 + Math.random() * 40),
            life: 0,
            max: 4 + Math.random() * 5,
            r: 2 + Math.random() * 3.5,
            ph: Math.random() * 6.28,
          });
          acc -= 1;
        }
        acc = Math.min(acc, 1);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += dt;
        if (e.life > e.max) {
          embers.splice(i, 1);
          continue;
        }
        e.x += (e.vx + Math.sin(t * 1.4 + e.ph) * 9) * dt;
        e.y += e.vy * dt;
        const k = e.life / e.max;
        const a = Math.sin(k * Math.PI) * (0.55 + 0.45 * Math.sin(t * 8 + e.ph));
        const sz = e.r * (1 - k * 0.5) * 2;
        ctx.globalAlpha = Math.max(0, a) * 0.85;
        ctx.drawImage(sprite, e.x - sz, e.y - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const frame = (now: number) => {
      if (!visible) {
        raf = 0;
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      draw((now - start) / 1000, dt);
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    resize();

    let io: IntersectionObserver | null = null;
    if (!reduced) {
      parent.addEventListener('pointermove', onMove, { passive: true });
      io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      });
      io.observe(parent);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      parent.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={ref} className="mk-hero-canvas" aria-hidden="true" />;
};

/* ----------------------------- Product card -------------------------- */

interface ProductCardProps {
  product: MarketplaceProductItem;
  index: number;
  t: Tr;
  lang: SupportedLang;
  adding: boolean;
  added: boolean;
  onOpen: () => void;
  onAdd: (e: React.MouseEvent) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index, t, lang, adding, added, onOpen, onAdd }) => {
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    el.style.setProperty('--rx', `${(0.5 - py) * 5}deg`);
    el.style.setProperty('--ry', `${(px - 0.5) * 6}deg`);
  };
  const onLeave = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div className="mk-card-wrap" style={{ ['--i' as any]: Math.min(index, 14) }}>
      <article
        className="mk-card"
        role="link"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onOpen();
          }
        }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <div className="mk-media">
          {product.primary_image_url ? (
            <img
              src={product.primary_image_url}
              alt={product.name}
              loading="lazy"
              onError={(e) => handleProductImageError(e, product.category || product.craft_type)}
            />
          ) : (
            <div className="mk-media-empty">
              <Sparkles size={32} />
            </div>
          )}
          <div className="mk-shade" />

          <span className={`mk-stock ${product.is_in_stock ? 'is-in' : 'is-out'}`}>
            <i />
            {product.is_in_stock ? t.inStock(product.stock_quantity) : t.outOfStock}
          </span>

          <span className="mk-go" aria-hidden="true">
            <ArrowUpRight size={18} />
          </span>
        </div>

        <div className="mk-body">
          <span className="mk-cat">{translateCategoryName(product.craft_type || product.category, lang)}</span>
          <h3 className="mk-name">{translateProductName(product.name, lang)}</h3>
          <p className="mk-desc">{translateProductDescription(product.short_description, lang)}</p>

          <div className="mk-artisan">
            <MapPin size={14} />
            <span>{t.byArtisanLabel(product.artisan_name, product.artisan_location)}</span>
          </div>

          <div className="mk-foot">
            <div>
              <span className="mk-price-label">{t.sellingPrice}</span>
              <span className="mk-price">₹{product.price.toLocaleString('en-IN')}</span>
            </div>

            <div className="mk-actions">
              {product.is_in_stock && (
                <button
                  type="button"
                  className={`mk-add ${added ? 'is-added' : ''}`}
                  onClick={onAdd}
                  disabled={adding}
                  title={t.addToCart}
                  aria-label={t.addToCart}
                >
                  {adding ? <span className="mk-spinner" /> : added ? <Check size={16} /> : <ShoppingCart size={16} />}
                </button>
              )}
              <span className="mk-view">{t.viewDetails}</span>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

/* ----------------------------- Page ---------------------------------- */

export const Marketplace: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [products, setProducts] = useState<MarketplaceProductItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleExit = async () => {
    if (user?.role === 'ARTISAN') {
      navigate('/artisan/dashboard');
    } else {
      await logout();
      navigate('/login');
    }
  };

  // Preferred Language State
  const [selectedLang, setSelectedLang] = useState<SupportedLang>(() => {
    const saved = localStorage.getItem('m63_marketplace_lang');
    if (saved === 'ta' || saved === 'hi' || saved === 'en') return saved;
    if (user?.preferredLanguage === 'ta' || user?.preferredLanguage === 'hi') return user.preferredLanguage;
    return 'en';
  });

  const handleLanguageChange = (lang: SupportedLang) => {
    setSelectedLang(lang);
    localStorage.setItem('m63_marketplace_lang', lang);
  };

  const t = translations[selectedLang];

  // Filter States
  const [search, setSearch] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [sortOption, setSortOption] = useState<'recommended' | 'price_asc' | 'price_desc' | 'newest'>('recommended');
  const [cartCount, setCartCount] = useState<number>(0);
  const [addingId, setAddingId] = useState<string | null>(null);

  // UI-only state
  const [addedId, setAddedId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const rootRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const addedTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    loadProducts();
    loadCartCount();
  }, [activeCategory, sortOption]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const query: MarketplaceFilterQuery = {
        category: activeCategory,
        search: search.trim() || undefined,
        sort: sortOption,
      };
      const res = await fetchMarketplaceProducts(query);
      setProducts(res.products);
      setTotalCount(res.total);
    } catch (err: any) {
      setError(err.message || 'Unable to load marketplace products. Please check back shortly.');
    } finally {
      setLoading(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const cart = await fetchBuyerCart();
      const count = cart.items.reduce((acc, i) => acc + i.quantity, 0);
      setCartCount(count);
    } catch (e) {}
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    try {
      setAddingId(productId);
      await addToBuyerCart(productId, 1);
      await loadCartCount();
      // UI-only feedback: brief "added" tick on the button
      setAddedId(productId);
      window.clearTimeout(addedTimer.current);
      addedTimer.current = window.setTimeout(() => setAddedId(null), 1400);
    } catch (err: any) {
      alert(err.message || 'Failed to add item to cart');
    } finally {
      setAddingId(null);
    }
  };

  /* ---- UI-only effects ---- */

  // scroll progress + condensed nav
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        rootRef.current?.style.setProperty('--mk-p', String(max > 0 ? y / max : 0));
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  // sliding category indicator
  useLayoutEffect(() => {
    const measure = () => {
      const box = pillsRef.current;
      const el = box?.querySelector<HTMLButtonElement>('[data-active="true"]');
      if (!box || !el) return;
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
      const target = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
      box.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeCategory, selectedLang]);

  const tickerItems = CATEGORIES.filter((c) => c !== 'All');
  const titleWords = t.title.split(' ');
  const initial = user?.name ? user.name.trim().charAt(0).toUpperCase() : '';

  return (
    <div className={`mk-root ${scrolled ? 'is-scrolled' : ''}`} ref={rootRef}>
      <style>{css}</style>

      <div className="mk-progress" aria-hidden="true" />
      {loading && <div className="mk-loadbar" aria-hidden="true" />}

      {/* ------------------------------ Nav ------------------------------ */}
      <header className="mk-nav">
        <div className="mk-nav-inner">
          {/* Exit to M63 Home Button */}
          <button
            type="button"
            className="mk-btn mk-btn-ghost"
            onClick={handleExit}
            title="Exit Marketplace and go to M63 Artisan Landing Page"
          >
            <ArrowLeft size={16} />
            <span>{t.exitToHome}</span>
          </button>

          <div className="mk-lang">
            <span className="mk-lang-label">
              <Globe size={16} />
              <span>Language / மொழி / भाषा:</span>
            </span>
            <div className="mk-seg" role="group" aria-label="Language">
              {(['en', 'ta', 'hi'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLanguageChange(l)}
                  className={selectedLang === l ? 'is-active' : ''}
                  aria-pressed={selectedLang === l}
                >
                  {l === 'en' ? '🇬🇧 English' : l === 'ta' ? '🇮🇳 தமிழ்' : '🇮🇳 हिन्दी'}
                </button>
              ))}
            </div>
          </div>

          {/* Profile, Orders & Cart Quick Access */}
          <div className="mk-nav-actions">
            {user ? (
              <button
                type="button"
                className="mk-btn mk-btn-ghost"
                onClick={() => navigate(user.role === 'CUSTOMER' ? '/marketplace/profile' : '/artisan/profile')}
                title="View Profile"
              >
                <span className="mk-avatar">{initial || '·'}</span>
                <span>{user.name ? user.name.split(' ')[0] : t.profile}</span>
              </button>
            ) : (
              <button type="button" className="mk-btn mk-btn-ghost" onClick={() => navigate('/customer/login')}>
                <LogIn size={16} />
                <span>{t.signIn}</span>
              </button>
            )}
            <button type="button" className="mk-btn mk-btn-ghost" onClick={() => navigate('/marketplace/orders')}>
              <ShoppingBag size={16} />
              <span>{t.myOrders}</span>
            </button>
            <button type="button" className="mk-btn mk-btn-gold" onClick={() => navigate('/marketplace/cart')} aria-label={`${t.cart} (${cartCount})`}>
              <ShoppingCart size={16} />
              <span>{t.cart}</span>
              <span key={cartCount} className="mk-badge">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------ Hero ----------------------------- */}
      <section className="mk-hero">
        <HeroField />
        <div className="mk-hero-glow" aria-hidden="true" />
        <div className="mk-wrap mk-hero-inner">
          <div className="mk-hero-meta">
            <span className="mk-badge-pill">{t.badge}</span>
            <span className="mk-platform">{t.platform}</span>
          </div>
          <h1 className="mk-title" aria-label={t.title}>
            {titleWords.map((word, i) => (
              <span key={`${word}-${i}`} style={{ animationDelay: `${0.15 + i * 0.09}s` }}>
                {word}
                {i < titleWords.length - 1 ? '\u00A0' : ''}
              </span>
            ))}
          </h1>
          <p className="mk-subtitle">{t.subtitle}</p>
        </div>

        <div className="mk-ticker" aria-hidden="true">
          <div className="mk-ticker-track">
            {[0, 1].map((dup) => (
              <div className="mk-ticker-group" key={dup}>
                {tickerItems.map((c) => (
                  <span key={`${dup}-${c}`}>
                    <i />
                    {translateCategoryName(c, selectedLang)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- Toolbar ---------------------------- */}
      <div className="mk-toolbar">
        <div className="mk-wrap">
          {/* Search & Sort Controls Bar */}
          <div className="mk-controls">
            <form onSubmit={handleSearchSubmit} className="mk-search">
              <div className="mk-search-field">
                <Search size={18} />
                <input type="text" placeholder={t.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  borderRadius: '12px',
                }}
              >
                {t.searchBtn}
              </Button>
            </form>

            <div className="mk-sort">
              <ArrowUpDown size={16} />
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value as any)}>
                <option value="recommended">{t.sortRecommended}</option>
                <option value="price_asc">{t.sortPriceAsc}</option>
                <option value="price_desc">{t.sortPriceDesc}</option>
                <option value="newest">{t.sortNewest}</option>
              </select>
            </div>
          </div>

          {/* Category Pill Navigation */}
          <div className="mk-pills" ref={pillsRef}>
            <span
              className="mk-pill-indicator"
              style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width, opacity: indicator.ready ? 1 : 0 }}
            />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                data-active={activeCategory === cat}
                className={activeCategory === cat ? 'is-active' : ''}
                onClick={() => setActiveCategory(cat)}
              >
                {translateCategoryName(cat, selectedLang)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --------------------------- Main content ------------------------ */}
      <main className="mk-wrap mk-main">
        {/* Loading State */}
        {loading && (
          <div>
            <p className="mk-loading-text">
              <span className="mk-spinner mk-spinner-gold" />
              {t.loadingProducts}
            </p>
            <div className="mk-grid" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="mk-skel" style={{ ['--i' as any]: i }}>
                  <div className="mk-skel-img" />
                  <div className="mk-skel-body">
                    <span style={{ width: '38%' }} />
                    <span style={{ width: '80%', height: 16 }} />
                    <span style={{ width: '95%' }} />
                    <span style={{ width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mk-state mk-state-error" role="alert">
            <AlertCircle size={26} />
            <p>{error}</p>
            <Button size="sm" variant="secondary" onClick={loadProducts} style={{ marginTop: '12px' }}>
              {t.retry}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && products.length === 0 && (
          <div className="mk-state">
            <span className="mk-state-icon">
              <ShoppingBag size={44} />
            </span>
            <h3>{t.noProductsTitle}</h3>
            <p className="mk-state-sub">{t.noProductsSub}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setActiveCategory('All');
              }}
            >
              {t.resetFilters}
            </Button>
          </div>
        )}

        {/* Product Cards Grid */}
        {!loading && !error && products.length > 0 && (
          <div>
            <div className="mk-count">
              <span>{t.showingProducts(products.length, totalCount)}</span>
            </div>

            <div className="mk-grid">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  t={t}
                  lang={selectedLang}
                  adding={addingId === product.id}
                  added={addedId === product.id}
                  onOpen={() => navigate(`/marketplace/product/${product.id}`)}
                  onAdd={(e) => handleAddToCart(e, product.id)}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

/* ----------------------------- Styles -------------------------------- */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.mk-root {
  --bg: #05070f; --surface: rgba(255,255,255,.04); --line: rgba(255,255,255,.09);
  --text: #E5E7EB; --muted: #94A3B8; --gold: #F59E0B; --gold-2: #FBBF24; --gold-3: #FDE68A;
  position: relative; min-height: 100vh; color: var(--text); background: var(--bg); overflow-x: clip;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', 'Noto Sans Tamil', 'Noto Sans Devanagari', sans-serif;
}
.mk-root *, .mk-root *::before, .mk-root *::after { box-sizing: border-box; }
.mk-root::before { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(900px 500px at 15% -5%, rgba(76,29,149,.22), transparent 60%), radial-gradient(800px 500px at 90% 10%, rgba(217,119,6,.13), transparent 60%); }
.mk-wrap { width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 24px; }

.mk-progress { position: fixed; top: 0; left: 0; right: 0; height: 2px; z-index: 80; transform-origin: left; transform: scaleX(var(--mk-p, 0));
  background: linear-gradient(90deg, var(--gold), var(--gold-3)); box-shadow: 0 0 10px rgba(251,191,36,.7); }
.mk-loadbar { position: fixed; top: 0; left: 0; right: 0; height: 2px; z-index: 81; overflow: hidden; }
.mk-loadbar::after { content: ''; position: absolute; inset: 0; width: 35%; background: linear-gradient(90deg, transparent, var(--gold-2), transparent); animation: mk-load 1.1s ease-in-out infinite; }

/* Nav */
.mk-nav { position: sticky; top: 0; z-index: 60; transition: background .3s, box-shadow .3s, border-color .3s; border-bottom: 1px solid transparent; }
.is-scrolled .mk-nav { background: rgba(5,7,15,.78); -webkit-backdrop-filter: blur(18px) saturate(140%); backdrop-filter: blur(18px) saturate(140%);
  border-color: var(--line); box-shadow: 0 10px 40px -20px rgba(0,0,0,.8); }
.mk-nav-inner { max-width: 1280px; margin: 0 auto; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; min-height: 64px; }
.mk-nav-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.mk-btn { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border-radius: 12px; font: inherit; font-size: .82rem; font-weight: 700;
  cursor: pointer; white-space: nowrap; transition: transform .18s, background .2s, border-color .2s, box-shadow .2s, color .2s; }
.mk-btn:active { transform: scale(.97); }
.mk-btn-ghost { color: #F1F5F9; background: rgba(255,255,255,.06); border: 1px solid var(--line); }
.mk-btn-ghost:hover { background: rgba(255,255,255,.11); border-color: rgba(251,191,36,.45); }
.mk-btn-gold { color: #fff; border: none; background: linear-gradient(135deg, #F59E0B, #D97706); box-shadow: 0 6px 20px -6px rgba(245,158,11,.7); position: relative; }
.mk-btn-gold:hover { box-shadow: 0 8px 26px -4px rgba(245,158,11,.85); transform: translateY(-1px); }
.mk-btn:focus-visible, .mk-seg button:focus-visible, .mk-pills button:focus-visible, .mk-add:focus-visible, .mk-card:focus-visible,
.mk-search-field input:focus-visible, .mk-sort select:focus-visible { outline: 2px solid var(--gold-2); outline-offset: 2px; }
.mk-avatar { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: .72rem; font-weight: 800; color: #78350F; background: linear-gradient(135deg, var(--gold-3), var(--gold)); }
.mk-badge { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; display: inline-grid; place-items: center; font-size: .7rem; font-weight: 800;
  color: #78350F; background: #fff; animation: mk-pop .5s cubic-bezier(.2,1.6,.4,1); }

.mk-lang { display: flex; align-items: center; gap: 10px; }
.mk-lang-label { display: none; align-items: center; gap: 6px; font-size: .78rem; font-weight: 700; color: #CBD5E1; }
.mk-lang-label svg { color: var(--gold); }
@media (min-width: 1240px) { .mk-lang-label { display: inline-flex; } }
.mk-seg { display: inline-flex; padding: 4px; gap: 2px; border-radius: 12px; background: rgba(255,255,255,.05); border: 1px solid var(--line); }
.mk-seg button { height: 32px; padding: 0 12px; border-radius: 9px; border: none; background: transparent; color: #CBD5E1; font: inherit; font-size: .78rem; font-weight: 600; cursor: pointer; transition: background .2s, color .2s, box-shadow .2s; }
.mk-seg button:hover { color: #fff; }
.mk-seg button.is-active { background: linear-gradient(135deg, var(--gold-2), var(--gold)); color: #451A03; font-weight: 800; box-shadow: 0 4px 14px -4px rgba(245,158,11,.7); }

/* Hero */
.mk-hero { position: relative; overflow: hidden; padding: 56px 0 0; margin-top: -64px; padding-top: 120px; }
.mk-hero-canvas { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.mk-hero-glow { position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(600px 300px at 30% 40%, rgba(245,158,11,.12), transparent 70%); }
.mk-hero-inner { position: relative; z-index: 2; padding-bottom: 44px; }
.mk-hero-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; opacity: 0; animation: mk-rise .7s cubic-bezier(.2,.8,.2,1) .05s forwards; }
.mk-badge-pill { padding: 5px 12px; border-radius: 999px; font-size: .72rem; font-weight: 800; letter-spacing: .04em; color: #451A03;
  background: linear-gradient(135deg, var(--gold-3), var(--gold)); box-shadow: 0 0 24px -4px rgba(245,158,11,.7); }
.mk-platform { font-size: .85rem; font-weight: 600; color: var(--muted); }
.mk-title { margin: 0; font-family: 'Fraunces', Georgia, 'Noto Serif Tamil', 'Noto Serif Devanagari', serif; font-weight: 700; letter-spacing: -0.025em; line-height: 1.08;
  font-size: clamp(2.2rem, 5vw, 3.9rem); max-width: 16ch; }
.mk-title span { display: inline-block; opacity: 0; color: transparent; background: linear-gradient(100deg, #fff 30%, var(--gold-3) 48%, #fff 66%); background-size: 250% 100%;
  -webkit-background-clip: text; background-clip: text;
  animation: mk-word .9s cubic-bezier(.2,.8,.2,1) forwards, mk-shine 6s ease-in-out 1.4s infinite; }
.mk-subtitle { margin: 16px 0 0; max-width: 60ch; font-size: 1.02rem; line-height: 1.6; color: #CBD5E1; opacity: 0; animation: mk-rise .8s cubic-bezier(.2,.8,.2,1) .55s forwards; }

.mk-ticker { position: relative; z-index: 2; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: rgba(255,255,255,.02); overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
.mk-ticker-track { display: flex; width: max-content; animation: mk-marquee 46s linear infinite; }
.mk-ticker-group { display: flex; }
.mk-ticker span { display: inline-flex; align-items: center; gap: 14px; padding: 14px 22px; font-size: .78rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #94A3B8; white-space: nowrap; }
.mk-ticker i { width: 5px; height: 5px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 10px var(--gold); }

/* Toolbar */
.mk-toolbar { position: relative; z-index: 50; background: rgba(5,7,15,.82); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); border-bottom: 1px solid var(--line); }
@media (min-width: 900px) { .mk-toolbar { position: sticky; top: 64px; } }
.mk-controls { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; padding-top: 16px; }
.mk-search { flex: 1; min-width: 260px; display: flex; gap: 8px; }
.mk-search-field { position: relative; flex: 1; }
.mk-search-field svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted); transition: color .2s; pointer-events: none; }
.mk-search-field input { width: 100%; height: 44px; padding: 0 16px 0 44px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,.05); color: #fff; font: inherit; font-size: .9rem; outline: none; transition: border-color .2s, box-shadow .2s, background .2s; }
.mk-search-field input::placeholder { color: #64748B; }
.mk-search-field input:focus { border-color: rgba(251,191,36,.7); background: rgba(255,255,255,.07); box-shadow: 0 0 0 3px rgba(251,191,36,.14), 0 0 28px -6px rgba(245,158,11,.4); }
.mk-search-field:focus-within svg { color: var(--gold-2); }
.mk-sort { display: flex; align-items: center; gap: 8px; color: var(--muted); }
.mk-sort select { height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--line); background-color: #0B1020; color: #fff; font: inherit; font-size: .85rem; font-weight: 600; outline: none; cursor: pointer; }
.mk-sort select:focus { border-color: rgba(251,191,36,.7); }

.mk-pills { position: relative; display: flex; gap: 6px; overflow-x: auto; padding: 14px 0 16px; scrollbar-width: none; }
.mk-pills::-webkit-scrollbar { display: none; }
.mk-pill-indicator { position: absolute; left: 0; top: 14px; height: 36px; border-radius: 999px; pointer-events: none; z-index: 0;
  background: linear-gradient(135deg, var(--gold-2), var(--gold)); box-shadow: 0 6px 22px -6px rgba(245,158,11,.75);
  transition: transform .45s cubic-bezier(.2,.8,.2,1), width .45s cubic-bezier(.2,.8,.2,1), opacity .3s; }
.mk-pills button { position: relative; z-index: 1; flex: 0 0 auto; height: 36px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,.03);
  color: #CBD5E1; font: inherit; font-size: .83rem; font-weight: 600; white-space: nowrap; cursor: pointer; transition: color .25s, border-color .25s, background .25s; }
.mk-pills button:hover { border-color: rgba(251,191,36,.4); color: #fff; }
.mk-pills button.is-active { color: #451A03; font-weight: 800; border-color: transparent; background: transparent; }

/* Main */
.mk-main { position: relative; z-index: 2; padding-top: 32px; padding-bottom: 80px; }
.mk-count { margin-bottom: 18px; font-size: .85rem; font-weight: 600; color: var(--muted); animation: mk-fade .6s ease both; }
.mk-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }

/* Card */
.mk-card-wrap { opacity: 0; animation: mk-card-in .75s cubic-bezier(.2,.8,.2,1) forwards; animation-delay: calc(var(--i, 0) * 55ms); perspective: 1000px; }
.mk-card { --rx: 0deg; --ry: 0deg; position: relative; display: flex; flex-direction: column; height: 100%; border-radius: 20px; overflow: hidden; cursor: pointer;
  background: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025)); border: 1px solid var(--line);
  transform: rotateX(var(--rx)) rotateY(var(--ry)); transition: transform .25s ease-out, box-shadow .3s, border-color .3s; will-change: transform; }
.mk-card::after { content: ''; position: absolute; inset: 0; pointer-events: none; border-radius: inherit; opacity: 0; transition: opacity .3s;
  background: radial-gradient(320px circle at var(--mx, 50%) var(--my, 0%), rgba(251,191,36,.16), transparent 60%); }
.mk-card:hover { border-color: rgba(251,191,36,.4); box-shadow: 0 30px 60px -24px rgba(0,0,0,.9), 0 0 50px -18px rgba(245,158,11,.5); }
.mk-card:hover::after { opacity: 1; }

.mk-media { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: #0B1020; }
.mk-media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .9s cubic-bezier(.2,.8,.2,1), filter .5s; }
.mk-card:hover .mk-media img { transform: scale(1.08); }
.mk-media-empty { width: 100%; height: 100%; display: grid; place-items: center; color: #64748B; }
.mk-shade { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(5,7,15,.25) 0%, transparent 35%, rgba(5,7,15,.75) 100%); }
.mk-stock { position: absolute; top: 12px; right: 12px; display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: .7rem; font-weight: 800;
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid; }
.mk-stock i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.mk-stock.is-in { color: #6EE7B7; background: rgba(6,78,59,.55); border-color: rgba(16,185,129,.4); }
.mk-stock.is-in i { animation: mk-blink 2.2s ease-in-out infinite; }
.mk-stock.is-out { color: #FCA5A5; background: rgba(127,29,29,.55); border-color: rgba(239,68,68,.4); }
.mk-go { position: absolute; left: 14px; bottom: 14px; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; color: #451A03;
  background: linear-gradient(135deg, var(--gold-3), var(--gold)); transform: translate(-8px, 8px) scale(.7); opacity: 0; transition: transform .35s cubic-bezier(.2,1.4,.4,1), opacity .25s; }
.mk-card:hover .mk-go { transform: none; opacity: 1; }

.mk-body { display: flex; flex-direction: column; flex: 1; padding: 18px 18px 16px; }
.mk-cat { font-size: .68rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--gold-2); }
.mk-name { margin: 6px 0 6px; font-family: 'Fraunces', Georgia, 'Noto Serif Tamil', 'Noto Serif Devanagari', serif; font-size: 1.14rem; font-weight: 600; line-height: 1.3; color: #F8FAFC; letter-spacing: -.01em; }
.mk-desc { margin: 0 0 14px; font-size: .82rem; line-height: 1.5; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.mk-artisan { display: flex; align-items: center; gap: 6px; margin-top: auto; margin-bottom: 14px; font-size: .78rem; font-weight: 600; color: #94A3B8; }
.mk-artisan svg { color: var(--gold); flex-shrink: 0; }
.mk-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; padding-top: 14px; border-top: 1px solid var(--line); }
.mk-price-label { display: block; font-size: .68rem; font-weight: 600; color: #64748B; }
.mk-price { font-size: 1.32rem; font-weight: 800; letter-spacing: -.01em; color: var(--gold-3); text-shadow: 0 0 24px rgba(245,158,11,.35); }
.mk-actions { display: flex; align-items: center; gap: 8px; }
.mk-add { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; cursor: pointer; color: var(--gold-2);
  background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.35); transition: transform .18s, background .25s, color .25s, border-color .25s; }
.mk-add:hover:not(:disabled) { background: rgba(245,158,11,.22); transform: translateY(-1px); }
.mk-add:active:not(:disabled) { transform: scale(.92); }
.mk-add:disabled { cursor: progress; }
.mk-add.is-added { color: #6EE7B7; background: rgba(16,185,129,.16); border-color: rgba(16,185,129,.5); animation: mk-pop .5s cubic-bezier(.2,1.6,.4,1); }
.mk-view { display: inline-flex; align-items: center; height: 38px; padding: 0 14px; border-radius: 12px; font-size: .8rem; font-weight: 700; color: #fff;
  background: linear-gradient(135deg, #F59E0B, #D97706); box-shadow: 0 6px 18px -8px rgba(245,158,11,.8); transition: box-shadow .25s, transform .25s; }
.mk-card:hover .mk-view { box-shadow: 0 8px 24px -4px rgba(245,158,11,.9); transform: translateY(-1px); }

.mk-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(251,191,36,.3); border-top-color: var(--gold-2); animation: mk-rot .7s linear infinite; display: inline-block; }
.mk-spinner-gold { margin-right: 10px; vertical-align: -3px; }

/* Loading skeleton */
.mk-loading-text { margin: 0 0 18px; font-size: .9rem; font-weight: 600; color: var(--muted); }
.mk-skel { border-radius: 20px; overflow: hidden; border: 1px solid var(--line); background: rgba(255,255,255,.03); opacity: 0; animation: mk-fade .5s ease forwards; animation-delay: calc(var(--i, 0) * 60ms); }
.mk-skel-img { aspect-ratio: 4 / 3; }
.mk-skel-body { padding: 18px; display: grid; gap: 10px; }
.mk-skel-body span { display: block; height: 11px; border-radius: 6px; }
.mk-skel-img, .mk-skel-body span { background: linear-gradient(100deg, rgba(255,255,255,.04) 30%, rgba(255,255,255,.1) 50%, rgba(255,255,255,.04) 70%); background-size: 250% 100%; animation: mk-skel 1.4s ease-in-out infinite; }

/* Empty + error */
.mk-state { text-align: center; padding: 64px 24px; border-radius: 24px; border: 1px solid var(--line); background: rgba(255,255,255,.03); animation: mk-fade .6s ease both; }
.mk-state h3 { margin: 12px 0 0; font-family: 'Fraunces', Georgia, serif; font-size: 1.35rem; font-weight: 600; color: #F8FAFC; }
.mk-state p { margin: 6px auto 18px; color: var(--muted); }
.mk-state-sub { max-width: 400px; font-size: .9rem; }
.mk-state-icon { display: inline-grid; place-items: center; width: 84px; height: 84px; border-radius: 50%; color: var(--gold-2); background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.3); animation: mk-float 3.4s ease-in-out infinite; }
.mk-state-error { border-color: rgba(239,68,68,.4); background: rgba(239,68,68,.08); color: #FCA5A5; margin-bottom: 24px; padding: 32px 24px; }
.mk-state-error p { color: #FCA5A5; font-weight: 700; margin: 8px 0 0; }

/* Keyframes */
@keyframes mk-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes mk-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes mk-word { from { opacity: 0; transform: translateY(26px); filter: blur(10px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes mk-shine { 0%, 40% { background-position: 100% 0; } 80%, 100% { background-position: -100% 0; } }
@keyframes mk-card-in { from { opacity: 0; transform: translateY(34px) scale(.97); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes mk-marquee { to { transform: translateX(-50%); } }
@keyframes mk-load { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
@keyframes mk-pop { 0% { transform: scale(.6); } 100% { transform: scale(1); } }
@keyframes mk-blink { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
@keyframes mk-rot { to { transform: rotate(360deg); } }
@keyframes mk-skel { from { background-position: 100% 0; } to { background-position: -100% 0; } }
@keyframes mk-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

@media (max-width: 720px) {
  .mk-wrap, .mk-nav-inner { padding-left: 16px; padding-right: 16px; }
  .mk-nav-actions { width: 100%; }
  .mk-nav-actions .mk-btn { flex: 1; justify-content: center; padding: 0 10px; }
  .mk-grid { grid-template-columns: 1fr; }
  .mk-hero { padding-top: 150px; }
  .mk-title { max-width: none; }
}

@media (prefers-reduced-motion: reduce) {
  .mk-root *, .mk-root *::before, .mk-root *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
  .mk-card-wrap, .mk-hero-meta, .mk-subtitle, .mk-title span { opacity: 1 !important; }
  .mk-title span { color: #fff; -webkit-background-clip: border-box; background-clip: border-box; background: none; }
  .mk-ticker-track { animation: none; }
}
`;

export default Marketplace;