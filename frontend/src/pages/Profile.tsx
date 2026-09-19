import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { CopyableM63Id } from '../components/common/CopyableM63Id.js';
import { Button } from '../components/ui/Button.js';
import { updateArtisanProfileName } from '../services/authService.js';
import { User, Mail, Calendar, ShieldCheck, Check, Pencil } from 'lucide-react';

/* ---------- UI-only helpers (no data / backend involved) ---------- */

const cssVar = (name: string, index: number): React.CSSProperties =>
  ({ [name]: index } as React.CSSProperties);

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** "Meera Krishnan" -> "MK", "Meera" -> "M" */
const initialsOf = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};

/** Feeds the cursor position into --mx / --my so CSS can draw a spotlight under the pointer. */
const trackSpotlight = (e: React.MouseEvent<HTMLElement>) => {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  el.style.setProperty('--my', `${e.clientY - rect.top}px`);
};

/** The ID badge: leans toward the cursor and catches a light sheen as it moves. */
const IdBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--rx', `${((0.5 - py) * 8).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((px - 0.5) * 10).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    el.style.setProperty('--sheen', `${(px * 100).toFixed(1)}%`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div ref={ref} className="m63p-badge-card" onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {children}
    </div>
  );
};

export const Profile: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      await updateArtisanProfileName(name);
      await refreshProfile();
      setEditing(false);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile name.');
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  // Focus the field the moment editing starts.
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Purely visual derivations
  const displayName = ((editing ? name : user?.name) || '').trim() || 'Artisan';
  const initials = initialsOf(displayName);
  const dirty = editing && name.trim() !== (user?.name || '').trim();
  const statusText = user?.status || 'ACTIVE';
  const statusOk = String(statusText).toUpperCase() === 'ACTIVE';

  // Soft glow that follows the pointer across the whole page.
  const handleRootMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--cx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--cy', `${e.clientY - rect.top}px`);
  };

  return (
    <div ref={rootRef} className="m63-profile animate-fade-in" onMouseMove={handleRootMove}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap');

        /* ============ Dark theme tokens (scoped to this page) ============ */
        .m63-profile {
          --m63p-bg: #0C1211;
          --m63p-ink: #F3EFE7;
          --m63p-ink-soft: #9CA6A2;
          --m63p-surface: rgba(255, 255, 255, 0.04);
          --m63p-surface-strong: rgba(255, 255, 255, 0.07);
          --m63p-teal: #5FB8B0;
          --m63p-teal-soft: rgba(95, 184, 176, 0.12);
          --m63p-brass: #E3AE55;
          --m63p-brass-soft: rgba(227, 174, 85, 0.15);
          --m63p-ok: #6FD6A0;
          --m63p-ok-soft: rgba(111, 214, 160, 0.13);
          --m63p-rust: #F0764E;
          --m63p-line: rgba(255, 255, 255, 0.09);

          color-scheme: dark;
          color: var(--m63p-ink);
          position: relative;
          isolation: isolate;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 26px;
          min-height: calc(100vh - 60px);
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 24px;
          background: transparent;
        }
        @media (max-width: 640px) {
          .m63-profile { padding: 20px 16px; }
        }

        .m63-profile > * { position: relative; z-index: 1; }
        .m63-profile > .m63p-aurora { position: absolute; z-index: 0; }

        .m63p-display { font-family: 'Space Grotesk', var(--m63-font-sans, inherit); }

        /* ============ Living background ============ */
        .m63p-aurora { inset: 0; pointer-events: none; overflow: hidden; }
        .m63p-aurora span {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          will-change: transform;
        }
        .m63p-aurora .a1 {
          width: 420px; height: 420px; top: -150px; left: -110px;
          background: radial-gradient(circle, rgba(47, 140, 130, 0.5), transparent 65%);
          animation: m63pDrift1 20s ease-in-out infinite alternate;
        }
        .m63p-aurora .a2 {
          width: 360px; height: 360px; top: 38%; right: -130px;
          background: radial-gradient(circle, rgba(227, 174, 85, 0.26), transparent 65%);
          animation: m63pDrift2 24s ease-in-out infinite alternate;
        }
        .m63p-aurora .a3 {
          width: 440px; height: 440px; bottom: -190px; left: 30%;
          background: radial-gradient(circle, rgba(189, 78, 42, 0.2), transparent 65%);
          animation: m63pDrift3 28s ease-in-out infinite alternate;
        }
        .m63p-aurora::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
          background-size: 22px 22px;
          -webkit-mask-image: radial-gradient(ellipse at 30% 15%, #000 10%, transparent 70%);
          mask-image: radial-gradient(ellipse at 30% 15%, #000 10%, transparent 70%);
        }
        .m63p-aurora::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(520px circle at var(--cx, 50%) var(--cy, -20%), rgba(95, 184, 176, 0.12), transparent 60%);
        }
        @keyframes m63pDrift1 { to { transform: translate(140px, 90px) scale(1.15); } }
        @keyframes m63pDrift2 { to { transform: translate(-150px, -70px) scale(1.1); } }
        @keyframes m63pDrift3 { to { transform: translate(120px, -90px) scale(1.2); } }

        /* ============ Motion primitives ============ */
        /* "backwards" fill: hidden during the delay, then normal styles take over,
           so hover / tilt transforms keep working afterwards. */
        .m63p-anim {
          animation: m63pRise 0.7s cubic-bezier(.16,1,.3,1) backwards;
          animation-delay: calc(var(--i, 0) * 110ms);
        }
        @keyframes m63pRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes m63pSpin { to { transform: rotate(360deg); } }
        @keyframes m63pStitch { to { stroke-dashoffset: -100; } }
        @keyframes m63pPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(111, 214, 160, 0.5); }
          50% { box-shadow: 0 0 0 5px rgba(111, 214, 160, 0); }
        }
        @keyframes m63pPop {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes m63pShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(2px); }
        }
        @keyframes m63pDrain { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @keyframes m63pSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ============ Header ============ */
        .m63p-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--m63p-ink);
          letter-spacing: -0.02em;
          margin: 0;
        }
        .m63p-subtitle { font-size: 0.95rem; color: var(--m63p-ink-soft); margin: 4px 0 0; }

        /* ============ Layout ============ */
        .m63p-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
        @media (min-width: 860px) {
          .m63p-grid { grid-template-columns: 320px minmax(0, 1fr); align-items: start; }
        }
        .m63p-main { display: flex; flex-direction: column; gap: 20px; min-width: 0; }

        .m63p-panel {
          background: linear-gradient(180deg, var(--m63p-surface-strong), var(--m63p-surface));
          border: 1px solid var(--m63p-line);
          border-radius: 18px;
          padding: 24px;
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
        }
        @media (max-width: 640px) { .m63p-panel { padding: 18px; } }

        .m63p-panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }
        .m63p-panel-title { font-size: 1.1rem; font-weight: 700; color: var(--m63p-ink); margin: 0; }
        .m63p-panel-sub { font-size: 0.82rem; color: var(--m63p-ink-soft); margin: 2px 0 0; }

        /* ============ ID badge ============ */
        .m63p-badge-card {
          position: relative;
          overflow: hidden;
          border-radius: 22px;
          padding: 40px 22px 22px;
          text-align: center;
          background: linear-gradient(165deg, #1C2E2C 0%, #111A19 55%, #1A1610 100%);
          border: 1px solid rgba(227, 174, 85, 0.3);
          box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
          transition: transform 0.4s cubic-bezier(.16,1,.3,1), box-shadow 0.4s ease;
          will-change: transform;
        }
        .m63p-badge-card:hover {
          box-shadow: 0 36px 70px -30px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(227, 174, 85, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .m63p-badge-card > * { position: relative; z-index: 1; }
        /* light sheen + glare that follow the cursor */
        .m63p-badge-card::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
          background:
            radial-gradient(320px circle at var(--gx, 50%) var(--gy, 0%), rgba(255, 255, 255, 0.09), transparent 60%),
            linear-gradient(115deg, transparent 30%, rgba(227, 174, 85, 0.13) 45%, rgba(95, 184, 176, 0.13) 55%, transparent 70%);
          background-size: 100% 100%, 260% 100%;
          background-position: 0 0, var(--sheen, 50%) 0;
        }
        .m63p-badge-card:hover::after { opacity: 1; }

        /* lanyard slot */
        .m63p-slot {
          position: absolute !important;
          top: 14px;
          left: 50%;
          width: 46px;
          height: 8px;
          margin-left: -23px;
          border-radius: 999px;
          background: #0A0F0E;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.9), 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .m63p-avatar {
          position: relative;
          width: 96px;
          height: 96px;
          margin: 0 auto 16px;
          padding: 6px;
          border-radius: 50%;
        }
        .m63p-avatar::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(from 0deg, var(--m63p-teal), var(--m63p-brass), var(--m63p-rust), var(--m63p-teal));
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
          animation: m63pSpin 9s linear infinite;
        }
        .m63p-avatar-face {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #2B423F, #141C1B);
          box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
        }
        .m63p-initials {
          display: inline-block;
          font-size: 1.9rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: var(--m63p-ink);
          animation: m63pPop 0.35s cubic-bezier(.34,1.56,.64,1);
        }

        .m63p-badge-name {
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--m63p-ink);
          margin: 0;
          overflow-wrap: anywhere;
        }
        .m63p-badge-note {
          font-size: 0.82rem;
          line-height: 1.5;
          color: var(--m63p-ink-soft);
          margin: 6px 0 0;
        }

        .m63p-stitch { display: block; width: 100%; height: 7px; margin: 20px 0; }
        .m63p-stitch line { animation: m63pStitch 7s linear infinite; }

        /* ivory ID tag: CopyableM63Id was built for a light surface, so it stays light and legible */
        .m63p-idtag {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 14px;
          border-radius: 14px;
          background: #F3EFE7;
          border: 1px solid rgba(227, 174, 85, 0.55);
          color: #211D18;
        }
        .m63p-idtag-label { font-size: 0.74rem; font-weight: 700; color: #6B6357; }

        /* ============ Personal details form ============ */
        .m63p-edit {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font: inherit;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--m63p-teal);
          background: var(--m63p-teal-soft);
          border: 1px solid rgba(95, 184, 176, 0.3);
          border-radius: 999px;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(.16,1,.3,1), background-color 0.2s ease, box-shadow 0.2s ease;
        }
        .m63p-edit:hover {
          transform: translateY(-1px);
          background: rgba(95, 184, 176, 0.2);
          box-shadow: 0 8px 18px -8px rgba(95, 184, 176, 0.5);
        }
        .m63p-edit:hover svg { transform: rotate(-12deg); }
        .m63p-edit svg { transition: transform 0.25s cubic-bezier(.34,1.56,.64,1); }
        .m63p-edit:active { transform: scale(0.96); }
        .m63p-edit:focus-visible { outline: 2px solid var(--m63p-teal); outline-offset: 2px; }

        .m63p-field { display: flex; flex-direction: column; gap: 8px; }
        .m63p-label { font-size: 0.8rem; font-weight: 600; color: var(--m63p-ink-soft); transition: color 0.2s ease; }
        .m63p-field.is-editing .m63p-label { color: var(--m63p-teal); }
        .m63p-input {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 16px;
          font: inherit;
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--m63p-ink);
          caret-color: var(--m63p-teal);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--m63p-line);
          border-radius: 12px;
          outline: none;
          transition: border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease;
        }
        .m63p-input:disabled {
          cursor: not-allowed;
          opacity: 1;
          color: rgba(243, 239, 231, 0.78);
          -webkit-text-fill-color: rgba(243, 239, 231, 0.78);
        }
        .m63p-field.is-editing .m63p-input {
          background: rgba(95, 184, 176, 0.06);
          border-color: rgba(95, 184, 176, 0.55);
          box-shadow: 0 0 0 4px rgba(95, 184, 176, 0.12);
        }
        .m63p-field.has-error .m63p-input {
          border-color: rgba(240, 118, 78, 0.7);
          box-shadow: 0 0 0 4px rgba(240, 118, 78, 0.12);
        }

        .m63p-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 14px;
          animation: m63pRise 0.4s cubic-bezier(.16,1,.3,1) backwards;
        }
        .m63p-dirty {
          margin-right: auto;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 0.8rem;
          color: var(--m63p-brass);
        }
        .m63p-dirty::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--m63p-brass);
        }

        /* ============ Alerts ============ */
        .m63p-alert {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          margin-bottom: 16px;
          font-size: 0.9rem;
          font-weight: 500;
          border-radius: 12px;
          animation: m63pSlideDown 0.4s cubic-bezier(.16,1,.3,1);
        }
        .m63p-alert.ok {
          color: var(--m63p-ok);
          background: var(--m63p-ok-soft);
          border: 1px solid rgba(111, 214, 160, 0.35);
        }
        .m63p-alert.bad {
          color: #FFB49B;
          background: rgba(240, 118, 78, 0.12);
          border: 1px solid rgba(240, 118, 78, 0.4);
          animation: m63pSlideDown 0.4s cubic-bezier(.16,1,.3,1), m63pShake 0.45s ease 0.1s;
        }
        .m63p-alert-icon {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(111, 214, 160, 0.2);
        }
        .m63p-alert.bad::before {
          content: '!';
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 50%;
          font-weight: 700;
          font-size: 0.8rem;
          background: rgba(240, 118, 78, 0.25);
        }
        /* drains over 3s, matching the auto-dismiss timer */
        .m63p-alert-bar {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 2px;
          background: var(--m63p-ok);
          transform-origin: left center;
          animation: m63pDrain 3s linear forwards;
        }

        /* ============ Account tiles ============ */
        .m63p-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
        .m63p-tile {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          min-width: 0;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--m63p-line);
          transition: border-color 0.25s ease;
        }
        .m63p-tile:hover { border-color: rgba(95, 184, 176, 0.35); }
        .m63p-tile::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%), rgba(95, 184, 176, 0.16), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .m63p-tile:hover::before { opacity: 1; }
        .m63p-tile > * { position: relative; z-index: 1; }

        .m63p-tile-icon {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          transition: transform 0.35s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease;
        }
        .m63p-tile-icon.teal { background: var(--m63p-teal-soft); color: var(--m63p-teal); }
        .m63p-tile-icon.brass { background: var(--m63p-brass-soft); color: var(--m63p-brass); }
        .m63p-tile-icon.ok { background: var(--m63p-ok-soft); color: var(--m63p-ok); }
        .m63p-tile-icon.warn { background: rgba(240, 118, 78, 0.14); color: var(--m63p-rust); }
        .m63p-tile:hover .m63p-tile-icon { transform: rotate(-8deg) scale(1.1); }

        .m63p-tile-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .m63p-tile-label { font-size: 0.76rem; font-weight: 600; color: var(--m63p-ink-soft); }
        .m63p-tile-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--m63p-ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .m63p-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          width: fit-content;
          padding: 3px 10px;
          font-size: 0.78rem;
          font-weight: 700;
          border-radius: 999px;
        }
        .m63p-status::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .m63p-status.ok { color: var(--m63p-ok); background: var(--m63p-ok-soft); }
        .m63p-status.ok::before { animation: m63pPulse 1.8s ease-out infinite; }
        .m63p-status.warn { color: var(--m63p-rust); background: rgba(240, 118, 78, 0.14); }

        /* ============ Reduced motion ============ */
        @media (prefers-reduced-motion: reduce) {
          .m63-profile .m63p-anim,
          .m63-profile .m63p-actions,
          .m63-profile .m63p-alert {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .m63-profile .m63p-aurora span,
          .m63-profile .m63p-avatar::before,
          .m63-profile .m63p-stitch line,
          .m63-profile .m63p-status::before,
          .m63-profile .m63p-initials,
          .m63-profile .m63p-alert-bar {
            animation: none !important;
          }
          .m63-profile .m63p-badge-card,
          .m63-profile .m63p-tile-icon,
          .m63-profile .m63p-edit,
          .m63-profile .m63p-edit svg {
            transition: none !important;
          }
        }
      `}</style>

      {/* Ambient background */}
      <div className="m63p-aurora" aria-hidden="true">
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
      </div>

      {/* Page header */}
      <div className="m63p-anim" style={cssVar('--i', 0)}>
        <h1 className="m63p-title m63p-display">M63 Artisan Profile</h1>
        <p className="m63p-subtitle">Manage your account identity and personal workspace settings.</p>
      </div>

      <div className="m63p-grid">
        {/* Identity badge */}
        <aside className="m63p-anim" style={cssVar('--i', 1)}>
          <IdBadge>
            <span className="m63p-slot" aria-hidden="true" />

            <div className="m63p-avatar" aria-hidden="true">
              <div className="m63p-avatar-face m63p-display">
                <span key={initials} className="m63p-initials">
                  {initials}
                </span>
              </div>
            </div>

            <h2 className="m63p-badge-name m63p-display">{displayName}</h2>
            <p className="m63p-badge-note">Your unique public identifier across the M63 platform.</p>

            <svg className="m63p-stitch" viewBox="0 0 300 8" preserveAspectRatio="none" aria-hidden="true">
              <line
                x1="0"
                y1="4"
                x2="300"
                y2="4"
                stroke="rgba(227, 174, 85, 0.55)"
                strokeWidth="2"
                strokeDasharray="1 9"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <div className="m63p-idtag">
              <span className="m63p-idtag-label">Your platform M63 ID</span>
              <CopyableM63Id m63Id={user?.m63Id || 'M63-MOMAOV'} size="normal" />
            </div>
          </IdBadge>
        </aside>

        <div className="m63p-main">
          {/* Editable name */}
          <section className="m63p-panel m63p-anim" style={cssVar('--i', 2)}>
            <form onSubmit={handleSave}>
              <div className="m63p-panel-head">
                <div>
                  <h2 className="m63p-panel-title m63p-display">Personal details</h2>
                  <p className="m63p-panel-sub">Only your name can be changed here.</p>
                </div>
                {!editing && (
                  <button type="button" className="m63p-edit" onClick={() => setEditing(true)}>
                    <Pencil size={14} />
                    Edit Name
                  </button>
                )}
              </div>

              {successMsg && (
                <div className="m63p-alert ok" role="alert">
                  <span className="m63p-alert-icon">
                    <Check size={14} />
                  </span>
                  <span>Profile name updated successfully.</span>
                  <span className="m63p-alert-bar" aria-hidden="true" />
                </div>
              )}

              {error && (
                <div className="m63p-alert bad" role="alert">
                  <span>{error}</span>
                </div>
              )}

              <div className={`m63p-field${editing ? ' is-editing' : ''}${error ? ' has-error' : ''}`}>
                <label className="m63p-label" htmlFor="m63p-full-name">
                  Full Name
                </label>
                <input
                  id="m63p-full-name"
                  ref={inputRef}
                  className="m63p-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!editing}
                  required
                />
              </div>

              {editing && (
                <div className="m63p-actions">
                  {dirty && <span className="m63p-dirty">Unsaved changes</span>}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    style={{ color: 'var(--m63p-ink-soft)' }}
                    onClick={() => {
                      setName(user?.name || '');
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={saving}>
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </section>

          {/* Account metadata (read only) */}
          <section className="m63p-panel m63p-anim" style={cssVar('--i', 3)}>
            <div className="m63p-panel-head">
              <div>
                <h2 className="m63p-panel-title m63p-display">Account security &amp; metadata</h2>
                <p className="m63p-panel-sub">Read-only details for your account.</p>
              </div>
            </div>

            <div className="m63p-tiles">
              {/* Email Address */}
              <div className="m63p-tile" onMouseMove={trackSpotlight}>
                <div className="m63p-tile-icon teal">
                  <Mail size={19} />
                </div>
                <div className="m63p-tile-text">
                  <span className="m63p-tile-label">Email Address</span>
                  <span className="m63p-tile-value" title={user?.email}>
                    {user?.email}
                  </span>
                </div>
              </div>

              {/* Account Status */}
              <div className="m63p-tile" onMouseMove={trackSpotlight}>
                <div className={`m63p-tile-icon ${statusOk ? 'ok' : 'warn'}`}>
                  <ShieldCheck size={19} />
                </div>
                <div className="m63p-tile-text">
                  <span className="m63p-tile-label">Account Status</span>
                  <span className={`m63p-status ${statusOk ? 'ok' : 'warn'}`}>{statusText}</span>
                </div>
              </div>

              {/* Member Since */}
              <div className="m63p-tile" onMouseMove={trackSpotlight}>
                <div className="m63p-tile-icon brass">
                  <Calendar size={19} />
                </div>
                <div className="m63p-tile-text">
                  <span className="m63p-tile-label">Member Since</span>
                  <span className="m63p-tile-value">{formattedDate}</span>
                </div>
              </div>

              {/* Role */}
              <div className="m63p-tile" onMouseMove={trackSpotlight}>
                <div className="m63p-tile-icon teal">
                  <User size={19} />
                </div>
                <div className="m63p-tile-text">
                  <span className="m63p-tile-label">Platform Role</span>
                  <span className="m63p-tile-value">{user?.role || 'ARTISAN'}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};