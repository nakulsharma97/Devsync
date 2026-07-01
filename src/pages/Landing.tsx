import { motion } from "framer-motion";
import {
  ArrowRight,
  Code2,
  Users,
  Sparkles,
  GitBranch,
  Shield,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const features = [
  {
    icon: Code2,
    title: "Collaborative Coding",
    description:
      "Real-time pair programming and code reviews with your team. Share knowledge and ship faster.",
  },
  {
    icon: Users,
    title: "Developer Network",
    description:
      "Connect with engineers who share your interests. Build meaningful professional relationships.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    description:
      "Smart code analysis, automated documentation, and intelligent suggestions as you build.",
  },
  {
    icon: GitBranch,
    title: "Project Showcase",
    description:
      "Share your work, get feedback, and discover open-source projects looking for contributors.",
  },
  {
    icon: Shield,
    title: "Code Quality",
    description:
      "Automated reviews, security scanning, and best practice enforcement built right in.",
  },
  {
    icon: Layers,
    title: "Workspaces",
    description:
      "Organize projects into workspaces. Keep your personal, work, and open-source efforts separate.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-background"
    >
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-foreground flex items-center justify-center">
              <Code2 className="w-4 h-4 text-background" />
            </div>
            <span className="text-sm font-medium tracking-tight">DevSync</span>
          </div>
          <nav aria-label="Main" className="hidden sm:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-sm"
            >
              Sign in
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-sm"
            >
              Get Started
              <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          </nav>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="sm:hidden text-sm"
          >
            Sign in
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-36 pb-24 px-6">
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-block text-xs font-medium tracking-widest uppercase text-muted-foreground mb-8">
              Developer Collaboration Platform
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.08] text-foreground"
          >
            Build better software
            <br />
            <span className="text-muted-foreground">together.</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto"
          >
            DevSync connects developers with the tools, teams, and AI
            intelligence they need to create exceptional software — from idea to
            deployment.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto text-sm px-8 h-11"
            >
              Start building
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto text-sm px-8 h-11"
            >
              Explore features
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="border-t border-border" />
      </div>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-20"
          >
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Everything you need to ship
            </h2>
            <p className="mt-4 text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
              A comprehensive platform designed for modern development teams who
              care about quality and velocity.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="bg-background p-8 sm:p-10"
              >
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center mb-5">
                  <feature.icon className="w-4.5 h-4.5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="border-t border-border" />
      </div>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-xl text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Ready to ship with confidence?
          </h2>
          <p className="mt-4 text-muted-foreground text-base leading-relaxed">
            Join developers who use DevSync to build better software, faster.
            No credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto text-sm px-8 h-11"
            >
              Get started free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto text-sm px-8 h-11"
            >
              Sign in
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-foreground flex items-center justify-center">
              <Code2 className="w-3 h-3 text-background" />
            </div>
            <span className="text-xs text-muted-foreground">
              DevSync &mdash; &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
