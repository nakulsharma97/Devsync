import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Code2,
  Users,
  Sparkles,
  GitBranch,
  Shield,
  Layers,
  Check,
  ChevronRight,
  Star,
  Github,
  Twitter,
  MessageCircle,
  Zap,
  Rocket,
  Command,
  Globe,
  Monitor,
  Database,
  Cloud,
  Terminal,
  ExternalLink,
  Menu,
  X,
  Play,
  FileType,
  Braces,
  GitPullRequest,
  Bug,
  PaintBucket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HighContrastToggle } from "@/components/HighContrastToggle";
import { useNavigate } from "react-router";
import { useRef, useState, useEffect, useCallback } from "react";

// ─── Animation Variants ───────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

// ─── Animated Counter ─────────────────────────────────────────

function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  const numericValue = parseInt(value.replace(/[^0-9]/g, ""));
  const hasPlus = value.includes("+");
  const hasPercent = value.includes("%");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const duration = 2000;
          const startTime = performance.now();

          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * numericValue);
            setDisplay(current.toString());
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplay(numericValue.toString());
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [numericValue]);

  return (
    <span ref={ref} className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
      {display}{hasPlus ? "+" : ""}{hasPercent ? "%" : ""}{suffix}
    </span>
  );
}

// ─── Safe Parallax Hook (IntersectionObserver-based) ──────────

function useParallax(speed: number = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const handleScroll = () => {
            const rect = el!.getBoundingClientRect();
            const viewportCenter = window.innerHeight / 2;
            const elementCenter = rect.top + rect.height / 2;
            const distance = elementCenter - viewportCenter;
            setOffsetY(distance * speed);
          };

          handleScroll();
          window.addEventListener("scroll", handleScroll, { passive: true });
          return () => window.removeEventListener("scroll", handleScroll);
        }
      },
      { threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [speed]);

  return { ref, style: { transform: `translateY(${offsetY}px)`, transition: "transform 0.1s linear" } };
}

// ─── Hero Code Editor Mockup ─────────────────────────────────

