import React from 'react';
import { Package } from 'lucide-react';
import { ProductPerformanceItem } from '../../services/analyticsService.js';
import { analyticsTranslations, AnalyticsLang } from './analyticsTranslations.js';

interface Props {
  products: ProductPerformanceItem[];
  lang: AnalyticsLang;
}

export const TopProductsTable: React.FC<Props> = ({ products, lang }) => {
  const t = analyticsTranslations[lang] || analyticsTranslations.en;

  const getMedalIcon = (index: number) => {
    if (index === 0) return '🥇 #1';
    if (index === 1) return '🥈 #2';
    if (index === 2) return '🥉 #3';
    return `#${index + 1}`;
  };

  return (
    <div className="m63-bi-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', margin: 0 }}>{t.topProductsTitle}</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--m63-bi-text-subtle)' }}>{t.topProductsSub}</span>
        </div>
        <a
          href="/artisan/products"
          style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--m63-bi-orange)', textDecoration: 'none' }}
        >
          {t.viewAll}
        </a>
      </div>

      <div className="m63-bi-table-container">
        <table className="m63-bi-table">
          <thead>
            <tr>
              <th style={{ width: '46px' }}>{t.rank}</th>
              <th>{t.product}</th>
              <th>{t.category}</th>
              <th>{t.units}</th>
              <th>{t.revenue}</th>
              <th>{t.stock}</th>
              <th>{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0 ? (
              products.map((prod, idx) => {
                const isTopSellerLowStock = prod.tags.includes('BEST_SELLER_LOW_STOCK');
                return (
                  <tr key={prod.id} style={{ backgroundColor: isTopSellerLowStock ? 'rgba(245, 158, 11, 0.05)' : 'transparent' }}>
                    <td style={{ fontWeight: 800, color: idx === 0 ? 'var(--m63-bi-orange)' : 'var(--m63-bi-text-muted)', fontSize: '0.8rem' }}>
                      {getMedalIcon(idx)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--m63-bi-surface)', border: '1px solid var(--m63-bi-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--m63-bi-orange)' }}>
                          <Package size={14} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--m63-bi-text-main)' }}>{prod.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--m63-bi-text-muted)' }}>SKU: TS-{prod.id.slice(-4).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--m63-bi-text-subtle)' }}>{prod.category}</td>
                    <td style={{ fontWeight: 700, color: 'var(--m63-bi-text-main)' }}>{prod.units_sold}</td>
                    <td style={{ fontWeight: 700, color: 'var(--m63-bi-green)' }}>₹{prod.revenue.toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 600, color: 'var(--m63-bi-text-main)' }}>{prod.stock_quantity}</td>
                    <td>
                      {prod.stock_quantity === 0 ? (
                        <span className="m63-bi-badge m63-bi-badge-critical">{t.outOfStock}</span>
                      ) : isTopSellerLowStock ? (
                        <span className="m63-bi-badge m63-bi-badge-warning">{t.bestsellerLow}</span>
                      ) : prod.stock_quantity <= 5 ? (
                        <span className="m63-bi-badge m63-bi-badge-warning">{t.lowStock}</span>
                      ) : (
                        <span className="m63-bi-badge m63-bi-badge-healthy">{t.healthy}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--m63-bi-text-muted)' }}>
                  {t.noProdSales}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
