import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { CustomerFloatingEntry } from '../components/common/CustomerFloatingEntry.js';
import '../styles/m63-animations.css';

/* ------------------------------------------------------------------ *
 *  M63 Register — "Woven on the loom"
 *  Same engine as the Login page; the pot is replaced by a plaid
 *  textile: warp threads hang from a rod, weft rows are woven in one
 *  by one by a glowing shuttle, then the cloth ripples and catches a
 *  sweep of light.
 *
 *  BACKEND-CONNECTED (unchanged):
 *    - register({ name, email, password, confirmPassword }) via useAuth()
 *    - navigate('/register-success', { state: { m63Id, name } })
 *    - <CustomerFloatingEntry /> (marketplace entry)
 * ------------------------------------------------------------------ */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const WEFT = ['245,158,11', '234,88,12', '244,63,94', '245,158,11', '139,92,246', '234,88,12'];
const WARP = ['251,146,60', '244,63,94', '139,92,246', '245,158,11', '234,88,12', '167,139,250'];

const LoomScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const COLS = 56;
    const ROWS = 64;
    let w = 0;
    let h = 0;
    let raf = 0;
    let emberAcc = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let layout = { cx: 0, cy: 0, H: 0, alpha: 1 };

    const sprite = document.createElement('canvas');
    sprite.width = 32;
    sprite.height = 32;
    const sctx = sprite.getContext('2d');
    if (sctx) {
      const g = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,237,213,1)');
      g.addColorStop(0.25, 'rgba(251,146,60,0.85)');
      g.addColorStop(1, 'rgba(234,88,12,0)');
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, 32, 32);
    }

    type Star = { x: number; y: number; z: number; p: number };
    type Ember = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; ph: number };
    type Meteor = { x: number; y: number; vx: number; vy: number; life: number };
    const stars: Star[] = Array.from({ length: 150 }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random() * 0.9 + 0.1, p: Math.random() * Math.PI * 2,
    }));
    const embers: Ember[] = [];
    const meteors: Meteor[] = [];
    const pts = new Float32Array(ROWS * COLS * 2);

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
        ? { cx: w * 0.28, cy: h * 0.46, H: h * 0.6, alpha: 1 }
        : { cx: w * 0.5, cy: h * 0.46, H: Math.min(h * 0.7, w * 1.3), alpha: 0.32 };
      if (reduced) render(10, 0.016);
    };

    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / w - 0.5) * 2;
      mouse.ty = (e.clientY / h - 0.5) * 2;
    };

    const spawnEmber = () => {
      const { cx, cy, H } = layout;
      const fromCloth = Math.random() < 0.6;
      embers.push({
        x: fromCloth ? cx + (Math.random() - 0.5) * H * 0.6 : Math.random() * w,
        y: fromCloth ? cy + H * 0.5 : h + 10,
        vx: (Math.random() - 0.5) * 14,
        vy: -(18 + Math.random() * 46),
        life: 0,
        max: 3 + Math.random() * 4,
        r: 2 + Math.random() * 4,
        ph: Math.random() * Math.PI * 2,
      });
    };

    const render = (t: number, dt: number) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      const ax = w * 0.15 + Math.sin(t * 0.12) * 60;
      const g1 = ctx.createRadialGradient(ax, h * 0.25, 0, ax, h * 0.25, h * 0.6);
      g1.addColorStop(0, 'rgba(76,29,149,0.24)');
      g1.addColorStop(1, 'rgba(76,29,149,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      const bx = w * 0.85 + Math.cos(t * 0.1) * 50;
      const g2 = ctx.createRadialGradient(bx, h * 0.8, 0, bx, h * 0.8, h * 0.55);
      g2.addColorStop(0, 'rgba(194,65,12,0.16)');
      g2.addColorStop(1, 'rgba(194,65,12,0)');
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
        mg.addColorStop(0, `rgba(255,237,213,${a})`);
        mg.addColorStop(1, 'rgba(255,237,213,0)');
        ctx.strokeStyle = mg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }

      // ---- cloth
      const rt = clamp((t - 0.3) / 3.6, 0, 1);
      const eased = rt < 0.5 ? 4 * rt * rt * rt : 1 - Math.pow(-2 * rt + 2, 3) / 2;
      const rowsW = eased * ROWS; // rows woven so far
      const { cx, cy, H, alpha } = layout;
      const Wf = H * 0.62;
      const yaw = Math.sin(t * 0.35) * 0.4 + mouse.x * 0.5 + 1.2 * Math.exp(-Math.max(0, t - 0.3) / 1.2);
      const tilt = 0.08 + mouse.y * 0.06;
      const cy0 = Math.cos(yaw), sy0 = Math.sin(yaw);
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const D = H * 2.6;

      // soft warm light behind the cloth
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.8);
      glow.addColorStop(0, `rgba(234,88,12,${0.16 * alpha * Math.min(1, eased * 1.5)})`);
      glow.addColorStop(1, 'rgba(234,88,12,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - H, cy - H, H * 2, H * 2);

      const project = (u: number, v: number, out: (x: number, y: number) => void) => {
        const X = (u - 0.5) * Wf;
        const Y = (0.5 - v) * H;
        const A = 0.05 * H * (0.25 + v);
        const Z = A * Math.sin(u * 6.5 + t * 1.1 + v * 2.5) + 0.018 * H * Math.sin(u * 13 - t * 1.7) * v;
        const x1 = X * cy0 + Z * sy0;
        const z1 = -X * sy0 + Z * cy0;
        const y2 = Y * ct - z1 * st;
        const z2 = Y * st + z1 * ct;
        const f = D / (D - z2);
        out(cx + x1 * f, cy - y2 * f);
      };

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const o = (r * COLS + c) * 2;
          project(c / (COLS - 1), r / (ROWS - 1), (x, y) => { pts[o] = x; pts[o + 1] = y; });
        }
      }

      const woven = Math.min(ROWS, Math.floor(rowsW));

      // warp threads
      for (let c = 0; c < COLS; c++) {
        const col = WARP[Math.floor(c / 7) % WARP.length];
        ctx.lineWidth = 1;
        if (woven < ROWS - 1) {
          ctx.strokeStyle = `rgba(148,163,184,${0.12 * alpha})`;
          ctx.beginPath();
          for (let r = Math.max(0, woven - 1); r < ROWS; r++) {
            const o = (r * COLS + c) * 2;
            if (r === Math.max(0, woven - 1)) ctx.moveTo(pts[o], pts[o + 1]);
            else ctx.lineTo(pts[o], pts[o + 1]);
          }
          ctx.stroke();
        }
        if (woven > 1) {
          ctx.strokeStyle = `rgba(${col},${0.42 * alpha})`;
          ctx.beginPath();
          for (let r = 0; r < woven; r++) {
            const o = (r * COLS + c) * 2;
            if (r === 0) ctx.moveTo(pts[o], pts[o + 1]);
            else ctx.lineTo(pts[o], pts[o + 1]);
          }
          ctx.stroke();
        }
      }

      // weft rows (plaid bands) with a travelling sheen
      const sweep = ((t * 0.25) % 1.6) - 0.3;
      for (let r = 0; r < woven; r++) {
        const v = r / (ROWS - 1);
        const heat = Math.exp(-(((v - sweep) / 0.06) ** 2));
        const base = WEFT[Math.floor(r / 5) % WEFT.length].split(',').map(Number);
        const cr = Math.min(255, base[0] + heat * 90);
        const cg = Math.min(255, base[1] + heat * 110);
        const cb = Math.min(255, base[2] + heat * 120);
        ctx.strokeStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${(0.55 + 0.4 * heat) * alpha})`;
        ctx.lineWidth = 1.3 + heat;
        ctx.beginPath();
        for (let c = 0; c < COLS; c++) {
          const o = (r * COLS + c) * 2;
          if (c === 0) ctx.moveTo(pts[o], pts[o + 1]);
          else ctx.lineTo(pts[o], pts[o + 1]);
        }
        ctx.stroke();
      }

      // thread crossings
      ctx.fillStyle = `rgba(254,215,170,${0.45 * alpha})`;
      for (let r = 0; r < woven; r += 2) {
        for (let c = 0; c < COLS; c += 2) {
          const o = (r * COLS + c) * 2;
          ctx.fillRect(pts[o] - 0.8, pts[o + 1] - 0.8, 1.6, 1.6);
        }
      }

      // top rod
      const rl: number[] = [];
      const rr: number[] = [];
      project(-0.03, 0, (x, y) => rl.push(x, y));
      project(1.03, 0, (x, y) => rr.push(x, y));
      ctx.strokeStyle = `rgba(253,186,116,${0.85 * alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rl[0], rl[1]);
      ctx.lineTo(rr[0], rr[1]);
      ctx.stroke();

      // shuttle on the row being woven
      if (rowsW < ROWS - 1 && rowsW > 0) {
        const r = Math.min(ROWS - 1, Math.floor(rowsW));
        const ping = (t * 2.2) % 2;
        const pos = (ping < 1 ? ping : 2 - ping) * (COLS - 1);
        const c0 = Math.floor(pos);
        const c1 = Math.min(COLS - 1, c0 + 1);
        const f = pos - c0;
        const o0 = (r * COLS + c0) * 2;
        const o1 = (r * COLS + c1) * 2;
        const sx = pts[o0] + (pts[o1] - pts[o0]) * f;
        const sy = pts[o0 + 1] + (pts[o1 + 1] - pts[o0 + 1]) * f;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, sx - 26, sy - 26, 52, 52);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgba(255,237,213,${0.95 * alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let c = 0; c < COLS; c++) {
          const o = (r * COLS + c) * 2;
          if (c === 0) ctx.moveTo(pts[o], pts[o + 1]);
          else ctx.lineTo(pts[o], pts[o + 1]);
        }
        ctx.stroke();
      }

      // embers
      if (!reduced) {
        emberAcc += dt * (8 + 16 * Math.min(eased, 1));
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

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
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
      const result = await register(formData);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setLeaving(true);
      await new Promise((r) => setTimeout(r, reduced ? 0 : 700));
      navigate('/register-success', {
        state: { m63Id: result.m63Id, name: formData.name },
      });
    } catch (err: any) {
      setServerError(err?.message || 'Unable to create account. Please try again.');
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
    el.style.transform = `perspective(1100px) rotateX(${(0.5 - py) * 4}deg) rotateY(${(px - 0.5) * 5}deg)`;
  };

  const onCardLeave = () => {
    const el = tiltRef.current;
    if (el) el.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg)';
  };

  const d = (n: number) => ({ ['--d' as any]: `${n}s` });

  return (
    <div className="lx-root m63-sans">
      <style>{css}</style>

      <LoomScene />
      <div className="lx-vignette" aria-hidden="true" />
      <div className="lx-grain" aria-hidden="true" />
      {leaving && <div className="lx-flash" aria-hidden="true" />}

      <main className="lx-grid">
        <section className="lx-hero" aria-label="About M63">
          <h2 className="m63-serif lx-hero-title">Every thread tells a story.</h2>
          <p className="lx-hero-copy">
            Create your workspace and bring your craft online, from the loom to the M63 marketplace.
          </p>
          <ol className="lx-steps">
            {['Sign up', 'Get your M63 ID', 'List your work', 'Sell'].map((s, i) => (
              <li key={s} style={{ animationDelay: `${2.8 + i * 1.6}s` }}>
                <i style={{ animationDelay: `${2.8 + i * 1.6}s` }} />
                {s}
              </li>
            ))}
          </ol>
        </section>

        <section className={`lx-stage ${leaving ? 'is-leaving' : ''}`}>
          <div className="lx-enter">
            <div ref={tiltRef} className="lx-tilt" onPointerMove={onCardMove} onPointerLeave={onCardLeave}>
              <div className={`lx-card ${shake ? 'lx-shake' : ''}`}>
                <div className="lx-rise lx-brand" style={d(0.95)}>
                  <div className="lx-mark">
                    <span className="lx-mark-ring" />
                    M
                  </div>
                  <h1 className="m63-serif lx-title" aria-label="Welcome to M63">
                    {'Welcome to M63'.split(' ').map((word, i) => (
                      <span key={i} style={{ animationDelay: `${1.05 + i * 0.12}s` }}>
                        {word}
                        {i < 2 ? '\u00A0' : ''}
                      </span>
                    ))}
                  </h1>
                  <p className="lx-sub">Create your digital workspace and bring your craft online.</p>
                </div>

                {serverError && (
                  <div
                    className="m63-alert m63-alert-error lx-alert"
                    role="alert"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      color: '#FCA5A5',
                    }}
                  >
                    <span>{serverError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="lx-rise lx-field" style={d(1.2)}>
                    <Input
                      label="Full Name"
                      placeholder="e.g. Meena Devi"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      error={errors.name}
                      required
                    />
                  </div>

                  <div className="lx-rise lx-field" style={d(1.3)}>
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      error={errors.email}
                      required
                    />
                  </div>

                  <div className="lx-rise lx-field" style={d(1.4)}>
                    <Input
                      label="Password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      error={errors.password}
                      required
                    />
                  </div>

                  <div className="lx-rise lx-field" style={d(1.5)}>
                    <Input
                      label="Confirm Password"
                      type="password"
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      error={errors.confirmPassword}
                      required
                    />
                  </div>

                  <div className="lx-rise lx-btn-wrap" style={{ ...d(1.62), marginTop: '24px' }}>
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      loading={loading}
                      style={{
                        background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                        border: 'none',
                        boxShadow: '0 4px 16px rgba(234, 88, 12, 0.35)',
                        fontWeight: 700,
                      }}
                    >
                      Create my M63 Account
                    </Button>
                  </div>
                </form>

                <div className="lx-rise lx-foot" style={d(1.75)}>
                  Already have an account?{' '}
                  <Link to="/login" className="lx-foot-link">
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Marketplace entry — backend-connected, untouched */}
      <CustomerFloatingEntry />
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

.lx-hero { align-self: end; padding: 0 0 5vh 4vw; max-width: 480px; opacity: 0; animation: lx-fade 1s ease 2.4s forwards; }
.lx-hero-title { font-size: clamp(1.5rem, 2.2vw, 2.1rem); font-weight: 700; letter-spacing: -0.01em; color: #F8FAFC; margin: 0; }
.lx-hero-copy { margin: 8px 0 16px; font-size: .95rem; line-height: 1.55; color: #94A3B8; max-width: 44ch; }
.lx-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px 22px; font-size: .85rem; font-weight: 600; }
.lx-steps li { display: inline-flex; align-items: center; gap: 8px; color: #64748B; animation: lx-step 6.4s ease infinite; }
.lx-steps i { width: 7px; height: 7px; border-radius: 50%; background: #475569; animation: lx-dot 6.4s ease infinite; }

.lx-stage { grid-column: 2; display: flex; justify-content: center; }
.lx-enter { width: 100%; max-width: 440px; opacity: 0; animation: lx-card-in 1s cubic-bezier(.2,.8,.2,1) .7s forwards; }
.lx-tilt { transition: transform .25s ease-out; transform: perspective(1100px); will-change: transform; }
.lx-card { position: relative; padding: 32px 40px 28px; border-radius: 24px;
  background: linear-gradient(160deg, rgba(17,24,39,.74), rgba(8,12,24,.74));
  -webkit-backdrop-filter: blur(22px) saturate(140%); backdrop-filter: blur(22px) saturate(140%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.07), 0 30px 80px -20px rgba(0,0,0,.7), 0 0 70px -12px rgba(234,88,12,.28); }
.lx-card::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.4px; pointer-events: none;
  background: conic-gradient(from var(--lx-a), transparent 0 55%, rgba(245,158,11,.95) 76%, rgba(234,88,12,.95) 86%, transparent 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); animation: lx-spin 6s linear infinite; }
.lx-card::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(360px circle at var(--mx, 50%) var(--my, 0%), rgba(251,146,60,.14), transparent 60%); }
.lx-card > * { position: relative; z-index: 1; }

.lx-brand { text-align: center; margin-bottom: 24px; }
.lx-mark { position: relative; width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%); color: #fff; font-weight: 800; font-size: 1.4rem; margin-bottom: 12px;
  box-shadow: 0 4px 20px rgba(234,88,12,.4); animation: lx-breathe 3.6s ease-in-out infinite; }
.lx-mark-ring { position: absolute; inset: -6px; border-radius: 16px; border: 1px solid rgba(251,146,60,.5); animation: lx-ring 3.6s ease-out infinite; }
.lx-title { font-size: 1.55rem; font-weight: 700; letter-spacing: -0.01em; color: #F8FAFC; margin: 0; display: flex; flex-wrap: wrap; justify-content: center; }
.lx-title span { display: inline-block; opacity: 0; animation: lx-letter .8s cubic-bezier(.2,.8,.2,1) forwards; }
.lx-sub { font-size: .875rem; color: #94A3B8; margin: 4px 0 0; }

.lx-rise { opacity: 0; animation: lx-rise .75s cubic-bezier(.2,.8,.2,1) forwards; animation-delay: var(--d, 1s); }

.lx-field { position: relative; }
.lx-field::before { content: ''; position: absolute; left: -22px; top: 30px; width: 3px; height: 26px; border-radius: 2px;
  background: linear-gradient(#F59E0B, #EA580C); transform: scaleY(0); transform-origin: center; transition: transform .35s cubic-bezier(.2,.8,.2,1); }
.lx-field:focus-within::before { transform: scaleY(1); }
.lx-field:focus-within input { border-color: rgba(245,158,11,.75) !important; box-shadow: 0 0 0 3px rgba(245,158,11,.16), 0 0 24px rgba(234,88,12,.22) !important; }

.lx-btn-wrap { position: relative; overflow: hidden; border-radius: 12px; transition: transform .15s ease, filter .3s; }
.lx-btn-wrap:hover { filter: brightness(1.08); }
.lx-btn-wrap:active { transform: scale(.985); }
.lx-btn-wrap::after { content: ''; position: absolute; top: 0; bottom: 0; left: -40%; width: 30%; pointer-events: none;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.28), transparent); transform: skewX(-18deg); animation: lx-sheen 4.2s ease-in-out 2.4s infinite; }

.lx-foot { margin-top: 22px; text-align: center; font-size: .875rem; color: #94A3B8; }
.lx-foot-link { font-weight: 600; color: #F59E0B; text-decoration: none; transition: color .2s, text-shadow .2s; }
.lx-foot-link:hover { color: #FDBA74; text-shadow: 0 0 14px rgba(245,158,11,.6); }
.lx-foot-link:focus-visible { outline: 2px solid #F59E0B; outline-offset: 3px; border-radius: 4px; }

.lx-alert { animation: lx-alert-in .4s cubic-bezier(.2,.8,.2,1); }
.lx-shake { animation: lx-shake .55s cubic-bezier(.36,.07,.19,.97); }
.is-leaving .lx-tilt { transition: transform .7s cubic-bezier(.5,0,.2,1), opacity .7s, filter .7s; transform: perspective(1100px) scale(1.06) !important; opacity: 0; filter: brightness(1.8) blur(3px); }
.lx-flash { position: fixed; inset: 0; z-index: 100; pointer-events: none; opacity: 0;
  background: radial-gradient(circle at 72% 50%, #FFEDD5 0%, #FDBA74 12%, #EA580C 32%, rgba(3,7,18,0) 68%);
  animation: lx-flash .7s ease-in forwards; }

@keyframes lx-fade { to { opacity: 1; } }
@keyframes lx-card-in { from { opacity: 0; transform: translateY(46px) scale(.95); filter: blur(10px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes lx-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes lx-letter { from { opacity: 0; transform: translateY(18px) scale(.8); filter: blur(8px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes lx-spin { to { --lx-a: 360deg; } }
@keyframes lx-sheen { 0%, 55% { left: -40%; } 85%, 100% { left: 140%; } }
@keyframes lx-breathe { 0%,100% { box-shadow: 0 4px 20px rgba(234,88,12,.4); } 50% { box-shadow: 0 6px 34px rgba(234,88,12,.7); } }
@keyframes lx-ring { 0% { transform: scale(.9); opacity: .8; } 100% { transform: scale(1.35); opacity: 0; } }
@keyframes lx-step { 0%, 3% { color: #64748B; } 8%, 22% { color: #FDBA74; } 30%, 100% { color: #64748B; } }
@keyframes lx-dot { 0%, 3% { background: #475569; box-shadow: none; } 8%, 22% { background: #F59E0B; box-shadow: 0 0 12px 2px rgba(245,158,11,.8); } 30%, 100% { background: #475569; box-shadow: none; } }
@keyframes lx-alert-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
@keyframes lx-shake { 10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(4px); } 30%, 50%, 70% { transform: translateX(-7px); } 40%, 60% { transform: translateX(7px); } }
@keyframes lx-flash { 0% { opacity: 0; transform: scale(.25); } 60% { opacity: 1; } 100% { opacity: 1; transform: scale(2.6); } }

@media (max-width: 959px), (max-height: 559px) {
  .lx-grid { grid-template-columns: 1fr; padding: 24px 16px; }
  .lx-hero { display: none; }
  .lx-stage { grid-column: 1; }
  .lx-field::before { display: none; }
  .lx-card { padding: 28px 22px 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .lx-root *, .lx-root *::before, .lx-root *::after { animation: none !important; transition: none !important; }
  .lx-hero, .lx-enter, .lx-rise, .lx-title span { opacity: 1 !important; }
  .lx-card::before { background: linear-gradient(135deg, rgba(245,158,11,.6), rgba(234,88,12,.2)); }
}
`;

export default Register;  