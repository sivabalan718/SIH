import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mic, Send, Sparkles } from 'lucide-react';
import { MarketplaceProductItem } from '../../services/marketplaceService.js';
import { fetchBuyerOrders } from '../../services/orderService.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { ShopProductCard } from '../../components/shop/ShopProductCard.js';
import { rankSimilar, useCatalogIndex } from '../../components/shop/useCatalogIndex.js';
import { useVoiceInput } from '../../components/shop/ShopLayout.js';
import { formatINR, getShopLang, useShopStore } from '../../utils/shopStore.js';

/**
 * M63 AI (customer). Every answer is computed from verified marketplace data — listings,
 * Smart Catalogue attributes, verified ratings and the customer's own orders. It never
 * invents prices, stock, offers, product facts or order status.
 */

interface Msg {
  from: 'user' | 'bot';
  text: string;
  products?: MarketplaceProductItem[];
  action?: { label: string; to: string };
}

const SYNONYMS: Record<string, string[]> = {
  clay: ['pottery', 'terracotta', 'earthen', 'kulhad'],
  pottery: ['clay', 'terracotta', 'ceramic'],
  saree: ['sari', 'silk', 'textile', 'handloom'],
  silk: ['saree', 'textile'],
  cotton: ['textile', 'handloom'],
  jewellery: ['jewelry', 'earring', 'necklace', 'bangle', 'jhumka'],
  jewelry: ['jewellery', 'earring', 'necklace'],
  wood: ['wooden', 'carved', 'teak', 'rosewood'],
  wooden: ['wood', 'carved'],
  painting: ['art', 'madhubani', 'tanjore', 'canvas', 'paintings'],
  brass: ['metal', 'bronze'],
  decor: ['home decor', 'decoration', 'lamp', 'diya', 'vase'],
  bag: ['bags', 'tote', 'jute'],
};
const STOP = new Set(
  'show me find i want need some any the a an of for with in on and or to under below less than within above over more between from rs inr rupees products product items item handmade please can you get buy looking what which is are there'.split(' ')
);

function parsePrice(q: string) {
  const num = (s: string) => Number(s.replace(/[,₹]/g, ''));
  const between = q.match(/between\s*₹?\s*([\d,]+)\s*(?:and|-|to)\s*₹?\s*([\d,]+)/i);
  if (between) return { min: num(between[1]), max: num(between[2]) };
  const under = q.match(/(?:under|below|less than|within|upto|up to|<)\s*₹?\s*([\d,]+)/i);
  const over = q.match(/(?:above|over|more than|>)\s*₹?\s*([\d,]+)/i);
  return { min: over ? num(over[1]) : undefined, max: under ? num(under[1]) : undefined };
}

function searchCatalog(q: string, index: MarketplaceProductItem[]) {
  const { min, max } = parsePrice(q);
  const cleaned = q.toLowerCase().replace(/between\s*₹?[\d,]+\s*(and|-|to)\s*₹?[\d,]+|(under|below|less than|within|up ?to|above|over|more than)\s*₹?[\d,]+|₹\s*[\d,]+/g, ' ');
  const tokens = cleaned.split(/[^a-z஀-௿ऀ-ॿ]+/).filter((t) => t.length > 2 && !STOP.has(t));
  const inStockOnly = /in stock|available/.test(q.toLowerCase());

  const scored = index
    .filter((p) => (min === undefined || p.price >= min) && (max === undefined || p.price <= max) && (!inStockOnly || p.stock_quantity > 0))
    .map((p) => {
      const hay = {
        strong: [p.name, p.category, p.material, p.craft_type, p.subcategory].filter(Boolean).join(' ').toLowerCase(),
        weak: [p.short_description, ...(p.highlights || []), p.artisan_name].filter(Boolean).join(' ').toLowerCase(),
      };
      let score = 0;
      let matchedTokens = 0;
      for (const t of tokens) {
        const variants = [t, ...(SYNONYMS[t] || [])];
        const strong = variants.some((v) => hay.strong.includes(v));
        const weak = !strong && variants.some((v) => hay.weak.includes(v));
        if (strong) score += 3;
        if (weak) score += 1;
        if (strong || weak) matchedTokens++;
      }
      return { p, score, matchedTokens };
    });

  const results = tokens.length
    ? scored.filter((x) => x.matchedTokens === tokens.length || (tokens.length > 2 && x.matchedTokens >= tokens.length - 1)).sort((a, b) => b.score - a.score || (b.p.rating_average || 0) - (a.p.rating_average || 0))
    : scored.sort((a, b) => (b.p.rating_average || 0) - (a.p.rating_average || 0));
  return { products: results.map((x) => x.p), min, max, tokens };
}

