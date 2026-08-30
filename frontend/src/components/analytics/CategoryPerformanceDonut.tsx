import React from 'react';
import { CategoryPerformanceItem } from '../../services/analyticsService.js';
import { analyticsTranslations, AnalyticsLang } from './analyticsTranslations.js';

interface Props {
  categories: CategoryPerformanceItem[];
  totalRevenue: number;
  lang: AnalyticsLang;
}

const BAR_COLORS = ['#E86024', '#9333EA', '#10B981', '#3B82F6', '#F59E0B', '#EC4899'];

export const CategoryPerformanceDonut: React.FC<Props> = ({ categories, totalRevenue, lang }) => {
  const t = analyticsTranslations[lang] || analyticsTranslations.en;

  return (
    <div className="m63-bi-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', margin: 0 }}>{t.catContributionTitle}</h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--m63-bi-text-subtle)' }}>
          {t.catContributionSub} (Total: ₹{totalRevenue.toLocaleString('en-IN')})
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {categories.length > 0 ? (
          categories.map((cat, idx) => {
            const color = BAR_COLORS[idx % BAR_COLORS.length];
            const sharePct = cat.revenue_share_percent;
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                  <span style={{ color: 'var(--m63-bi-text-main)' }}>{cat.category}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--m63-bi-text-subtle)', fontWeight: 500 }}>
                      ₹{cat.revenue.toLocaleString('en-IN')} ({cat.units_sold} {t.units})
                    </span>
                    <span style={{ color: 'var(--m63-bi-orange)', width: '36px', textAlign: 'right' }}>
                      {sharePct}%
                    </span>
                  </div>
                </div>

                {/* Progress fill bar */}
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--m63-bi-surface)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--m63-bi-border)' }}>
                  <div
                    style={{
                      width: `${Math.max(4, sharePct)}%`,
                      height: '100%',
                      backgroundColor: color,
                      borderRadius: '4px',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--m63-bi-text-muted)' }}>
            {t.noCatData}
          </div>
        )}
      </div>

      <div style={{ paddingTop: '10px', borderTop: '1px solid var(--m63-bi-border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--m63-bi-text-subtle)' }}>
        <span>{t.dominantCat}</span>
        <strong style={{ color: 'var(--m63-bi-orange)' }}>
          {categories[0]?.category || 'Handicrafts'}
        </strong>
      </div>
    </div>
  );
};
