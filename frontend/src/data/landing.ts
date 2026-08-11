import {
  Code2,
  Users,
  Shield,
  Layers,
  Rocket,
  Terminal,
  Zap,
  Globe,
  Monitor,
  Database,
  Cloud,
  Triangle,
  Orbit,
  Atom,
  Boxes,
  Waves,
  Landmark,
} from "lucide-react";

// ─── CSS keyframes — injected via <style> in Landing ────────────
// NOTE: keyframes referenced by landing sections live here so the
// Landing page is self-contained (Auth.tsx defines its own copies).

export const keyframesStyle = `
html {
  scroll-behavior: smooth;
  /* Keep anchored sections clear of the fixed navbar */
  scroll-padding-top: 5.5rem;
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slide-in-left {
  from { opacity: 0; transform: translateX(-40px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes gradient-pan {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes shine-sweep {
  0% { transform: translateX(-160%) skewX(-20deg); }
  60%, 100% { transform: translateX(260%) skewX(-20deg); }
}

.animate-fade-in-up { animation: fade-in-up 0.6s ease-out both; }
.animate-fade-in { animation: fade-in 0.6s ease-out both; }
.animate-slide-in-left { animation: slide-in-left 0.6s ease-out both; }
.animate-slide-in-right { animation: slide-in-right 0.6s ease-out both; }
.animate-marquee { animation: marquee 34s linear infinite; }
.animate-gradient-pan {
  background-size: 200% auto;
  animation: gradient-pan 6s ease-in-out infinite;
}
.animate-shine-sweep { animation: shine-sweep 3.2s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up,
  .animate-fade-in,
  .animate-slide-in-left,
  .animate-slide-in-right,
  .animate-marquee,
  .animate-gradient-pan,
  .animate-shine-sweep {
    animation: none !important;
  }
}
`;

// ─── Feature Cards ──────────────────────────────────────────────

export interface Feature {
  icon: typeof Code2;
  title: string;
  description: string;
  iconBg: string;
}

export const features: Feature[] = [
  { icon: Code2, title: "AI-Powered Code Editor", description: "Smart autocomplete, real-time error detection, and AI suggestions that adapt to your coding style and project context.", iconBg: "from-indigo-500 to-purple-600" },
  { icon: Users, title: "Live Collaboration", description: "Multi-player editing with cursor sync, voice chat, and instant code reviews. Ship features together from anywhere.", iconBg: "from-blue-500 to-cyan-600" },
  { icon: Rocket, title: "One-Click Deploy", description: "Push to production from your editor. Built-in CI/CD, preview deployments, and rollback with zero configuration.", iconBg: "from-emerald-500 to-teal-600" },
  { icon: Terminal, title: "Dev Environment in Browser", description: "Full Linux terminal, VS Code extensions, and database clients. Everything runs in your browser, nothing on your machine.", iconBg: "from-orange-500 to-amber-600" },
  { icon: Shield, title: "Enterprise Security", description: "SOC 2 compliant, end-to-end encryption, SSO, audit logs, and granular permission controls for teams of any size.", iconBg: "from-red-500 to-rose-600" },
  { icon: Layers, title: "Smart Workspaces", description: "Organize projects with intelligent workspaces. AI suggests folder structures, dependencies, and team assignments automatically.", iconBg: "from-violet-500 to-fuchsia-600" },
];

// ─── Trusted-by Logo Marquee ────────────────────────────────────

export interface Company {
  name: string;
  icon: typeof Code2;
}

export const companies: Company[] = [
  { name: "Nimbus", icon: Cloud },
  { name: "Vertex", icon: Triangle },
  { name: "Orbit", icon: Orbit },
  { name: "Quantum", icon: Atom },
  { name: "Helix", icon: Boxes },
  { name: "Drift", icon: Waves },
  { name: "Beacon", icon: Landmark },
  { name: "Apex", icon: Zap },
];

// ─── Stats ──────────────────────────────────────────────────────

export interface Stat {
  value: string;
  label: string;
  sub: string;
}

export const stats: Stat[] = [
  { value: "50,000+", label: "Active Developers", sub: "Growing 15% MoM" },
  { value: "12,000+", label: "Projects Deployed", sub: "Across 190 countries" },
  { value: "2,000,000+", label: "Code Reviews", sub: "98% satisfaction rate" },
  { value: "99.99%", label: "Uptime SLA", sub: "Guaranteed availability" },
];

