/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * analyticsAdapter — the ONLY place that knows the shape of the backend payload.
 *
 * It reads `CalculatedAnalytics` + `BusinessInsight[]` exactly as returned by
 * fetchArtisanAnalytics and turns them into view-ready data. It never mutates,
 * re-fetches or re-calculates business numbers; the only derived values are
 * presentation ones (average per order when the backend doesn't send one,
 * shares for donut slices, best/busiest day).
 *
 * If a field in your payload is named differently, add the name to the key
 * lists below (top of file). Nothing else in the UI needs to change.
 */

export type Tone = 'good' | 'warn' | 'risk' | 'info';
export type FmtKind = 'money' | 'count' | 'percent';

/* ---------------- key lists: extend these if your names differ ---------------- */
const K_LABEL = ['label', 'date', 'day', 'period', 'name', 'x'];
const K_REVENUE = ['revenue', 'total_revenue', 'sales', 'amount', 'value'];
const K_ORDERS = ['orders', 'order_count', 'total_orders', 'num_orders', 'count'];
const K_NAME = ['name', 'product_name', 'title', 'product', 'label', 'category', 'category_name'];
const K_UNITS = ['units_sold', 'quantity_sold', 'units', 'quantity', 'sold', 'qty', 'orders', 'order_count'];
const K_STATUS = ['status', 'label', 'name', 'key', 'state', 'category'];
const K_COUNT = ['count', 'value', 'total', 'orders', 'quantity', 'items'];
const K_STOCK_QTY = ['stock', 'stock_quantity', 'quantity', 'qty', 'available', 'remaining'];
const K_TITLE = ['title', 'headline', 'heading', 'name', 'insight_title'];
const K_BODY = ['message', 'description', 'insight', 'text', 'summary', 'detail', 'details', 'body', 'content'];
const K_ACTION = ['action', 'recommendation', 'suggestion', 'next_step', 'cta'];
const K_TONE = ['type', 'severity', 'priority', 'sentiment', 'status', 'category', 'level'];

