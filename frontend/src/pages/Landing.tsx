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
  Star,
  Github,
  Twitter,
  MessageCircle,
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

const testimonials = [
  {
    quote: "DevSync transformed how our team collaborates. The AI code reviews alone saved us countless hours.",
    author: "Sarah Chen",
    role: "Lead Engineer at Acme",
  },
  {
    quote: "The developer network is incredible. I found my current team through DevSync.",
    author: "Marcus Johnson",
    role: "Full Stack Developer",
  },
  {
    quote: "Best developer platform I've used. The workspace organization is a game-changer.",
    author: "Emily Rodriguez",
    role: "Independent Developer",
  },
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
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.98]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/30">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Code2 className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">DevSync</span>
          </button>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-accent after:transition-all hover:after:w-full">Features</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-accent after:transition-all hover:after:w-full">Docs</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-accent after:transition-all hover:after:w-full">Pricing</a>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm">Sign in</Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="text-sm shadow-md hover:shadow-lg transition-shadow duration-200 bg-gradient-to-r from-accent to-accent/90 text-white">
              Get Started
              <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          </nav>
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="md:hidden text-sm">Sign in</Button>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-32 pb-24 md:pt-44 md:pb-36 px-6 overflow-hidden">
        <motion.div
          style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
          className="mx-auto max-w-4xl text-center relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-accent/15 via-accent/10 to-accent/5 text-accent text-xs font-medium tracking-wide mb-8 border border-accent/20 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Now in public beta
              <span className="ml-1 opacity-60">·</span>
              <span className="text-accent/70">Join 10K+ developers</span>
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.04] text-foreground"
          >
            Build better software
            <br />
            <span className="bg-gradient-to-r from-accent via-purple-500 to-pink-500 bg-clip-text text-transparent">
              together.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            DevSync connects developers with the tools, teams, and AI intelligence they need
            to create exceptional software — from the first line of code to production deployment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto text-base px-8 h-12 shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-accent to-accent/90 text-white hover:from-accent/90 hover:to-accent"
            >
              Start building free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto text-base px-8 h-12 border-border/50 hover:bg-accent/5 hover:border-accent/30 transition-all duration-200"
            >
              <Star className="mr-2 w-4 h-4" />
              See features
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-xs text-muted-foreground"
          >
            No credit card required · Free tier includes everything you need to start
          </motion.p>
        </motion.div>

        {/* Gradient orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-br from-accent/8 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-accent/10 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-purple-500/8 to-transparent rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Social proof / stats bar */}
      <section className="border-y border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10K+", label: "Active developers", change: "+23% this month" },
              { value: "5K+", label: "Projects shipped", change: "+12% this month" },
              { value: "500+", label: "Open source repos", change: "+8% this month" },
              { value: "99.9%", label: "Uptime", change: "99.9% SLA" },
            ].map((stat) => (
              <div key={stat.label} className="group">
                <p className="text-3xl font-bold text-foreground transition-all duration-200 group-hover:text-accent">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                <p className="text-[10px] text-accent/60 mt-0.5 font-medium">{stat.change}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-36 px-6 relative">
        <div className="mx-auto max-w-7xl relative z-10">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              initial: { opacity: 0, y: 30 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
            }}
            className="text-center mb-16 md:mb-24"
          >
            <span className="text-xs font-medium tracking-widest uppercase bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent mb-4 block">Features</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Everything you need to ship
            </h2>
            <p className="mt-4 text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
              A comprehensive platform designed for modern development teams who care about quality and velocity.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="group relative bg-card border border-border/50 rounded-2xl p-8 transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center mb-5 ring-1 ring-accent/20 group-hover:ring-accent/30 group-hover:scale-105 transition-all duration-200">
                    <feature.icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-accent transition-colors duration-200">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32 px-6 bg-muted/20 relative">
        <div className="mx-auto max-w-7xl relative z-10">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              initial: { opacity: 0, y: 30 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
            }}
            className="text-center mb-16"
          >
            <span className="text-xs font-medium tracking-widest uppercase bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent mb-4 block">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Loved by developers
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="bg-card border border-border/50 rounded-2xl p-6 transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-6 italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-accent">
                      {testimonial.author.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 md:py-36 px-6 relative">
        <div className="mx-auto max-w-5xl relative z-10">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-xs font-medium tracking-widest uppercase bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent mb-4 block">Why DevSync</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-6">
                Built for developers who ship daily
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                We've distilled years of developer experience into a platform that respects your time
                and elevates your craft. No noise, no clutter — just the tools you need.
              </p>
              <div className="space-y-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3 group">
                    <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors duration-200">
                      <Check className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-accent/10 via-purple-500/5 to-pink-500/5 border border-border/50 p-8 flex items-center justify-center relative overflow-hidden group hover:shadow-xl hover:shadow-accent/5 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="text-center relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mx-auto mb-6 ring-1 ring-accent/20 group-hover:scale-105 transition-transform duration-300">
                    <Code2 className="w-10 h-10 text-accent" />
                  </div>
                  <p className="text-xl font-semibold text-foreground">Join 10,000+ developers</p>
                  <p className="text-sm text-muted-foreground mt-2">Start shipping better software today</p>
                  <Button
                    onClick={() => navigate("/auth")}
                    className="mt-6 shadow-md hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-accent to-accent/90 text-white"
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

      {/* CTA */}
      <section className="py-24 md:py-36 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] to-transparent pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center relative z-10"
        >
          <span className="text-xs font-medium tracking-widest uppercase bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent mb-4 block">Get started</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Ready to ship with confidence?
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-md mx-auto">
            Join developers who use DevSync to build better software, faster. No credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto text-base px-8 h-12 shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-accent to-accent/90 text-white hover:from-accent/90 hover:to-accent"
            >
              Get started free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-base px-8 h-12 border-border/50 hover:bg-accent/5 hover:border-accent/30 transition-all duration-200"
            >
              Talk to sales
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-8">
            <div className="sm:col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                  <Code2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold">DevSync</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mb-6">
                A developer collaboration platform built by engineers, for engineers.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { icon: Github, href: "#" },
                  { icon: Twitter, href: "#" },
                  { icon: MessageCircle, href: "#" },
                ].map(({ icon: Icon, href }) => (
                  <a
                    key={href}
                    href={href}
                    className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Documentation", "Changelog"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-2"
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
