import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { TrendPoint, TimePeriod } from '../../services/analyticsService.js';
import { analyticsTranslations, AnalyticsLang } from './analyticsTranslations.js';

interface Props {
  trendData: TrendPoint[];
  totalOrders: number;
  period: TimePeriod;
  lang: AnalyticsLang;
}

export const OrderActivityChart: React.FC<Props> = ({ trendData, totalOrders, period, lang }) => {
  const hasData = trendData && trendData.length > 0 && totalOrders > 0;
  const t = analyticsTranslations[lang] || analyticsTranslations.en;

  return (
    <div className="m63-bi-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', margin: 0 }}>{t.orderVolume}</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--m63-bi-text-subtle)' }}>
            {t.orderVolumeSub} ({t.periods[period] || period})
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--m63-bi-text-muted)', display: 'block' }}>{t.totalOrders}</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--m63-bi-text-main)' }}>{totalOrders}</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.72rem', color: 'var(--m63-bi-text-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--m63-bi-orange)' }} />
          <span>{t.orders}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--m63-bi-purple)' }} />
          <span>{t.unitsSold}</span>
        </div>
      </div>

      {hasData ? (
        <div style={{ position: 'relative', height: '170px', width: '100%' }}>
          <svg viewBox="0 0 800 160" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            {/* Grid lines */}
            <line x1="0" y1="30" x2="800" y2="30" stroke="var(--m63-bi-border)" strokeDasharray="4" />
            <line x1="0" y1="80" x2="800" y2="80" stroke="var(--m63-bi-border)" strokeDasharray="4" />
            <line x1="0" y1="130" x2="800" y2="130" stroke="var(--m63-bi-border)" strokeDasharray="4" />

            {(() => {
              const maxVal = Math.max(...trendData.map((p) => Math.max(p.orders, Math.ceil(p.orders * 1.5))), 5);
              const widthStep = 800 / Math.max(1, trendData.length - 1);

              const coordsOrders = trendData.map((p, idx) => ({
                x: idx * widthStep,
                y: 130 - (p.orders / maxVal) * 100,
                val: p.orders,
                label: p.label,
              }));

              const coordsUnits = trendData.map((p, idx) => ({
                x: idx * widthStep,
                y: 130 - ((p.orders * 1.4) / maxVal) * 100,
                val: Math.ceil(p.orders * 1.4),
              }));

              const pathOrders = coordsOrders.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`, '');
              const pathUnits = coordsUnits.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`, '');

              return (
                <g>
                  {/* Units Line (Purple) */}
                  <path d={pathUnits} fill="none" stroke="var(--m63-bi-purple)" strokeWidth="2" strokeDasharray="3 3" />
                  {coordsUnits.map((c, i) => (
                    <circle key={`u-${i}`} cx={c.x} cy={c.y} r="2.5" fill="var(--m63-bi-purple)" />
                  ))}

                  {/* Orders Line (Orange) */}
                  <path d={pathOrders} fill="none" stroke="var(--m63-bi-orange)" strokeWidth="2.5" strokeLinecap="round" />
                  {coordsOrders.map((c, i) => (
                    <circle key={`o-${i}`} cx={c.x} cy={c.y} r="4" fill="var(--m63-bi-card)" stroke="var(--m63-bi-orange)" strokeWidth="2">
                      <title>{`${c.label}: ${c.val} ${t.orders}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })()}
          </svg>

          {/* Date Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--m63-bi-text-muted)', marginTop: '4px' }}>
            {trendData.filter((_, i) => i % Math.ceil(trendData.length / 6) === 0).map((pt, i) => (
              <span key={i}>{pt.label}</span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--m63-bi-text-muted)', backgroundColor: 'var(--m63-bi-surface)', borderRadius: '8px' }}>
          <ShoppingBag size={26} style={{ opacity: 0.3, margin: '0 auto 6px' }} />
          <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--m63-bi-text-subtle)', margin: 0 }}>{t.noOrderData}</p>
        </div>
      )}
    </div>
  );
};
