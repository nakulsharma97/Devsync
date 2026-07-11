import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import CodeEditorMockup from "@/components/CodeEditorMockup";
import { Rocket, Terminal, Check } from "lucide-react";

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/40 pointer-events-none" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-pink-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-medium tracking-wide mb-8 border border-indigo-500/25 shadow-lg shadow-indigo-500/10 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                Now in Public Beta <span className="mx-1 opacity-40">·</span> <span className="text-indigo-600/80 dark:text-indigo-300/70">50K+ developers</span>
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              Code, Collaborate,<br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">Ship at light speed.</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-foreground/70 leading-relaxed max-w-lg mx-auto lg:mx-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              The developer platform that combines AI-powered coding, real-time collaboration, and instant deployment — all in your browser.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 lg:justify-start animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              <Button size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto text-base px-8 h-12 shadow-xl hover:shadow-2xl transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 relative overflow-hidden group">
                <span className="relative z-10 flex items-center">
                  Start Building Free<Rocket className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              <Button variant="outline" size="lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto text-base px-8 h-12 border-indigo-500/40 hover:border-indigo-400/60 hover:bg-indigo-500/10 text-foreground font-medium transition-all duration-200">
                <Terminal className="mr-2 w-4 h-4" />Watch Demo
              </Button>
            </div>

            <div className="mt-6 flex items-center gap-6 justify-center lg:justify-start text-xs text-foreground/60 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />No credit card</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />Free tier included</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />Cancel anytime</span>
            </div>
          </div>

          <div className="hidden lg:block animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <CodeEditorMockup />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: "2s" }}>
        <span className="text-xs text-muted-foreground">Scroll to explore</span>
        <div className="w-5 h-8 rounded-full border border-border/40 flex items-start justify-center p-1 animate-float">
          <div className="w-1 h-2 rounded-full bg-accent/60" />
        </div>
      </div>
    </section>
  );
}