// ─── Testimonials ───────────────────────────────────────────────

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  gradient: string;
  initials: string;
}

export const testimonials: Testimonial[] = [
  { quote: "DevSync changed how our entire engineering team operates. We went from two-week sprints to shipping daily.", author: "Sarah Chen", role: "VP of Engineering, Stripe", gradient: "from-indigo-500 to-purple-600", initials: "SC" },
  { quote: "The AI code suggestions are scary good. It understands our codebase better than some team members.", author: "Marcus Johnson", role: "CTO, Vercel", gradient: "from-emerald-500 to-teal-600", initials: "MJ" },
  { quote: "We built our entire microservices architecture on DevSync. The browser-based dev environment is a game changer.", author: "Emily Rodriguez", role: "Founder, Railway", gradient: "from-orange-500 to-amber-600", initials: "ER" },
];

// ─── Pricing Plans ──────────────────────────────────────────────

export interface PricingPlan {
  name: string;
  price: string;
  priceYearly: string;
  period: string;
  periodYearly: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}

export const pricing: PricingPlan[] = [
  { name: "Starter", price: "$0", priceYearly: "$0", period: "/month", periodYearly: "/month, billed yearly", description: "Perfect for individual developers and open-source projects.", features: ["Unlimited public projects", "AI code suggestions", "Community support", "1 GB storage", "Basic analytics"], cta: "Get Started Free", popular: false },
  { name: "Pro", price: "$19", priceYearly: "$15", period: "/month", periodYearly: "/month, billed yearly", description: "For professional developers who need more power and privacy.", features: ["Everything in Starter", "Unlimited private projects", "Priority AI features", "50 GB storage", "Advanced analytics", "Custom domains", "Team collaboration"], cta: "Start Free Trial", popular: true },
  { name: "Enterprise", price: "$99", priceYearly: "$79", period: "/month", periodYearly: "/month, billed yearly", description: "For teams that need enterprise-grade security and control.", features: ["Everything in Pro", "SSO & SAML", "Audit logs", "Unlimited storage", "99.99% SLA", "Dedicated support", "Custom integrations", "On-premise option"], cta: "Contact Sales", popular: false },
];

// ─── Benefits ───────────────────────────────────────────────────

export interface Benefit {
  icon: typeof Zap;
  text: string;
}

export const benefits: Benefit[] = [
  { icon: Zap, text: "10x faster development workflow" },
  { icon: Shield, text: "SOC 2 Type II certified" },
  { icon: Globe, text: "Available in 190+ countries" },
  { icon: Cloud, text: "99.99% uptime guarantee" },
  { icon: Database, text: "Automatic backups & versioning" },
  { icon: Monitor, text: "Full local development environment" },
];

// ─── How It Works Steps ─────────────────────────────────────────

export interface HowItWorksStep {
  step: string;
  icon: typeof Terminal;
  title: string;
  description: string;
  gradient: string;
}

export const howItWorksSteps: HowItWorksStep[] = [
  { step: "01", icon: Terminal, title: "Open your browser", description: "No setup, no downloads. Just open DevSync and start coding in a full-featured development environment.", gradient: "from-indigo-500 to-purple-600" },
  { step: "02", icon: Users, title: "Invite your team", description: "Real-time multiplayer editing with cursor sync, voice chat, and instant feedback. Like Google Docs for code.", gradient: "from-emerald-500 to-teal-600" },
  { step: "03", icon: Rocket, title: "Ship to production", description: "One click deploys your app to production with built-in CI/CD, preview URLs, and instant rollbacks.", gradient: "from-orange-500 to-amber-600" },
];

// ─── Footer Links ───────────────────────────────────────────────

export interface FooterLink {
  name: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export const footerColumns: FooterColumn[] = [
  { title: "Product", links: [{ name: "Features", href: "#features" }, { name: "Pricing", href: "#pricing" }, { name: "Documentation", href: "#docs" }, { name: "Changelog", href: "#" }, { name: "API Status", href: "#" }] },
  { title: "Company", links: [{ name: "About", href: "#" }, { name: "Blog", href: "#" }, { name: "Careers", href: "#" }, { name: "Press Kit", href: "#" }, { name: "Contact", href: "#" }] },
  { title: "Legal", links: [{ name: "Privacy Policy", href: "#" }, { name: "Terms of Service", href: "#" }, { name: "Security", href: "#" }, { name: "Cookies", href: "#" }, { name: "GDPR", href: "#" }] },
];

