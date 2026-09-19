import React, { useMemo, useState } from 'react';
import { Panel, AnimatedNumber, cv } from './primitives.js';
import { View, money, int } from './analyticsAdapter.js';
import { t } from './copy.js';

/* ------------------------------ Top products ------------------------------ */
export const ProductsPanel: React.FC<{ view: View; lang: string; className?: string }> = ({ view, lang, className }) => {
  const rows = view.products.slice(0, 7);
  const max = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <Panel className={className} title={t('topProducts', lang)} sub={t('byRevenue', lang)} delay={80}>
      {!rows.length ? (
        <div className="ix-empty">{t('empty', lang)}</div>
      ) : (
        <ol className="ix-plist">
          {rows.map((r, i) => (
            <li key={r.name + i} className={`ix-prow${i === 0 ? ' is-top' : ''}`} style={cv({ '--i': i, '--w': r.revenue / max })}>
              <span className="ix-rank">{i + 1}</span>
              <div className="ix-prow-main">
                <span className="ix-pname" title={r.name}>
                  {r.name}
                </span>
                <div className="ix-track">
                  <span className="ix-fill" />
                </div>
              </div>
              <div className="ix-prow-nums">
                <b>{money(r.revenue)}</b>
                {r.units > 0 && (
                  <span>
                    {int(r.units)} {t('units', lang)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
};

/* -------------------------------- Categories ------------------------------- */
const COLORS = ['#f2a900', '#e0525f', '#2ec4b6', '#8c96ff', '#ff8a3d', '#c58af9'];

export const CategoryPanel: React.FC<{ view: View; lang: string; className?: string }> = ({ view, lang, className }) => {
  const [active, setActive] = useState<number | null>(null);

  const slices = useMemo(() => {
    const cats = view.categories;
    const head = cats.slice(0, 5);
    const tail = cats.slice(5).reduce((s, c) => s + c.value, 0);
    const list = tail > 0 ? [...head, { name: t('other', lang), value: tail }] : head;
    const total = list.reduce((s, c) => s + c.value, 0) || 1;
    let start = 0;
    return list.map((c, i) => {
      const share = (c.value / total) * 100;
      const s = { ...c, share, start, color: COLORS[i % COLORS.length] };
      start += share;
      return s;
    });
  }, [view.categories, lang]);

  const cur = active !== null ? slices[active] : null;

  return (
    <Panel className={className} title={t('categories', lang)} delay={160}>
      {!slices.length ? (
        <div className="ix-empty">{t('empty', lang)}</div>
      ) : (
        <div className="ix-cat">
          <div className="ix-donut">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="40" className="ix-donut-track" />
              <g transform="rotate(-90 50 50)">
                {slices.map((s, i) => {
                  const len = Math.max(0, s.share - 1.2);
                  return (
                    <circle
                      key={s.name + i}
                      cx="50"
                      cy="50"
                      r="40"
                      pathLength={100}
                      className={`ix-arc${active === i ? ' is-active' : ''}${active !== null && active !== i ? ' is-dim' : ''}`}
                      style={cv({ '--len': len, '--rest': 100 - len, '--i': i, stroke: s.color, strokeDashoffset: -s.start })}
                    />
                  );
                })}
              </g>
            </svg>
            <div className="ix-donut-center">
              {cur ? (
                <>
                  <span className="ix-donut-name">{cur.name}</span>
                  <b>{Math.round(cur.share)}%</b>
                  <span className="ix-donut-sub">{money(cur.value)}</span>
                </>
              ) : (
                <>
                  <span className="ix-donut-name">{t('revenue', lang)}</span>
                  <b>
                    <AnimatedNumber value={view.revenue} format={(n) => money(n)} delay={700} />
                  </b>
                </>
              )}
            </div>
          </div>

          <ul className="ix-legend" onPointerLeave={() => setActive(null)}>
            {slices.map((s, i) => (
              <li
                key={s.name + i}
                className={active === i ? 'is-active' : ''}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                tabIndex={0}
                style={cv({ '--i': i })}
              >
                <i style={{ background: s.color }} />
                <span className="ix-legend-name">{s.name}</span>
                <b>{Math.round(s.share)}%</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
};
