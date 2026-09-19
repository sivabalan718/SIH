import React from 'react';
import { Panel, AnimatedNumber, cv } from './primitives.js';
import { View, Tone, int, toneOfKey } from './analyticsAdapter.js';
import { t } from './copy.js';

const TONE_COLOR: Record<Tone, string> = {
  good: '#2ec4b6',
  warn: '#f2a900',
  risk: '#e0525f',
  info: '#8c96ff',
};

/* ------------------------------- Stock health ------------------------------ */
export const StockPanel: React.FC<{ view: View; lang: string; className?: string }> = ({ view, lang, className }) => {
  const { segments, extras, watch } = view.stock;
  const total = segments.reduce((s, p) => s + p.value, 0);
  const good = segments.filter((p) => toneOfKey(p.key) === 'good').reduce((s, p) => s + p.value, 0);
  const hasGood = segments.some((p) => toneOfKey(p.key) === 'good');
  const headline = hasGood && total > 0 ? Math.round((good / total) * 100) : total;
  const maxQty = watch ? Math.max(...watch.items.map((i) => i.qty), 1) : 1;

  return (
    <Panel className={className} title={t('stock', lang)} delay={200}>
      {!segments.length ? (
        <div className="ix-empty">{t('empty', lang)}</div>
      ) : (
        <>
          <div className="ix-stock-head">
            <span className="ix-hero-num ix-hero-num--md">
              <AnimatedNumber value={headline} format={(n) => (hasGood ? `${Math.round(n)}%` : int(n))} delay={600} />
            </span>
            <span className="ix-kicker">{hasGood ? t('healthy', lang) : t('items', lang)}</span>
          </div>

          <div className="ix-seg-bar" aria-hidden="true">
            {segments.map((s) => (
              <span
                key={s.key}
                style={{ flexGrow: Math.max(s.value, 0.0001), background: TONE_COLOR[toneOfKey(s.key)] }}
                title={`${s.label}: ${s.value}`}
              />
            ))}
          </div>

          <ul className="ix-rows">
            {segments.map((s, i) => (
              <li key={s.key} className="ix-row" style={cv({ '--i': i })}>
                <i className="ix-dot" style={{ background: TONE_COLOR[toneOfKey(s.key)] }} />
                <span className="ix-row-label">{s.label}</span>
                <b>
                  <AnimatedNumber value={s.value} format={int} delay={700 + i * 90} />
                </b>
              </li>
            ))}
          </ul>

          {extras.length > 0 && (
            <div className="ix-extras">
              {extras.map((e) => (
                <span key={e.label} className="ix-chip">
                  {e.label}: <b>{e.text}</b>
                </span>
              ))}
            </div>
          )}

          {watch && (
            <div className="ix-watch">
              <div className="ix-kicker">{watch.title}</div>
              {watch.items.map((it, i) => (
                <div key={it.name + i} className="ix-watch-row" style={cv({ '--i': i, '--w': it.qty / maxQty })}>
                  <span title={it.name}>{it.name}</span>
                  <div className="ix-track ix-track--thin">
                    <span className="ix-fill ix-fill--warn" />
                  </div>
                  <b>{int(it.qty)}</b>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Panel>
  );
};

/* ------------------------------ Order progress ----------------------------- */
export const FulfilmentPanel: React.FC<{ view: View; lang: string; className?: string }> = ({ view, lang, className }) => {
  const pairs = view.fulfil.filter((p) => p.value >= 0);
  const total = pairs.reduce((s, p) => s + p.value, 0);
  const lead =
    pairs.filter((p) => toneOfKey(p.key) === 'good').sort((a, b) => b.value - a.value)[0] ||
    [...pairs].sort((a, b) => b.value - a.value)[0];
  const pct = lead && total > 0 ? (lead.value / total) * 100 : 0;
  const color = lead ? TONE_COLOR[toneOfKey(lead.key)] : TONE_COLOR.info;

  return (
    <Panel className={className} title={t('fulfil', lang)} delay={260}>
      {!pairs.length || total === 0 ? (
        <div className="ix-empty">{t('empty', lang)}</div>
      ) : (
        <div className="ix-ful">
          <div className="ix-gauge">
            <svg viewBox="0 0 100 56" aria-hidden="true">
              <path d="M10 50 A40 40 0 0 1 90 50" pathLength={100} className="ix-gauge-track" />
              <path
                d="M10 50 A40 40 0 0 1 90 50"
                pathLength={100}
                className="ix-gauge-fill"
                style={cv({ '--len': pct, stroke: color })}
              />
            </svg>
            <div className="ix-gauge-center">
              <b>
                <AnimatedNumber value={pct} format={(n) => `${Math.round(n)}%`} delay={700} />
              </b>
              <span>
                {lead?.label} {t('ofOrders', lang)}
              </span>
            </div>
          </div>

          <ul className="ix-rows ix-rows--bars">
            {pairs.map((p, i) => (
              <li key={p.key} className="ix-frow" style={cv({ '--i': i, '--w': total ? p.value / total : 0 })}>
                <div className="ix-frow-top">
                  <span className="ix-row-label">
                    <i className="ix-dot" style={{ background: TONE_COLOR[toneOfKey(p.key)] }} />
                    {p.label}
                  </span>
                  <b>
                    <AnimatedNumber value={p.value} format={int} delay={700 + i * 90} />
                  </b>
                </div>
                <div className="ix-track ix-track--thin">
                  <span className="ix-fill" style={{ background: TONE_COLOR[toneOfKey(p.key)] }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
};
