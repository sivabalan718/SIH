import React from 'react';
import { Lightbulb, TrendingUp, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';
import { Panel, cv } from './primitives.js';
import { Insight, Tone } from './analyticsAdapter.js';
import { t, CopyKey } from './copy.js';

const ICON: Record<Tone, React.ReactNode> = {
  good: <TrendingUp size={18} />,
  warn: <AlertTriangle size={18} />,
  risk: <ShieldAlert size={18} />,
  info: <Lightbulb size={18} />,
};
const LABEL: Record<Tone, CopyKey> = { good: 'toneGood', warn: 'toneWarn', risk: 'toneRisk', info: 'toneInfo' };

export const InsightsPanel: React.FC<{ insights: Insight[]; lang: string; className?: string }> = ({ insights, lang, className }) => (
  <Panel
    className={className}
    title={t('insights', lang)}
    sub={
      <span className="ix-ai-sub">
        <Sparkles size={14} /> {t('insightsSub', lang)}
      </span>
    }
    delay={300}
  >
    {!insights.length ? (
      <div className="ix-empty">{t('empty', lang)}</div>
    ) : (
      <div className="ix-ins-grid">
        {insights.map((ins, i) => (
          <article key={i} className={`ix-ins ix-ins--${ins.tone}`} style={cv({ '--i': i })}>
            <div className="ix-ins-top">
              <span className="ix-ins-icon">{ICON[ins.tone]}</span>
              <span className="ix-ins-tag">{t(LABEL[ins.tone], lang)}</span>
            </div>
            <h4>{ins.title}</h4>
            {ins.body && <p>{ins.body}</p>}
            {ins.action && <div className="ix-ins-action">{ins.action}</div>}
          </article>
        ))}
      </div>
    )}
  </Panel>
);
