import React, { useEffect, useRef, useState } from 'react';

/**
 * MotionKit — presentation only.
 * Nothing in here fetches, transforms or owns analytics data. Components receive
 * values that AnalyticsPage already has and only decide how they appear.
 */

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Localised picker with English fallback. */
export const pick = (dict: Record<string, string>, lang: string): string => dict[lang] ?? dict.en;

/* ------------------------------------------------------------------ */
/* useInView: flips to true once, the first time the element is seen   */
/* ------------------------------------------------------------------ */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, seen] as const;
}

/* ------------------------------------------------------------------ */
/* CountUp: eases from the previous value to the new one               */
/* ------------------------------------------------------------------ */
interface CountUpProps {
  value: number;
  format: (n: number) => string;
  duration?: number;
}

export const CountUp: React.FC<CountUpProps> = ({ value, format, duration = 1500 }) => {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!seen) return;
    const target = Number.isFinite(value) ? value : 0;
    if (prefersReducedMotion()) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }
    const begin = fromRef.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart: fast start, long settle
      const v = begin + (target - begin) * eased;
      fromRef.current = v;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, seen, duration]);

  return (
    <span ref={ref} className="m63x-num" aria-label={format(Number.isFinite(value) ? value : 0)}>
      {format(display)}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Chapter: a numbered stop on the thread. Wipes its content open.     */
/* ------------------------------------------------------------------ */
interface ChapterProps {
  index: number;
  title: string;
  children: React.ReactNode;
}

export const Chapter: React.FC<ChapterProps> = ({ index, title, children }) => {
  const [ref, seen] = useInView<HTMLElement>();
  return (
    <section ref={ref} className={`m63x-chapter${seen ? ' is-in' : ''}`} aria-label={title}>
      <header className="m63x-chapter-head">
        <span className="m63x-node" aria-hidden="true">
          {index}
        </span>
        <h2 className="m63x-chapter-title">{title}</h2>
        <span className="m63x-rule" aria-hidden="true" />
      </header>
      <div className="m63x-chapter-body">{children}</div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* PulseHero: the one memorable moment on the page                     */
/* Uses only kpis.total_revenue and kpis.total_orders, already fetched */
/* ------------------------------------------------------------------ */
interface PulseHeroProps {
  revenue: number;
  orders: number;
  period: string;
  lang: string;
}

const HERO_COPY = {
  revenue: { en: 'Revenue earned', ta: 'ஈட்டிய வருவாய்', hi: 'कुल कमाई' },
  orders: { en: 'Orders received', ta: 'பெற்ற ஆர்டர்கள்', hi: 'मिले ऑर्डर' },
  avg: { en: 'Average per order', ta: 'ஆர்டருக்கு சராசரி', hi: 'प्रति ऑर्डर औसत' },
};

const periodLabel = (period: string, lang: string): string => {
  const m = /^(\d+)d$/.exec(period);
  if (!m) return period;
  const n = m[1];
  if (lang === 'ta') return `கடந்த ${n} நாட்கள்`;
  if (lang === 'hi') return `पिछले ${n} दिन`;
  return `Last ${n} days`;
};

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const fmtMoney = (n: number) => `₹${inr.format(Math.round(n))}`;
const fmtInt = (n: number) => inr.format(Math.round(n));

export const PulseHero: React.FC<PulseHeroProps> = ({ revenue, orders, period, lang }) => {
  const rev = Number(revenue) || 0;
  const ord = Number(orders) || 0;
  const avg = ord > 0 ? rev / ord : 0;

  return (
    <div className="m63x-hero">
      <div className="m63x-hero-main">
        <p className="m63x-hero-period">{periodLabel(period, lang)}</p>
        <div className="m63x-hero-figure">
          <CountUp value={rev} format={fmtMoney} duration={1800} />
        </div>
        <svg className="m63x-weave" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden="true">
          <path className="m63x-weave-b" pathLength={1} d="M0 20 C 50 40, 100 0, 150 20 S 250 40, 300 20 S 400 0, 450 20 S 550 40, 600 20" />
          <path className="m63x-weave-a" pathLength={1} d="M0 20 C 50 0, 100 40, 150 20 S 250 0, 300 20 S 400 40, 450 20 S 550 0, 600 20" />
        </svg>
        <p className="m63x-hero-label">{pick(HERO_COPY.revenue, lang)}</p>
      </div>

      <div className="m63x-hero-side">
        <div className="m63x-hero-stat">
          <span className="m63x-hero-stat-value">
            <CountUp value={ord} format={fmtInt} duration={1400} />
          </span>
          <span className="m63x-hero-stat-label">{pick(HERO_COPY.orders, lang)}</span>
        </div>
        <div className="m63x-hero-stat">
          <span className="m63x-hero-stat-value">
            <CountUp value={avg} format={fmtMoney} duration={1600} />
          </span>
          <span className="m63x-hero-stat-label">{pick(HERO_COPY.avg, lang)}</span>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Loom: loading state. Warp threads rise and fall in a travelling wave */
/* ------------------------------------------------------------------ */
export const Loom: React.FC<{ message: string }> = ({ message }) => (
  <div className="m63x-loom" role="status" aria-live="polite">
    <div className="m63x-warp" aria-hidden="true">
      {Array.from({ length: 11 }).map((_, i) => (
        <span key={i} style={{ ['--i' as any]: i } as React.CSSProperties} />
      ))}
    </div>
    <p className="m63x-loom-text">{message}</p>
  </div>
);
