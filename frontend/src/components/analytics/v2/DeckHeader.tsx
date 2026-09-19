import React from 'react';
import { RefreshCw, HelpCircle } from 'lucide-react';
import type { TimePeriod } from '../../../services/analyticsService.js';
import type { AnalyticsLang } from '../analyticsTranslations.js';
import { t } from './copy.js';
import { cv } from './primitives.js';

/**
 * ⚠️ Keep this list identical to the TimePeriod values your service accepts.
 * The old AnalyticsHeader is the reference: whatever periods it offered go here.
 */
export const PERIOD_OPTIONS: string[] = ['7d', '30d', '90d'];
const LANGS: { id: string; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'ta', label: 'தமிழ்' },
  { id: 'hi', label: 'हिंदी' },
];

const shortPeriod = (p: string, lang: string) => {
  const m = /^(\d+)d$/.exec(p);
  if (!m) return p;
  return lang === 'ta' ? `${m[1]} நா` : lang === 'hi' ? `${m[1]} दिन` : `${m[1]}d`;
};

interface Props {
  period: TimePeriod;
  setPeriod: (p: TimePeriod) => void;
  lang: AnalyticsLang;
  setLang: (l: AnalyticsLang) => void;
  onOpenCalculationModal: () => void;
  onRefresh: () => void;
  loading: boolean;
  story: string;
}

const Segmented: React.FC<{
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}> = ({ options, value, onChange, label }) => {
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div className="ix-seg" role="radiogroup" aria-label={label} style={cv({ '--n': options.length, '--k': idx })}>
      <span className="ix-seg-pill" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={o.id === value}
          className={o.id === value ? 'is-on' : ''}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

export const DeckHeader: React.FC<Props> = ({ period, setPeriod, lang, setLang, onOpenCalculationModal, onRefresh, loading, story }) => {
  const periods = PERIOD_OPTIONS.includes(String(period)) ? PERIOD_OPTIONS : [...PERIOD_OPTIONS, String(period)];
  return (
    <header className="ix-head">
      <div className="ix-head-left">
        <div className="ix-brand">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M16 2 30 16 16 30 2 16Z" className="ix-brand-a" />
            <path d="M16 8 24 16 16 24 8 16Z" className="ix-brand-b" />
            <circle cx="16" cy="16" r="2.4" className="ix-brand-c" />
          </svg>
          <span>M63</span>
        </div>
        <h1 className="ix-title">{t('title', lang)}</h1>
        {story && (
          <p className="ix-story" key={story} aria-label={story}>
            {story.split(' ').map((w, i) => (
              <span key={i} className="ix-word" style={cv({ '--i': i })} aria-hidden="true">
                {w}{' '}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="ix-head-right">
        <Segmented
          label="Period"
          options={periods.map((p) => ({ id: p, label: shortPeriod(p, lang) }))}
          value={String(period)}
          onChange={(id) => setPeriod(id as TimePeriod)}
        />
        <Segmented label="Language" options={LANGS} value={lang} onChange={(id) => setLang(id as AnalyticsLang)} />
        <button className="ix-btn" onClick={onRefresh} disabled={loading} aria-label={t('refresh', lang)}>
          <RefreshCw size={15} className={loading ? 'is-spin' : ''} />
        </button>
        <button className="ix-btn ix-btn--text" onClick={onOpenCalculationModal}>
          <HelpCircle size={15} /> {t('method', lang)}
        </button>
      </div>
    </header>
  );
};