/** Answer a question about one product strictly from its listing. */
function answerAboutProduct(q: string, p: MarketplaceProductItem, index: MarketplaceProductItem[]): Msg {
  const s = q.toLowerCase();
  const specs = Object.entries(p.specifications || {});
  const spec = (re: RegExp) => specs.find(([k]) => re.test(k.toLowerCase()))?.[1];

  if (/similar|like this|alternative|other options/.test(s)) {
    const sim = rankSimilar([p], index, 8);
    return sim.length
      ? { from: 'bot', text: `Here are products similar to ${p.name}, matched on category, craft and material.`, products: sim }
      : { from: 'bot', text: `I couldn't find closely similar products to ${p.name} right now.` };
  }
  if (/artisan|who made|maker|seller/.test(s)) {
    const more = index.filter((x) => x.artisan_id === p.artisan_id && x.id !== p.id);
    return {
      from: 'bot',
      text: `${p.name} is handmade by ${p.artisan_name}${p.artisan_location ? ` (${p.artisan_location})` : ''}. ${more.length ? `They have ${more.length} other product${more.length === 1 ? '' : 's'} on M63.` : 'This is their only listed product right now.'}`,
      products: more.slice(0, 8),
    };
  }
  if (/price|cost|how much/.test(s)) return { from: 'bot', text: `${p.name} is listed at ${formatINR(p.price)}, set by the artisan.` };
  if (/stock|available|availability|left/.test(s))
    return { from: 'bot', text: p.stock_quantity > 0 ? `Yes — ${p.stock_quantity} in stock right now.` : `${p.name} is currently out of stock.` };
  if (/material|made of|made from/.test(s)) {
    const m = p.material || spec(/material/);
    return { from: 'bot', text: m ? `According to the artisan's listing, it is made of ${m}.` : `The artisan hasn't specified the material for this product.` };
  }
  if (/craft|technique|how is it made|handmade how/.test(s)) {
    const c = p.craft_type || spec(/craft|technique/);
    return { from: 'bot', text: c ? `The listed craft technique is ${c}.` : `The artisan hasn't specified the craft technique.` };
  }
  if (/care|clean|wash|maintain/.test(s))
    return { from: 'bot', text: p.care_instructions ? `Care instructions from the listing: ${p.care_instructions}` : `The artisan hasn't added care instructions yet.` };
  if (/size|dimension|capacity|weight|how big|litre|cm/.test(s)) {
    const found = specs.filter(([k]) => /size|dimension|capacity|weight|height|width|length|volume/.test(k.toLowerCase()));
    return {
      from: 'bot',
      text: found.length ? found.map(([k, v]) => `${k}: ${v}`).join(' · ') : `The listing doesn't include size or capacity details.`,
    };
  }
  if (/review|rating|quality/.test(s))
    return {
      from: 'bot',
      text: p.review_count
        ? `It's rated ${p.rating_average?.toFixed(1)}/5 from ${p.review_count} verified purchase${p.review_count === 1 ? '' : 's'}.`
        : `${p.name} has no reviews yet.`,
    };

  // Suitability questions ("is this good for kitchen use?") — quote the listing, never guess.
  const words = s.split(/[^a-z]+/).filter((w) => w.length > 3 && !STOP.has(w) && !['this', 'suitable', 'good', 'use', 'used', 'usable'].includes(w));
  const text = [p.full_description, p.short_description, ...(p.highlights || []), ...specs.map(([k, v]) => `${k}: ${v}`)].join('. ');
  const sentences = text.split(/(?<=[.!?])\s+/);
  const hits = sentences.filter((sen) => words.some((w) => sen.toLowerCase().includes(w)));
  if (hits.length) return { from: 'bot', text: `From the artisan's listing: “${hits.slice(0, 2).join(' ')}”` };
  return {
    from: 'bot',
    text: `The listing doesn't say anything about that, so I can't confirm it. You can ask me about its price, stock, material, craft, size, care or reviews.`,
  };
}

const SUGGESTIONS = ['Handmade pottery under ₹1000', 'Show silk sarees', 'Where is my order?', 'Any offers?', 'Top rated products'];

