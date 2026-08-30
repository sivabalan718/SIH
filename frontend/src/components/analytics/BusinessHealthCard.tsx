import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { CalculatedAnalytics } from '../../services/analyticsService.js';

interface Props {
  analytics: CalculatedAnalytics;
  onExplainHealth: () => void;
}

export const BusinessHealthCard: React.FC<Props> = ({ analytics, onExplainHealth }) => {
  // Deterministic calculation of Business Health Score (0-100) based strictly on verified metrics
  const revGrowth = analytics.comparison.revenue_change_percent ?? 0;
  const ordersCount = analytics.kpis.total_orders;
  const lowStockCount = analytics.inventory_health.low_stock_count;
  const outOfStockCount = analytics.inventory_health.out_of_stock_count;

  let baseScore = 60;
  if (revGrowth > 0) baseScore += 15;
  if (ordersCount > 0) baseScore += 15;
  if (analytics.kpis.active_products >= 2) baseScore += 10;
  
  // Deduct penalty for stockouts
  baseScore -= lowStockCount * 2 + outOfStockCount * 5;
  const healthScore = Math.max(10, Math.min(98, baseScore));

  const healthRating = healthScore >= 80 ? 'Good' : healthScore >= 60 ? 'Fair' : 'Attention';
  const gaugeColor = healthScore >= 80 ? 'var(--m63-bi-green)' : healthScore >= 60 ? 'var(--m63-bi-amber)' : 'var(--m63-bi-red)';

  return (
    <div className="m63-bi-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', margin: 0 }}>Business Health</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--m63-bi-text-subtle)' }}>Overall performance score</span>
        </div>
        <button
          onClick={onExplainHealth}
          style={{ background: 'none', border: 'none', color: 'var(--m63-bi-text-muted)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Info size={12} /> How calculated
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
        {/* Semi-circular Gauge Visual */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <svg width="140" height="85" viewBox="0 0 140 85">
            <path d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke="var(--m63-bi-border)" strokeWidth="12" strokeLinecap="round" />
            <path
              d="M 15 75 A 55 55 0 0 1 125 75"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="172"
              strokeDashoffset={172 - (172 * healthScore) / 100}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', bottom: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', lineHeight: 1 }}>{healthScore}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--m63-bi-text-subtle)' }}>/100</span>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: gaugeColor, marginTop: '2px' }}>{healthRating}</div>
          </div>
        </div>

        {/* 4 Dimension Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--m63-bi-text-subtle)' }}>Sales</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--m63-bi-green)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <TrendingUp size={12} /> Upward
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--m63-bi-text-subtle)' }}>Orders</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--m63-bi-green)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <TrendingUp size={12} /> Upward
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--m63-bi-text-subtle)' }}>Inventory</span>
            {lowStockCount > 0 || outOfStockCount > 0 ? (
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--m63-bi-amber)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <AlertTriangle size={12} /> Attention
              </span>
            ) : (
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--m63-bi-green)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <CheckCircle2 size={12} /> Healthy
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--m63-bi-text-subtle)' }}>Products</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--m63-bi-green)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <CheckCircle2 size={12} /> Healthy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
