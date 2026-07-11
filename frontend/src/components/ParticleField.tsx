import { useEffect, useRef } from "react";

// ─── Canvas particle system ──────────────────────────────

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const frameRef = useRef(0);
  const isDarkRef = useRef(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // ── Detect theme ──
    const isDark = () => document.documentElement.classList.contains("dark");
    isDarkRef.current = isDark();

    // ── Watch theme changes ──
    const observer = new MutationObserver(() => {
      isDarkRef.current = isDark();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // ── Particles ──
    const PARTICLE_COUNT = 80;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
      speed: number;
    }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        speed: Math.random() * 0.2 + 0.05,
      });
    }

    // ── Stars ──
    const STAR_COUNT = 40;
    const stars: { x: number; y: number; r: number; twinkle: number; phase: number }[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * 0.5 + 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX / w, y: e.clientY / h };
    };
    window.addEventListener("mousemove", handleMouse);

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", handleResize);

    let animId: number;
    const draw = () => {
      frameRef.current++;
      ctx.clearRect(0, 0, w, h);

      const dark = isDarkRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // ── Grid lines (subtle in dark, very subtle in light) ──
      const gridSize = 60;
      const offsetX = (mx - 0.5) * 6;
      const offsetY = (my - 0.5) * 6;

      ctx.strokeStyle = dark ? "rgba(99, 102, 241, 0.04)" : "rgba(99, 102, 241, 0.05)";
      ctx.lineWidth = 0.5;
      for (let x = gridSize; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + offsetX, 0);
        ctx.lineTo(x + offsetX, h);
        ctx.stroke();
      }
      for (let y = gridSize; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y + offsetY);
        ctx.lineTo(w, y + offsetY);
        ctx.stroke();
      }

      // ── Light beams ──
      const beamAlpha = dark
        ? 0.015 + Math.sin(frameRef.current * 0.01) * 0.008
        : 0.02 + Math.sin(frameRef.current * 0.01) * 0.01;
      ctx.strokeStyle = `rgba(99, 102, 241, ${beamAlpha})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const baseX = (w * (i + 1)) / 4 + offsetX * 2;
        const baseY = -100 + offsetY * 2;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(baseX + 200, h + 100);
        ctx.stroke();
      }

      // ── Floating circles ──
      for (let i = 0; i < 6; i++) {
        const cx = (w * (i + 0.5)) / 6 + Math.sin(frameRef.current * 0.005 + i) * 40;
        const cy = (h * ((i % 3) + 1)) / 4 + Math.cos(frameRef.current * 0.007 + i * 2) * 30;
        const cr = 20 + Math.sin(frameRef.current * 0.01 + i) * 10;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        gradient.addColorStop(0, dark ? "rgba(99, 102, 241, 0.04)" : "rgba(99, 102, 241, 0.06)");
        gradient.addColorStop(0.5, dark ? "rgba(99, 102, 241, 0.02)" : "rgba(99, 102, 241, 0.03)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Particles ──
      const particleColor = dark ? "#818cf8" : "#6366f1";
      for (const p of particles) {
        p.vx += (mx - 0.5) * 0.0003;
        p.vy += (my - 0.5) * 0.0003;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        p.vx *= 0.999;
        p.vy *= 0.999;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129, 140, 248, ${p.alpha + Math.sin(frameRef.current * p.speed + p.x) * 0.1})`;
        ctx.fill();
      }

      // ── Stars (only in dark mode) ──
      if (dark) {
        for (const star of stars) {
          const twinkle =
            star.twinkle * (0.5 + 0.5 * Math.sin(frameRef.current * 0.02 + star.phase));
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r * twinkle, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * twinkle})`;
          ctx.fill();
        }
      }

      // ── Particle connections ──
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.08;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ─── React Component ─────────────────────────────────────

export default function ParticleField() {
  return (
    <>
      {/* Theme-aware background */}
      <div className="absolute inset-0 dark:bg-[#050816] bg-background" />

      {/* Blue ambient gradients — stronger in dark mode */}
      <div
        className="absolute top-1/3 left-1/4 w-[800px] h-[800px] pointer-events-none dark:opacity-100 opacity-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(99,102,241,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] pointer-events-none dark:opacity-100 opacity-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(129,140,248,0.04) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Light mode ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none dark:opacity-0 opacity-100 bg-gradient-to-b from-indigo-50/40 via-white to-white"
      />

      {/* Canvas particles + grid */}
      <ParticleCanvas />
    </>
  );
}
