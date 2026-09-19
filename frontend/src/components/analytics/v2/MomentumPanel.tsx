import React, { useMemo, useState } from 'react';
import { Panel, AnimatedNumber, useSize, cv } from './primitives.js';
import { View, money, moneyShort, int } from './analyticsAdapter.js';
import { t } from './copy.js';

const PAD = { l: 12, r: 12, t: 16, b: 26 };

/** Catmull-Rom → cubic bezier, clamped so curves never dip under the baseline. */
function smooth(pts: [number, number][], yBase: number): string {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1y = Math.min(yBase, p1[1] + (p2[1] - p0[1]) / 6);
    const c2y = Math.min(yBase, p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

interface Props {
  view: View;
  periodLabel: string;
  lang: string;
  className?: string;
}

export const MomentumPanel: React.FC<Props> = ({ view, periodLabel, lang, className }) => {
  const { trend } = view;
  const n = trend.length;
  const [active, setActive] = useState<number | null>(null);
  const [wrapRef, size] = useSize<HTMLDivElement>();
  const W = size.w;
  const H = size.h;

  const avgDaily = useMemo(() => (n ? trend.reduce((s, p) => s + p.revenue, 0) / n : 0), [trend, n]);
  const peakIdx = useMemo(() => {
    let bi = -1;
    trend.forEach((p, i) => {
      if (bi < 0 || p.revenue > trend[bi].revenue) bi = i;
    });
    return bi;
  }, [trend]);

  const g = useMemo(() => {
    if (!W || !H || !n) return null;
    const barsH = Math.min(64, Math.max(34, H * 0.22));
    const yBase = H - PAD.b - barsH - 14;
    const yTop = PAD.t + 10;
    const innerW = W - PAD.l - PAD.r;
    const step = n > 1 ? innerW / (n - 1) : 0;
    const xs = trend.map((_, i) => (n > 1 ? PAD.l + i * step : PAD.l + innerW / 2));
    const maxR = Math.max(...trend.map((p) => p.revenue), 1) * 1.1;
    const maxO = Math.max(...trend.map((p) => p.orders), 1);
    const ys = trend.map((p) => yBase - (p.revenue / maxR) * (yBase - yTop));
    const barBase = H - PAD.b;
    const barW = Math.max(2, Math.min(24, (n > 1 ? step : innerW) * 0.56));
    const bars = trend.map((p) => (p.orders > 0 ? Math.max(3, (p.orders / maxO) * barsH) : 0));
    const line = smooth(xs.map((x, i) => [x, ys[i]] as [number, number]), yBase);
    const area = n > 1 ? `${line} L${xs[n - 1]},${yBase} L${xs[0]},${yBase} Z` : '';
    const ticks = Array.from(new Set(n <= 6 ? trend.map((_, i) => i) : [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1)))));
    return { barsH, yBase, yTop, step, xs, ys, maxR, barBase, barW, bars, line, area, ticks };
  }, [W, H, n, trend]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!g || !n) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const idx = n > 1 ? Math.round((x - PAD.l) / g.step) : 0;
    setActive(Math.max(0, Math.min(n - 1, idx)));
  };

  const cur = active !== null ? trend[active] : null;
  const shownRev = cur ? cur.revenue : view.revenue;
  const shownOrders = cur ? cur.orders : view.orders;
  const delta = cur && avgDaily > 0 ? ((cur.revenue - avgDaily) / avgDaily) * 100 : null;

  return (
    <Panel className={className} title={t('salesOverTime', lang)} sub={periodLabel} delay={0}>
      <div className="ix-mom-head">
        <div>
          <div className="ix-kicker">{cur ? cur.label : t('total', lang)}</div>
          <div className="ix-hero-num">
            <AnimatedNumber value={shownRev} format={money} duration={active !== null ? 240 : 1900} />
          </div>
        </div>
        <div className="ix-mom-chips">
          <span className="ix-chip">
            <i className="ix-dot ix-dot--rev" />
            <b>{int(shownOrders)}</b> {t('orders', lang)}
          </span>
          {delta !== null && (
            <span className={`ix-chip ${delta >= 0 ? 'ix-chip--up' : 'ix-chip--down'}`}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))}% {t('vsAvg', lang)}
            </span>
          )}
        </div>
      </div>

      <div
        ref={wrapRef}
        className="ix-chart"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
      >
        {!n && <div className="ix-empty">{t('empty', lang)}</div>}
        {g && (
          <svg width={W} height={H} className="ix-svg" role="img" aria-label={t('salesOverTime', lang)}>
            <defs>
              <linearGradient id="ixArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f2a900" stopOpacity="0.45" />
                <stop offset="1" stopColor="#f2a900" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[1 / 3, 2 / 3, 1].map((f) => {
              const y = g.yBase - f * (g.yBase - g.yTop);
              return (
                <g key={f}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} className="ix-grid-line" />
                  <text x={PAD.l} y={y - 5} className="ix-axis">
                    {moneyShort((f * g.maxR) / 1.1)}
                  </text>
                </g>
              );
            })}

            {g.area && (
              <g className="ix-area-g">
                <path d={g.area} fill="url(#ixArea)" />
              </g>
            )}
            <path className="ix-line" pathLength={1} d={g.line} />

            {g.bars.map((h, i) => (
              <rect
                key={i}
                className={`ix-bar${active === i ? ' is-active' : ''}`}
                x={g.xs[i] - g.barW / 2}
                y={g.barBase - h}
                width={g.barW}
                height={h}
                rx={Math.min(3, g.barW / 2)}
                style={cv({ '--i': i, '--n': n })}
              />
            ))}

            {n === 1 && <circle cx={g.xs[0]} cy={g.ys[0]} r={5} fill="#f2a900" />}

            {/* best-day flag */}
            {peakIdx >= 0 && n > 1 && active === null && (
              <g className="ix-flag" transform={`translate(${g.xs[peakIdx]},${g.ys[peakIdx]})`}>
                <circle r={5} className="ix-flag-dot" />
                <text
                  y={-12}
                  className="ix-flag-text"
                  textAnchor={g.xs[peakIdx] > W - 90 ? 'end' : g.xs[peakIdx] < 90 ? 'start' : 'middle'}
                >
                  {t('bestDay', lang)} {moneyShort(trend[peakIdx].revenue)}
                </text>
              </g>
            )}

            {/* today pulse */}
            {n > 1 && active === null && (
              <g transform={`translate(${g.xs[n - 1]},${g.ys[n - 1]})`}>
                <circle r={4} fill="#f4ebd9" />
                <circle r={4} className="ix-pulse" />
              </g>
            )}

            {/* scrubber */}
            {active !== null && (
              <g>
                <line x1={g.xs[active]} x2={g.xs[active]} y1={g.yTop - 8} y2={g.barBase} className="ix-cross" />
                <circle cx={g.xs[active]} cy={g.ys[active]} r={11} className="ix-scrub-halo" />
                <circle cx={g.xs[active]} cy={g.ys[active]} r={5.5} className="ix-scrub-dot" />
              </g>
            )}

            {g.ticks.map((i) => (
              <text
                key={i}
                x={g.xs[i]}
                y={H - 7}
                className="ix-axis ix-axis--x"
                textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              >
                {trend[i].label}
              </text>
            ))}
          </svg>
        )}
      </div>
    </Panel>
  );
};
