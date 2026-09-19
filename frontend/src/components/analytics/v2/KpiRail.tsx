import React from 'react';
import { Panel, AnimatedNumber } from './primitives.js';
import { View, money, int, formatBy } from './analyticsAdapter.js';
import { t } from './copy.js';

const Spark: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (data.length < 2) return <div className="ix-tile-deco" />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 100, 26 - ((v - min) / rng) * 22] as [number, number]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  return (
    <svg className="ix-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <path className="ix-spark-line" pathLength={1} d={d} style={{ stroke: color }} />
    </svg>
  );
};

interface Tile {
  label: string;
  value: React.ReactNode;
  sub?: string;
  spark?: number[];
  color: string;
  meter?: number;
}

export const KpiRail: React.FC<{ view: View; lang: string; className?: string }> = ({ view, lang, className }) => {
  const tiles: Tile[] = [
    {
      label: t('orders', lang),
      value: <AnimatedNumber value={view.orders} format={int} delay={500} />,
      spark: view.trend.map((p) => p.orders),
      color: '#2ec4b6',
    },
    {
      label: t('avgOrder', lang),
      value: <AnimatedNumber value={view.aov} format={money} delay={650} />,
      spark: view.trend.map((p) => (p.orders > 0 ? p.revenue / p.orders : 0)),
      color: '#8c96ff',
    },
  ];

  const extras: Tile[] = view.extraKpis.map((k, i) => ({
    label: k.label,
    value: <AnimatedNumber value={k.value} format={(n) => formatBy(k.kind, n)} delay={800 + i * 120} />,
    color: '#ff8a3d',
    meter: k.kind === 'percent' ? Math.max(0, Math.min(100, k.value)) : undefined,
  }));
  const derived: Tile[] = [];
  if (view.best && view.best.revenue > 0)
    derived.push({
      label: t('bestDay', lang),
      value: <AnimatedNumber value={view.best.revenue} format={money} delay={800} />,
      sub: view.best.label,
      color: '#f2a900',
    });
  if (view.busiest && view.busiest.orders > 0)
    derived.push({
      label: t('busiestDay', lang),
      value: <AnimatedNumber value={view.busiest.orders} format={int} delay={920} />,
      sub: `${view.busiest.label}`,
      color: '#e0525f',
    });

  const rest = [...extras, ...derived].slice(0, 2);
  const all = [...tiles, ...rest];

  return (
    <Panel className={className} delay={120}>
      <div className="ix-tiles">
        {all.map((tile, i) => (
          <div key={i} className="ix-tile">
            <div className="ix-tile-top">
              <span className="ix-tile-label">{tile.label}</span>
              {tile.sub && <span className="ix-tile-sub">{tile.sub}</span>}
            </div>
            <div className="ix-tile-value">{tile.value}</div>
            {tile.meter !== undefined ? (
              <div className="ix-meter">
                <span style={{ ['--w' as any]: tile.meter / 100 }} />
              </div>
            ) : (
              <Spark data={tile.spark || []} color={tile.color} />
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
};
