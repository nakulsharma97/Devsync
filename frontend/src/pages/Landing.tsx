import { motion, useScroll, useTransform } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { useRef } from "react";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const features = [
  {
    icon: Code2,
    title: "Collaborative Coding",
    description: "Real-time pair programming and code reviews with your team. Share knowledge and ship faster with confidence.",
  },
  {
    icon: Users,
    title: "Developer Network",
    description: "Connect with engineers who share your interests. Build meaningful professional relationships that advance your career.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    description: "Smart code analysis, automated documentation, and intelligent suggestions that help you write better code, faster.",
  },
  {
    icon: GitBranch,
    title: "Project Showcase",
    description: "Share your work, get meaningful feedback, and discover open-source projects that need your expertise.",
  },
  {
    icon: Shield,
    title: "Code Quality",
    description: "Automated reviews, security scanning, and best practice enforcement baked into your workflow from day one.",
  },
  {
    icon: Layers,
    title: "Workspaces",
    description: "Organize projects into focused workspaces. Keep personal, work, and open-source efforts cleanly separated.",
  },
];

const benefits = [
  "Unlimited projects and repositories",
  "Real-time collaboration tools",
  "AI-powered code reviews",
  "Community of verified developers",
  "Privacy-first architecture",
  "Always-free tier available",
];

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center shadow-sm">
              <Code2 className="w-4.5 h-4.5 text-background" />
            </div>
            <span className="text-base font-semibold tracking-tight">DevSync</span>
          </button>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm">Sign in</Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="text-sm shadow-sm">
              Get Started
              <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          </nav>
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="md:hidden text-sm">Sign in</Button>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-32 pb-24 md:pt-40 md:pb-32 px-6 overflow-hidden">
        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="mx-auto max-w-4xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium tracking-wide mb-8 border border-accent/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Now in public beta
            </span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.04] text-foreground"
          >
            Build better software
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-accent to-accent/60">together.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            DevSync connects developers with the tools, teams, and AI intelligence they need 
            to create exceptional software — from the first line of code to production deployment.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto text-base px-8 h-12 shadow-sm">
              Start building free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto text-base px-8 h-12">
              See features
            </Button>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="mt-6 text-xs text-muted-foreground"
          >
            No credit card required · Free tier includes everything you need to start
          </motion.p>
        </motion.div>
        {/* Subtle gradient orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-accent/5 via-accent/3 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-bl from-accent/8 to-transparent rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Social proof / stats bar */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10K+", label: "Active developers" },
              { value: "5K+", label: "Projects shipped" },
              { value: "500+", label: "Open source repos" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-32 px-6">
        <div className="mx-auto max-w-7xl">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-80px" }}
            variants={{
              initial: { opacity: 0, y: 30 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
            }}
            className="text-center mb-16 md:mb-24"
          >
            <span className="text-xs font-medium tracking-widest uppercase text-accent mb-4 block">Features</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Everything you need to ship
            </h2>
            <p className="mt-4 text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
              A comprehensive platform designed for modern development teams who care about quality and velocity.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/50 rounded-xl overflow-hidden">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="bg-card p-8 sm:p-10 hover:bg-accent/5 transition-colors duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-5 ring-1 ring-accent/20">
                  <feature.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 md:py-32 px-6 bg-muted/20">
        <div className="mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-xs font-medium tracking-widest uppercase text-accent mb-4 block">Why DevSync</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-6">
                Built for developers who ship daily
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                We've distilled years of developer experience into a platform that respects your time 
                and elevates your craft. No noise, no clutter — just the tools you need.
              </p>
              <div className="space-y-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-accent" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border border-border/50 p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-6 ring-1 ring-accent/20">
                    <Code2 className="w-8 h-8 text-accent" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">Join 10,000+ developers</p>
                  <p className="text-sm text-muted-foreground mt-2">Start shipping better software today</p>
                  <Button onClick={() => navigate("/auth")} className="mt-6 shadow-sm">
                    Get started
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-xs font-medium tracking-widest uppercase text-accent mb-4 block">Get started</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Ready to ship with confidence?
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-md mx-auto">
            Join developers who use DevSync to build better software, faster. No credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto text-base px-8 h-12 shadow-sm">
              Get started free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto text-base px-8 h-12">
              Talk to sales
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-foreground flex items-center justify-center">
                  <Code2 className="w-3.5 h-3.5 text-background" />
                </div>
                <span className="text-sm font-semibold">DevSync</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                A developer collaboration platform built by engineers, for engineers.
              </p>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Documentation", "Changelog"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} DevSync. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {["Twitter", "GitHub", "Discord"].map((social) => (
                <a key={social} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{social}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
