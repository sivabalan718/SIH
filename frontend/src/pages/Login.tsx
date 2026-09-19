import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { CustomerFloatingEntry } from '../components/common/CustomerFloatingEntry.js';
import '../styles/m63-animations.css';

/* ------------------------------------------------------------------ *
 *  M63 Login — "Thrown on the wheel"
 *
 *  Concept: on load a glowing wireframe vessel is thrown on a potter's
 *  wheel (rings rise and expand, spiralling into shape), then keeps
 *  turning under a kiln glow with rising embers, a parallax starfield
 *  and the occasional meteor. The sign-in card floats beside it with
 *  a live conic border, cursor spotlight and 3D tilt.
 *
 *  BACKEND-CONNECTED (unchanged):
 *    - login({ identifier, password }) via useAuth()
 *    - <CustomerFloatingEntry /> (marketplace entry)
 *  Everything else is presentation only.
 * ------------------------------------------------------------------ */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* ------------------------- Canvas scene ---------------------------- */

const KilnScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const RINGS = 44;
    const SEG = 72;
    const MERIDIANS = 18;
    const MERIDIAN_STEP = SEG / MERIDIANS; // 4

    let w = 0;
    let h = 0;
    let raf = 0;
    let yaw = 0;
    let emberAcc = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let layout = { potX: 0, potCY: 0, potH: 0, alpha: 1 };

    // Glow sprite used for embers (pre-rendered once)
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
      x: Math.random(),
      y: Math.random(),
      z: Math.random() * 0.9 + 0.1,
      p: Math.random() * Math.PI * 2,
    }));
    const embers: Ember[] = [];
    const meteors: Meteor[] = [];
    const pts = new Float32Array(RINGS * SEG * 3);

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
        ? { potX: w * 0.28, potCY: h * 0.44, potH: h * 0.58, alpha: 1 }
        : { potX: w * 0.5, potCY: h * 0.46, potH: Math.min(h * 0.7, w * 1.3), alpha: 0.32 };
      if (reduced) render(10, 0.016);
    };

    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / w - 0.5) * 2;
      mouse.ty = (e.clientY / h - 0.5) * 2;
    };

    // Vessel silhouette: narrow foot, round belly, slim neck, flared lip
    const profile = (y: number, t: number) =>
      0.12 +
      0.38 * Math.exp(-(((y - 0.35) / 0.28) ** 2)) +
      0.1 * Math.exp(-(((y - 0.97) / 0.05) ** 2)) -
      0.07 * Math.exp(-(((y - 0.72) / 0.1) ** 2)) +
      0.012 * Math.sin(t * 1.3 + y * 9);

    const spawnEmber = () => {
      const { potX, potCY, potH } = layout;
      const fromPot = Math.random() < 0.6;
      embers.push({
        x: fromPot ? potX + (Math.random() - 0.5) * potH * 0.5 : Math.random() * w,
        y: fromPot ? potCY + potH * 0.5 : h + 10,
        vx: (Math.random() - 0.5) * 14,
        vy: -(18 + Math.random() * 46),
        life: 0,
        max: 3 + Math.random() * 4,
        r: 2 + Math.random() * 4,
        ph: Math.random() * Math.PI * 2,
      });
    };

    const render = (t: number, dt: number) => {
      // ---- background
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

      // ---- stars (parallax)
      for (const s of stars) {
        const sx = s.x * w - mouse.x * 12 * s.z;
        const sy = s.y * h - mouse.y * 8 * s.z;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.5 + s.p);
        ctx.fillStyle = `rgba(226,232,240,${0.12 + 0.55 * tw * s.z})`;
        const sz = s.z * 1.7;
        ctx.fillRect(sx, sy, sz, sz);
      }

      // ---- meteors
      if (!reduced && Math.random() < dt * 0.18) {
        meteors.push({
          x: w * 0.1 + Math.random() * w * 0.9,
          y: Math.random() * h * 0.4,
          vx: -(500 + Math.random() * 300),
          vy: 180 + Math.random() * 120,
          life: 0,
        });
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += dt;
        if (m.life > 1.2) {
          meteors.splice(i, 1);
          continue;
        }
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

      // ---- vessel + wheel
      const rt = clamp((t - 0.3) / 3.3, 0, 1);
      const eased = rt < 0.5 ? 4 * rt * rt * rt : 1 - Math.pow(-2 * rt + 2, 3) / 2;
      const reveal = 1.15 * eased;

      const { potX: cx, potCY: cy, potH: H, alpha } = layout;
      const R = H * 0.55;
      const tilt = 0.36 + mouse.y * 0.08;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const D = H * 2.4;
      const yawOff = yaw + mouse.x * 0.5;

      const proj = (X: number, Y: number, Z: number): [number, number, number] => {
        const Yp = Y * ct - Z * st;
        const Zp = Y * st + Z * ct;
        const f = D / (D - Zp);
        return [cx + X * f, cy - Yp * f, Z];
      };

      // kiln glow on the floor
      const Y0 = -H * 0.5;
      const [wx, wy] = proj(0, Y0, 0);
      const wheelA = clamp(t / 0.6, 0, 1) * alpha;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.scale(1, Math.max(0.25, st));
      const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.7);
      gg.addColorStop(0, `rgba(234,88,12,${0.4 * wheelA * (0.6 + 0.4 * Math.min(reveal, 1))})`);
      gg.addColorStop(1, 'rgba(234,88,12,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(-R * 1.8, -R * 1.8, R * 3.6, R * 3.6);
      ctx.restore();

      // wheel rings + spinning ticks
      ctx.lineWidth = 1;
      for (const rr of [0.95 * R, 1.2 * R]) {
        ctx.strokeStyle = `rgba(251,146,60,${0.22 * wheelA})`;
        ctx.beginPath();
        for (let a = 0; a <= 96; a++) {
          const ang = (a / 96) * Math.PI * 2;
          const [x, y] = proj(rr * Math.cos(ang), Y0, rr * Math.sin(ang));
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(253,186,116,${0.35 * wheelA})`;
      ctx.beginPath();
      for (let i = 0; i < 60; i++) {
        const ang = (i / 60) * Math.PI * 2 + yawOff * 0.7;
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        const [x1, y1] = proj(0.95 * R * c, Y0, 0.95 * R * s);
        const [x2, y2] = proj(1.0 * R * c * (i % 5 === 0 ? 1.1 : 1.04), Y0, 1.0 * R * s * (i % 5 === 0 ? 1.1 : 1.04));
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();

      // project vessel points
      let n = 0;
      for (let i = 0; i < RINGS; i++) {
        const y = i / (RINGS - 1);
        if (y > reveal) break;
        const k = clamp((reveal - y) / 0.15, 0, 1);
        const ke = k * k * (3 - 2 * k);
        const r = profile(y, t) * R * (0.35 + 0.65 * ke);
        const Y = (y - 0.5) * H;
        const lag = (1 - ke) * 0.9; // freshly pulled clay lags → spiral
        for (let s = 0; s < SEG; s++) {
          const a = (s / SEG) * Math.PI * 2 + yawOff + lag;
          const [px, py, pz] = proj(r * Math.cos(a), Y, r * Math.sin(a));
          const o = (i * SEG + s) * 3;
          pts[o] = px;
          pts[o + 1] = py;
          pts[o + 2] = pz;
        }
        n++;
      }

      if (n > 1) {
        // meridians
        ctx.lineWidth = 0.8;
        for (let m = 0; m < MERIDIANS; m++) {
          const s = m * MERIDIAN_STEP;
          const midZ = pts[((n >> 1) * SEG + s) * 3 + 2];
          ctx.strokeStyle = `rgba(251,146,60,${(midZ > 0 ? 0.15 : 0.05) * alpha})`;
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const o = (i * SEG + s) * 3;
            if (i === 0) ctx.moveTo(pts[o], pts[o + 1]);
            else ctx.lineTo(pts[o], pts[o + 1]);
          }
          ctx.stroke();
        }

        // rings
        const pulsePos = ((t * 0.22) % 1.7) - 0.35;
        const strokeRing = (i: number, front: boolean) => {
          ctx.beginPath();
          for (let s = 0; s < SEG; s++) {
            const s2 = (s + 1) % SEG;
            const o1 = (i * SEG + s) * 3;
            const o2 = (i * SEG + s2) * 3;
            const isFront = (pts[o1 + 2] + pts[o2 + 2]) / 2 > 0;
            if (isFront !== front) continue;
            ctx.moveTo(pts[o1], pts[o1 + 1]);
            ctx.lineTo(pts[o2], pts[o2 + 1]);
          }
          ctx.stroke();
        };

        for (let i = 0; i < n; i++) {
          const y = i / (RINGS - 1);
          const heat = Math.exp(-(((y - pulsePos) / 0.07) ** 2));
          const cr = Math.min(255, 194 + (245 - 194) * y + heat * 60);
          const cg = Math.min(255, 65 + (158 - 65) * y + heat * 110);
          const cb = Math.min(255, 12 + heat * 150);
          const col = `${cr | 0},${cg | 0},${cb | 0}`;

          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(${col},${(0.13 + 0.25 * heat) * alpha})`;
          strokeRing(i, false);
          ctx.lineWidth = 1.1 + heat;
          ctx.strokeStyle = `rgba(${col},${(0.5 + 0.4 * heat) * alpha})`;
          strokeRing(i, true);
        }

        // vertex sparks on the front face
        ctx.fillStyle = `rgba(254,215,170,${0.6 * alpha})`;
        for (let m = 0; m < MERIDIANS; m++) {
          const s = m * MERIDIAN_STEP;
          for (let i = 0; i < n; i += 2) {
            const o = (i * SEG + s) * 3;
            if (pts[o + 2] > 0) ctx.fillRect(pts[o] - 1, pts[o + 1] - 1, 2, 2);
          }
        }

        // the ring being pulled up glows white-hot
        if (reveal < 1.12) {
          const i = n - 1;
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineWidth = 5;
          ctx.strokeStyle = `rgba(251,146,60,${0.3 * alpha})`;
          strokeRing(i, true);
          strokeRing(i, false);
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineWidth = 2;
          ctx.strokeStyle = `rgba(255,237,213,${0.95 * alpha})`;
          strokeRing(i, true);
          strokeRing(i, false);
        }
      }

      // ---- embers
      if (!reduced) {
        emberAcc += dt * (8 + 16 * Math.min(reveal, 1));
        while (emberAcc >= 1 && embers.length < 140) {
          spawnEmber();
          emberAcc -= 1;
        }
        emberAcc = Math.min(emberAcc, 1);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += dt;
        if (e.life > e.max) {
          embers.splice(i, 1);
          continue;
        }
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
        yaw += dt * (0.3 + 2.4 * Math.exp(-Math.max(0, t - 0.3) / 1.6));
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

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Same form shape as before — backend contract unchanged
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(false);

  const [shake, setShake] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);

  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 600);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.identifier.trim()) {
      errs.identifier = 'Please enter your Email or M63 ID';
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
      await login(formData);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setLeaving(true); // kiln flare, then route
      await new Promise((r) => setTimeout(r, reduced ? 0 : 700));
      navigate('/artisan/dashboard');
    } catch (err: any) {
      setServerError(err?.message || 'Invalid email or M63 ID or password.');
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
    if (!el) return;
    el.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg)';
  };

  return (
    <div className="lx-root m63-sans">
      <style>{css}</style>

      <KilnScene />
      <div className="lx-vignette" aria-hidden="true" />
      <div className="lx-grain" aria-hidden="true" />
      {leaving && <div className="lx-flash" aria-hidden="true" />}

      <main className="lx-grid">
        {/* Left: brand line — a real sequence, so the steps light up in order */}
        <section className="lx-hero" aria-label="About M63">
          <h2 className="m63-serif lx-hero-title">Your craft deserves to be seen.</h2>
          <p className="lx-hero-copy">
            Create your products, price them fairly and reach customers through M63.
          </p>
          <ol className="lx-steps">
            {['Describe', 'Catalogue', 'Price', 'Sell'].map((s, i) => (
              <li key={s} style={{ animationDelay: `${2.8 + i * 1.6}s` }}>
                <i style={{ animationDelay: `${2.8 + i * 1.6}s` }} />
                {s}
              </li>
            ))}
          </ol>
        </section>

        {/* Right: sign-in card */}
        <section className={`lx-stage ${leaving ? 'is-leaving' : ''}`}>
          <div className="lx-enter">
            <div
              ref={tiltRef}
              className="lx-tilt"
              onPointerMove={onCardMove}
              onPointerLeave={onCardLeave}
            >
              <div className={`lx-card ${shake ? 'lx-shake' : ''}`}>
                <div className="lx-rise lx-brand" style={{ ['--d' as any]: '0.95s' }}>
                  <div className="lx-mark">
                    <span className="lx-mark-ring" />
                    M
                  </div>
                  <h1 className="m63-serif lx-title" aria-label="M63">
                    {['M', '6', '3'].map((ch, i) => (
                      <span key={i} style={{ animationDelay: `${1.05 + i * 0.09}s` }}>
                        {ch}
                      </span>
                    ))}
                  </h1>
                  <p className="lx-sub">Welcome back to your artisan workspace</p>
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

                {forgotMsg && (
                  <div
                    className="m63-alert m63-alert-success lx-alert"
                    role="alert"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      borderColor: 'rgba(16, 185, 129, 0.4)',
                      color: '#6EE7B7',
                    }}
                  >
                    <span>
                      Password recovery instructions can be requested via M63 Support or your registered email address.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="lx-rise lx-field" style={{ ['--d' as any]: '1.2s' }}>
                    <Input
                      label="Email or M63 ID"
                      placeholder="e.g. artisan@example.com or M63-MOMAOV"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      error={errors.identifier}
                      helperText="Enter your registered email or your 10-character M63 ID"
                      required
                    />
                  </div>

                  <div className="lx-rise lx-field" style={{ ['--d' as any]: '1.32s' }}>
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

                  <div
                    className="lx-rise"
                    style={{
                      ['--d' as any]: '1.42s',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: '-6px',
                      marginBottom: '18px',
                    }}
                  >
                    <button type="button" className="lx-link-btn" onClick={() => setForgotMsg(true)}>
                      Forgot password?
                    </button>
                  </div>

                  <div className="lx-rise lx-btn-wrap" style={{ ['--d' as any]: '1.52s' }}>
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
                      Sign In to M63
                    </Button>
                  </div>
                </form>

                <div className="lx-rise lx-foot" style={{ ['--d' as any]: '1.65s' }}>
                  Don't have an M63 account yet?{' '}
                  <Link to="/register" className="lx-foot-link">
                    Create M63 account
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

.lx-root { position: relative; min-height: 100vh; width: 100%; background: #030712; overflow: hidden; color: #F8FAFC; }
.lx-canvas { position: fixed; inset: 0; z-index: 0; display: block; }
.lx-vignette { position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(3,7,18,.75) 100%); }
.lx-grain { position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: .07; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.5'/></svg>"); }

.lx-grid { position: relative; z-index: 10; min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr;
  align-items: center; padding: 32px; }

/* Hero (left) */
.lx-hero { align-self: end; padding: 0 0 5vh 4vw; max-width: 480px; opacity: 0; animation: lx-fade 1s ease 2.4s forwards; }
.lx-hero-title { font-size: clamp(1.5rem, 2.2vw, 2.1rem); font-weight: 700; letter-spacing: -0.01em; color: #F8FAFC; margin: 0; }
.lx-hero-copy { margin: 8px 0 16px; font-size: .95rem; line-height: 1.55; color: #94A3B8; max-width: 44ch; }
.lx-steps { list-style: none; margin: 0; padding: 0; display: flex; gap: 22px; font-size: .85rem; font-weight: 600; }
.lx-steps li { display: inline-flex; align-items: center; gap: 8px; color: #64748B; animation: lx-step 6.4s ease infinite; }
.lx-steps i { width: 7px; height: 7px; border-radius: 50%; background: #475569; animation: lx-dot 6.4s ease infinite; }

/* Stage / card */
.lx-stage { grid-column: 2; display: flex; justify-content: center; }
.lx-enter { width: 100%; max-width: 440px; opacity: 0; animation: lx-card-in 1s cubic-bezier(.2,.8,.2,1) .7s forwards; }
.lx-tilt { transition: transform .25s ease-out; transform: perspective(1100px); will-change: transform; }
.lx-card { position: relative; padding: 36px 40px 32px; border-radius: 24px;
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

/* Brand */
.lx-brand { text-align: center; margin-bottom: 28px; }
.lx-mark { position: relative; width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%); color: #fff; font-weight: 800; font-size: 1.4rem; margin-bottom: 12px;
  box-shadow: 0 4px 20px rgba(234,88,12,.4); animation: lx-breathe 3.6s ease-in-out infinite; }
.lx-mark-ring { position: absolute; inset: -6px; border-radius: 16px; border: 1px solid rgba(251,146,60,.5); animation: lx-ring 3.6s ease-out infinite; }
.lx-title { font-size: 1.6rem; font-weight: 700; letter-spacing: -0.01em; color: #F8FAFC; margin: 0; display: flex; justify-content: center; }
.lx-title span { display: inline-block; opacity: 0; animation: lx-letter .8s cubic-bezier(.2,.8,.2,1) forwards; }
.lx-sub { font-size: .875rem; color: #94A3B8; margin-top: 4px; }

/* Staggered entrance */
.lx-rise { opacity: 0; animation: lx-rise .75s cubic-bezier(.2,.8,.2,1) forwards; animation-delay: var(--d, 1s); }

/* Fields */
.lx-field { position: relative; }
.lx-field::before { content: ''; position: absolute; left: -22px; top: 30px; width: 3px; height: 26px; border-radius: 2px;
  background: linear-gradient(#F59E0B, #EA580C); transform: scaleY(0); transform-origin: center; transition: transform .35s cubic-bezier(.2,.8,.2,1); }
.lx-field:focus-within::before { transform: scaleY(1); }
.lx-field:focus-within input { border-color: rgba(245,158,11,.75) !important; box-shadow: 0 0 0 3px rgba(245,158,11,.16), 0 0 24px rgba(234,88,12,.22) !important; }

.lx-link-btn { background: none; border: none; color: #F59E0B; font-size: .85rem; cursor: pointer; font-weight: 500; padding: 2px 0; transition: color .2s, text-shadow .2s; }
.lx-link-btn:hover { color: #FDBA74; text-shadow: 0 0 14px rgba(245,158,11,.6); }

/* Button sheen */
.lx-btn-wrap { position: relative; overflow: hidden; border-radius: 12px; transition: transform .15s ease, filter .3s; }
.lx-btn-wrap:hover { filter: brightness(1.08); }
.lx-btn-wrap:active { transform: scale(.985); }
.lx-btn-wrap::after { content: ''; position: absolute; top: 0; bottom: 0; left: -40%; width: 30%; pointer-events: none;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.28), transparent); transform: skewX(-18deg); animation: lx-sheen 4.2s ease-in-out 2.4s infinite; }

.lx-foot { margin-top: 24px; text-align: center; font-size: .875rem; color: #94A3B8; }
.lx-foot-link { font-weight: 600; color: #F59E0B; text-decoration: none; transition: color .2s, text-shadow .2s; }
.lx-foot-link:hover { color: #FDBA74; text-shadow: 0 0 14px rgba(245,158,11,.6); }
.lx-link-btn:focus-visible, .lx-foot-link:focus-visible { outline: 2px solid #F59E0B; outline-offset: 3px; border-radius: 4px; }

.lx-alert { animation: lx-alert-in .4s cubic-bezier(.2,.8,.2,1); }

/* Feedback states */
.lx-shake { animation: lx-shake .55s cubic-bezier(.36,.07,.19,.97); }
.is-leaving .lx-tilt { transition: transform .7s cubic-bezier(.5,0,.2,1), opacity .7s, filter .7s; transform: perspective(1100px) scale(1.06) !important; opacity: 0; filter: brightness(1.8) blur(3px); }
.lx-flash { position: fixed; inset: 0; z-index: 100; pointer-events: none; opacity: 0;
  background: radial-gradient(circle at 72% 50%, #FFEDD5 0%, #FDBA74 12%, #EA580C 32%, rgba(3,7,18,0) 68%);
  animation: lx-flash .7s ease-in forwards; }

/* Keyframes */
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

/* Responsive */
@media (max-width: 959px), (max-height: 559px) {
  .lx-grid { grid-template-columns: 1fr; padding: 24px 16px; }
  .lx-hero { display: none; }
  .lx-stage { grid-column: 1; }
  .lx-field::before { display: none; }
  .lx-card { padding: 30px 24px 26px; }
}

/* Reduced motion: everything is present, nothing moves */
@media (prefers-reduced-motion: reduce) {
  .lx-root *, .lx-root *::before, .lx-root *::after { animation: none !important; transition: none !important; }
  .lx-hero, .lx-enter, .lx-rise, .lx-title span { opacity: 1 !important; }
  .lx-card::before { background: linear-gradient(135deg, rgba(245,158,11,.6), rgba(234,88,12,.2)); }
}
`;

export default Login;
