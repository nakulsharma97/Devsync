import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Rocket, Terminal, Check, ChevronDown } from "lucide-react";
import GlassCodeEditor from "@/components/GlassCodeEditor";

const OrganicBlob = lazy(() => import("@/components/OrganicBlob"));

export default function HeroSection() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);

  // ── Mouse parallax ──
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 30, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 30, damping: 20 });

  const blobX = useTransform(springX, [0, 1], [-15, 15]);
  const blobY = useTransform(springY, [0, 1], [-15, 15]);
  const editorX = useTransform(springX, [0, 1], [10, -10]);
  const editorY = useTransform(springY, [0, 1], [10, -10]);
  const textX = useTransform(springX, [0, 1], [-5, 5]);
  const textY = useTransform(springY, [0, 1], [-5, 5]);
  const gridX = useTransform(springX, [0, 1], [-20, 20]);
  const gridY = useTransform(springY, [0, 1], [-20, 20]);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [mouseX, mouseY]);

  // ── Scroll progress for scroll indicator fade ──
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center pt-24 overflow-hidden"
      style={{ background: "#050816" }}
    >
      {/* Parallax grid layer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ x: gridX, y: gridY, opacity: 0.4 }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </motion.div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* ── Left Side: Text + CTA ── */}
          <motion.div
            className="text-center lg:text-left"
            style={{ x: textX, y: textY }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide mb-8 border shadow-lg backdrop-blur-sm"
                style={{
                  background: "rgba(99, 102, 241, 0.1)",
                  borderColor: "rgba(99, 102, 241, 0.25)",
                  color: "rgba(165, 180, 252, 0.9)",
                  boxShadow: "0 0 20px rgba(99, 102, 241, 0.1)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "#818cf8" }}
                />
                Now in Public Beta
                <span style={{ color: "rgba(99, 102, 241, 0.4)" }}>·</span>
                <span style={{ color: "rgba(165, 180, 252, 0.6)" }}>50K+ developers</span>
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]"
              style={{ color: "#e2e8f0" }}
            >
              Code.
              <br />
              Collaborate.
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #818cf8 0%, #6366f1 30%, #a78bfa 60%, #c4b5fd 100%)",
                }}
              >
                Ship at light speed.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0"
              style={{ color: "rgba(148, 163, 184, 0.8)" }}
            >
              The developer platform that combines AI-powered coding, real-time
              collaboration, and instant deployment — all in your browser.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex flex-col sm:flex-row items-center gap-4 lg:justify-start"
            >
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto text-base px-8 h-12 relative overflow-hidden group transition-all duration-300 border-0"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #818cf8)",
                  boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0 30px rgba(99, 102, 241, 0.5), 0 0 60px rgba(99, 102, 241, 0.2)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(99, 102, 241, 0.3)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span className="relative z-10 flex items-center text-white">
                  Start Building Free
                  <Rocket className="ml-2 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200" />
                </span>
                {/* Shine overlay */}
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                    transform: "skewX(-20deg)",
                  }}
                />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="w-full sm:w-auto text-base px-8 h-12 font-medium transition-all duration-300"
                style={{
                  borderColor: "rgba(99, 102, 241, 0.3)",
                  color: "rgba(200, 210, 250, 0.9)",
                  background: "rgba(99, 102, 241, 0.05)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
                  e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
                  e.currentTarget.style.boxShadow =
                    "0 0 20px rgba(99, 102, 241, 0.15)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                  e.currentTarget.style.background = "rgba(99, 102, 241, 0.05)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Terminal className="mr-2 w-4 h-4" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Trust markers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-6 flex items-center gap-6 justify-center lg:justify-start text-xs"
              style={{ color: "rgba(148, 163, 184, 0.5)" }}
            >
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" style={{ color: "rgba(52, 211, 153, 0.6)" }} />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" style={{ color: "rgba(52, 211, 153, 0.6)" }} />
                Free tier included
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" style={{ color: "rgba(52, 211, 153, 0.6)" }} />
                Cancel anytime
              </span>
            </motion.div>
          </motion.div>

          {/* ── Right Side: Blob + Code Editor ── */}
          <motion.div
            className="hidden lg:flex flex-col items-center gap-6"
            style={{ x: editorX, y: editorY }}
          >
            {/* Blob centerpiece */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              className="w-full max-w-[420px] h-[380px] relative"
              style={{ x: blobX, y: blobY }}
            >
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div
                      className="w-12 h-12 rounded-full border-2 animate-spin"
                      style={{
                        borderColor: "rgba(99, 102, 241, 0.2)",
                        borderTopColor: "#6366f1",
                      }}
                    />
                  </div>
                }
              >
                <OrganicBlob />
              </Suspense>
            </motion.div>

            {/* Code Editor */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              className="w-full max-w-[480px]"
            >
              <GlassCodeEditor />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: scrollY > 50 ? 0 : 1 }}
        transition={{ duration: 0.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span
          className="text-xs font-mono"
          style={{ color: "rgba(148, 163, 184, 0.4)" }}
        >
          Scroll to explore
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full flex items-start justify-center p-1"
          style={{
            border: "1px solid rgba(99, 102, 241, 0.15)",
          }}
        >
          <div
            className="w-1 h-2 rounded-full"
            style={{ background: "rgba(99, 102, 241, 0.3)" }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
