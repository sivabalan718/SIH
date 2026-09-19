import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

export const reduced = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const cv = (o: Record<string, string | number>) => o as React.CSSProperties;

/* A panel tells everything inside it when it has scrolled into view,
   so charts start drawing exactly when the person can see them. */
const SeenContext = createContext<boolean>(true);
export const useSeen = () => useContext(SeenContext);

interface PanelProps {
  title?: string;
  sub?: React.ReactNode;
  className?: string;
  delay?: number;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ title, sub, className = '', delay = 0, children }) => {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced() || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={`ix-panel ${className}${seen ? ' is-in' : ''}`} style={cv({ '--d': `${delay}ms` })}>
      {title && (
        <header className="ix-ph">
          <h3>{title}</h3>
          {sub && <span className="ix-ph-sub">{sub}</span>}
        </header>
      )}
      <SeenContext.Provider value={seen}>
        <div className="ix-pb">{children}</div>
      </SeenContext.Provider>
    </section>
  );
};

/* Eases a number from its previous value to the new one. */
export function useTween(target: number, duration = 1500, delay = 0): number {
  const seen = useSeen();
  const [v, setV] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (!seen) return;
    const safe = Number.isFinite(target) ? target : 0;
    if (reduced()) {
      from.current = safe;
      setV(safe);
      return;
    }
    const begin = from.current;
    const t0 = performance.now() + delay;
    let raf = 0;
    const tick = (now: number) => {
      if (now < t0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const val = begin + (safe - begin) * eased;
      from.current = val;
      setV(val);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, seen]);

  return v;
}

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  duration?: number;
  delay?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, format, duration = 1500, delay = 400 }) => {
  const v = useTween(value, duration, delay);
  return (
    <span className="ix-num" aria-label={format(value)}>
      {format(v)}
    </span>
  );
};

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
