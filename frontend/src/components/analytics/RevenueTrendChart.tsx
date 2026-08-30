import React from 'react';
import { TrendingUp } from 'lucide-react';
import { TrendPoint, TimePeriod } from '../../services/analyticsService.js';
import { analyticsTranslations, AnalyticsLang } from './analyticsTranslations.js';

interface Props {
  trendData: TrendPoint[];
  totalRevenue: number;
  period: TimePeriod;
  lang: AnalyticsLang;
}

export const RevenueTrendChart: React.FC<Props> = ({ trendData, totalRevenue, period, lang }) => {
  const hasData = trendData && trendData.length > 0 && totalRevenue > 0;
  const t = analyticsTranslations[lang] || analyticsTranslations.en;

  return (
    <div className="m63-bi-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', margin: 0 }}>{t.revenueTrend}</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--m63-bi-text-subtle)' }}>
            {t.revenueSub} ({t.periods[period] || period})
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--m63-bi-text-muted)', display: 'block' }}>{t.total}</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--m63-bi-orange)' }}>₹{totalRevenue.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {hasData ? (
        <div style={{ position: 'relative', height: '190px', width: '100%', paddingTop: '10px' }}>
          <svg viewBox="0 0 800 180" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="m63WineRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--m63-bi-orange)" stopOpacity="0.38" />
                <stop offset="100%" stopColor="var(--m63-bi-orange)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="0" y1="30" x2="800" y2="30" stroke="var(--m63-bi-border)" strokeDasharray="4" />
            <line x1="0" y1="80" x2="800" y2="80" stroke="var(--m63-bi-border)" strokeDasharray="4" />
            <line x1="0" y1="130" x2="800" y2="130" stroke="var(--m63-bi-border)" strokeDasharray="4" />

            {/* Path rendering */}
            {(() => {
              const maxRev = Math.max(...trendData.map((p) => p.revenue), 100);
              const widthStep = 800 / Math.max(1, trendData.length - 1);

              const coords = trendData.map((p, idx) => {
                const x = idx * widthStep;
                const y = 140 - (p.revenue / maxRev) * 110;
                return { x, y, pt: p };
              });

              const pathD = coords.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`, '');
              const areaD = `${pathD} L 800 140 L 0 140 Z`;

              return (
                <g>
                  <path d={areaD} fill="url(#m63WineRevGrad)" />
                  <path d={pathD} fill="none" stroke="var(--m63-bi-orange)" strokeWidth="2.5" strokeLinecap="round" />

                  {coords.map((c, i) => (
                    <g key={i} className="group">
                      <circle cx={c.x} cy={c.y} r="4" fill="var(--m63-bi-card)" stroke="var(--m63-bi-orange)" strokeWidth="2" />
                      <title>{`${c.pt.label}: ₹${c.pt.revenue.toLocaleString('en-IN')}`}</title>
                    </g>
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
          <TrendingUp size={26} style={{ opacity: 0.3, margin: '0 auto 6px' }} />
          <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--m63-bi-text-subtle)', margin: 0 }}>{t.noRevData}</p>
        </div>
      )}
    </div>
  );
};
