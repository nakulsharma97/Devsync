import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import GlassCodeEditor from "@/components/GlassCodeEditor";
import { Button } from "@/components/ui/button";
import { Rocket, Terminal, Check } from "lucide-react";
import { prefersReducedMotion } from "@/lib/utils";
import type { PublicStats } from "@/services/landingService";

// The decorative code editor is now animation-library-free (~7 kB), so it is
// rendered directly instead of through a lazy chunk — no loading skeleton and
// no extra round trip on the hero.

export default function HeroSection({ stats }: { stats: PublicStats | null }) {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // CSS-variable-driven parallax — no framer-motion needed
  useEffect(() => {
    if (prefersReducedMotion) return;
    const handleMouse = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
      const ny = e.clientY / window.innerHeight - 0.5;
      document.documentElement.style.setProperty("--hero-mx", `${nx * 6}px`);
      document.documentElement.style.setProperty("--hero-my", `${ny * 6}px`);
    };
    window.addEventListener("mousemove", handleMouse, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const [showScrollHint, setShowScrollHint] = useState(true);
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setShowScrollHint(window.scrollY <= 50);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col justify-center pt-28 pb-24 overflow-hidden"
    >
      {/* Subtle grid — only dark mode */}
      <div className="absolute inset-0 pointer-events-none hidden dark:block opacity-[0.04]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(166, 83, 45, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(166, 83, 45, 0.3) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-6 sm:px-8 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — text with CSS parallax */}
          <div
            ref={textRef}
            className="text-center lg:text-left hero-parallax-text animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-8 border border-primary/20 bg-primary/5 text-primary animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Public Beta
              {stats && stats.users > 0 && (
                <>
                  <span className="mx-1 opacity-30">·</span>
                  <span className="text-muted-foreground">
                    {stats.users.toLocaleString()} dev{stats.users === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </span>

            <h1
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-foreground animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              Code.
              <br />
              Collaborate.
              <br />
              <span className="text-primary">Ship.</span>
            </h1>

            <p
              className="mt-6 text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0 text-muted-foreground animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              Projects, Kanban boards, real-time team chat, file sharing, and
              GitHub integration — one workspace for building software together.
            </p>

            <div
              className="mt-8 flex flex-col sm:flex-row items-center gap-3 lg:justify-start animate-fade-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <Button
                size="lg"
                onClick={() => navigate("/auth?mode=register")}
                className="w-full sm:w-auto text-sm px-8 h-11 font-medium"
              >
                <span className="flex items-center">
                  Start Free
                  <Rocket className="ml-2 w-4 h-4" />
                </span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="w-full sm:w-auto text-sm px-8 h-11 font-medium"
              >
                <Terminal className="mr-2 w-4 h-4" />
                See Features
              </Button>
            </div>

            <div
              className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 justify-center lg:justify-start text-xs text-muted-foreground animate-fade-in"
              style={{ animationDelay: "0.5s" }}
            >
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-accent" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-accent" />
                Free tier
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-accent" />
                Cancel anytime
              </span>
            </div>
          </div>

          {/* Right — editor with CSS parallax */}
          <div
            ref={editorRef}
            className="flex flex-col items-center gap-6 hero-parallax-editor"
          >
            <div
              className="w-full max-w-[520px] animate-fade-in-up"
              style={{ animationDelay: "0.5s" }}
            >
              <GlassCodeEditor />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint — CSS only */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-300 ${
          showScrollHint ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="text-[11px] font-mono text-muted-foreground/60">
          scroll
        </span>
        <div className="w-4 h-7 rounded-full flex items-start justify-center p-1 border border-border scroll-indicator">
          <div className="w-0.5 h-1.5 rounded-full bg-muted-foreground/40" />
        </div>
      </div>
    </section>
  );
}
