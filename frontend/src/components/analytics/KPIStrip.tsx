import React from 'react';
import { IndianRupee, ShoppingBag, Package, Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { CalculatedAnalytics } from '../../services/analyticsService.js';
import { analyticsTranslations, AnalyticsLang } from './analyticsTranslations.js';

interface Props {
  analytics: CalculatedAnalytics;
  lang: AnalyticsLang;
}

export const KPIStrip: React.FC<Props> = ({ analytics, lang }) => {
  const { kpis, comparison } = analytics;
  const t = analyticsTranslations[lang] || analyticsTranslations.en;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
      {/* KPI 1: Total Revenue */}
      <div className="m63-bi-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.totalRevenue}
          </span>
          <div style={{ padding: '5px', backgroundColor: 'var(--m63-bi-orange-subtle)', color: 'var(--m63-bi-orange)', borderRadius: '6px' }}>
            <IndianRupee size={14} />
          </div>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', lineHeight: 1.1 }}>
          ₹{kpis.total_revenue.toLocaleString('en-IN')}
        </div>
        <div style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {comparison.revenue_change_percent !== null ? (
            <span style={{ fontWeight: 700, color: comparison.revenue_change_percent >= 0 ? 'var(--m63-bi-green)' : 'var(--m63-bi-red)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              {comparison.revenue_change_percent >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(comparison.revenue_change_percent)}%
            </span>
          ) : (
            <span style={{ color: 'var(--m63-bi-text-muted)' }}>{t.noPriorData}</span>
          )}
          <span style={{ color: 'var(--m63-bi-text-muted)' }}>{t.vsPrevious}</span>
        </div>
      </div>

      {/* KPI 2: Total Orders */}
      <div className="m63-bi-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.totalOrders}
          </span>
          <div style={{ padding: '5px', backgroundColor: 'var(--m63-bi-orange-subtle)', color: 'var(--m63-bi-orange)', borderRadius: '6px' }}>
            <ShoppingBag size={14} />
          </div>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', lineHeight: 1.1 }}>
          {kpis.total_orders}
        </div>
        <div style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {comparison.orders_change_percent !== null ? (
            <span style={{ fontWeight: 700, color: comparison.orders_change_percent >= 0 ? 'var(--m63-bi-green)' : 'var(--m63-bi-red)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              {comparison.orders_change_percent >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(comparison.orders_change_percent)}%
            </span>
          ) : (
            <span style={{ color: 'var(--m63-bi-text-muted)' }}>{t.noPriorData}</span>
          )}
          <span style={{ color: 'var(--m63-bi-text-muted)' }}>{t.vsPrevious}</span>
        </div>
      </div>

      {/* KPI 3: Units Sold */}
      <div className="m63-bi-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.unitsSold}
          </span>
          <div style={{ padding: '5px', backgroundColor: 'var(--m63-bi-purple-subtle)', color: 'var(--m63-bi-purple)', borderRadius: '6px' }}>
            <Package size={14} />
          </div>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', lineHeight: 1.1 }}>
          {kpis.units_sold}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--m63-bi-text-subtle)' }}>
          {t.aov}: <strong style={{ color: 'var(--m63-bi-text-main)' }}>₹{kpis.average_order_value.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      {/* KPI 4: Available Stock */}
      <div className="m63-bi-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.availableStock}
          </span>
          <div style={{ padding: '5px', backgroundColor: 'var(--m63-bi-blue-subtle)', color: 'var(--m63-bi-blue)', borderRadius: '6px' }}>
            <Layers size={14} />
          </div>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', lineHeight: 1.1 }}>
          {kpis.available_stock}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--m63-bi-text-subtle)' }}>
          {kpis.active_products} {t.activeProducts}
        </div>
      </div>
    </div>
  );
};
