import React from 'react';
import { Target } from 'lucide-react';
import { CalculatedAnalytics } from '../../services/analyticsService.js';
import { analyticsTranslations, AnalyticsLang } from './analyticsTranslations.js';

interface Props {
  analytics: CalculatedAnalytics;
  lang: AnalyticsLang;
}

export const BusinessSnapshotStrip: React.FC<Props> = ({ analytics, lang }) => {
  const t = analyticsTranslations[lang] || analyticsTranslations.en;
  const topCat = analytics.category_performance[0]?.category || 'Handicrafts';

  return (
    <div className="m63-bi-card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', backgroundColor: 'var(--m63-bi-surface)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px 36px' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t.revenueLabel}</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--m63-bi-text-main)' }}>
            ₹{analytics.kpis.total_revenue.toLocaleString('en-IN')}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t.ordersLabel}</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--m63-bi-text-main)' }}>
            {analytics.kpis.total_orders}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t.unitsSoldLabel}</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--m63-bi-text-main)' }}>
            {analytics.kpis.units_sold}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t.activeProductsLabel}</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--m63-bi-text-main)' }}>
            {analytics.kpis.active_products}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t.stockAvailableLabel}</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--m63-bi-text-main)' }}>
            {analytics.kpis.available_stock}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t.topCategoryLabel}</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--m63-bi-orange)' }}>
            {topCat}
          </div>
        </div>
      </div>

      {/* Right Callout Box */}
      <div style={{ padding: '12px 16px', backgroundColor: 'var(--m63-bi-card)', border: '1px solid var(--m63-bi-border)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '360px' }}>
        <div style={{ padding: '8px', backgroundColor: 'var(--m63-bi-orange-subtle)', color: 'var(--m63-bi-orange)', borderRadius: '8px' }}>
          <Target size={18} />
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--m63-bi-orange)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.m63Priority}
          </span>
          <p style={{ fontSize: '0.78rem', color: 'var(--m63-bi-text-subtle)', margin: '2px 0 0 0', lineHeight: 1.35 }}>
            {t.m63PriorityText}
          </p>
        </div>
      </div>
    </div>
  );
};
