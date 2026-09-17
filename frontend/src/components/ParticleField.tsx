import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/utils";

// ─── Canvas particle system ──────────────────────────────

const PARTICLE_COUNT = 48;
const STAR_COUNT = 40;
const GRID_SIZE = 60;
/** ~30fps. A subtle ambient backdrop does not need 60fps, and halving the
 *  frame rate halves the main-thread cost while looking identical. */
const FRAME_INTERVAL_MS = 1000 / 30;
/** Stop animating once the hero is well out of view. The field is a fixed
 *  page backdrop, so without this the loop would burn frames for the entire
 *  time a visitor reads the pricing/footer sections. */
const HERO_VIEWPORTS = 1.5;

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
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

    // ── Precomputed grid line positions (rebuilt on resize, never per frame) ──
    let gridXs: number[] = [];
    let gridYs: number[] = [];
    const rebuildGrid = () => {
      gridXs = [];
      gridYs = [];
      for (let x = GRID_SIZE; x < w; x += GRID_SIZE) gridXs.push(x);
      for (let y = GRID_SIZE; y < h; y += GRID_SIZE) gridYs.push(y);
    };
    rebuildGrid();

    // ── Particles (kept modest to avoid scroll jank on low-end devices) ──
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

    // ── Ambient glow gradient cache ──
    // Creating six radial gradients per frame was the largest allocation in
    // this loop. The radius is quantised to whole pixels so a handful of
    // cached gradients cover every frame.
    const glowCache = new Map<string, CanvasGradient>();
    const getGlow = (r: number, dark: boolean): CanvasGradient => {
      const key = `${dark ? "d" : "l"}:${r}`;
      let g = glowCache.get(key);
      if (!g) {
        g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, dark ? "rgba(249, 115, 22, 0.05)" : "rgba(166, 83, 45, 0.04)");
        g.addColorStop(0.5, dark ? "rgba(249, 115, 22, 0.02)" : "rgba(166, 83, 45, 0.01)");
        g.addColorStop(1, "rgba(249, 115, 22, 0)");
        glowCache.set(key, g);
      }
      return g;
    };

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX / w, y: e.clientY / h };
    };
    window.addEventListener("mousemove", handleMouse, { passive: true });

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      rebuildGrid();
    };
    window.addEventListener("resize", handleResize);

    let animId = 0;
    let running = true;
    let frameCount = 0;
    let lastDraw = 0;
    // `inHero` — the field only animates while the hero area is on screen.
    let inHero = window.scrollY < window.innerHeight * HERO_VIEWPORTS;

    const shouldRun = () =>
      !prefersReducedMotion && !document.hidden && running && inHero;

    const schedule = () => {
      if (shouldRun()) animId = requestAnimationFrame(draw);
    };

    const draw = (now: number) => {
      // Frame-rate cap — skip this frame and keep the loop alive.
      if (now - lastDraw < FRAME_INTERVAL_MS) {
        animId = requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;
      frameCount++;
      ctx.clearRect(0, 0, w, h);

      const dark = isDarkRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // ── Grid lines (subtle in dark, very subtle in light) ──
      const offsetX = (mx - 0.5) * 6;
      const offsetY = (my - 0.5) * 6;

      ctx.strokeStyle = dark ? "rgba(249, 115, 22, 0.03)" : "rgba(166, 83, 45, 0.03)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (const gx of gridXs) {
        ctx.moveTo(gx + offsetX, 0);
        ctx.lineTo(gx + offsetX, h);
      }
      for (const gy of gridYs) {
        ctx.moveTo(0, gy + offsetY);
        ctx.lineTo(w, gy + offsetY);
      }
      ctx.stroke();

      // ── Light beams ──
      const beamAlpha = dark
        ? 0.015 + Math.sin(frameCount * 0.01) * 0.008
        : 0.02 + Math.sin(frameCount * 0.01) * 0.01;
      ctx.strokeStyle = dark ? `rgba(249, 115, 22, ${beamAlpha})` : `rgba(166, 83, 45, ${beamAlpha})`;
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
        const cx = (w * (i + 0.5)) / 6 + Math.sin(frameCount * 0.005 + i) * 40;
        const cy = (h * ((i % 3) + 1)) / 4 + Math.cos(frameCount * 0.007 + i * 2) * 30;
        const cr = Math.round(20 + Math.sin(frameCount * 0.01 + i) * 10);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = getGlow(cr, dark);
        ctx.beginPath();
        ctx.arc(0, 0, cr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Particles ──
      ctx.fillStyle = "";
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
        ctx.fillStyle = `rgba(180, 100, 50, ${p.alpha + Math.sin(frameCount * p.speed + p.x) * 0.1})`;
        ctx.fill();
      }

      // ── Stars (only in dark mode) ──
      if (dark) {
        for (const star of stars) {
          const twinkle =
            star.twinkle * (0.5 + 0.5 * Math.sin(frameCount * 0.02 + star.phase));
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r * twinkle, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * twinkle})`;
          ctx.fill();
        }
      }

      // ── Particle connections ──
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          // Cheap axis rejection before the square root.
          if (dx > 120 || dx < -120) continue;
          const dy = a.y - b.y;
          if (dy > 120 || dy < -120) continue;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = dark ? `rgba(249, 115, 22, ${(1 - dist / 120) * 0.05})` : `rgba(166, 83, 45, ${(1 - dist / 120) * 0.06})`;
            ctx.stroke();
          }
        }
      }

      schedule();
    };

    // Pause the animation loop while the tab is hidden; resume on visibility.
    const handleVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(animId);
      } else if (!running) {
        running = true;
        schedule();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Pause once the hero has been scrolled past — the backdrop is static-looking
    // anyway, so there is no reason to keep repainting it further down the page.
    const handleScroll = () => {
      const wasInHero = inHero;
      inHero = window.scrollY < window.innerHeight * HERO_VIEWPORTS;
      if (!wasInHero && inHero) schedule();
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    if (prefersReducedMotion) {
      // Reduced motion: draw a single static frame (grid + particles) and stop.
      draw(FRAME_INTERVAL_MS);
    } else {
      animId = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("scroll", handleScroll);
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
      {/* Theme-aware background (uses the app's --background token in both themes) */}
      <div className="absolute inset-0 bg-background" />

      {/* Ambient glows. These are already soft radial gradients, so the old
          `filter: blur(60px)` bought nothing visually while forcing the
          compositor to rasterise an 800px layer on every theme change. */}
      <div
        className="absolute top-1/3 left-1/4 w-[800px] h-[800px] pointer-events-none dark:opacity-100 opacity-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(99,102,241,0.06) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] pointer-events-none dark:opacity-100 opacity-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(129,140,248,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Light mode ambient glow */}
      <div className="absolute inset-0 pointer-events-none dark:opacity-0 opacity-100 bg-gradient-to-b from-primary/5 via-background to-background" />

      {/* Canvas particles + grid */}
      <ParticleCanvas />
    </>
  );
}