function CodeEditorMockup() {
  const lines = [
    { content: 'import { DevSync } from "devsync";', highlight: false },
    { content: 'import { AI, Collaboration } from "devsync/features";', highlight: false },
    { content: "", highlight: false },
    { content: "const app = new DevSync({", highlight: false },
    { content: '  project: "my-app",', highlight: false },
    { content: '  team: "engineering",', highlight: false },
    { content: "  ai: AI.enabled,", highlight: false },
    { content: "  collab: Collaboration.realtime,", highlight: false },
    { content: "});", highlight: false },
    { content: "", highlight: false },
    { content: "// Deploy with one click", highlight: true },
    { content: "await app.deploy({", highlight: false },
    { content: '  env: "production",', highlight: false },
    { content: "  preview: true,", highlight: false },
    { content: '  rollback: "instant",', highlight: false },
    { content: "});", highlight: false },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl overflow-hidden group hover:border-indigo-500/30 hover:shadow-indigo-500/10 transition-all duration-500">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <div className="flex items-center gap-1.5 ml-3 text-[10px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">
          <FileType className="w-3 h-3" />
          <span>app.ts</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <GitPullRequest className="w-3 h-3" />
          <span>main</span>
        </div>
      </div>

      {/* Editor content */}
      <div className="p-4 md:p-5 font-mono text-[11px] md:text-xs leading-relaxed">
        <div className="flex">
          {/* Line numbers */}
          <div className="text-muted-foreground/30 text-right pr-3 select-none space-y-[2px]">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          {/* Code */}
          <div className="space-y-[2px]">
            {lines.map((line, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 ${
                  line.highlight
                    ? "bg-indigo-500/10 -mx-3 px-3 rounded py-[1px] border-l-2 border-indigo-400"
                    : ""
                }`}
              >
                {line.content ? (
                  <span className="text-foreground/80">{line.content}</span>
                ) : (
                  <span className="text-muted-foreground/20">{/* spacer */}</span>
                )}
                {line.highlight && (
                  <span className="inline-flex items-center gap-1 text-[9px] text-indigo-400 bg-indigo-500/15 px-1.5 py-0.5 rounded-full animate-pulse">
                    <Play className="w-2 h-2 fill-current" />
                    Deploying
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border/30 bg-muted/20 text-[9px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Braces className="w-2.5 h-2.5" /> TypeScript
          </span>
          <span className="flex items-center gap-1">
            <Bug className="w-2.5 h-2.5" /> 0 errors
          </span>
          <span className="flex items-center gap-1">
            <GitBranch className="w-2.5 h-2.5" /> main
          </span>
        </div>
        <span className="flex items-center gap-1">
          <PaintBucket className="w-2.5 h-2.5" /> Prettier
        </span>
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────

const features = [
  {
    icon: Code2,
    title: "AI-Powered Code Editor",
    description: "Smart autocomplete, real-time error detection, and AI suggestions that adapt to your coding style and project context.",
    gradient: "from-indigo-500/20 to-purple-500/20",
    iconBg: "from-indigo-500 to-purple-600",
  },
  {
    icon: Users,
    title: "Live Collaboration",
    description: "Multi-player editing with cursor sync, voice chat, and instant code reviews. Ship features together from anywhere.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconBg: "from-blue-500 to-cyan-600",
  },
  {
    icon: Rocket,
    title: "One-Click Deploy",
    description: "Push to production from your editor. Built-in CI/CD, preview deployments, and rollback with zero configuration.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconBg: "from-emerald-500 to-teal-600",
  },
  {
    icon: Terminal,
    title: "Dev Environment in Browser",
    description: "Full Linux terminal, VS Code extensions, and database clients. Everything runs in your browser, nothing on your machine.",
    gradient: "from-orange-500/20 to-amber-500/20",
    iconBg: "from-orange-500 to-amber-600",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 compliant, end-to-end encryption, SSO, audit logs, and granular permission controls for teams of any size.",
    gradient: "from-red-500/20 to-rose-500/20",
    iconBg: "from-red-500 to-rose-600",
  },
  {
    icon: Layers,
    title: "Smart Workspaces",
    description: "Organize projects with intelligent workspaces. AI suggests folder structures, dependencies, and team assignments automatically.",
    gradient: "from-violet-500/20 to-fuchsia-500/20",
    iconBg: "from-violet-500 to-fuchsia-600",
  },
];

const stats = [
  { value: "50000", label: "Active Developers", sub: "Growing 15% MoM", suffix: "+" },
  { value: "12000", label: "Projects Deployed", sub: "Across 190 countries", suffix: "+" },
  { value: "2000000", label: "Code Reviews", sub: "98% satisfaction rate", suffix: "+" },
  { value: "9999", label: "Uptime SLA", sub: "Guaranteed availability", suffix: ".99%" },
];

const testimonials = [
  {
    quote: "DevSync changed how our entire engineering team operates. We went from two-week sprints to shipping daily.",
    author: "Sarah Chen",
    role: "VP of Engineering, Stripe",
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    quote: "The AI code suggestions are scary good. It understands our codebase better than some team members.",
    author: "Marcus Johnson",
    role: "CTO, Vercel",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    quote: "We built our entire microservices architecture on DevSync. The browser-based dev environment is a game changer.",
    author: "Emily Rodriguez",
    role: "Founder, Railway",
    gradient: "from-orange-500 to-amber-600",
  },
];

const pricing = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    description: "Perfect for individual developers and open-source projects.",
    features: ["Unlimited public projects", "AI code suggestions", "Community support", "1 GB storage", "Basic analytics"],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For professional developers who need more power and privacy.",
    features: ["Everything in Starter", "Unlimited private projects", "Priority AI features", "50 GB storage", "Advanced analytics", "Custom domains", "Team collaboration"],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For teams that need enterprise-grade security and control.",
    features: ["Everything in Pro", "SSO & SAML", "Audit logs", "Unlimited storage", "99.99% SLA", "Dedicated support", "Custom integrations", "On-premise option"],
    cta: "Contact Sales",
    popular: false,
  },
];

// ─── Components ───────────────────────────────────────────────

function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/30 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-all duration-200 group-hover:scale-105 group-hover:shadow-indigo-500/30">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            DevSync
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {["Features", "Docs", "Pricing", "Enterprise"].map((item) => (
            <a
              key={item}
              href={item === "Features" ? "#features" : `#${item.toLowerCase()}`}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/5"
            >
              {item}
            </a>
          ))}
          <div className="w-px h-5 bg-border/50 mx-2" />
          <HighContrastToggle />
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm font-medium">
            Sign in
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
          >
            Start Free
            <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
          </Button>
        </nav>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-accent/5 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border/30 bg-background/95 backdrop-blur-xl"
          >
            <div className="px-4 py-4 space-y-2">
              {["Features", "Docs", "Pricing", "Enterprise"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-accent/5 transition-colors"
                >
                  {item}
                </a>
              ))}
              <div className="pt-2 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                  Sign in
                </Button>
                <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white" onClick={() => navigate("/auth")}>
                  Start Free
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Static gradient background ────────────────────────────────

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-indigo-950/20 to-background" />
      <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-purple-500/8 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-32 w-[400px] h-[400px] bg-gradient-to-bl from-purple-500/10 via-pink-500/8 to-transparent rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent rounded-full blur-3xl" />
    </div>
  );
}

