import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface ShootingStar {
  x: number;
  y: number;
  dx: number;
  dy: number;
  length: number;
  speed: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  pulsePhase: number;
}

const STAR_COLORS = [
  '#FFFFFF', // Pure White
  '#E0F2FE', // Electric Cyan
  '#C084FC', // Cosmic Violet
  '#FDE68A', // Warm Gold Highlight
  '#38BDF8', // Deep Sky Blue
  '#F8FAFC', // Crisp Starlight
];

export const StarryBackground3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = mediaQuery.matches;

    const handleMotionPreference = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };
    mediaQuery.addEventListener('change', handleMotionPreference);

    // Mouse Parallax State
    let mouseXTarget = 0;
    let mouseYTarget = 0;
    let mouseXCurrent = 0;
    let mouseYCurrent = 0;
    let isMobile = window.innerWidth < 768;

    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile || prefersReducedMotion) return;
      const halfW = width / 2;
      const halfH = height / 2;
      mouseXTarget = (e.clientX - halfW) / halfW;
      mouseYTarget = (e.clientY - halfH) / halfH;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Starfield setup (750+ Stars for rich 3D scattered motion)
    const maxZ = 1000;
    const fov = 380;
    let starCount = isMobile ? 320 : 750;

    const createStar = (): Star => {
      return {
        x: (Math.random() - 0.5) * 2200,
        y: (Math.random() - 0.5) * 2200,
        z: Math.random() * maxZ,
        size: Math.random() * 1.6 + 0.5,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.04 + 0.008,
        twinklePhase: Math.random() * Math.PI * 2,
      };
    };

    let stars: Star[] = Array.from({ length: starCount }, createStar);

    // Ambient Nebula Clouds setup
    const nebulaClouds: NebulaCloud[] = [
      { x: 0.2, y: 0.3, radius: 450, color: 'rgba(124, 58, 237, 0.07)', alpha: 0.7, pulsePhase: 0 },
      { x: 0.8, y: 0.2, radius: 520, color: 'rgba(37, 99, 235, 0.06)', alpha: 0.6, pulsePhase: 1 },
      { x: 0.5, y: 0.8, radius: 600, color: 'rgba(234, 88, 12, 0.05)', alpha: 0.5, pulsePhase: 2 },
    ];

    // Shooting Stars setup
    let shootingStars: ShootingStar[] = [];
    let lastShootingStarTime = Date.now();
    let nextShootingStarDelay = Math.random() * 3000 + 2000; // 2 to 5 second interval

    const spawnShootingStar = () => {
      if (prefersReducedMotion) return;
      const startX = Math.random() * width * 0.85 + width * 0.05;
      const startY = Math.random() * height * 0.4;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.25;
      const speed = Math.random() * 9 + 11;
      const maxLife = Math.random() * 40 + 28;

      shootingStars.push({
        x: startX,
        y: startY,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        length: Math.random() * 110 + 70,
        speed,
        life: maxLife,
        maxLife,
        size: Math.random() * 1.8 + 1.2,
        color: Math.random() > 0.35 ? '#FDE68A' : '#38BDF8',
      });
    };

    // Resize Handler
    const resizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      isMobile = width < 768;
      starCount = isMobile ? 320 : 750;

      if (stars.length !== starCount) {
        stars = Array.from({ length: starCount }, createStar);
      }

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Render loop
    const render = () => {
      // Smooth lerp
      mouseXCurrent += (mouseXTarget - mouseXCurrent) * 0.06;
      mouseYCurrent += (mouseYTarget - mouseYCurrent) * 0.06;

      // Base Deep Cosmic Dark Fill
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Render Pulsing Ambient Cosmic Nebulas
      for (const cloud of nebulaClouds) {
        cloud.pulsePhase += 0.005;
        const pulse = 1 + 0.15 * Math.sin(cloud.pulsePhase);
        const cx = cloud.x * width;
        const cy = cloud.y * height;
        const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, cloud.radius * pulse);
        grad.addColorStop(0, cloud.color);
        grad.addColorStop(1, 'rgba(3, 7, 18, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      const halfW = width / 2;
      const halfH = height / 2;
      const parallaxX = mouseXCurrent * 35;
      const parallaxY = mouseYCurrent * 35;

      // 2. Render 3D Stars in Motion
      const zSpeed = prefersReducedMotion ? 0 : 0.75; // Increased speed for active starry motion

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        if (!prefersReducedMotion) {
          star.z -= zSpeed;
          if (star.z <= 0) {
            star.z = maxZ;
            star.x = (Math.random() - 0.5) * 2200;
            star.y = (Math.random() - 0.5) * 2200;
          }
        }

        // 3D Perspective Projection
        const k = fov / star.z;
        const px = star.x * k + halfW + parallaxX * (1 - star.z / maxZ);
        const py = star.y * k + halfH + parallaxY * (1 - star.z / maxZ);

        if (px < -20 || px > width + 20 || py < -20 || py > height + 20) {
          continue;
        }

        const depthFactor = 1 - star.z / maxZ;
        const projectedSize = Math.max(0.45, star.size * k * 0.55);

        star.twinklePhase += star.twinkleSpeed;
        const twinkle = prefersReducedMotion ? 1 : 0.65 + 0.35 * Math.sin(star.twinklePhase);
        const alpha = Math.min(1, Math.max(0.12, star.alpha * depthFactor * twinkle));

        ctx.beginPath();
        ctx.arc(px, py, projectedSize, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;
        ctx.fill();

        // Bloom ring for high-intensity stars
        if (projectedSize > 1.3 && alpha > 0.45) {
          ctx.beginPath();
          ctx.arc(px, py, projectedSize * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = alpha * 0.22;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // 3. Shooting Stars
      const now = Date.now();
      if (!prefersReducedMotion && now - lastShootingStarTime > nextShootingStarDelay) {
        if (shootingStars.length < 3) {
          spawnShootingStar();
          lastShootingStarTime = now;
          nextShootingStarDelay = Math.random() * 4000 + 2500;
        }
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const meteor = shootingStars[i];
        meteor.x += meteor.dx;
        meteor.y += meteor.dy;
        meteor.life--;

        const lifeRatio = meteor.life / meteor.maxLife;
        const currentAlpha = Math.sin(lifeRatio * Math.PI);

        if (meteor.life <= 0 || meteor.x > width + 120 || meteor.y > height + 120) {
          shootingStars.splice(i, 1);
          continue;
        }

        const tailX = meteor.x - (meteor.dx / meteor.speed) * meteor.length * lifeRatio;
        const tailY = meteor.y - (meteor.dy / meteor.speed) * meteor.length * lifeRatio;

        const meteorGrad = ctx.createLinearGradient(meteor.x, meteor.y, tailX, tailY);
        meteorGrad.addColorStop(0, '#FFFFFF');
        meteorGrad.addColorStop(0.25, meteor.color);
        meteorGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = meteorGrad;
        ctx.lineWidth = meteor.size * lifeRatio;
        ctx.lineCap = 'round';
        ctx.globalAlpha = currentAlpha * 0.95;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(meteor.x, meteor.y, meteor.size * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = currentAlpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      mediaQuery.removeEventListener('change', handleMotionPreference);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
};
