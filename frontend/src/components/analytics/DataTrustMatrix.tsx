import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { analyticsTranslations, AnalyticsLang } from './analyticsTranslations.js';

interface Props {
  lang: AnalyticsLang;
}

export const DataTrustMatrix: React.FC<Props> = ({ lang }) => {
  const t = analyticsTranslations[lang] || analyticsTranslations.en;

  const trustItems = [
    { label: t.prodCost, status: t.verified, icon: CheckCircle2, color: 'var(--m63-bi-green)' },
    { label: t.prodInfo, status: t.verified, icon: CheckCircle2, color: 'var(--m63-bi-green)' },
    { label: t.salesRecords, status: t.verified, icon: CheckCircle2, color: 'var(--m63-bi-green)' },
    { label: t.inventorySnapshot, status: t.verified, icon: CheckCircle2, color: 'var(--m63-bi-green)' },
    { label: t.marketBenchmarks, status: t.limited, icon: AlertTriangle, color: 'var(--m63-bi-amber)' },
    { label: t.externalTrends, status: t.unavailable, icon: XCircle, color: 'var(--m63-bi-text-muted)' },
  ];

  return (
    <div className="m63-bi-card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', backgroundColor: 'var(--m63-bi-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldCheck size={16} style={{ color: 'var(--m63-bi-orange)' }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t.dataTrustTitle}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 24px' }}>
        {trustItems.map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--m63-bi-text-subtle)' }}>{item.label}:</span>
              <span style={{ fontWeight: 700, color: item.color, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <IconComponent size={12} /> {item.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
