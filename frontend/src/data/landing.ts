import {
  Code2,
  Users,
  FolderGit2,
  MessageCircle,
  Kanban,
  Paperclip,
  GitBranch,
  Bell,
  TrendingUp,
  Terminal,
  Rocket,
  Shield,
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
// Every feature below is an actual, implemented DevSync capability.

export interface Feature {
  icon: typeof Code2;
  title: string;
  description: string;
  iconBg: string;
}

export const features: Feature[] = [
  { icon: FolderGit2, title: "Project Management", description: "Create public or private projects, invite your team, and manage the full project lifecycle — active, completed or archived.", iconBg: "from-indigo-500 to-purple-600" },
  { icon: Kanban, title: "Kanban Boards", description: "Plan work on boards with columns, priorities, labels and due dates. Drag tasks through your workflow and track completion.", iconBg: "from-blue-500 to-cyan-600" },
  { icon: MessageCircle, title: "Team Chat", description: "Real-time project rooms and direct messages with typing indicators and presence — one WebSocket connection for everything.", iconBg: "from-emerald-500 to-teal-600" },
  { icon: GitBranch, title: "GitHub Integration", description: "Connect your GitHub account, link a repository to a project, and follow commits, issues and pull requests from DevSync.", iconBg: "from-orange-500 to-amber-600" },
  { icon: Paperclip, title: "File Sharing", description: "Share files in conversations with server-side validation of size, type and content. Downloads stay private to authorized members.", iconBg: "from-violet-500 to-fuchsia-600" },
  { icon: Bell, title: "Notifications", description: "Get notified about invitations, member events, task assignments and messages — with unread counts that stay in sync.", iconBg: "from-red-500 to-rose-600" },
  { icon: Users, title: "Team Collaboration", description: "Invite members by search, approve join requests for public projects, and manage roles with server-enforced permissions.", iconBg: "from-sky-500 to-indigo-600" },
  { icon: TrendingUp, title: "Analytics", description: "Task completion rates, member contributions and activity trends — computed with efficient database aggregation, never fake numbers.", iconBg: "from-teal-500 to-emerald-600" },
  { icon: Shield, title: "Secure by Default", description: "JWT authentication, BCrypt passwords, server-side authorization on every resource, audit logging and rate-limited endpoints.", iconBg: "from-amber-500 to-orange-600" },
];

// ─── Capability chips (replaces the fake "trusted by" logo strip) ──

export interface Capability {
  icon: typeof Code2;
  label: string;
}

export const capabilities: Capability[] = [
  { icon: Users, label: "Real-time Collaboration" },
  { icon: FolderGit2, label: "Project Management" },
  { icon: Kanban, label: "Kanban Boards" },
  { icon: MessageCircle, label: "Team Chat" },
  { icon: Paperclip, label: "File Sharing" },
  { icon: GitBranch, label: "GitHub Integration" },
  { icon: Bell, label: "Notifications" },
  { icon: TrendingUp, label: "Analytics" },
];

// ─── Benefits ───────────────────────────────────────────────────
// Only statements that are true of the actual product.

export interface Benefit {
  icon: typeof Code2;
  text: string;
}

export const benefits: Benefit[] = [
  { icon: Users, text: "Real-time collaboration built in" },
  { icon: GitBranch, text: "GitHub repository integration" },
  { icon: Kanban, text: "Kanban task management" },
  { icon: MessageCircle, text: "Team chat with typing and presence" },
  { icon: Paperclip, text: "Secure, validated file sharing" },
  { icon: Shield, text: "Server-enforced permissions" },
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
  { step: "01", icon: FolderGit2, title: "Create your project", description: "Give your project a name, describe it, and choose who can see it — public and discoverable, or private and invite-only.", gradient: "from-indigo-500 to-purple-600" },
  { step: "02", icon: Users, title: "Invite your team", description: "Search for people by name or email and send invitations. Members accept right from their notifications and join your workspace.", gradient: "from-emerald-500 to-teal-600" },
  { step: "03", icon: Rocket, title: "Collaborate and ship", description: "Plan on Kanban boards, chat in real time, share files, and link GitHub repositories — all from one project workspace.", gradient: "from-orange-500 to-amber-600" },
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