// ─── Main Landing Page ─────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { ref: heroParallaxRef, style: heroParallaxStyle } = useParallax(0.08);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <AnimatedBackground />
      <Navbar />

      {/* ══════════════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-gradient-to-br from-indigo-500/10 via-purple-500/8 to-pink-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 -left-48 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/15 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "10s" }} />
        <div className="absolute bottom-1/4 -right-48 w-[500px] h-[500px] bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Hero Text */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="text-center lg:text-left"
            >
              <motion.div variants={itemVariants}>
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-pink-500/15 text-indigo-300 text-xs font-medium tracking-wide mb-8 border border-indigo-500/25 shadow-lg shadow-indigo-500/10 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Now in Public Beta
                  <span className="mx-1 opacity-40">·</span>
                  <span className="text-indigo-300/70">50K+ developers</span>
                </span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]"
              >
                Code, Collaborate,
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Ship at light speed.
                </span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="mt-6 text-base sm:text-lg text-foreground/70 leading-relaxed max-w-lg mx-auto lg:mx-0"
              >
                The developer platform that combines AI-powered coding, real-time collaboration, and instant deployment — all in your browser.
              </motion.p>

              <motion.div variants={itemVariants} className="mt-8 flex flex-col sm:flex-row items-center gap-4 lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="w-full sm:w-auto text-base px-8 h-12 shadow-xl hover:shadow-2xl transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center">
                    Start Building Free
                    <Rocket className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 h-12 border-indigo-500/40 hover:border-indigo-400/60 hover:bg-indigo-500/10 text-foreground font-medium transition-all duration-200"
                >
                  <Terminal className="mr-2 w-4 h-4" />
                  Watch Demo
                </Button>
              </motion.div>

              <motion.div variants={itemVariants} className="mt-6 flex items-center gap-6 justify-center lg:justify-start text-xs text-foreground/60">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Free tier included
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Cancel anytime
                </span>
              </motion.div>
            </motion.div>

            {/* Hero Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
              className="hidden lg:block"
              ref={heroParallaxRef as any}
              style={heroParallaxStyle}
            >
              <CodeEditorMockup />
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-muted-foreground/60">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-5 h-8 rounded-full border border-border/40 flex items-start justify-center p-1"
          >
            <motion.div className="w-1 h-2 rounded-full bg-accent/60" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STATS BAR (with animated counters)
      ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 border-y border-border/30 bg-muted/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 md:py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center group"
              >
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                <p className="text-xs md:text-sm text-muted-foreground mt-1.5 font-medium">{stat.label}</p>
                <p className="text-[10px] md:text-xs text-indigo-400/70 mt-0.5">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════════ */}
      <section id="features" className="relative z-10 py-16 md:py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl relative">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeInUp}
            className="text-center mb-10 md:mb-16"
          >
            <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 block">
              Everything you need
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Build better software,
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">faster than ever</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              A complete development platform with AI-powered tools, real-time collaboration, and enterprise-grade infrastructure.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] as const }}
                className="group relative bg-card border border-border/50 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                <div className="relative z-10">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center mb-5 shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl`}>
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-semibold mb-2 group-hover:text-indigo-300 transition-colors duration-200">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works, Testimonials, Benefits, Pricing, CTA, Footer sections remain the same */}
      {/* (unchanged from the working version) */}

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-16 md:py-24 px-4 sm:px-6 bg-muted/20">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeInUp}
            className="text-center mb-10"
          >
            <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent mb-4 block">
              How it works
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              From idea to production in minutes
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Terminal,
                title: "Open your browser",
                description: "No setup, no downloads. Just open DevSync and start coding in a full-featured development environment.",
                gradient: "from-indigo-500 to-purple-600",
              },
              {
                step: "02",
                icon: Users,
                title: "Invite your team",
                description: "Real-time multiplayer editing with cursor sync, voice chat, and instant feedback. Like Google Docs for code.",
                gradient: "from-emerald-500 to-teal-600",
              },
              {
                step: "03",
                icon: Rocket,
                title: "Ship to production",
                description: "One click deploys your app to production with built-in CI/CD, preview URLs, and instant rollbacks.",
                gradient: "from-orange-500 to-amber-600",
              },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative"
              >
                <div className="bg-card border border-border/50 rounded-2xl p-8 hover:border-indigo-500/20 transition-all duration-300 group">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/20 bg-clip-text text-transparent">
                      {step.step}
                    </span>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}>
                      <step.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 text-muted-foreground/30">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-16 md:py-24 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl relative">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeInUp}
            className="text-center mb-10"
          >
            <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-4 block">
              Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Trusted by engineering leaders
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:border-indigo-500/20 hover:shadow-xl hover:-translate-y-1 group"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm md:text-base text-foreground leading-relaxed mb-6 italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center shadow-md`}>
                    <span className="text-sm font-bold text-white">
                      {testimonial.author.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          BENEFITS / WHY DEVSYNC
      ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-16 md:py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 block">
                Why DevSync
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
                Built by engineers, for engineers
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-md">
                We&apos;ve spent years building software and know what really matters. DevSync delivers the tools you need without the noise.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Zap, text: "10x faster development workflow" },
                  { icon: Shield, text: "SOC 2 Type II certified" },
                  { icon: Globe, text: "Available in 190+ countries" },
                  { icon: Cloud, text: "99.99% uptime guarantee" },
                  { icon: Database, text: "Automatic backups & versioning" },
                  { icon: Monitor, text: "Full local development environment" },
                ].map((benefit) => (
                  <div key={benefit.text} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0 group-hover:from-indigo-500/30 group-hover:to-purple-500/30 transition-all duration-200">
                      <benefit.icon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-sm text-foreground">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
              className="relative"
            >
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/5 border border-border/50 p-6 md:p-8 flex items-center justify-center relative overflow-hidden group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="text-center relative z-10">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6 ring-1 ring-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Command className="w-12 h-12 text-indigo-400" />
                  </div>
                  <p className="text-xl font-semibold mb-2">Ready to ship faster?</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Join 50,000+ developers already building on DevSync.
                  </p>
                  <Button
                    onClick={() => navigate("/auth")}
                    className="shadow-xl hover:shadow-2xl transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
                  >
                    Get started
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════════════════════ */}
      <section id="pricing" className="relative z-10 py-16 md:py-24 px-4 sm:px-6 bg-muted/20">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeInUp}
            className="text-center mb-10"
          >
            <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent mb-4 block">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-muted-foreground max-w-md mx-auto">
              Start for free. Upgrade when you need more power.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricing.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-8 transition-all duration-300 ${
                  plan.popular
                    ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-purple-500/5 shadow-xl shadow-indigo-500/10 scale-105"
                    : "border-border/50 bg-card hover:border-indigo-500/20 hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => navigate("/auth")}
                  className={`w-full ${
                    plan.popular
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg"
                      : "bg-card border border-border/50 hover:border-indigo-500/30 hover:bg-indigo-500/5"
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-16 md:py-28 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-indigo-500/8 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
          className="mx-auto max-w-3xl text-center relative z-10"
        >
          <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 block">
            Get started
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            Ready to build
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              the next big thing?
            </span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Join the platform that helps developers ship better software, faster. No credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto text-base px-10 h-12 shadow-xl hover:shadow-2xl transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center">
                Get Started Free
                <Rocket className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-base px-10 h-12 border-border/50 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-200"
            >
              <ExternalLink className="mr-2 w-4 h-4" />
              View Documentation
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 md:py-20">
          <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Code2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold">DevSync</span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
                A developer collaboration platform built by engineers, for engineers. Ship better software, together.
              </p>
              <div className="flex items-center gap-2">
                {[
                  { icon: Github, href: "#", label: "GitHub" },
                  { icon: Twitter, href: "#", label: "Twitter" },
                  { icon: MessageCircle, href: "#", label: "Discord" },
                ].map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-indigo-500/10 hover:text-indigo-400 transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Documentation", "Changelog", "API Status"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Press Kit", "Contact"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Security", "Cookies", "GDPR"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-2"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} DevSync. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {["Twitter", "GitHub", "Discord"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
