import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import '../styles/m63-animations.css';
 
/* ------------------------------------------------------------------ *
 *  M63 Customer Login — "The marketplace wheel"
 *  Same engine as Login/Register. A glowing turntable spins with five
 *  handcrafted goods orbiting it: shirt, jewel, statue, tea cup, toy.
 *
 *  BACKEND-CONNECTED (unchanged):
 *    - loginCustomer({ email, password }) via useAuth()
 *    - navigate('/marketplace') on success
 * ------------------------------------------------------------------ */
 
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;
const COLORS = ['251,191,36', '254,240,138', '245,158,11', '253,186,116', '252,211,77'];
const LABELS = ['Apparel', 'Jewellery', 'Sculpture', 'Tea ware', 'Toys'];
 
const WheelScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
 
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 
    let w = 0;
    let h = 0;
    let raf = 0;
    let spin = 0;
    let emberAcc = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let layout = { cx: 0, cy: 0, H: 0, alpha: 1 };
 
    const sprite = document.createElement('canvas');
    sprite.width = 32;
    sprite.height = 32;
    const sctx = sprite.getContext('2d');
    if (sctx) {
      const g = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(254,243,199,1)');
      g.addColorStop(0.25, 'rgba(251,191,36,0.85)');
      g.addColorStop(1, 'rgba(217,119,6,0)');
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, 32, 32);
    }
 
    type Star = { x: number; y: number; z: number; p: number };
    type Ember = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; ph: number };
    type Meteor = { x: number; y: number; vx: number; vy: number; life: number };
    const stars: Star[] = Array.from({ length: 150 }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random() * 0.9 + 0.1, p: Math.random() * TAU,
    }));
    const embers: Ember[] = [];
    const meteors: Meteor[] = [];
 
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const desktop = w >= 960 && h >= 560;
      layout = desktop
        ? { cx: w * 0.28, cy: h * 0.5, H: h * 0.6, alpha: 1 }
        : { cx: w * 0.5, cy: h * 0.48, H: Math.min(h * 0.6, w * 1.1), alpha: 0.32 };
      if (reduced) render(10, 0.016);
    };
 
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / w - 0.5) * 2;
      mouse.ty = (e.clientY / h - 0.5) * 2;
    };
 
    const spawnEmber = () => {
      const { cx, cy, H } = layout;
      const near = Math.random() < 0.6;
      embers.push({
        x: near ? cx + (Math.random() - 0.5) * H * 0.9 : Math.random() * w,
        y: near ? cy + H * 0.25 : h + 10,
        vx: (Math.random() - 0.5) * 14,
        vy: -(18 + Math.random() * 46),
        life: 0, max: 3 + Math.random() * 4, r: 2 + Math.random() * 4, ph: Math.random() * TAU,
      });
    };
 
    // ---- the five goods, drawn in a -1..1 unit box (y down)
    const circ = (x: number, y: number, r: number) => {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    };
    const drawGood = (kind: number, t: number) => {
      ctx.beginPath();
      if (kind === 0) {
        // shirt
        ctx.moveTo(-0.3, -0.8); ctx.lineTo(-0.9, -0.5); ctx.lineTo(-0.65, -0.12); ctx.lineTo(-0.45, -0.3);
        ctx.lineTo(-0.45, 0.85); ctx.lineTo(0.45, 0.85); ctx.lineTo(0.45, -0.3); ctx.lineTo(0.65, -0.12);
        ctx.lineTo(0.9, -0.5); ctx.lineTo(0.3, -0.8); ctx.quadraticCurveTo(0, -0.5, -0.3, -0.8); ctx.closePath();
      } else if (kind === 1) {
        // jewel
        ctx.moveTo(-0.8, -0.3); ctx.lineTo(-0.4, -0.8); ctx.lineTo(0.4, -0.8); ctx.lineTo(0.8, -0.3); ctx.lineTo(0, 0.9); ctx.closePath();
        ctx.moveTo(-0.8, -0.3); ctx.lineTo(0.8, -0.3);
        ctx.moveTo(-0.4, -0.8); ctx.lineTo(-0.25, -0.3); ctx.lineTo(0, 0.9);
        ctx.moveTo(0.4, -0.8); ctx.lineTo(0.25, -0.3); ctx.lineTo(0, 0.9);
      } else if (kind === 2) {
        // statue bust on a plinth
        ctx.moveTo(-0.55, 0.9); ctx.lineTo(0.55, 0.9); ctx.lineTo(0.55, 0.68); ctx.lineTo(-0.55, 0.68); ctx.closePath();
        ctx.moveTo(-0.42, 0.68); ctx.lineTo(-0.34, 0); ctx.quadraticCurveTo(0, -0.2, 0.34, 0); ctx.lineTo(0.42, 0.68);
        ctx.moveTo(-0.08, -0.12); ctx.lineTo(-0.08, -0.28);
        ctx.moveTo(0.08, -0.12); ctx.lineTo(0.08, -0.28);
        circ(0, -0.55, 0.24);
      } else if (kind === 3) {
        // tea cup, saucer and steam
        const sw = Math.sin(t * 2) * 0.05;
        ctx.moveTo(-0.6, -0.2); ctx.lineTo(0.6, -0.2);
        ctx.quadraticCurveTo(0.55, 0.62, 0, 0.64); ctx.quadraticCurveTo(-0.55, 0.62, -0.6, -0.2);
        ctx.moveTo(0.58, -0.02); ctx.bezierCurveTo(1.0, -0.05, 0.95, 0.45, 0.45, 0.38);
        ctx.moveTo(0.85, 0.78); ctx.ellipse(0, 0.78, 0.85, 0.14, 0, 0, TAU);
        ctx.moveTo(-0.2, -0.35); ctx.bezierCurveTo(-0.35 + sw, -0.5, -0.05 - sw, -0.62, -0.2, -0.82);
        ctx.moveTo(0.15, -0.35); ctx.bezierCurveTo(0.0 - sw, -0.5, 0.3 + sw, -0.62, 0.15, -0.82);
      } else {
        // teddy bear
        circ(0, -0.35, 0.35);
        circ(-0.3, -0.66, 0.14); circ(0.3, -0.66, 0.14);
        ctx.moveTo(0.4, 0.35); ctx.ellipse(0, 0.35, 0.4, 0.42, 0, 0, TAU);
        circ(-0.52, 0.2, 0.13); circ(0.52, 0.2, 0.13);
        circ(-0.25, 0.8, 0.15); circ(0.25, 0.8, 0.15);
        circ(-0.12, -0.4, 0.03); circ(0.12, -0.4, 0.03);
        circ(0, -0.27, 0.1);
      }
    };
 
    const render = (t: number, dt: number) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);
 
      const ax = w * 0.15 + Math.sin(t * 0.12) * 60;
      const g1 = ctx.createRadialGradient(ax, h * 0.25, 0, ax, h * 0.25, h * 0.6);
      g1.addColorStop(0, 'rgba(76,29,149,0.22)');
      g1.addColorStop(1, 'rgba(76,29,149,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      const bx = w * 0.85 + Math.cos(t * 0.1) * 50;
      const g2 = ctx.createRadialGradient(bx, h * 0.8, 0, bx, h * 0.8, h * 0.55);
      g2.addColorStop(0, 'rgba(217,119,6,0.16)');
      g2.addColorStop(1, 'rgba(217,119,6,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
 
      for (const s of stars) {
        const sx = s.x * w - mouse.x * 12 * s.z;
        const sy = s.y * h - mouse.y * 8 * s.z;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.5 + s.p);
        ctx.fillStyle = `rgba(226,232,240,${0.12 + 0.55 * tw * s.z})`;
        ctx.fillRect(sx, sy, s.z * 1.7, s.z * 1.7);
      }
 
      if (!reduced && Math.random() < dt * 0.18) {
        meteors.push({ x: w * 0.1 + Math.random() * w * 0.9, y: Math.random() * h * 0.4, vx: -(500 + Math.random() * 300), vy: 180 + Math.random() * 120, life: 0 });
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += dt;
        if (m.life > 1.2) { meteors.splice(i, 1); continue; }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const a = Math.sin((m.life / 1.2) * Math.PI);
        const tx = m.x - m.vx * 0.12;
        const ty = m.y - m.vy * 0.12;
        const mg = ctx.createLinearGradient(m.x, m.y, tx, ty);
        mg.addColorStop(0, `rgba(254,243,199,${a})`);
        mg.addColorStop(1, 'rgba(254,243,199,0)');
        ctx.strokeStyle = mg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
 
      // ---- wheel geometry
      const { cx, cy, H, alpha } = layout;
      const Rw = H * 0.5;
      const tilt = 0.42 + mouse.y * 0.06;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const D = H * 2.6;
      const proj = (X: number, Y: number, Z: number): [number, number, number] => {
        const Yp = Y * ct - Z * st;
        const Zp = Y * st + Z * ct;
        const f = D / (D - Zp);
        return [cx + X * f, cy - Yp * f, f];
      };
      const wheelA = clamp(t / 0.8, 0, 1) * alpha;
      const ease = (x: number) => 1 - Math.pow(1 - x, 3);
      const spinA = spin + mouse.x * 0.4;
 
      // floor glow
      const [hx, hy] = proj(0, 0, 0);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.scale(1, Math.max(0.25, st));
      const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, Rw * 1.5);
      gg.addColorStop(0, `rgba(245,158,11,${0.32 * wheelA})`);
      gg.addColorStop(1, 'rgba(245,158,11,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(-Rw * 1.6, -Rw * 1.6, Rw * 3.2, Rw * 3.2);
      ctx.restore();
 
      // rims (top + slab underside), inner ring, spinning ticks
      const ring = (rad: number, Y: number, a: number, lw: number) => {
        ctx.strokeStyle = `rgba(251,191,36,${a * wheelA})`;
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const ang = (i / 120) * TAU;
          const [x, y] = proj(rad * Math.cos(ang), Y, rad * Math.sin(ang));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      ring(Rw * 1.12, 0, 0.5, 1.4);
      ring(Rw * 1.12, -H * 0.03, 0.2, 1);
      ring(Rw * 0.98, 0, 0.18, 1);
      ring(Rw * 0.3, 0, 0.35, 1);
 
      ctx.strokeStyle = `rgba(253,230,138,${0.4 * wheelA})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 72; i++) {
        const ang = (i / 72) * TAU + spinA;
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        const inner = i % 6 === 0 ? 0.94 : 1;
        const [x1, y1] = proj(Rw * 1.12 * c, 0, Rw * 1.12 * s);
        const [x2, y2] = proj(Rw * 1.12 * inner * c, 0, Rw * 1.12 * inner * s);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
 
      // items: position, depth, sorted back → front
      type Item = { i: number; X: number; Z: number; e: number };
      const items: Item[] = [];
      for (let i = 0; i < 5; i++) {
        const e = ease(clamp((t - 0.5 - i * 0.3) / 1.3, 0, 1));
        const ang = spinA + (i / 5) * TAU;
        const rad = Rw * e;
        items.push({ i, X: rad * Math.cos(ang), Z: rad * Math.sin(ang), e });
      }
      items.sort((a, b) => a.Z - b.Z);
 
      // spokes
      ctx.strokeStyle = `rgba(251,191,36,${0.22 * wheelA})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const it of items) {
        const [gx, gy] = proj(it.X, 0, it.Z);
        ctx.moveTo(hx, hy);
        ctx.lineTo(gx, gy);
      }
      ctx.stroke();
 
      // hub
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = wheelA;
      ctx.drawImage(sprite, hx - 22, hy - 22, 44, 44);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
 
      // goods
      for (const it of items) {
        if (it.e <= 0.01) continue;
        const zn = it.Z / Rw; // -1 back … +1 front
        const depthA = (0.55 + 0.45 * (0.5 + 0.5 * zn)) * alpha * it.e;
        const lift = H * 0.16 + Math.sin(t * 1.4 + it.i) * H * 0.012;
        const [gx, gy] = proj(it.X, 0, it.Z);
        const [tx, ty, f] = proj(it.X, lift, it.Z);
        const S = H * 0.11 * f * (0.4 + 0.6 * it.e);
 
        // contact shadow + tether
        ctx.fillStyle = `rgba(245,158,11,${0.18 * depthA})`;
        ctx.beginPath();
        ctx.ellipse(gx, gy, S * 0.7, S * 0.7 * st, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(251,191,36,${0.3 * depthA})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(tx, ty + S * 0.9);
        ctx.stroke();
 
        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(S, S);
        ctx.rotate(Math.sin(t * 0.9 + it.i * 1.7) * 0.06);
        const col = COLORS[it.i];
        ctx.shadowColor = `rgba(245,158,11,${0.8 * depthA})`;
        ctx.shadowBlur = 14;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 1.8 / S;
        ctx.fillStyle = `rgba(${col},${0.09 * depthA})`;
        ctx.strokeStyle = `rgba(${col},${0.95 * depthA})`;
        drawGood(it.i, t);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.shadowBlur = 0;
      }
 
      // embers
      if (!reduced) {
        emberAcc += dt * (8 + 16 * clamp(t / 2, 0, 1));
        while (emberAcc >= 1 && embers.length < 140) { spawnEmber(); emberAcc -= 1; }
        emberAcc = Math.min(emberAcc, 1);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += dt;
        if (e.life > e.max) { embers.splice(i, 1); continue; }
        e.x += (e.vx + Math.sin(t * 1.5 + e.ph) * 10) * dt;
        e.y += e.vy * dt;
        const k = e.life / e.max;
        const a = Math.sin(k * Math.PI) * (0.55 + 0.45 * Math.sin(t * 9 + e.ph));
        const sz = e.r * (1 - k * 0.5) * 2;
        ctx.globalAlpha = Math.max(0, a) * 0.9;
        ctx.drawImage(sprite, e.x - sz, e.y - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
 
    resize();
    window.addEventListener('resize', resize);
    if (!reduced) {
      window.addEventListener('pointermove', onMove, { passive: true });
      const start = performance.now();
      let last = start;
      const frame = (now: number) => {
        const t = (now - start) / 1000;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        mouse.x += (mouse.tx - mouse.x) * 0.06;
        mouse.y += (mouse.ty - mouse.y) * 0.06;
        spin += dt * (0.4 + 2.2 * Math.exp(-Math.max(0, t - 0.3) / 1.5));
        render(t, dt);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);
 
  return <canvas ref={canvasRef} className="lx-canvas" aria-hidden="true" />;
};
 
/* ----------------------------- Page -------------------------------- */
 
export const CustomerLogin: React.FC = () => {
  const { loginCustomer } = useAuth();
  const navigate = useNavigate();
 
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
 
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);
 
  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 600);
  };
 
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.email.trim()) {
      errs.email = 'Please enter your email address';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      errs.password = 'Please enter your password';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
 
    if (!validate()) {
      triggerShake();
      return;
    }
 
    setLoading(true);
    try {
      await loginCustomer(formData);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setLeaving(true);
      await new Promise((r) => setTimeout(r, reduced ? 0 : 700));
      navigate('/marketplace');
    } catch (err: any) {
      setServerError(err?.message || 'Invalid email or password.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };
 
  const onCardMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    el.style.transform = `perspective(1100px) rotateX(${(0.5 - py) * 5}deg) rotateY(${(px - 0.5) * 6}deg)`;
  };
 
  const onCardLeave = () => {
    const el = tiltRef.current;
    if (el) el.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg)';
  };
 
  const d = (n: number) => ({ ['--d' as any]: `${n}s` });
  const titleWords = ['M63', 'Customer', 'Sign', 'In'];
 
  return (
    <div className="lx-root m63-sans">
      <style>{css}</style>
 
      <WheelScene />
      <div className="lx-vignette" aria-hidden="true" />
      <div className="lx-grain" aria-hidden="true" />
      {leaving && <div className="lx-flash" aria-hidden="true" />}
 
      <main className="lx-grid">
        <section className="lx-hero" aria-label="About the M63 marketplace">
          <h2 className="m63-serif lx-hero-title">Handmade, from artisan to you.</h2>
          <p className="lx-hero-copy">
            Discover and buy authentic crafts made by artisans, each with its own story.
          </p>
          <ol className="lx-steps">
            {LABELS.map((s, i) => (
              <li key={s} style={{ animationDelay: `${2.6 + i * 1.6}s` }}>
                <i style={{ animationDelay: `${2.6 + i * 1.6}s` }} />
                {s}
              </li>
            ))}
          </ol>
        </section>
 
        <section className={`lx-stage ${leaving ? 'is-leaving' : ''}`}>
          <div className="lx-enter">
            <div ref={tiltRef} className="lx-tilt" onPointerMove={onCardMove} onPointerLeave={onCardLeave}>
              <div className={`lx-card ${shake ? 'lx-shake' : ''}`}>
                {/* Navigation Back */}
                <button type="button" className="lx-back lx-rise" style={d(0.9)} onClick={() => navigate('/login')}>
                  <ArrowLeft size={16} />
                  <span>Back to M63 Landing Page</span>
                </button>
 
                <div className="lx-rise lx-brand" style={d(0.98)}>
                  <div className="lx-mark">
                    <span className="lx-mark-ring" />
                    <ShoppingBag size={26} />
                  </div>
                  <h1 className="m63-serif lx-title" aria-label="M63 Customer Sign In">
                    {titleWords.map((word, i) => (
                      <span key={i} style={{ animationDelay: `${1.08 + i * 0.1}s` }}>
                        {word}
                        {i < titleWords.length - 1 ? '\u00A0' : ''}
                      </span>
                    ))}
                  </h1>
                  <p className="lx-sub">Sign in to discover &amp; purchase handcrafted artisan products</p>
                </div>
 
                {serverError && (
                  <div
                    className="lx-alert"
                    role="alert"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      color: '#FCA5A5',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={18} className="shrink-0 text-red-400" />
                    <span>{serverError}</span>
                  </div>
                )}
 
                <form onSubmit={handleSubmit} noValidate>
                  <div className="lx-rise lx-field" style={d(1.22)}>
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="e.g. customer@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      error={errors.email}
                      required
                    />
                  </div>
 
                  <div className="lx-rise lx-field" style={d(1.34)}>
                    <Input
                      label="Password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      error={errors.password}
                      required
                    />
                  </div>
 
                  <div className="lx-rise lx-btn-wrap" style={{ ...d(1.48), marginTop: '24px' }}>
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      loading={loading}
                      style={{
                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        border: 'none',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        height: '44px',
                        boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
                      }}
                    >
                      Sign In to Marketplace
                    </Button>
                  </div>
                </form>
 
                <div className="lx-rise lx-foot" style={d(1.62)}>
                  New customer on M63?{' '}
                  <Link to="/customer/register" className="lx-foot-link">
                    Create Customer Account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
 
/* ----------------------------- Styles ------------------------------ */
 
const css = `
@property --lx-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
 
.lx-root { position: relative; min-height: 100vh; width: 100%; background: #030712; overflow-x: hidden; color: #F8FAFC; }
.lx-canvas { position: fixed; inset: 0; z-index: 0; display: block; }
.lx-vignette { position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(3,7,18,.75) 100%); }
.lx-grain { position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: .07; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.5'/></svg>"); }
 
.lx-grid { position: relative; z-index: 10; min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; align-items: center; padding: 32px; }
 
.lx-hero { align-self: end; padding: 0 0 5vh 4vw; max-width: 520px; opacity: 0; animation: lx-fade 1s ease 2.2s forwards; }
.lx-hero-title { font-size: clamp(1.5rem, 2.2vw, 2.1rem); font-weight: 700; letter-spacing: -0.01em; color: #F8FAFC; margin: 0; }
.lx-hero-copy { margin: 8px 0 16px; font-size: .95rem; line-height: 1.55; color: #94A3B8; max-width: 44ch; }
.lx-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px 22px; font-size: .85rem; font-weight: 600; }
.lx-steps li { display: inline-flex; align-items: center; gap: 8px; color: #64748B; animation: lx-step 8s ease infinite; }
.lx-steps i { width: 7px; height: 7px; border-radius: 50%; background: #475569; animation: lx-dot 8s ease infinite; }
 
.lx-stage { grid-column: 2; display: flex; justify-content: center; }
.lx-enter { width: 100%; max-width: 440px; opacity: 0; animation: lx-card-in 1s cubic-bezier(.2,.8,.2,1) .7s forwards; }
.lx-tilt { transition: transform .25s ease-out; transform: perspective(1100px); will-change: transform; }
.lx-card { position: relative; padding: 32px 40px 30px; border-radius: 24px;
  background: linear-gradient(160deg, rgba(17,24,39,.74), rgba(8,12,24,.74));
  -webkit-backdrop-filter: blur(22px) saturate(140%); backdrop-filter: blur(22px) saturate(140%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.07), 0 30px 80px -20px rgba(0,0,0,.7), 0 0 70px -12px rgba(245,158,11,.3); }
.lx-card::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.4px; pointer-events: none;
  background: conic-gradient(from var(--lx-a), transparent 0 55%, rgba(253,230,138,.95) 76%, rgba(245,158,11,.95) 86%, transparent 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); animation: lx-spin 6s linear infinite; }
.lx-card::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(360px circle at var(--mx, 50%) var(--my, 0%), rgba(251,191,36,.14), transparent 60%); }
.lx-card > * { position: relative; z-index: 1; }
 
.lx-back { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: #94A3B8; font: inherit; font-weight: 600;
  font-size: .85rem; cursor: pointer; margin-bottom: 20px; padding: 2px 0; transition: color .2s; }
.lx-back svg { transition: transform .25s; }
.lx-back:hover { color: #FDE68A; }
.lx-back:hover svg { transform: translateX(-4px); }
.lx-back:focus-visible { outline: 2px solid #F59E0B; outline-offset: 3px; border-radius: 4px; }
 
.lx-brand { text-align: center; margin-bottom: 26px; }
.lx-mark { position: relative; width: 52px; height: 52px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #fff; margin-bottom: 12px;
  box-shadow: 0 4px 18px rgba(245,158,11,.4); animation: lx-breathe 3.6s ease-in-out infinite; }
.lx-mark-ring { position: absolute; inset: -6px; border-radius: 18px; border: 1px solid rgba(251,191,36,.5); animation: lx-ring 3.6s ease-out infinite; }
.lx-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.01em; color: #F8FAFC; margin: 0; display: flex; flex-wrap: wrap; justify-content: center; }
.lx-title span { display: inline-block; opacity: 0; animation: lx-letter .8s cubic-bezier(.2,.8,.2,1) forwards; }
.lx-sub { font-size: .88rem; color: #94A3B8; margin: 6px 0 0; }
 
.lx-rise { opacity: 0; animation: lx-rise .75s cubic-bezier(.2,.8,.2,1) forwards; animation-delay: var(--d, 1s); }
 
.lx-field { position: relative; }
.lx-field::before { content: ''; position: absolute; left: -22px; top: 30px; width: 3px; height: 26px; border-radius: 2px;
  background: linear-gradient(#FDE68A, #F59E0B); transform: scaleY(0); transform-origin: center; transition: transform .35s cubic-bezier(.2,.8,.2,1); }
.lx-field:focus-within::before { transform: scaleY(1); }
.lx-field:focus-within input { border-color: rgba(251,191,36,.75) !important; box-shadow: 0 0 0 3px rgba(251,191,36,.16), 0 0 24px rgba(245,158,11,.22) !important; }
 
.lx-btn-wrap { position: relative; overflow: hidden; border-radius: 12px; transition: transform .15s ease, filter .3s; }
.lx-btn-wrap:hover { filter: brightness(1.08); }
.lx-btn-wrap:active { transform: scale(.985); }
.lx-btn-wrap::after { content: ''; position: absolute; top: 0; bottom: 0; left: -40%; width: 30%; pointer-events: none;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.3), transparent); transform: skewX(-18deg); animation: lx-sheen 4.2s ease-in-out 2.2s infinite; }
 
.lx-foot { margin-top: 24px; text-align: center; font-size: .88rem; color: #94A3B8; }
.lx-foot-link { font-weight: 700; color: #F59E0B; text-decoration: none; transition: color .2s, text-shadow .2s; }
.lx-foot-link:hover { color: #FDE68A; text-shadow: 0 0 14px rgba(245,158,11,.6); }
.lx-foot-link:focus-visible { outline: 2px solid #F59E0B; outline-offset: 3px; border-radius: 4px; }
 
.lx-alert { animation: lx-alert-in .4s cubic-bezier(.2,.8,.2,1); }
.lx-shake { animation: lx-shake .55s cubic-bezier(.36,.07,.19,.97); }
.is-leaving .lx-tilt { transition: transform .7s cubic-bezier(.5,0,.2,1), opacity .7s, filter .7s; transform: perspective(1100px) scale(1.06) !important; opacity: 0; filter: brightness(1.8) blur(3px); }
.lx-flash { position: fixed; inset: 0; z-index: 100; pointer-events: none; opacity: 0;
  background: radial-gradient(circle at 72% 50%, #FEF3C7 0%, #FCD34D 12%, #D97706 32%, rgba(3,7,18,0) 68%);
  animation: lx-flash .7s ease-in forwards; }
 
@keyframes lx-fade { to { opacity: 1; } }
@keyframes lx-card-in { from { opacity: 0; transform: translateY(46px) scale(.95); filter: blur(10px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes lx-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes lx-letter { from { opacity: 0; transform: translateY(18px) scale(.8); filter: blur(8px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes lx-spin { to { --lx-a: 360deg; } }
@keyframes lx-sheen { 0%, 55% { left: -40%; } 85%, 100% { left: 140%; } }
@keyframes lx-breathe { 0%,100% { box-shadow: 0 4px 18px rgba(245,158,11,.4); } 50% { box-shadow: 0 6px 34px rgba(245,158,11,.7); } }
@keyframes lx-ring { 0% { transform: scale(.9); opacity: .8; } 100% { transform: scale(1.35); opacity: 0; } }
@keyframes lx-step { 0%, 2% { color: #64748B; } 6%, 18% { color: #FDE68A; } 24%, 100% { color: #64748B; } }
@keyframes lx-dot { 0%, 2% { background: #475569; box-shadow: none; } 6%, 18% { background: #FBBF24; box-shadow: 0 0 12px 2px rgba(251,191,36,.8); } 24%, 100% { background: #475569; box-shadow: none; } }
@keyframes lx-alert-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
@keyframes lx-shake { 10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(4px); } 30%, 50%, 70% { transform: translateX(-7px); } 40%, 60% { transform: translateX(7px); } }
@keyframes lx-flash { 0% { opacity: 0; transform: scale(.25); } 60% { opacity: 1; } 100% { opacity: 1; transform: scale(2.6); } }
 
@media (max-width: 959px), (max-height: 559px) {
  .lx-grid { grid-template-columns: 1fr; padding: 24px 16px; }
  .lx-hero { display: none; }
  .lx-stage { grid-column: 1; }
  .lx-field::before { display: none; }
  .lx-card { padding: 28px 22px 26px; }
}
 
@media (prefers-reduced-motion: reduce) {
  .lx-root *, .lx-root *::before, .lx-root *::after { animation: none !important; transition: none !important; }
  .lx-hero, .lx-enter, .lx-rise, .lx-title span { opacity: 1 !important; }
  .lx-card::before { background: linear-gradient(135deg, rgba(251,191,36,.6), rgba(245,158,11,.2)); }
}
`;
 
export default CustomerLogin;
 






