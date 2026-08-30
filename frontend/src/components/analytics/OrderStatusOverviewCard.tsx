import React from 'react';
import { Clock, CheckCircle2, RefreshCw, Truck, PackageCheck, XCircle } from 'lucide-react';
import { FulfilmentDistribution } from '../../services/analyticsService.js';
import { analyticsTranslations, AnalyticsLang } from './analyticsTranslations.js';

interface Props {
  fulfilment: FulfilmentDistribution;
  lang: AnalyticsLang;
}

export const OrderStatusOverviewCard: React.FC<Props> = ({ fulfilment, lang }) => {
  const t = analyticsTranslations[lang] || analyticsTranslations.en;
  const total = fulfilment.pending + fulfilment.confirmed + fulfilment.processing + fulfilment.shipped + fulfilment.delivered + fulfilment.cancelled;
  const calcPct = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  const statuses = [
    { label: t.pendingStatus, count: fulfilment.pending, pct: calcPct(fulfilment.pending), color: '#F59E0B', icon: Clock },
    { label: t.confirmedStatus, count: fulfilment.confirmed, pct: calcPct(fulfilment.confirmed), color: '#3B82F6', icon: CheckCircle2 },
    { label: t.processingStatus, count: fulfilment.processing, pct: calcPct(fulfilment.processing), color: '#9333EA', icon: RefreshCw },
    { label: t.shippedStatus, count: fulfilment.shipped, pct: calcPct(fulfilment.shipped), color: '#10B981', icon: Truck },
    { label: t.deliveredStatus, count: fulfilment.delivered, pct: calcPct(fulfilment.delivered), color: '#059669', icon: PackageCheck },
    { label: t.cancelledStatus, count: fulfilment.cancelled, pct: calcPct(fulfilment.cancelled), color: '#EF4444', icon: XCircle },
  ];

  return (
    <div className="m63-bi-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', margin: 0 }}>{t.fulfilmentTitle}</h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--m63-bi-text-subtle)' }}>{t.fulfilmentSub}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {statuses.map((item, idx) => {
          const IconComp = item.icon;
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100px', flexShrink: 0, fontSize: '0.74rem', color: 'var(--m63-bi-text-main)', fontWeight: 700 }}>
                <IconComp size={13} style={{ color: item.color }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              </div>

              {/* Lifecycle Progress Bar */}
              <div style={{ flex: 1, height: '7px', backgroundColor: 'var(--m63-bi-surface)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--m63-bi-border)' }}>
                <div
                  style={{
                    width: `${Math.max(item.count > 0 ? 5 : 0, item.pct)}%`,
                    height: '100%',
                    backgroundColor: item.color,
                    borderRadius: '4px',
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--m63-bi-text-subtle)', width: '55px', textAlign: 'right', fontWeight: 700 }}>
                {item.count} <span style={{ fontSize: '0.68rem', color: 'var(--m63-bi-text-muted)', fontWeight: 400 }}>({item.pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--m63-bi-border)', fontSize: '0.76rem', color: 'var(--m63-bi-text-subtle)' }}>
        <span>{t.cancellationRate}: <strong style={{ color: fulfilment.cancellation_rate_percent > 10 ? 'var(--m63-bi-red)' : 'var(--m63-bi-green)' }}>{fulfilment.cancellation_rate_percent}%</strong></span>
        <span>{t.total}: <strong style={{ color: 'var(--m63-bi-text-main)' }}>{total}</strong></span>
      </div>
    </div>
  );
};