/* ---------------- helpers ---------------- */
const pickVal = (o: any, keys: string[]): any => {
  if (!o || typeof o !== 'object') return undefined;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

export const num = (v: any): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export const humanize = (k: string): string => {
  const s = String(k).replace(/[_\-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const asArray = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
};

const ISO = /^\d{4}-\d{2}-\d{2}/;
const prettyLabel = (v: any, i: number): string => {
  const s = String(v ?? i + 1);
  if (ISO.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  return s;
};

/* ---------------- formatters ---------------- */
const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
export const money = (n: number) => `₹${inr.format(Math.round(n))}`;
export const moneyShort = (n: number) => `₹${compact.format(n)}`;
export const int = (n: number) => inr.format(Math.round(n));
export const percent = (n: number) => `${Math.round(n * 10) / 10}%`;

export const fmtKindOf = (key: string): FmtKind =>
  /revenue|value|price|amount|worth|profit|sales/i.test(key)
    ? 'money'
    : /rate|percent|pct|growth|margin|ratio|share/i.test(key)
    ? 'percent'
    : 'count';

export const formatBy = (kind: FmtKind, v: number) => (kind === 'money' ? money(v) : kind === 'percent' ? percent(v) : int(v));

export const toneOfKey = (k: string): Tone =>
  /out|zero|empty|critical|cancel|fail|return|reject|refund|dead/i.test(k)
    ? 'risk'
    : /low|warn|reorder|pending|delay|hold|process|await|slow/i.test(k)
    ? 'warn'
    : /health|good|in.?stock|adequate|deliver|complet|fulfil|done|paid|ok\b/i.test(k)
    ? 'good'
    : 'info';

/* ---------------- shapes ---------------- */
export interface TrendPoint { label: string; revenue: number; orders: number }
export interface ProductRow { name: string; revenue: number; units: number }
export interface CategoryRow { name: string; value: number }
export interface Pair { key: string; label: string; value: number }
export interface StockView {
  segments: Pair[];
  extras: { label: string; text: string }[];
  watch: { title: string; items: { name: string; qty: number }[] } | null;
}
export interface Kpi { key: string; label: string; value: number; kind: FmtKind }
export interface Insight { title: string; body: string; action?: string; tone: Tone }

export interface View {
  revenue: number;
  orders: number;
  aov: number;
  trend: TrendPoint[];
  products: ProductRow[];
  categories: CategoryRow[];
  stock: StockView;
  fulfil: Pair[];
  extraKpis: Kpi[];
  insights: Insight[];
  best: TrendPoint | null;
  busiest: TrendPoint | null;
  changePct: number | null;
}

/* ---------------- converters ---------------- */
function toTrend(raw: any): TrendPoint[] {
  return asArray(raw).map((p, i) => ({
    label: prettyLabel(pickVal(p, K_LABEL), i),
    revenue: num(pickVal(p, K_REVENUE)),
    orders: num(pickVal(p, K_ORDERS)),
  }));
}

function toProducts(raw: any): ProductRow[] {
  return asArray(raw)
    .map((p) => ({
      name: String(pickVal(p, K_NAME) ?? '—'),
      revenue: num(pickVal(p, K_REVENUE)),
      units: num(pickVal(p, K_UNITS)),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function toCategories(raw: any): CategoryRow[] {
  const arr = asArray(raw).map((c) => ({
    name: String(pickVal(c, ['category', 'name', 'label', 'category_name']) ?? '—'),
    value: num(pickVal(c, [...K_REVENUE, 'units', 'count'])),
  }));
  return arr.filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
}

export function toPairs(raw: any): Pair[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    const objs = raw.filter((r) => r && typeof r === 'object');
    const hasCount = objs.some((r) => pickVal(r, K_COUNT) !== undefined);
    if (objs.length && !hasCount) {
      const tally: Record<string, number> = {};
      objs.forEach((r) => {
        const k = String(pickVal(r, K_STATUS) ?? 'other');
        tally[k] = (tally[k] || 0) + 1;
      });
      return Object.entries(tally).map(([k, v]) => ({ key: k, label: humanize(k), value: v }));
    }
    return raw.map((r, i) => {
      if (r && typeof r === 'object') {
        const label = String(pickVal(r, K_STATUS) ?? i);
        return { key: label, label: humanize(label), value: num(pickVal(r, K_COUNT)) };
      }
      return { key: String(i), label: String(i), value: num(r) };
    });
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).flatMap(([k, v]: [string, any]) => {
      if (typeof v === 'number') return [{ key: k, label: humanize(k), value: v }];
      if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return [{ key: k, label: humanize(k), value: Number(v) }];
      if (Array.isArray(v)) return [{ key: k, label: humanize(k), value: v.length }];
      if (v && typeof v === 'object' && pickVal(v, K_COUNT) !== undefined) return [{ key: k, label: humanize(k), value: num(pickVal(v, K_COUNT)) }];
      return [];
    });
  }
  return [];
}

function toStock(raw: any): StockView {
  const pairs = toPairs(raw);
  const isExtra = (k: string) => /^(total|all)|avg|average|rate|percent|pct|score|value|worth/i.test(k);
  const segments = pairs.filter((p) => !isExtra(p.key) && p.value >= 0);
  const extras = pairs
    .filter((p) => isExtra(p.key))
    .map((p) => ({ label: p.label, text: formatBy(fmtKindOf(p.key), p.value) }));

  let watch: StockView['watch'] = null;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries<any>(raw)) {
      if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
        const items = v
          .map((x) => ({ name: String(pickVal(x, K_NAME) ?? ''), qty: num(pickVal(x, K_STOCK_QTY)) }))
          .filter((i) => i.name)
          .slice(0, 4);
        if (items.length) {
          watch = { title: humanize(k), items };
          break;
        }
      }
    }
  }
  return { segments, extras, watch };
}

function toInsights(raw: any[]): Insight[] {
  return (raw || []).map((r: any) => {
    if (typeof r === 'string') return { title: firstSentence(r).head, body: firstSentence(r).rest, tone: 'info' as Tone };
    let title = String(pickVal(r, K_TITLE) ?? '');
    let body = String(pickVal(r, K_BODY) ?? '');
    if (!title && body) {
      const s = firstSentence(body);
      title = s.head;
      body = s.rest;
    }
    if (title === body) body = '';
    const toneSrc = String(pickVal(r, K_TONE) ?? '');
    const tone: Tone = /risk|critical|high|alert|danger|negative|declin|urgent/i.test(toneSrc)
      ? 'risk'
      : /warn|medium|caution|attention|low.?stock|watch/i.test(toneSrc)
      ? 'warn'
      : /good|success|positive|growth|opportun|win|praise/i.test(toneSrc)
      ? 'good'
      : 'info';
    const action = pickVal(r, K_ACTION);
    return { title, body, tone, action: action ? String(action) : undefined };
  });
}

function firstSentence(s: string): { head: string; rest: string } {
  const m = s.match(/^(.{12,90}?[.!?।])\s+(.*)$/s);
  return m ? { head: m[1], rest: m[2] } : { head: s.length > 90 ? s.slice(0, 87) + '…' : s, rest: s.length > 90 ? s : '' };
}

/* ---------------- main entry ---------------- */
export function buildView(analytics: any, rawInsights: any[]): View {
  const k = analytics?.kpis ?? {};
  const revenue = num(k.total_revenue);
  const orders = num(k.total_orders);
  const trend = toTrend(analytics?.revenue_trend);

  const aovRaw = pickVal(k, ['average_order_value', 'avg_order_value', 'aov']);
  const aov = aovRaw !== undefined ? num(aovRaw) : orders > 0 ? revenue / orders : 0;

  const used = ['total_revenue', 'total_orders', 'average_order_value', 'avg_order_value', 'aov'];
  const extraKpis: Kpi[] = Object.entries<any>(k)
    .filter(([key, v]) => !used.includes(key) && (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)))))
    .slice(0, 4)
    .map(([key, v]) => ({ key, label: humanize(key), value: num(v), kind: fmtKindOf(key) }));

  let best: TrendPoint | null = null;
  let busiest: TrendPoint | null = null;
  trend.forEach((p) => {
    if (!best || p.revenue > best.revenue) best = p;
    if (!busiest || p.orders > busiest.orders) busiest = p;
  });

  let changePct: number | null = null;
  if (trend.length >= 4) {
    const half = Math.floor(trend.length / 2);
    const a = trend.slice(0, half).reduce((s, p) => s + p.revenue, 0);
    const b = trend.slice(-half).reduce((s, p) => s + p.revenue, 0);
    if (a > 0) changePct = ((b - a) / a) * 100;
  }

  return {
    revenue,
    orders,
    aov,
    trend,
    products: toProducts(analytics?.product_performance),
    categories: toCategories(analytics?.category_performance),
    stock: toStock(analytics?.inventory_health),
    fulfil: toPairs(analytics?.fulfilment),
    extraKpis,
    insights: toInsights(rawInsights),
    best,
    busiest,
    changePct,
  };
}

/** One human sentence summarising the period, computed from the same trend the charts use. */
export function buildStory(v: View, lang: string): string {
  if (!v.best || v.best.revenue <= 0) return '';
  const day = v.best.label;
  const amt = money(v.best.revenue);
  const c = v.changePct;
  const pct = c === null ? '' : String(Math.round(Math.abs(c)));
  const up = (c ?? 0) >= 0;
  if (lang === 'ta')
    return `சிறந்த நாள் ${day} — ${amt}.` + (c === null ? '' : ` இக்காலத்தின் பிற்பாதி முதல் பாதியை விட ${pct}% ${up ? 'அதிகம்' : 'குறைவு'}.`);
  if (lang === 'hi')
    return `सबसे अच्छा दिन ${day} रहा, कमाई ${amt}.` + (c === null ? '' : ` दूसरा आधा हिस्सा पहले से ${pct}% ${up ? 'ज़्यादा' : 'कम'} है।`);
  return `Best day was ${day} with ${amt}.` + (c === null ? '' : ` The second half of this period is ${pct}% ${up ? 'higher' : 'lower'} than the first.`);
}
