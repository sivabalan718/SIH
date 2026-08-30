import React from 'react';
import { BarChart2, Info, Globe } from 'lucide-react';
import { TimePeriod } from '../../services/analyticsService.js';
import { analyticsTranslations, AnalyticsLang } from './analyticsTranslations.js';

interface Props {
  period: TimePeriod;
  setPeriod: (p: TimePeriod) => void;
  lang: AnalyticsLang;
  setLang: (l: AnalyticsLang) => void;
  onOpenCalculationModal: () => void;
}

export const AnalyticsHeader: React.FC<Props> = ({
  period,
  setPeriod,
  lang,
  setLang,
  onOpenCalculationModal,
}) => {
  const t = analyticsTranslations[lang] || analyticsTranslations.en;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', backgroundColor: 'var(--m63-bi-orange-subtle)', color: 'var(--m63-bi-orange)', borderRadius: '8px' }}>
            <BarChart2 size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', letterSpacing: '-0.02em', margin: 0 }}>
              {t.title}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--m63-bi-text-subtle)', marginTop: '2px', margin: 0 }}>
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Explainability Action Button */}
        <button
          onClick={onOpenCalculationModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--m63-bi-border)',
            borderRadius: '6px',
            color: 'var(--m63-bi-text-subtle)',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Info size={13} style={{ color: 'var(--m63-bi-orange)' }} />
          {t.howCalculated}
        </button>
      </div>

      {/* Control Strip: Segmented Period Control + Language Dropdown */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '2px' }}>
        {/* Segmented Period Controls */}
        <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'var(--m63-bi-surface)', padding: '3px', borderRadius: '8px', border: '1px solid var(--m63-bi-border)', gap: '2px' }}>
          {(['7d', '30d', '90d', 'this_year', 'all_time'] as TimePeriod[]).map((p) => {
            const isActive = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--m63-bi-orange)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--m63-bi-text-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 6px rgba(232, 96, 36, 0.35)' : 'none',
                }}
              >
                {t.periods[p]}
              </button>
            );
          })}
        </div>

        {/* Multilingual Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--m63-bi-surface)', border: '1px solid var(--m63-bi-border)', padding: '5px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--m63-bi-text-main)' }}>
          <Globe size={14} style={{ color: 'var(--m63-bi-orange)' }} />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as AnalyticsLang)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', fontWeight: 'inherit', cursor: 'pointer', outline: 'none' }}
          >
            <option value="en" style={{ backgroundColor: 'var(--m63-bi-card)' }}>English</option>
            <option value="ta" style={{ backgroundColor: 'var(--m63-bi-card)' }}>தமிழ் (Tamil)</option>
            <option value="hi" style={{ backgroundColor: 'var(--m63-bi-card)' }}>हिंदी (Hindi)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
