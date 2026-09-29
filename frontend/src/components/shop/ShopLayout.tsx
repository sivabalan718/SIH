import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Compass, Home, Mic, Search, ShoppingCart, Sparkles, User, X } from 'lucide-react';
import { fetchBuyerCart } from '../../services/cartService.js';
import { CART_EVENT, TOAST_EVENT } from '../../utils/shopStore.js';
import '../../styles/shop.css';

const NAV = [
  { to: '/marketplace', label: 'Home', icon: Home, match: (p: string) => p === '/marketplace' || p === '/marketplace/' },
  { to: '/marketplace/discover', label: 'Discover', icon: Compass, match: (p: string) => p.startsWith('/marketplace/discover') },
  { to: '/marketplace/cart', label: 'Cart', icon: ShoppingCart, match: (p: string) => p.startsWith('/marketplace/cart') || p.startsWith('/marketplace/checkout') },
  { to: '/marketplace/account', label: 'Account', icon: User, match: (p: string) => /^\/marketplace\/(account|orders|profile)/.test(p) },
  { to: '/marketplace/ai', label: 'M63 AI', icon: Sparkles, match: (p: string) => p.startsWith('/marketplace/ai') },
];

/** Browser speech recognition, when the device supports it. */
export function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const SpeechRecognition = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

  const start = () => {
    if (!SpeechRecognition || listening) return;
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => onResult(e.results?.[0]?.[0]?.transcript || '');
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  useEffect(() => () => recRef.current?.abort?.(), []);
  return { supported: Boolean(SpeechRecognition), listening, start };
}

export const ShopLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const path = location.pathname;
  // Screens with their own sticky action bar hide the bottom navigation.
  const isProductPage = path.startsWith('/marketplace/product/') || path.startsWith('/marketplace/checkout');
  const isHome = path === '/marketplace' || path === '/marketplace/';
  const [query, setQuery] = useState(params.get('q') || '');
  const [cartCount, setCartCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const loadCartCount = () =>
    fetchBuyerCart()
      .then((cart) => setCartCount(cart.items.reduce((n, i) => n + i.quantity, 0)))
      .catch(() => setCartCount(0));

  useEffect(() => {
    setQuery(path.startsWith('/marketplace/discover') ? params.get('q') || '' : '');
    window.scrollTo({ top: 0 });
    // Existing cart/checkout pages change the cart without events — refresh the badge per screen.
    loadCartCount();
  }, [path]);

  useEffect(() => {
    const onCart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'number') setCartCount(detail);
      else loadCartCount();
    };
    let timer: number | undefined;
    const onToast = (e: Event) => {
      setToast(String((e as CustomEvent).detail));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setToast(null), 2400);
    };
    window.addEventListener(CART_EVENT, onCart);
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(CART_EVENT, onCart);
      window.removeEventListener(TOAST_EVENT, onToast);
      window.clearTimeout(timer);
    };
  }, []);

  const submitSearch = (text: string) => {
    const q = text.trim();
    navigate(q ? `/marketplace/discover?q=${encodeURIComponent(q)}` : '/marketplace/discover');
  };
  const voice = useVoiceInput((text) => {
    setQuery(text);
    submitSearch(text);
  });

  return (
    <div className={`shop${isProductPage ? ' shop--no-nav' : ''}`}>
      <header className="shop-header">
        <div className="shop-header__row">
          {!isHome && (
            <button className="shop-header__icon shop-header__back" aria-label="Go back" onClick={() => navigate(-1)}>
              <ArrowLeft size={22} />
            </button>
          )}
          <button className="shop-brand" onClick={() => navigate('/marketplace')} aria-label="M63 home">
            M63 <small>Handmade</small>
          </button>
          <div className="shop-header__spacer" />
          <button className="shop-header__icon" aria-label={`Cart, ${cartCount} items`} onClick={() => navigate('/marketplace/cart')}>
            <ShoppingCart size={22} />
            {cartCount > 0 && <span className="shop-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
          </button>
        </div>
        <form
          className="shop-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch(query);
          }}
        >
          <Search size={18} color="#78716c" aria-hidden />
          <input
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pottery, silk, brass, artisans…"
            aria-label="Search M63"
          />
          {query && (
            <button type="button" className="shop-search__btn" aria-label="Clear search" onClick={() => setQuery('')}>
              <X size={18} />
            </button>
          )}
          {voice.supported && (
            <button
              type="button"
              className={`shop-search__btn${voice.listening ? ' shop-search__btn--listening' : ''}`}
              aria-label="Search by voice"
              onClick={voice.start}
            >
              <Mic size={18} />
            </button>
          )}
        </form>
      </header>

      <main className="shop-main">
        <Outlet />
      </main>

      {!isProductPage && (
        <nav className="shop-nav" aria-label="Marketplace">
          <div className="shop-nav__inner">
            {NAV.map(({ to, label, icon: Icon, match }) => {
              const active = match(path);
              return (
                <button key={to} className="shop-nav__item" aria-current={active ? 'page' : undefined} onClick={() => navigate(to)}>
                  {label === 'M63 AI' ? (
                    <span className="shop-nav__ai"><Icon size={17} /></span>
                  ) : (
                    <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                  )}
                  {label}
                  {label === 'Cart' && cartCount > 0 && <span className="shop-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {toast && <div className="shop-toast" role="status">{toast}</div>}
    </div>
  );
};
