import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { BusinessInsight } from '../../services/analyticsService.js';
import { analyticsTranslations, AnalyticsLang } from './analyticsTranslations.js';

interface Props {
  insights: BusinessInsight[];
  lang: AnalyticsLang;
}

export const BusinessAdvisorSection: React.FC<Props> = ({ insights, lang }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const t = analyticsTranslations[lang] || analyticsTranslations.en;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const highConfidenceCount = insights.filter((i) => i.confidence === 'HIGH').length;
  const actionCount = insights.filter((i) => i.recommendation).length;

  const renderBadge = (trust: BusinessInsight['trust_level'], type: BusinessInsight['type']) => {
    if (type === 'WARNING' || type === 'INVENTORY') {
      return <span className="m63-bi-badge m63-bi-badge-critical">HIGH PRIORITY</span>;
    }
    if (trust === 'VERIFIED') {
      return <span className="m63-bi-badge m63-bi-badge-healthy">{t.verifiedBadge}</span>;
    }
    if (type === 'OPPORTUNITY') {
      return <span className="m63-bi-badge m63-bi-badge-opportunity">OPPORTUNITY</span>;
    }
    return <span className="m63-bi-badge m63-bi-badge-purple">INFERRED</span>;
  };

  return (
    <div className="m63-bi-card" style={{ borderLeft: '4px solid var(--m63-bi-orange)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', backgroundColor: 'var(--m63-bi-orange-subtle)', color: 'var(--m63-bi-orange)', borderRadius: '8px' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--m63-bi-text-main)', margin: 0 }}>{t.aiAdvisorTitle}</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--m63-bi-text-subtle)' }}>
              {t.aiAdvisorSub}
            </span>
          </div>
        </div>

        {/* Compact Summary Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--m63-bi-text-subtle)', backgroundColor: 'var(--m63-bi-surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--m63-bi-border)' }}>
          <strong style={{ color: 'var(--m63-bi-orange)' }}>{t.aiCenter}</strong>
          <span>•</span>
          <span>{insights.length} {t.insightsLabel}</span>
          <span>•</span>
          <span>{highConfidenceCount} {t.highConfidenceLabel}</span>
          <span>•</span>
          <span>{actionCount} {t.actionRecommendedLabel}</span>
        </div>
      </div>

      {/* Structured Insights Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        {insights.map((insight) => {
          const isExpanded = expandedId === insight.id;
          return (
            <div
              key={insight.id}
              style={{
                backgroundColor: 'var(--m63-bi-surface)',
                border: '1px solid var(--m63-bi-border)',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--m63-bi-text-main)', margin: 0 }}>
                    {insight.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {renderBadge(insight.trust_level, insight.type)}
                    <span className="m63-bi-badge m63-bi-badge-purple">[ {insight.confidence} {t.confidenceBadge} ]</span>
                  </div>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--m63-bi-text-subtle)', lineHeight: 1.4, margin: 0 }}>
                  {insight.message}
                </p>

                {insight.recommendation && (
                  <div style={{ padding: '8px 10px', backgroundColor: 'rgba(232, 96, 36, 0.08)', border: '1px solid rgba(232, 96, 36, 0.2)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--m63-bi-text-main)' }}>
                    💡 <strong>{t.recommendationLabel}</strong> {insight.recommendation}
                  </div>
                )}
              </div>

              {/* Expandable Evidence Panel */}
              <div>
                <button
                  onClick={() => toggleExpand(insight.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: 'var(--m63-bi-orange)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 0 0 0',
                  }}
                >
                  <span>{t.whyM63Says}</span>
                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {isExpanded && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--m63-bi-card)', border: '1px solid var(--m63-bi-border)', borderRadius: '6px', fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <div>
                      <strong style={{ color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', fontSize: '0.66rem', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                        {t.evidenceHeader}
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: '14px', color: 'var(--m63-bi-text-main)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {insight.evidence.map((ev, i) => (
                          <li key={i}>
                            <span style={{ color: 'var(--m63-bi-green)' }}>✓</span> <strong>{ev.metric}:</strong> {ev.value}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <strong style={{ color: 'var(--m63-bi-text-muted)', textTransform: 'uppercase', fontSize: '0.66rem', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>
                        {t.reasoningFlow}
                      </strong>
                      <p style={{ margin: 0, color: 'var(--m63-bi-text-subtle)' }}>{insight.message}</p>
                    </div>

                    <div style={{ paddingTop: '4px', borderTop: '1px solid var(--m63-bi-border)', display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.68rem' }}>
                      <span style={{ color: 'var(--m63-bi-green)' }}>Production Data: ✓ {t.verified}</span>
                      <span style={{ color: 'var(--m63-bi-green)' }}>Order Data: ✓ {t.verified}</span>
                      <span style={{ color: 'var(--m63-bi-green)' }}>Inventory Data: ✓ {t.verified}</span>
                      <span style={{ color: 'var(--m63-bi-amber)' }}>Market Data: ⚠ {t.limited}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