export const ShopAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const lang = useShopStore(getShopLang);
  const { products: index, loading } = useCatalogIndex(lang);
  const contextId = params.get('product');
  const contextProduct = useMemo(() => index.find((p) => p.id === contextId) || null, [index, contextId]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        from: 'bot',
        text: contextProduct
          ? `Ask me anything about “${contextProduct.name}” — price, stock, material, craft, size, care, reviews, the artisan, or similar products.`
          : `Hi! I'm M63 AI. I can find handmade products, compare options, and check your orders — using only real M63 listings and your order history.`,
      },
    ]);
  }, [contextProduct?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const reply = async (q: string): Promise<Msg> => {
    const s = q.toLowerCase();
    if (/\b(order|track|delivery|deliver|shipped|parcel)\b/.test(s) && !/\bin stock\b/.test(s)) {
      if (user?.role !== 'CUSTOMER') return { from: 'bot', text: 'Please sign in to check your orders.', action: { label: 'Sign in', to: '/customer/login' } };
      try {
        const orders = await fetchBuyerOrders();
        if (!orders.length) return { from: 'bot', text: "You haven't placed any orders yet." };
        const o = orders[0];
        const items = o.items.reduce((n, i) => n + i.quantity, 0);
        return {
          from: 'bot',
          text: `Your latest order ${o.m63_order_number} (${items} item${items === 1 ? '' : 's'}, ${formatINR(o.total_amount)}) is ${o.status.toLowerCase()} — placed ${new Date(o.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.${orders.length > 1 ? ` You have ${orders.length} orders in total.` : ''}`,
          action: { label: 'View all orders', to: '/marketplace/orders' },
        };
      } catch {
        return { from: 'bot', text: "I couldn't load your orders right now. Please try again shortly.", action: { label: 'Open orders', to: '/marketplace/orders' } };
      }
    }
    if (/\b(offer|offers|discount|deal|deals|coupon|sale)\b/.test(s)) {
      const budget = index.filter((p) => p.price <= 500 && p.stock_quantity > 0).slice(0, 8);
      return {
        from: 'bot',
        text: `There are no active offers or discounts on M63 right now — prices are set directly by artisans.${budget.length ? ' Here are handmade picks under ₹500:' : ''}`,
        products: budget,
      };
    }
    if (contextProduct && !/\b(show|find|search)\b/.test(s)) return answerAboutProduct(q, contextProduct, index);
    if (/top rated|best rated|highest rated|popular/.test(s)) {
      const rated = index.filter((p) => (p.review_count || 0) > 0).sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0)).slice(0, 8);
      return rated.length
        ? { from: 'bot', text: 'Top rated products from verified purchases:', products: rated }
        : { from: 'bot', text: 'No products have verified reviews yet.' };
    }
    if (/^(hi|hello|hey|help|namaste|vanakkam)\b/.test(s))
      return { from: 'bot', text: 'Try “clay cups under ₹500”, “brass products”, “where is my order?”, or open a product and tap “Ask M63 AI”.' };

    const { products, min, max, tokens } = searchCatalog(q, index);
    const priceText = min !== undefined && max !== undefined ? ` between ${formatINR(min)} and ${formatINR(max)}` : max !== undefined ? ` under ${formatINR(max)}` : min !== undefined ? ` above ${formatINR(min)}` : '';
    if (!products.length) {
      return {
        from: 'bot',
        text: `I couldn't find listed products matching “${tokens.join(' ') || q}”${priceText}. Try a broader word like pottery, silk, brass or wood.`,
      };
    }
    const prices = products.map((p) => p.price);
    const inStock = products.filter((p) => p.stock_quantity > 0).length;
    return {
      from: 'bot',
      text: `Found ${products.length} product${products.length === 1 ? '' : 's'}${tokens.length ? ` for “${tokens.join(' ')}”` : ''}${priceText} — ${formatINR(Math.min(...prices))} to ${formatINR(Math.max(...prices))}, ${inStock} in stock.`,
      products: products.slice(0, 10),
      action: tokens.length ? { label: 'See all results', to: `/marketplace/discover?q=${encodeURIComponent(tokens.join(' '))}${max ? `&max=${max}` : ''}${min ? `&min=${min}` : ''}` } : undefined,
    };
  };

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setInput('');
    setMessages((m) => [...m, { from: 'user', text: q }]);
    const answer = await reply(q);
    setMessages((m) => [...m, answer]);
  };

  const voice = useVoiceInput((t) => ask(t));

  return (
    <div className="ai">
      <div className="ai__log" aria-live="polite">
        {contextProduct && (
          <button className="shop-chip" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(`/marketplace/product/${contextProduct.id}`)}>
            <Sparkles size={14} /> Asking about: {contextProduct.name}
          </button>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className={`ai__msg ai__msg--${m.from}`}>{m.text}</div>
            {m.products && m.products.length > 0 && (
              <div className="ai__results">
                <div className="shop-rail">
                  {m.products.map((p) => (
                    <ShopProductCard key={p.id} product={p} lang={lang} />
                  ))}
                </div>
              </div>
            )}
            {m.action && (
              <button className="shop-link" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(m.action!.to)}>
                {m.action.label} →
              </button>
            )}
          </div>
        ))}
        {messages.length <= 1 && (
          <div className="shop-chips" style={{ padding: 0, flexWrap: 'wrap' }}>
            {(contextProduct ? ['What is it made of?', 'Is it in stock?', 'Care instructions', 'Show similar products', 'Who made this?'] : SUGGESTIONS).map((s) => (
              <button key={s} className="shop-chip" onClick={() => ask(s)} disabled={loading}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="ai__composer">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={loading ? 'Loading marketplace…' : 'Ask M63 AI…'} aria-label="Ask M63 AI" enterKeyHint="send" />
          {voice.supported && (
            <button type="button" className={`shop-search__btn${voice.listening ? ' shop-search__btn--listening' : ''}`} aria-label="Ask by voice" onClick={voice.start}>
              <Mic size={18} />
            </button>
          )}
          <button type="submit" className="ai__send" aria-label="Send" disabled={!input.trim()}>
            <Send size={17} />
          </button>
        </form>
      </div>
    </div>
  );
};
