import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Flame, Package } from 'lucide-react';
import { InventoryHealthSummary } from '../../services/analyticsService.js';
import { analyticsTranslations, AnalyticsLang } from './analyticsTranslations.js';

interface Props {
  inventory: InventoryHealthSummary;
  lang: AnalyticsLang;
}

export const InventoryIntelligenceCard: React.FC<Props> = ({ inventory, lang }) => {
  const t = analyticsTranslations[lang] || analyticsTranslations.en;

  return (
    <div className="m63-bi-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', margin: 0 }}>{t.inventoryTitle}</h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--m63-bi-text-subtle)' }}>{t.inventorySub}</span>
      </div>

      {/* 4 Mini Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
        <div style={{ padding: '10px', backgroundColor: 'var(--m63-bi-surface)', border: '1px solid var(--m63-bi-border)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--m63-bi-green)' }}>
            <CheckCircle2 size={12} /> {t.healthyStockLabel}
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', marginTop: '2px' }}>
            {inventory.healthy_count}
          </div>
        </div>

        <div style={{ padding: '10px', backgroundColor: 'var(--m63-bi-surface)', border: '1px solid var(--m63-bi-border)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--m63-bi-amber)' }}>
            <AlertTriangle size={12} /> {t.lowStockLabel}
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', marginTop: '2px' }}>
            {inventory.low_stock_count}
          </div>
        </div>

        <div style={{ padding: '10px', backgroundColor: 'var(--m63-bi-surface)', border: '1px solid var(--m63-bi-border)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--m63-bi-red)' }}>
            <XCircle size={12} /> {t.outOfStockLabel}
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', marginTop: '2px' }}>
            {inventory.out_of_stock_count}
          </div>
        </div>

        <div style={{ padding: '10px', backgroundColor: 'var(--m63-bi-surface)', border: '1px solid var(--m63-bi-border)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--m63-bi-orange)' }}>
            <Flame size={12} /> {t.bestsellerLowLabel}
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', marginTop: '2px' }}>
            {inventory.bestseller_low_stock_count}
          </div>
        </div>
      </div>

      {/* Products Needing Attention */}
      <div>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
          {t.attentionHeader}
        </span>

        <div className="m63-bi-table-container">
          <table className="m63-bi-table">
            <thead>
              <tr>
                <th>{t.product}</th>
                <th>{t.velocity}</th>
                <th>{t.stock}</th>
                <th>{t.estRemaining}</th>
                <th>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {inventory.low_stock_products.length > 0 ? (
                inventory.low_stock_products.slice(0, 3).map((prod) => (
                  <tr key={prod.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: 'var(--m63-bi-surface)', border: '1px solid var(--m63-bi-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--m63-bi-orange)' }}>
                          <Package size={12} />
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--m63-bi-text-main)' }}>{prod.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--m63-bi-text-subtle)' }}>{prod.sales_velocity_per_day} units/day</td>
                    <td style={{ fontWeight: 700, color: prod.stock_quantity <= 2 ? 'var(--m63-bi-red)' : 'var(--m63-bi-amber)' }}>{prod.stock_quantity}</td>
                    <td style={{ color: 'var(--m63-bi-text-subtle)' }}>{prod.estimated_days_of_stock_remaining ? `~${prod.estimated_days_of_stock_remaining} days` : 'N/A'}</td>
                    <td>
                      <span className={`m63-bi-badge ${prod.stock_quantity <= 2 ? 'm63-bi-badge-critical' : 'm63-bi-badge-warning'}`}>
                        {prod.stock_quantity <= 2 ? t.restockUrgent : t.restockSoon}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '14px', color: 'var(--m63-bi-text-muted)' }}>
                    {t.allHealthy}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
