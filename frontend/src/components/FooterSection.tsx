import { Github } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export default function FooterSection() {
  return (
    <footer className="relative border-t border-border/20 bg-background/40 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 md:py-20">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <LogoMark size={32} />
              <span className="font-display text-base font-semibold tracking-tight">DevSync</span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
              A developer collaboration platform built to help teams organize projects, manage tasks, and collaborate in real time.
            </p>
            <a
              href="https://github.com/nakulsharma97/Devsync"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
            >
              <Github className="h-4 w-4" />
              GitHub repository
            </a>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-2">Features</a></li>
              <li><a href="#pricing" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-2">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-foreground mb-4">Project</h4>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              DevSync is a student-built project for learning and demonstrating full-stack development through practical collaboration tools.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 DevSync. Built as a student project for learning and demonstrating full-stack development.
          </p>
        </div>
      </div>
    </footer>
  );
}
